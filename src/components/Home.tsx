import { TRIPS } from '../trips'
import { fmtDate, nights, tripStatus } from '../lib'

export function Home() {
  return (
    <>
      <header className="wrap top">
        <div className="eyebrow">Trips · {TRIPS.length}</div>
        <h1>여행</h1>
        <p className="clock">일정을 고르면 날짜별 동선, 지도, 예약 체크리스트가 열립니다.</p>
      </header>
      <main className="wrap">
        <ul className="trips">
          {TRIPS.map((t) => {
            const st = tripStatus(t)
            const n = nights(t)
            return (
              <li key={t.id}>
                <a href={`#/${t.id}`} className={`trip ${st.kind}`}>
                  <span className="trip-date">
                    <span className="y">{t.start.slice(0, 4)}</span>
                    <span className="md">
                      {t.start.slice(5).replace('-', '.')}
                      <span className="faint"> – </span>
                      {t.end.slice(5).replace('-', '.')}
                    </span>
                  </span>
                  <span className="trip-main">
                    <strong>{t.title}</strong>
                    <span className="sub">
                      {t.country} · {t.city} · {n}박 {n + 1}일
                    </span>
                    <span className="sub">{t.summary}</span>
                    <span className="sub faint">
                      {fmtDate(t.start)} 출발 · {fmtDate(t.end)} 귀국
                    </span>
                  </span>
                  <span className={`chip ${st.kind === 'now' ? 'today' : st.kind === 'upcoming' ? 'ok' : 'idea'}`}>{st.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}
