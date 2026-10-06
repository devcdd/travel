import { useEffect, useState } from 'react'
import { load, save } from './lib'

export interface Rate { krw: number; updated?: string }

// 본문의 금액마다 컴포넌트가 생겨서, 환율 요청은 통화별로 한 번만 보내고 결과를 나눠 써요.
const pending = new Map<string, Promise<Rate | null>>()

function fetchRate(code: string): Promise<Rate | null> {
  let p = pending.get(code)
  if (!p) {
    p = fetch(`https://open.er-api.com/v6/latest/${code}`)
      .then((r) => r.json())
      .then((j) => {
        const krw = j?.rates?.KRW
        if (typeof krw !== 'number') return null
        save(`rate-${code}-KRW`, krw)
        return { krw, updated: new Date(j.time_last_update_unix * 1000).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) }
      })
      .catch(() => null)
    pending.set(code, p)
  }
  return p
}

/** 원화 환율. 오프라인이면 마지막으로 저장한 값을 쓰고, updated가 비어 있어요. */
export function useKrwRate(code: string): Rate | null {
  const [rate, setRate] = useState<Rate | null>(() => {
    const krw = load<number | null>(`rate-${code}-KRW`, null)
    return krw ? { krw } : null
  })
  useEffect(() => {
    let alive = true
    fetchRate(code).then((r) => alive && r && setRate(r))
    return () => {
      alive = false
    }
  }, [code])
  return rate
}

const roundKrw = (n: number) => (n < 10_000 ? Math.round(n / 10) * 10 : Math.round(n / 100) * 100).toLocaleString('ko-KR')

/** "500–1,500" 같은 금액 범위를 원화 범위 문자열로 바꿔요. */
export function toKrw(amount: string, krw: number) {
  return amount
    .split('–')
    .map((x) => roundKrw(parseFloat(x.replace(/[^\d.]/g, '')) * krw))
    .join('–')
}
