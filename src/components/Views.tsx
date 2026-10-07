import { useEffect, useState } from 'react'
import { copyText, dirUrl, fmtDate, load, mapUrl, save } from '../lib'
import { useActions, useTrip } from '../context'
import { Rich } from './Rich'
import { useKrwRate } from '../rate'
import { byDistance, distance, fmtDistance, useGeo, type Geo } from '../geo'
import { Local } from './Local'
import { PlaceActions } from './PlaceActions'

/** 처음 나온 순서대로 묶음을 만들어요. 묶음 이름이 없으면 '기타'로 모아요. */
function groupBy<T>(items: T[], key: (x: T) => string | undefined): [string, T[]][] {
  const m = new Map<string, T[]>()
  for (const x of items) {
    const k = key(x) ?? '기타'
    m.set(k, [...(m.get(k) ?? []), x])
  }
  return [...m]
}

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

export function FlightsView() {
  const { flights, stay, facilities, hotel } = useTrip()
  return (
    <section className="ref">
      <h2>항공 · 숙소</h2>
      <p className="lead">예약해 둔 항공편과 숙소예요. 시각은 모두 그 공항의 현지 시각이에요.</p>
      <ul className="flights">
        {flights.map((f) => (
          <li key={f.flight}>
            <div className="fl-h">
              <span className="eyebrow">
                {f.label} · {fmtDate(f.date, false)}
              </span>
              <span>
                <strong>{f.airline}</strong> <span className="mono">{f.flight}</span>
              </span>
            </div>
            <div className="fl-route">
              {[f.from, f.to].map((e, i) => (
                <div key={i} className={i ? 'to' : 'from'}>
                  <time className="mono">{e.time}</time>
                  <span>{e.airport}</span>
                  {e.terminal && <span className="faint">{e.terminal}</span>}
                </div>
              ))}
              {f.duration && <span className="fl-dur faint">{f.duration}</span>}
            </div>
            {f.tips && (
              <ul className="pts">
                {f.tips.map((t) => (
                  <li key={t}>
                    <Rich text={t} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {stay.length > 0 && (
        <div className="info-g">
          <h3>
            {hotel.name}
            <span className="mono">{hotel.nights}박</span>
          </h3>
          <dl className="stay">
            {stay.map((x) => (
              <div key={x.k}>
                <dt>{x.k}</dt>
                <dd>
                  <Rich text={x.v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {facilities.length > 0 && (
        <div className="info-g">
          <h3>숙소 시설</h3>
          <dl className="stay">
            {facilities.map((x) => (
              <div key={x.k}>
                <dt>{x.k}</dt>
                <dd>
                  <Rich text={x.v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}

export function TicketsView() {
  const { tickets } = useTrip()
  return (
    <section className="ref">
      <h2>예매</h2>
      <p className="lead">미리 사 두거나 끝내 둔 것들이에요. 날짜 순서대로 모았어요.</p>
      <ul className="tickets">
        {[...tickets]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((t) => (
            <li key={t.title}>
              <div className="tk-h">
                <span className="eyebrow">{fmtDate(t.date, false)}</span>
                <span className={`chip ${t.done ? 'ok' : 'idea'}`}>{t.status}</span>
              </div>
              <h3>{t.title}</h3>
              {t.facts.length > 0 && (
                <dl className="stay">
                  {t.facts.map((x) => (
                    <div key={x.k}>
                      <dt>{x.k}</dt>
                      <dd>
                        <Rich text={x.v} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {t.points && (
                <ul className="pts">
                  {t.points.map((p) => (
                    <li key={p}>
                      <Rich text={p} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
      </ul>
    </section>
  )
}

/** 가까운 순 정렬 켜기. 켠 상태는 이 기기에 기억해요. */
function useNear() {
  const [on, setOn] = useState(() => load('near-sort', false))
  useEffect(() => save('near-sort', on), [on])
  const geo = useGeo(on)
  return { on, setOn, geo, pos: on ? geo.pos : null }
}

function NearBar({ on, setOn, geo }: { on: boolean; setOn: (v: boolean) => void; geo: Geo }) {
  return (
    <div className="near">
      <button type="button" className={`btn${on ? ' primary' : ''}`} aria-pressed={on} onClick={() => setOn(!on)}>
        가까운 순
      </button>
      <span className="faint">
        {!on ? '현재 위치에서 가까운 곳부터 보여 줘요' : (geo.error ?? (geo.pos ? '직선거리예요. 움직이면 다시 계산해요' : '위치를 찾는 중이에요'))}
      </span>
    </div>
  )
}

export function FoodView() {
  const { food, dishes } = useTrip()
  const near = useNear()
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <section className="ref">
      <h2>먹을 것</h2>
      <p className="lead">일정에 넣어 둔 맛집을 먼저 두고, 그 아래에 대만에서 먹어 볼 음식을 종류별로 모았어요. 오른쪽에는 넣어 둔 날짜나 동네를 적었고, 줄이 긴 곳은 웨이팅 칸에 대기 거는 방법을 적어 두었어요.</p>
      <nav className="dish-nav" aria-label="음식 종류">
        {food.length > 0 && (
          <button type="button" className="btn" onClick={() => jump('dish-plan')}>
            일정 맛집
          </button>
        )}
        {dishes.map((d, i) => (
          <button key={d.name} type="button" className="btn" onClick={() => jump(`dish-${i}`)}>
            {d.name}
          </button>
        ))}
      </nav>
      <NearBar {...near} />
      {food.length > 0 && (
        <div id="dish-plan" className="dish">
          <h3>
            <span>일정에 넣은 맛집</span>
            <span className="mono">{food.length}곳</span>
          </h3>
          <ul className="food">
            {byDistance(food, near.pos, (f) => f.place).map((f) => (
              <li key={f.title}>
                <h4>
                  {f.title} <Local>{f.local}</Local>
                </h4>
                <span className="when">
                  {near.pos && <b className="dist">{fmtDistance(distance(near.pos, f.place))}</b>}
                  {f.when}
                </span>
                <p>
                  <Rich text={f.desc} />
                </p>
                {f.order && (
                  <p className="order">
                    <b>추천</b>
                    <span>
                      <Rich text={f.order} />
                    </span>
                  </p>
                )}
                {f.wait && (
                  <div className="wait">
                    <div className="wait-h">
                      <h4>웨이팅</h4>
                      <span className={`chip ${f.wait.remote ? 'ok' : 'idea'}`}>{f.wait.remote ? '원격 가능' : '현장 접수만'}</span>
                      {f.wait.href && (
                        <a href={f.wait.href} target="_blank" rel="noopener">
                          {f.wait.remote ? '대기 걸기' : '순서 보기'}
                        </a>
                      )}
                    </div>
                    <ol>
                      {f.wait.steps.map((t) => (
                        <li key={t}>
                          <Rich text={t} />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="full">
                  <PlaceActions place={f.place} compact links={f.links} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {dishes.map((d, i) => (
        <div key={d.name} id={`dish-${i}`} className="dish">
          <h3>
            <span>
              {d.name} <Local>{d.local}</Local>
            </span>
            <span className="mono">{d.spots.length}곳</span>
          </h3>
          <p className="dish-d">
            <Rich text={d.desc} />
          </p>
          <ul className="food">
            {byDistance(d.spots, near.pos, (s) => s.place).map((s) => (
              <li key={s.place.q}>
                <h4>
                  {s.place.name} <Local>{s.place.local}</Local>
                </h4>
                <span className="when">
                  {near.pos && <b className="dist">{fmtDistance(distance(near.pos, s.place))}</b>}
                  {s.area}
                </span>
                <p>
                  <Rich text={s.note} />
                </p>
                <div className="full">
                  <PlaceActions place={s.place} compact links={s.links} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
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
      {groupBy(CHECKLIST, (c) => c.group).map(([g, items]) => (
        <div key={g} className="check-g">
          <h3>
            {g}
            <span className="mono">
              {items.filter((c) => done[c.id]).length} / {items.length}
            </span>
          </h3>
          <ul className="check">
            {items.map((c) => (
              <li key={c.id}>
                <label htmlFor={c.id}>
                  <input id={c.id} type="checkbox" checked={!!done[c.id]} onChange={(e) => setDone((d) => ({ ...d, [c.id]: e.target.checked }))} />
                  <div>
                    <strong>{c.title}</strong>
                    <span className="d">
                      <Rich text={c.desc} />
                    </span>
                  </div>
                  <span className="due">{c.due}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function Currency() {
  const { currency } = useTrip()
  const r = useKrwRate(currency.code)
  const rate = r?.krw ?? null
  const updated = r?.updated ?? ''
  const [twd, setTwd] = useState('100')

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
        {rate ? `1 ${currency.symbol} ≈ ${rate.toFixed(1)}원${updated ? ` · ${updated} 기준` : ' · 마지막으로 저장된 환율'}` : '인터넷에 연결되면 환율을 불러올게요.'} ·{' '}
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">
          ExchangeRate-API
        </a>
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
      {groupBy(info, (x) => x.group).map(([g, items]) => (
        <div key={g} className="info-g">
          <h3>{g}</h3>
          <ul className="info">
            {items.map((x) => (
              <li key={x.title}>
                <h4>{x.title}</h4>
                {x.body && (
                  <p>
                    <Rich text={x.body} />
                  </p>
                )}
                {x.points && (
                  <ul className="pts">
                    {x.points.map((t) => (
                      <li key={t}>
                        <Rich text={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="info-g">
        <h3>긴급 전화</h3>
        <ul className="sos">
          {emergency.map((e) => (
            <li key={e.number}>
              <span>{e.label}</span>
              <a className="mono" href={`tel:${e.number.replace(/[^\d]/g, '')}`}>
                {e.number}
              </a>
            </li>
          ))}
        </ul>
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

export function PhrasesView() {
  const { phrases } = useTrip()
  return (
    <section className="ref">
      <h2>회화</h2>
      <p className="lead">자주 쓰는 표현을 상황별로 모았어요. 한글 발음은 성조를 뺀 대략적인 소리라서, 잘 안 통하면 현지어 글자를 그대로 보여 주세요.</p>
      {groupBy(phrases, (p) => p.group).map(([g, items]) => (
        <div key={g} className="apps-g">
          <h3>{g}</h3>
          <ul className="phrases">
            {items.map((p) => (
              <li key={p.local}>
                <span className="ko">{p.ko}</span>
                <span className="zh">
                  <Local>{p.local}</Local>
                </span>
                <span className="say">{p.say}</span>
                {p.note && <span className="note">{p.note}</span>}
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
