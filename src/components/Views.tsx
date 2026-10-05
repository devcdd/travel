import { useEffect, useState } from 'react'
import { copyText, dirUrl, load, mapUrl, save } from '../lib'
import { useActions, useTrip } from '../context'
import { Rich } from './Rich'
import { Local } from './Local'
import { PlaceActions } from './PlaceActions'

export function HotelCard() {
  const { openTaxi, toast } = useActions()
  const { hotel: HOTEL } = useTrip()
  return (
    <section className="hotel" aria-label="숙소">
      <div className="hotel-txt">
        <span className="eyebrow">숙소 · {HOTEL.nights}박</span>
        <h2>
          {HOTEL.name} <Local>{HOTEL.local}</Local>
        </h2>
        <p>
          <button
            type="button"
            className="addr"
            onClick={async () => toast((await copyText(HOTEL.address!)) ? '숙소 주소를 복사했어요' : '복사하지 못했어요. 주소를 길게 눌러 복사해 주세요')}
            title="주소 복사"
          >
            {HOTEL.address}
          </button>
          <span className="faint"> · </span>
          <Rich text={HOTEL.access} />
        </p>
      </div>
      <div className="acts">
        <a className="btn primary" href={dirUrl(HOTEL)} target="_blank" rel="noopener">
          숙소로 돌아가기
        </a>
        <button type="button" className="btn" onClick={() => openTaxi(HOTEL)}>
          택시 카드
        </button>
        <a className="btn" href={mapUrl(HOTEL)} target="_blank" rel="noopener">
          지도
        </a>
      </div>
    </section>
  )
}

