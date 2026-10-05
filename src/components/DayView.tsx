import { useMemo, useRef, useState } from 'react'
import type { Day, Place, Stop } from '../types'
import { useTrip } from '../context'
import { GMAPS_KEY, embedRouteUrl, routeUrl, toMinutes } from '../lib'
import { weatherLabel, type DayWeather } from '../weather'
import { DayMap, type Pin } from './DayMap'
import { PlaceActions } from './PlaceActions'
import { Rich } from './Rich'

const KIND_LABEL = { meet: '집합', sight: '관광', food: '식사', free: '자유', move: '이동' } as const

const hasPos = (p?: Place): p is Place & { lat: number; lng: number } => p?.lat != null && p?.lng != null

/** 지도 핀과 타임라인 번호를 같은 순서로 만듭니다. */
function buildPins(day: Day, hotel: Place) {
  const isHotel = (p?: Place) => p?.q === hotel.q
  const pins: Pin[] = [{ key: 'hotel', label: '숙', lat: hotel.lat!, lng: hotel.lng!, place: hotel, kind: 'hotel', onRoute: true }]
  const labels: Record<number, { label: string; key: string }> = {}
  let n = 0
  day.stops.forEach((s, i) => {
    if (s.kind === 'move') return
    if (s.alts) {
      const altPins = s.alts.filter((a) => hasPos(a.place) && !isHotel(a.place))
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
  const { hotel } = useTrip()
  const { pins, labels, route } = useMemo(() => buildPins(day, hotel), [day, hotel])
  const [focus, setFocus] = useState<{ key: string; n: number } | null>(null)
  const [mapMode, setMapMode] = useState<'pins' | 'google'>('pins')
  const mapBox = useRef<HTMLDivElement>(null)
  const { cur, next } = today ? currentIndex(day.stops, nowMinutes) : { cur: -1, next: -1 }

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
        <p className="lead">{day.lead}</p>
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
                  <span className="faint"> ({day.weather.where})</span>
                </>
              ) : (
                <span className="faint">예보 불러오는 중</span>
              )}
            </dd>
          </div>
        </dl>
      </header>

      <div ref={mapBox} className="map-box">
        {GMAPS_KEY && (
          <div className="seg" role="tablist" aria-label="지도 종류">
            <button type="button" role="tab" aria-selected={mapMode === 'pins'} onClick={() => setMapMode('pins')}>
              번호 지도
            </button>
            <button type="button" role="tab" aria-selected={mapMode === 'google'} onClick={() => setMapMode('google')}>
              Google 경로
            </button>
          </div>
        )}
        {mapMode === 'google' && GMAPS_KEY ? (
          <iframe className="embed tall" title={`${day.label} 경로`} src={embedRouteUrl(hotel, route)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        ) : (
          <DayMap pins={pins} focus={focus} />
        )}
        <div className="acts">
          <a className="btn primary" href={routeUrl(hotel, route)} target="_blank" rel="noopener">
            하루 동선 Google 지도로 열기
          </a>
          {day.links?.map((l) => (
            <a key={l.href} className="btn" href={l.href} target="_blank" rel="noopener">
              {l.label}
            </a>
          ))}
        </div>
      </div>

      <ol className="tl">
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
                  {s.zh && <span className="zh">{s.zh}</span>}
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
                        <div key={a.tag}>
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
                            {a.zh && <span className="zh">{a.zh}</span>}
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
                {s.place && !s.alts && <PlaceActions place={s.place} tour={s.tour} />}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  )
}
