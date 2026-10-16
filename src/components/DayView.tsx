import { useEffect, useMemo, useRef, useState } from 'react'
import type { Day, Place, Stop } from '../types'
import { useMaps, useTrip } from '../context'
import { embedRouteUrl, load, save, toMinutes } from '../lib'
import { weatherLabel, type DayWeather } from '../weather'
import { DayMap, type Pin } from './DayMap'
import { PlaceActions } from './PlaceActions'
import { Rich } from './Rich'
import { Local } from './Local'

const KIND_LABEL = { meet: '집합', sight: '관광', food: '식사', free: '자유', move: '이동' } as const

const hasPos = (p?: Place): p is Place & { lat: number; lng: number } => p?.lat != null && p?.lng != null

/** 지도 핀과 타임라인 번호를 같은 순서로 만듭니다. picks에 체크한 선택지가 있으면 그 줄은 체크한 것만 핀으로 그려요. */
function buildPins(day: Day, hotel: Place, picks: Record<number, string[]>) {
  const isHotel = (p?: Place) => p?.q === hotel.q
  const pins: Pin[] = [{ key: 'hotel', label: '숙', lat: hotel.lat!, lng: hotel.lng!, place: hotel, kind: 'hotel', onRoute: true }]
  const labels: Record<number, { label: string; key: string }> = {}
  let n = 0
  day.stops.forEach((s, i) => {
    if (s.kind === 'move') return
    if (s.alts) {
      const picked = picks[i]?.length ? picks[i] : null
      const altPins = s.alts.filter((a) => hasPos(a.place) && !isHotel(a.place) && (!picked || picked.includes(a.tag)))
      if (!altPins.length) return
      n++
      labels[i] = { label: String(n), key: `s${i}${altPins[0].tag}` }
      for (const a of altPins) {
        const p = a.place as Place & { lat: number; lng: number }
        pins.push({ key: `s${i}${a.tag}`, label: `${n}${a.tag}`, lat: p.lat, lng: p.lng, place: p, kind: s.kind, onRoute: false })
      }
      return
    }
    if (isHotel(s.place)) {
      labels[i] = { label: '숙', key: 'hotel' }
      return
    }
    if (!hasPos(s.place)) return
    n++
    labels[i] = { label: String(n), key: `s${i}` }
    pins.push({ key: `s${i}`, label: String(n), lat: s.place.lat, lng: s.place.lng, place: s.place, kind: s.kind, onRoute: !s.offRoute })
  })
  const route = day.stops.filter((s) => s.place && !s.alts && !s.offRoute && !isHotel(s.place)).map((s) => s.place!)
  return { pins, labels, route }
}

function currentIndex(stops: Stop[], minutes: number) {
  let cur = -1
  let next = -1
  stops.forEach((s, i) => {
    if (s.kind === 'move') return
    const m = toMinutes(s.time)
    if (m == null) return
    if (m <= minutes) cur = i
    else if (next === -1) next = i
  })
  return { cur, next }
}