export function FoodView() {
  const { food: FOOD } = useTrip()
  return (
    <section className="ref">
      <h2>먹을 것</h2>
      <p className="lead">일정에 넣은 맛집과 함께 가 볼 만한 후보를 모았어요. 오른쪽 날짜는 그 맛집을 넣어 둔 날이에요.</p>
      <ul className="food">
        {FOOD.map((f) => (
          <li key={f.title}>
            <h3>
              {f.title} <Local>{f.local}</Local>
            </h3>
            <span className="when">{f.when}</span>
            <p>{f.desc}</p>
            {f.order && (
              <p className="order">
                <b>추천</b>
                {f.order}
              </p>
            )}
            <div className="full">
              <PlaceActions place={f.place} compact links={f.links} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ChecklistView() {
  const { id, checklist: CHECKLIST } = useTrip()
  const CHECK_KEY = `${id}-checklist`
  // 'tpe-2026-checklist'는 여행 선택 기능 이전에 쓰던 저장 키입니다.
  const [done, setDone] = useState<Record<string, boolean>>(() => load(CHECK_KEY, id === 'taipei-2026' ? load('tpe-2026-checklist', {}) : {}))
  useEffect(() => save(CHECK_KEY, done), [CHECK_KEY, done])
  const n = CHECKLIST.filter((c) => done[c.id]).length
  return (
    <section className="ref">
      <h2>예약 · 준비</h2>
      <p className="lead">준비를 마친 항목은 체크해 두세요. 체크한 내용은 이 기기에 저장돼요.</p>
      <div className="progress">
        <div className="bar">
          <i style={{ width: `${(n / CHECKLIST.length) * 100}%` }} />
        </div>
        <span className="mono">
          {n} / {CHECKLIST.length}
        </span>
      </div>
      <ul className="check">
        {CHECKLIST.map((c) => (
          <li key={c.id}>
            <label htmlFor={c.id}>
              <input id={c.id} type="checkbox" checked={!!done[c.id]} onChange={(e) => setDone((d) => ({ ...d, [c.id]: e.target.checked }))} />
              <div>
                <strong>{c.title}</strong>
                <span className="d">{c.desc}</span>
              </div>
              <span className="due">{c.due}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Currency() {
  const { currency } = useTrip()
  const RATE_KEY = `rate-${currency.code}-KRW`
  const [rate, setRate] = useState<number | null>(() => load<number | null>(RATE_KEY, null))
  const [updated, setUpdated] = useState('')
  const [twd, setTwd] = useState('100')

  useEffect(() => {
    fetch(`https://open.er-api.com/v6/latest/${currency.code}`)
      .then((r) => r.json())
      .then((j) => {
        const krw = j?.rates?.KRW
        if (typeof krw === 'number') {
          setRate(krw)
          save(RATE_KEY, krw)
          setUpdated(new Date(j.time_last_update_unix * 1000).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }))
        }
      })
      .catch(() => {})
  }, [RATE_KEY, currency.code])

  const v = parseFloat(twd)
  const krw = rate && !Number.isNaN(v) ? Math.round(v * rate) : null

  return (
    <div className="fx">
      <h3>환율 계산</h3>
      <div className="fx-row">
        <label htmlFor="fx-twd" className="fx-in">
          <span>{currency.symbol}</span>
          <input id="fx-twd" inputMode="decimal" value={twd} onChange={(e) => setTwd(e.target.value.replace(/[^\d.]/g, ''))} />
        </label>
        <span className="fx-eq">=</span>
        <output className="fx-out" htmlFor="fx-twd">
          {krw != null ? `${krw.toLocaleString('ko-KR')}원` : '환율을 불러오지 못했어요'}
        </output>
      </div>
      <div className="fx-quick">
        {currency.quick.map((x) => (
          <button key={x} type="button" className="btn" onClick={() => setTwd(String(x))}>
            {x}
          </button>
        ))}
      </div>
      <p className="faint small">
        {rate ? `1 ${currency.symbol} ≈ ${rate.toFixed(1)}원${updated ? ` · ${updated} 기준` : ' · 마지막으로 저장된 환율'}` : '인터넷에 연결되면 환율을 불러올게요.'}
      </p>
    </div>
  )
}

export function InfoView() {
  const { info, emergency } = useTrip()
  return (
    <section className="ref">
      <h2>현지 정보</h2>
      <Currency />
      <div className="info">
        {info.map((x) => (
          <div key={x.title}>
            <h3>{x.title}</h3>
            <p>{x.body}</p>
          </div>
        ))}
        <div>
          <h3>긴급 전화</h3>
          {emergency.map((e) => (
            <p key={e.number}>
              {e.label} <b className="mono">{e.number}</b>
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

export function AppsView() {
  const { apps } = useTrip()
  const groups = [...new Set(apps.map((a) => a.group))]
  return (
    <section className="ref">
      <h2>설치할 앱</h2>
      <p className="lead">출발 전에 받아 두면 여행이 훨씬 편해지는 앱들이에요. ‘필수’ 표시가 있는 앱부터 받아 두세요. 모두 한국 App Store에서 받을 수 있어요.</p>
      {groups.map((g) => (
        <div key={g} className="apps-g">
          <h3>{g}</h3>
          <ul className="apps">
            {apps
              .filter((a) => a.group === g)
              .map((a) => (
                <li key={a.name}>
                  <div className="app-h">
                    <strong>{a.name}</strong>
                    {a.store && <span className="faint">{a.store}</span>}
                    {a.must && <span className="chip ok">필수</span>}
                  </div>
                  <p>{a.desc}</p>
                  <div className="acts compact">
                    {a.ios && (
                      <a className="btn" href={`https://apps.apple.com/kr/app/id${a.ios}`} target="_blank" rel="noopener">
                        App Store
                      </a>
                    )}
                    {a.ios && (
                      <a className="btn" href={`https://play.google.com/store/search?q=${encodeURIComponent(a.name)}&c=apps`} target="_blank" rel="noopener">
                        Google Play
                      </a>
                    )}
                    {a.web && (
                      <a className="btn" href={a.web} target="_blank" rel="noopener">
                        웹으로 열기
                      </a>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

export function NotesView() {
  const { notes } = useTrip()
  return (
    <section className="ref">
      <h2>메모</h2>
      {/* content/trips/<id>/notes.md를 빌드할 때 HTML로 바꾼 것 */}
      <div className="notes" dangerouslySetInnerHTML={{ __html: notes ?? '' }} />
    </section>
  )
}
