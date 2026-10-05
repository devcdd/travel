import { useEffect, useState } from 'react'
import type { Trip } from '../types'
import { fmtDate, nowIn, tripStatus } from '../lib'
import { useWeather } from '../weather'
import { TripContext } from '../context'
import { DayView } from './DayView'
import { ChecklistView, FoodView, HotelCard, InfoView } from './Views'

const EXTRA = [
  { id: 'food', label: '먹을 것' },
  { id: 'todo', label: '예약·준비' },
  { id: 'info', label: '현지 정보' },
]

function useNow(timeZone: string) {
  const [now, setNow] = useState(() => ({ local: nowIn(timeZone), kst: nowIn('Asia/Seoul') }))
  useEffect(() => {
    const t = setInterval(() => setNow({ local: nowIn(timeZone), kst: nowIn('Asia/Seoul') }), 30_000)
    return () => clearInterval(t)
  }, [timeZone])
  return now
}

export function defaultTab(trip: Trip) {
  const today = nowIn(trip.timeZone).date
  return trip.days.find((d) => d.date === today)?.id ?? trip.days[0].id
}

export function isTab(trip: Trip, id: string) {
  return trip.days.some((d) => d.id === id) || EXTRA.some((e) => e.id === id)
}

export function TripPage({ trip, tab }: { trip: Trip; tab: string }) {
  const { local, kst } = useNow(trip.timeZone)
  const weather = useWeather(trip.days)
  const st = tripStatus(trip)

  useEffect(() => {
    document.title = trip.title
  }, [trip.title])

  const go = (id: string) => {
    location.hash = `/${trip.id}/${id}`
    // 탭 바가 상단에 붙어 있을 만큼 내려와 있으면 새 탭의 첫머리로 되돌립니다.
    const strip = document.querySelector<HTMLElement>('.strip')
    const main = document.querySelector('main')
    if (strip && main) {
      const top = main.getBoundingClientRect().top + window.scrollY - strip.offsetHeight
      if (window.scrollY > top) window.scrollTo({ top })
    }
  }
  const link = (id: string) => ({
    href: `#/${trip.id}/${id}`,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      go(id)
    },
  })

  const day = trip.days.find((d) => d.id === tab)

  return (
    <TripContext.Provider value={trip}>
      <header className="wrap top">
        <a className="back" href="#/">
          ← 모든 여행
        </a>
        <div className="eyebrow">
          {trip.route} · {fmtDate(trip.start)} – {fmtDate(trip.end, false)}
        </div>
        <h1>{trip.title}</h1>
        <p className="clock">
          <span className={`chip ${st.kind === 'now' ? 'today' : st.kind === 'upcoming' ? 'ok' : 'idea'}`}>{st.label}</span>
          <span>
            현지 <b className="mono">{local.hm}</b>
            <span className="faint"> · 한국 {kst.hm}</span>
          </span>
        </p>
        <nav className="glance" aria-label="날짜별 요약">
          {trip.days.map((d) => {
            const w = weather[d.date]
            return (
              <a key={d.id} {...link(d.id)} className={tab === d.id ? 'on' : ''}>
                <span className="d">
                  {d.label.slice(0, 5)}
                  <small>
                    {d.label.slice(6)} · D{d.n}
                  </small>
                </span>
                <span className="what">
                  {d.title}
                  <span>
                    {d.stops.filter((s) => s.title && s.kind !== 'move').length}곳 · {d.chips[0].text}
                  </span>
                </span>
                <span className="wx mono">{w ? `${w.max}° · ${w.pop}%` : ''}</span>
              </a>
            )
          })}
        </nav>
        <HotelCard />
      </header>

      <div className="strip">
        <nav className="wrap" aria-label="탭">
          {trip.days.map((d) => (
            <a key={d.id} {...link(d.id)} aria-current={tab === d.id ? 'page' : undefined} className={d.date === local.date ? 'is-today' : ''}>
              <span className="mono">{d.label.slice(0, 5)}</span>
              {d.short}
            </a>
          ))}
          {EXTRA.map((x) => (
            <a key={x.id} {...link(x.id)} aria-current={tab === x.id ? 'page' : undefined}>
              {x.label}
            </a>
          ))}
        </nav>
      </div>

      <main className="wrap">
        {day && <DayView key={day.id} day={day} today={day.date === local.date} nowMinutes={local.minutes} weather={weather[day.date]} />}
        {tab === 'food' && <FoodView />}
        {tab === 'todo' && <ChecklistView />}
        {tab === 'info' && <InfoView />}
      </main>

      <footer className="wrap">
        {trip.footer} 날씨는 Open-Meteo, 환율은 ExchangeRate-API, 지도는 OpenStreetMap 데이터를 씁니다.
      </footer>
    </TripContext.Provider>
  )
}
