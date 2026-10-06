// content/의 YAML·Markdown을 읽어 검사하고, 화면이 쓰는 Trip[]으로 조립해 `virtual:trips` 모듈로 내보냅니다.
// 문제가 있으면 파일 경로와 위치를 모아 빌드를 멈춥니다. 개발 서버에서는 content/가 바뀌면 새로고침합니다.
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { marked } from 'marked'
import type { z } from 'zod'
import type { Plugin } from 'vite'
import * as S from './content-schema.ts'
import type { AppItem, CheckItem, Day, Dish, FoodItem, Place, Stop, Trip } from '../src/types.ts'

const VIRTUAL = 'virtual:trips'
const RESOLVED = '\0' + VIRTUAL
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const TOKEN = /\{([A-Z]+)(\d+[A-Z]?)\}/g

class Issues {
  list: string[] = []
  root: string
  constructor(root: string) {
    this.root = root
  }
  add(file: string, where: string, msg: string) {
    this.list.push(`${path.relative(this.root, file)}${where ? ` › ${where}` : ''}: ${msg}`)
  }
}

function readYaml<T extends z.ZodType>(file: string, schema: T, issues: Issues): z.output<T> | null {
  let raw: unknown
  try {
    raw = parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    issues.add(file, '', `YAML 문법 오류 ${(e as Error).message}`)
    return null
  }
  const r = schema.safeParse(raw)
  if (!r.success) {
    for (const i of r.error.issues) issues.add(file, i.path.join('.'), i.message)
    return null
  }
  return r.data
}

/** 문자열 안의 {BL10} 같은 노선 코드가 나라 파일에 정의돼 있는지 확인합니다. */
function checkTokens(value: unknown, lines: Record<string, unknown>, file: string, issues: Issues, at = '') {
  if (typeof value === 'string') {
    for (const m of value.matchAll(TOKEN)) if (!lines[m[1]]) issues.add(file, at, `알 수 없는 노선 코드 {${m[1]}${m[2]}}`)
  } else if (Array.isArray(value)) value.forEach((v, i) => checkTokens(v, lines, file, issues, at ? `${at}.${i}` : String(i)))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) checkTokens(v, lines, file, issues, at ? `${at}.${k}` : k)
}