export function DayView({ day, today, nowMinutes, weather }: { day: Day; today: boolean; nowMinutes: number; weather?: DayWeather }) {
  const { hotel, id: tripId } = useTrip()
  const { routeUrl, mapName, gmaps } = useMaps()
  const picksKey = `picks-${tripId}-${day.id}`
  const [picks, setPicks] = useState<Record<number, string[]>>(() => load(picksKey, {}))
  const togglePick = (i: number, tag: string) =>
    setPicks((prev) => {
      const cur = prev[i] ?? []
      const next = { ...prev, [i]: cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag] }
      save(picksKey, next)
      return next
    })
  const { pins, labels, route } = useMemo(() => buildPins(day, hotel, picks), [day, hotel, picks])
  const [focus, setFocus] = useState<{ key: string; n: number } | null>(null)
  const [mapMode, setMapMode] = useState<'pins' | 'google'>('pins')
  const mapBox = useRef<HTMLDivElement>(null)
  const { cur, next } = today ? currentIndex(day.stops, nowMinutes) : { cur: -1, next: -1 }
  const [cards, setCards] = useState(() => load('tl-cards', true))
  const tl = useRef<HTMLOListElement>(null)
  const [slide, setSlide] = useState(0)
  const setView = (v: boolean) => {
    setCards(v)
    save('tl-cards', v)
  }
  const go = (i: number, smooth = true) => {
    const el = tl.current
    const li = el?.children[i] as HTMLElement | undefined
    if (el && li) el.scrollTo({ left: li.offsetLeft - parseFloat(getComputedStyle(el).scrollPaddingLeft || '0'), behavior: smooth ? 'smooth' : 'instant' })
  }
  const onScroll = () => {
    const el = tl.current
    if (!el) return
    const kids = [...el.children] as HTMLElement[]
    // 끝까지 밀면 마지막 카드가 왼쪽에 붙지 못하니 마지막으로 봐요.
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) return setSlide(kids.length - 1)
    const x = el.scrollLeft + parseFloat(getComputedStyle(el).scrollPaddingLeft || '0')
    setSlide(kids.reduce((b, k, i) => (Math.abs(k.offsetLeft - x) < Math.abs(kids[b].offsetLeft - x) ? i : b), 0))
  }
  // 오늘이면 지금 하는 일정 카드부터 보여줘요. 시계가 바뀔 때마다 끌려가지 않게 날짜나 보기를 바꿀 때만 맞춰요.
  useEffect(() => {
    const start = cards && cur > 0 ? cur : 0
    go(start, false)
    setSlide(start)
  }, [cards, day.id])

  const show = (key: string) => {
    setMapMode('pins')
    setFocus((f) => ({ key, n: (f?.n ?? 0) + 1 }))
    mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="day" aria-labelledby={`${day.id}-h`}>
      <header className="day-h">
        <div className="row">
          <span className="n">DAY {day.n}</span>
          <span className="date">{day.label}</span>
          {today && <span className="chip today">오늘</span>}
          {day.chips.map((c) => (
            <span key={c.text} className={`chip ${c.tone}`}>
              {c.text}
            </span>
          ))}
        </div>
        <h2 id={`${day.id}-h`}>{day.title}</h2>
        <p className="lead">
          <Rich text={day.lead} />
        </p>
        <dl className="facts">
          {day.facts.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>
                <Rich text={f.v} />
              </dd>
            </div>
          ))}
          <div>
            <dt>날씨</dt>
            <dd>
              {weather ? (
                <>
                  {weatherLabel(weather.code)} <span className="mono">{weather.min}–{weather.max}°</span> · 비 {weather.pop}%
                  <span className="src">
                    {day.weather.where} 기준 ·{' '}
                    <a href="https://open-meteo.com/" target="_blank" rel="noopener">
                      Open-Meteo
                    </a>
                  </span>
                </>
              ) : (
                <span className="faint">예보를 불러오고 있어요</span>
              )}
            </dd>
          </div>
        </dl>
      </header>

      <div ref={mapBox} className="map-box">
        {gmaps && (
          <div className="seg" role="tablist" aria-label="지도 종류">
            <button type="button" role="tab" aria-selected={mapMode === 'pins'} onClick={() => setMapMode('pins')}>
              번호 지도
            </button>
            <button type="button" role="tab" aria-selected={mapMode === 'google'} onClick={() => setMapMode('google')}>
              Google 경로
            </button>
          </div>
        )}
        {mapMode === 'google' && gmaps ? (
          <iframe className="embed tall" title={`${day.label} 경로`} src={embedRouteUrl(hotel, route)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        ) : (
          <DayMap pins={pins} focus={focus} />
        )}
        <div className="acts">
          <a className="btn primary" href={routeUrl(hotel, route)} target="_blank" rel="noopener">
            {mapName}에서 하루 동선 보기
          </a>
          {day.links?.map((l) => (
            <a key={l.href} className="btn" href={l.href} target="_blank" rel="noopener">
              {l.label}
            </a>
          ))}
        </div>
      </div>

      <div className="tl-bar">
        <div className="seg" role="tablist" aria-label="일정 보기 방식">
          <button type="button" role="tab" aria-selected={cards} onClick={() => setView(true)}>
            카드
          </button>
          <button type="button" role="tab" aria-selected={!cards} onClick={() => setView(false)}>
            목록
          </button>
        </div>
        {cards && (
          <div className="tl-nav">
            <button type="button" onClick={() => go(slide - 1)} disabled={slide === 0} aria-label="이전 일정">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3 5 8l5 5" />
              </svg>
            </button>
            <span className="mono" aria-live="polite">
              {slide + 1} / {day.stops.length}
            </span>
            <button type="button" onClick={() => go(slide + 1)} disabled={slide >= day.stops.length - 1} aria-label="다음 일정">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <ol ref={tl} className={cards ? 'tl cards' : 'tl'} onScroll={cards ? onScroll : undefined}>
        {day.stops.map((s, i) =>
          s.kind === 'move' ? (
            <li key={i} className="mv">
              <time className="soft">{s.time}</time>
              <div className="st-b">
                <Rich text={s.desc ?? ''} />
              </div>
            </li>
          ) : (
            <li key={i} className={`st ${s.kind}${i === cur ? ' is-now' : ''}${i === next ? ' is-next' : ''}`}>
              <time className={s.soft ? 'soft' : ''}>{s.time}</time>
              <div className="st-b">
                {labels[i] ? (
                  <button type="button" className={`num pin-${labels[i].key === 'hotel' ? 'hotel' : s.kind}`} onClick={() => show(labels[i].key)} aria-label={`지도에서 ${s.title} 보기`}>
                    {labels[i].label}
                  </button>
                ) : (
                  <span className="dot" />
                )}
                <div className="st-h">
                  <h3>{s.title}</h3>
                  <Local>{s.local}</Local>
                  {i === cur && <span className="chip today">지금</span>}
                  {i === next && <span className="chip idea">다음</span>}
                </div>
                <div className="st-m">
                  <span className="kind">{s.kindLabel ?? KIND_LABEL[s.kind]}</span>
                  {s.meta?.map((m) => (
                    <span key={m}>
                      <Rich text={m} />
                    </span>
                  ))}
                </div>
                {s.desc && (
                  <p className="desc">
                    <Rich text={s.desc} />
                  </p>
                )}
                {s.tips && (
                  <ul className="tips">
                    {s.tips.map((t) => (
                      <li key={t}>
                        <Rich text={t} />
                      </li>
                    ))}
                  </ul>
                )}
                {s.alts && (
                  <div className="alt">
                    {s.alts.map((a) => {
                      const pinKey = `s${i}${a.tag}`
                      const pinned = pins.some((p) => p.key === pinKey)
                      return (
                        <div key={a.tag} className={picks[i]?.includes(a.tag) ? 'picked' : ''}>
                          {a.place && hasPos(a.place) && (
                            <label className="alt-pick" title="체크한 선택지만 지도에 표시">
                              <input type="checkbox" checked={picks[i]?.includes(a.tag) ?? false} onChange={() => togglePick(i, a.tag)} aria-label={`${a.title}만 지도에 표시`} />
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path className="ring" d="M19.5 7.5A9 9 0 1 0 21 12" />
                                <path className="tick" d="M7.5 11.5l4 4L21 5.5" />
                              </svg>
                            </label>
                          )}
                          <h4>
                            {pinned ? (
                              <button type="button" className="tag" onClick={() => show(pinKey)} aria-label={`지도에서 ${a.title} 보기`}>
                                {labels[i]?.label}
                                {a.tag}
                              </button>
                            ) : (
                              <span className="tag plain">{a.tag}</span>
                            )}
                            {a.title}
                            <Local>{a.local}</Local>
                          </h4>
                          <p>
                            <Rich text={a.desc} />
                          </p>
                          {a.tips && (
                            <ul className="tips">
                              {a.tips.map((t) => (
                                <li key={t}>
                                  <Rich text={t} />
                                </li>
                              ))}
                            </ul>
                          )}
                          {a.place && <PlaceActions place={a.place} compact links={a.links} />}
                        </div>
                      )
                    })}
                  </div>
                )}
                {s.place && !s.alts && <PlaceActions place={s.place} tour={s.tour} links={s.links} />}
                {!s.place && s.links && (
                  <div className="acts">
                    {s.links.map((l) => (
                      <a key={l.href} className="btn book" href={l.href} target="_blank" rel="noopener">
                        {l.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  )
}
