import type { Place, Trip } from './types'

const G = 'https://www.google.com/maps'
const enc = encodeURIComponent

export const mapUrl = (p: Place) => `${G}/search/?api=1&query=${enc(p.q)}`

/** origin을 생략하면 Google 지도가 현재 위치에서 출발합니다. */
export const dirUrl = (p: Place, from?: Place, mode: 'transit' | 'walking' | 'driving' = 'transit') =>
  `${G}/dir/?api=1${from ? `&origin=${enc(from.q)}` : ''}&destination=${enc(p.q)}&travelmode=${mode}`

/** 숙소에서 출발해 하루 동선을 순서대로 잇는 경로. 대중교통 모드는 경유지를 지원하지 않아 모드를 비워 둡니다. */
export const routeUrl = (hotel: Place, places: Place[]) => {
  const stops = places.filter((p, i) => i === 0 || p.q !== places[i - 1].q)
  if (stops.length === 0) return mapUrl(hotel)
  const dest = stops[stops.length - 1]
  const way = stops.slice(0, -1).slice(0, 9)
  return `${G}/dir/?api=1&origin=${enc(hotel.q)}&destination=${enc(dest.q)}${way.length ? `&waypoints=${enc(way.map((p) => p.q).join('|'))}` : ''}`
}

/** 지정한 시간대의 날짜(YYYY-MM-DD)와 분 단위 시각 */
export function nowIn(timeZone: string, d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hm: `${get('hour')}:${get('minute')}`, minutes: +get('hour') * 60 + +get('minute') }
}

export const toMinutes = (t: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  return m ? +m[1] * 60 + +m[2] : null
}

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 저장 불가 환경에서는 무시 */
  }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** .env의 VITE_GOOGLE_MAPS_API_KEY. 비어 있으면 Google 임베드 기능을 숨깁니다. */
export const GMAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()

const EMBED = 'https://www.google.com/maps/embed/v1'

export const embedPlaceUrl = (p: Place) => `${EMBED}/place?key=${enc(GMAPS_KEY)}&q=${enc(p.q)}&language=ko`

/** Embed API는 대중교통 모드에서 경유지를 받지 않아, 하루 경로 미리보기는 기본(자동차) 경로로 그립니다. */
export const embedRouteUrl = (hotel: Place, places: Place[]) => {
  const stops = places.filter((p, i) => i === 0 || p.q !== places[i - 1].q)
  const dest = stops[stops.length - 1] ?? hotel
  const way = stops.slice(0, -1).slice(0, 20)
  return `${EMBED}/directions?key=${enc(GMAPS_KEY)}&origin=${enc(hotel.q)}&destination=${enc(dest.q)}${way.length ? `&waypoints=${enc(way.map((p) => p.q).join('|'))}` : ''}&language=ko`
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** '2026-10-07' → '2026.10.07 (수)' */
export const fmtDate = (iso: string, withYear = true) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${withYear ? `${y}.` : ''}${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${dow})`
}

const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000

/** 한국 날짜 기준 여행 상태 */
export function tripStatus(trip: Pick<Trip, 'start' | 'end'>, today = nowIn('Asia/Seoul').date) {
  const t = dayNum(today)
  const s = dayNum(trip.start)
  const e = dayNum(trip.end)
  if (t < s) return { kind: 'upcoming' as const, label: `D-${s - t}` }
  if (t > e) return { kind: 'past' as const, label: '다녀옴' }
  return { kind: 'now' as const, label: `여행 중 · ${t - s + 1}일째` }
}

export const nights = (trip: Pick<Trip, 'start' | 'end'>) => dayNum(trip.end) - dayNum(trip.start)