const isTime = (t: string) => /^\d{2}:\d{2}$/.test(t)
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${iso.slice(5, 7)}.${iso.slice(8, 10)} ${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`
}

function loadTrip(dir: string, id: string, countries: Map<string, z.output<typeof S.Country>>, issues: Issues, files: string[]): Trip | null {
  const f = (name: string) => path.join(dir, name)
  const need = (name: string) => {
    if (fs.existsSync(f(name))) return true
    issues.add(f(name), '', '파일이 없어요')
    return false
  }
  if (!need('trip.yaml') || !need('places.yaml')) return null

  const trip = readYaml(f('trip.yaml'), S.Trip, issues)
  const places = readYaml(f('places.yaml'), S.Places, issues)
  files.push(f('trip.yaml'), f('places.yaml'))
  if (!trip || !places) return null

  const country = countries.get(trip.country)
  if (!country) {
    issues.add(f('trip.yaml'), 'country', `content/countries/${trip.country}.yaml이 없어요`)
    return null
  }
  const lines = country.lines

  const place = (pid: string | undefined, file: string, at: string): Place | undefined => {
    if (pid === undefined) return undefined
    const p = places[pid]
    if (!p) issues.add(file, at, `places.yaml에 없는 장소 id "${pid}"`)
    return p
  }

  checkTokens(trip, lines, f('trip.yaml'), issues)
  const hotelPlace = place(trip.hotel.place, f('trip.yaml'), 'hotel.place')
  trip.tickets.forEach((x, i) => {
    if (x.date < trip.start || x.date > trip.end) issues.add(f('trip.yaml'), `tickets.${i}.date`, `여행 기간(${trip.start} ~ ${trip.end}) 밖의 날짜예요`)
  })
  trip.flights.forEach((x, i) => {
    if (x.date < trip.start || x.date > trip.end) issues.add(f('trip.yaml'), `flights.${i}.date`, `여행 기간(${trip.start} ~ ${trip.end}) 밖의 날짜예요`)
  })
  if (hotelPlace && (hotelPlace.lat == null || hotelPlace.lng == null)) issues.add(f('places.yaml'), trip.hotel.place, '숙소에는 lat, lng가 필요해요')

  // days/*.yaml — 파일 이름 순서가 곧 Day 1, 2, 3 …
  const dayDir = f('days')
  const dayFiles = fs.existsSync(dayDir) ? fs.readdirSync(dayDir).filter((n) => n.endsWith('.yaml')).sort() : []
  if (!dayFiles.length) issues.add(dayDir, '', 'days/ 폴더에 일정 파일이 없어요')
  const seenDates = new Set<string>()
  const days: Day[] = []
  dayFiles.forEach((name, idx) => {
    const file = path.join(dayDir, name)
    files.push(file)
    const d = readYaml(file, S.Day, issues)
    if (!d) return
    checkTokens(d, lines, file, issues)
    if (d.date < trip.start || d.date > trip.end) issues.add(file, 'date', `여행 기간(${trip.start} ~ ${trip.end}) 밖의 날짜예요`)
    if (seenDates.has(d.date)) issues.add(file, 'date', '다른 일정 파일과 날짜가 겹쳐요')
    seenDates.add(d.date)

    const wPlace = d.weather ? place(d.weather.place, file, 'weather.place') : hotelPlace
    if (d.weather && wPlace && (wPlace.lat == null || wPlace.lng == null)) issues.add(file, 'weather.place', '날씨 기준 장소에는 lat, lng가 필요해요')

    const stops: Stop[] = d.stops.map((s, i) => {
      const at = `stops.${i}`
      if (s.move) return { time: s.time, soft: true, kind: 'move', desc: s.move }
      const p = place(s.place, file, `${at}.place`)
      return {
        time: s.time,
        soft: !isTime(s.time),
        kind: s.kind!,
        kindLabel: s.label,
        title: s.title,
        local: s.local ?? p?.local,
        place: p,
        meta: s.meta,
        desc: s.desc,
        tips: s.tips,
        links: s.links,
        tour: s.tour,
        offRoute: s.offRoute,
        alts: s.alts?.map((a, j) => {
          const ap = place(a.place, file, `${at}.alts.${j}.place`)
          return { tag: String.fromCharCode(65 + j), title: a.title, local: a.local ?? ap?.local, desc: a.desc, place: ap, tips: a.tips, links: a.links }
        }),
      }
    })

    days.push({
      id: `d${idx + 1}`,
      n: idx + 1,
      date: d.date,
      label: dayLabel(d.date),
      short: d.short,
      title: d.title,
      lead: d.lead,
      chips: d.chips,
      facts: d.facts.map((x) => ({ k: x.label, v: x.value })),
      weather: { lat: wPlace?.lat ?? 0, lng: wPlace?.lng ?? 0, where: d.weather?.label ?? trip.city },
      links: d.links,
      stops,
    })
  })

  let food: FoodItem[] = []
  if (fs.existsSync(f('food.yaml'))) {
    files.push(f('food.yaml'))
    const raw = readYaml(f('food.yaml'), S.Food, issues)
    if (raw) {
      checkTokens(raw, lines, f('food.yaml'), issues)
      food = raw.flatMap((x, i) => {
        const p = place(x.place, f('food.yaml'), `${i}.place`)
        return p ? [{ title: x.title, local: x.local ?? p.local, when: x.day, desc: x.desc, order: x.order, wait: x.wait, place: p, links: x.links }] : []
      })
    }
  }

  let dishes: Dish[] = []
  if (fs.existsSync(f('dishes.yaml'))) {
    files.push(f('dishes.yaml'))
    const raw = readYaml(f('dishes.yaml'), S.Dishes, issues)
    if (raw) {
      checkTokens(raw, lines, f('dishes.yaml'), issues)
      dishes = raw.map((d, i) => ({
        ...d,
        spots: d.spots.flatMap((s, j) => {
          const p = place(s.place, f('dishes.yaml'), `${i}.spots.${j}.place`)
          return p ? [{ ...s, place: p }] : []
        }),
      }))
    }
  }

  let tripChecklist: CheckItem[] = []
  if (fs.existsSync(f('checklist.yaml'))) {
    files.push(f('checklist.yaml'))
    tripChecklist = readYaml(f('checklist.yaml'), S.Checklist, issues) ?? []
  }
  const checklist = [...tripChecklist, ...country.checklist]
  const ids = new Set<string>()
  for (const c of checklist) {
    if (ids.has(c.id)) issues.add(f('checklist.yaml'), c.id, '체크리스트 id가 나라 파일이나 다른 항목과 겹쳐요')
    ids.add(c.id)
  }

  let notes: string | undefined
  if (fs.existsSync(f('notes.md'))) {
    files.push(f('notes.md'))
    notes = marked.parse(fs.readFileSync(f('notes.md'), 'utf8'), { async: false })
  }

  if (!hotelPlace) return null
  const apps: AppItem[] = [...country.apps, ...trip.apps]
  return {
    id,
    title: trip.title,
    country: country.name,
    countryCode: trip.country,
    city: trip.city,
    route: trip.route,
    start: trip.start,
    end: trip.end,
    timeZone: country.timeZone,
    lang: country.lang,
    currency: country.currency,
    taxiAsk: country.taxi.ask,
    lines,
    summary: trip.summary,
    hotel: { ...hotelPlace, access: trip.hotel.access, nights: trip.hotel.nights },
    days: days.sort((a, b) => a.date.localeCompare(b.date)),
    food,
    dishes,
    checklist,
    apps,
    info: [...trip.info, ...country.info],
    emergency: country.emergency,
    flights: trip.flights,
    stay: trip.stay.map((x) => ({ k: x.label, v: x.value })),
    tickets: trip.tickets.map((x) => ({ ...x, facts: x.facts.map((f) => ({ k: f.label, v: f.value })) })),
    notes,
  }
}

export function loadContent(dir: string) {
  const issues = new Issues(path.dirname(dir))
  const files: string[] = []
  const countries = new Map<string, z.output<typeof S.Country>>()
  const cDir = path.join(dir, 'countries')
  for (const name of fs.existsSync(cDir) ? fs.readdirSync(cDir).filter((n) => n.endsWith('.yaml')) : []) {
    const file = path.join(cDir, name)
    files.push(file)
    const c = readYaml(file, S.Country, issues)
    if (!c) continue
    const { lines, ...rest } = c
    checkTokens(rest, lines, file, issues)
    countries.set(name.replace(/\.yaml$/, ''), c)
  }

  const tDir = path.join(dir, 'trips')
  const trips: Trip[] = []
  for (const id of fs.existsSync(tDir) ? fs.readdirSync(tDir).sort() : []) {
    const full = path.join(tDir, id)
    if (!fs.statSync(full).isDirectory() || id.startsWith('.')) continue
    if (!/^[a-z0-9-]+$/.test(id)) {
      issues.add(full, '', '여행 폴더 이름은 영문 소문자, 숫자, -만 써 주세요 (주소에 쓰여요)')
      continue
    }
    const t = loadTrip(full, id, countries, issues, files)
    if (t) trips.push(t)
  }

  if (issues.list.length) {
    throw new Error(`여행 데이터에 고칠 곳이 ${issues.list.length}개 있어요\n\n${issues.list.map((m) => `  - ${m}`).join('\n')}\n`)
  }
  // 최신 여행이 위로 옵니다.
  trips.sort((a, b) => b.start.localeCompare(a.start))
  return { trips, files }
}

export function contentPlugin(rel = 'content'): Plugin {
  let dir = ''
  return {
    name: 'trip-content',
    configResolved(c) {
      dir = path.resolve(c.root, rel)
    },
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED
    },
    load(id) {
      if (id !== RESOLVED) return
      const { trips, files } = loadContent(dir)
      files.forEach((file) => this.addWatchFile(file))
      // 10:45–20:30, NT$500–1,500 같은 숫자 범위가 줄 끝에서 끊기지 않게 줄표 양옆에 WORD JOINER를 넣어요.
      return `export const TRIPS = ${JSON.stringify(trips).replace(/(\d)–(?=\d)/g, '$1\u2060–\u2060')}`
    },
    configureServer(server) {
      server.watcher.add(dir)
      const reload = (file: string) => {
        if (!file.startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
    },
  }
}
