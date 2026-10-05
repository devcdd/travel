import { useEffect, useState } from 'react'
import { CHECKLIST, FOOD, HOTEL } from '../data'
import { copyText, dirUrl, load, mapUrl, save } from '../lib'
import { useActions } from '../context'
import { PlaceActions } from './PlaceActions'

export function HotelCard() {
  const { openTaxi, toast } = useActions()
  return (
    <section className="hotel" aria-label="숙소">
      <div className="hotel-txt">
        <span className="eyebrow">숙소 · 3박</span>
        <h2>
          카이사르 메트로 타이베이 <span className="zh">台北凱達大飯店</span>
        </h2>
        <p>
          <button
            type="button"
            className="addr"
            onClick={async () => toast((await copyText(HOTEL.address!)) ? '숙소 주소를 복사했어요' : '복사하지 못했어요')}
            title="주소 복사"
          >
            {HOTEL.address}
          </button>
          <span className="faint"> · </span>
          <span className="mrt bl">BL10</span> 룽산쓰역 도보 3분 · 완화역 연결
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
  return (
    <section className="ref">
      <h2>먹을 것</h2>
      <p className="lead">일정에 넣은 곳과 대화에서 나온 후보입니다. 오른쪽 날짜는 배치한 날입니다.</p>
      <ul className="food">
        {FOOD.map((f) => (
          <li key={f.title}>
            <h3>
              {f.title} <span className="zh">{f.zh}</span>
            </h3>
            <span className="when">{f.when}</span>
            <p>{f.desc}</p>
            {f.order && (
              <p className="order">
                <b>주문</b>
                {f.order}
              </p>
            )}
            <div className="full">
              <PlaceActions place={f.place} compact />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const CHECK_KEY = 'tpe-2026-checklist'

export function ChecklistView() {
  const [done, setDone] = useState<Record<string, boolean>>(() => load(CHECK_KEY, {}))
  useEffect(() => save(CHECK_KEY, done), [done])
  const n = CHECKLIST.filter((c) => done[c.id]).length
  return (
    <section className="ref">
      <h2>예약 · 준비</h2>
      <p className="lead">체크한 항목은 이 기기에 저장됩니다.</p>
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

const RATE_KEY = 'tpe-2026-rate'

function Currency() {
  const [rate, setRate] = useState<number | null>(() => load<number | null>(RATE_KEY, null))
  const [updated, setUpdated] = useState('')
  const [twd, setTwd] = useState('100')

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/TWD')
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
  }, [])

  const v = parseFloat(twd)
  const krw = rate && !Number.isNaN(v) ? Math.round(v * rate) : null

  return (
    <div className="fx">
      <h3>환율 계산</h3>
      <div className="fx-row">
        <label htmlFor="fx-twd" className="fx-in">
          <span>NT$</span>
          <input id="fx-twd" inputMode="decimal" value={twd} onChange={(e) => setTwd(e.target.value.replace(/[^\d.]/g, ''))} />
        </label>
        <span className="fx-eq">=</span>
        <output className="fx-out" htmlFor="fx-twd">
          {krw != null ? `${krw.toLocaleString('ko-KR')}원` : '환율 정보 없음'}
        </output>
      </div>
      <div className="fx-quick">
        {[50, 100, 200, 350, 600, 1000].map((x) => (
          <button key={x} type="button" className="btn" onClick={() => setTwd(String(x))}>
            {x}
          </button>
        ))}
      </div>
      <p className="faint small">
        {rate ? `1 NT$ ≈ ${rate.toFixed(1)}원${updated ? ` · ${updated} 기준` : ' · 저장된 값'}` : '네트워크 연결 후 환율을 불러옵니다.'}
      </p>
    </div>
  )
}

const INFO: [string, string][] = [
  ['날씨', '10월 초 낮 27–30°C, 밤 22–24°C. 습하고 소나기가 잦습니다. 태풍 시즌 끝자락이라 출발 2–3일 전 예보를 확인하세요.'],
  ['교통', 'MRT가 대부분을 커버합니다. Google 지도 대중교통 경로가 정확하고, 우버와 택시도 저렴합니다.'],
  ['MRT 규칙', '개찰구 안에서는 물, 껌, 음식 모두 금지이고 벌금이 큽니다. 에스컬레이터는 오른쪽에 서세요.'],
  ['전기', '110V, 11자형 A타입 콘센트입니다. 휴대폰 충전기는 대부분 프리볼트라 어댑터만 있으면 됩니다.'],
  ['결제', '백화점과 체인점은 카드를 받지만 야시장, 노포, 일부 택시는 현금만 받습니다. 팁 문화는 없습니다.'],
  ['물 · 편의점', '수돗물은 끓여 마십니다. 세븐일레븐과 패밀리마트가 블록마다 있습니다.'],
  ['10.10 쌍십절', '중화민국 국경일입니다. 총통부 일대 교통이 통제되고 관광지가 붐빕니다. 은행과 관공서는 쉽니다.'],
  ['시차', '한국보다 1시간 늦습니다. 이 페이지의 시간은 모두 현지 시각입니다.'],
]

export function InfoView() {
  return (
    <section className="ref">
      <h2>현지 정보</h2>
      <Currency />
      <div className="info">
        {INFO.map(([h, p]) => (
          <div key={h}>
            <h3>{h}</h3>
            <p>{p}</p>
          </div>
        ))}
        <div>
          <h3>긴급 전화</h3>
          <p>
            경찰 <b className="mono">110</b> · 구급·소방 <b className="mono">119</b>
          </p>
          <p>
            관광 안내(24시간) <b className="mono">0800-011-765</b>
          </p>
        </div>
      </div>
    </section>
  )
}
