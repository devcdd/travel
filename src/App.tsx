import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAYS, type Place } from './data'
import { taipeiNow } from './lib'
import { useWeather } from './weather'
import { ActionsContext } from './context'
import { DayView } from './components/DayView'
import { TaxiSheet } from './components/TaxiSheet'
import { ChecklistView, FoodView, HotelCard, InfoView } from './components/Views'

const EXTRA = [
  { id: 'food', label: '먹을 것' },
  { id: 'todo', label: '예약·준비' },
  { id: 'info', label: '현지 정보' },
]
const TAB_IDS = [...DAYS.map((d) => d.id), ...EXTRA.map((e) => e.id)]

function initialTab() {
  const h = location.hash.slice(1)
  if (TAB_IDS.includes(h)) return h
  const today = DAYS.find((d) => d.date === taipeiNow().date)
  return today?.id ?? 'd1'
}

function useNow() {
  const [now, setNow] = useState(() => taipeiNow())
  useEffect(() => {
    const t = setInterval(() => setNow(taipeiNow()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export default function App() {
  const [tab, setTab] = useState(initialTab)
  const [taxi, setTaxi] = useState<Place | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const now = useNow()
  const weather = useWeather()

  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1)
      if (TAB_IDS.includes(h)) setTab(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(''), 2200)
    return () => clearTimeout(t)
  }, [toastMsg])

  const go = (id: string) => {
    setTab(id)
    history.replaceState(null, '', `#${id}`)
    // 탭 바가 상단에 붙어 있을 만큼 내려와 있으면 새 탭의 첫머리로 되돌립니다.
    const strip = document.querySelector<HTMLElement>('.strip')
    const main = document.querySelector('main')
    if (strip && main) {
      const top = main.getBoundingClientRect().top + window.scrollY - strip.offsetHeight
      if (window.scrollY > top) window.scrollTo({ top })
    }
  }

  const closeTaxi = useCallback(() => setTaxi(null), [])
  const actions = useMemo(() => ({ openTaxi: setTaxi, toast: setToastMsg }), [])
  const day = DAYS.find((d) => d.id === tab)
  const kst = (() => {
    const [h, m] = now.hm.split(':').map(Number)
    return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })()

  return (
    <ActionsContext.Provider value={actions}>
      <header className="wrap top">
        <div className="eyebrow">ICN → TPE · 2026.10.07 – 10.10</div>
        <h1>타이베이 3박 4일</h1>
        <p className="clock">
          현지 <b className="mono">{now.hm}</b>
          <span className="faint"> · 한국 {kst}</span>
        </p>
        <nav className="glance" aria-label="날짜별 요약">
          {DAYS.map((d) => {
            const w = weather[d.date]
            return (
              <a
                key={d.id}
                href={`#${d.id}`}
                className={tab === d.id ? 'on' : ''}
                onClick={(e) => {
                  e.preventDefault()
                  go(d.id)
                }}
              >
                <span className="d">
                  {d.label.slice(0, 5)}
                  <small>
                    {d.label.slice(6)} · D{d.n}
                  </small>
                </span>
                <span className="what">
                  {d.title}
                  <span>{d.stops.filter((s) => s.title && s.kind !== 'move').length}곳 · {d.chips[0].text}</span>
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
          {DAYS.map((d) => (
            <a
              key={d.id}
              href={`#${d.id}`}
              aria-current={tab === d.id ? 'page' : undefined}
              className={d.date === now.date ? 'is-today' : ''}
              onClick={(e) => {
                e.preventDefault()
                go(d.id)
              }}
            >
              <span className="mono">{d.label.slice(0, 5)}</span>
              {d.short}
            </a>
          ))}
          {EXTRA.map((x) => (
            <a
              key={x.id}
              href={`#${x.id}`}
              aria-current={tab === x.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                go(x.id)
              }}
            >
              {x.label}
            </a>
          ))}
        </nav>
      </div>

      <main className="wrap">
        {day && <DayView key={day.id} day={day} today={day.date === now.date} nowMinutes={now.minutes} weather={weather[day.date]} />}
        {tab === 'food' && <FoodView />}
        {tab === 'todo' && <ChecklistView />}
        {tab === 'info' && <InfoView />}
      </main>

      <footer className="wrap">
        정리 기준 2026.10.06. 가격, 영업시간, 전시 정보는 바뀔 수 있으니 방문 전 공식 채널에서 확인하세요. Day 2 시간표는 투어사 안내 기준입니다.
        날씨는 Open-Meteo, 환율은 ExchangeRate-API, 지도는 OpenStreetMap · CARTO 데이터를 씁니다.
      </footer>

      {taxi && <TaxiSheet place={taxi} onClose={closeTaxi} />}
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </ActionsContext.Provider>
  )
}
