import { useEffect, useState } from 'react'
import type { Day } from './types'

export interface DayWeather { code: number; max: number; min: number; pop: number }

export function weatherLabel(code: number) {
  if (code === 0) return '맑음'
  if (code <= 2) return '구름 조금'
  if (code === 3) return '흐림'
  if (code === 45 || code === 48) return '안개'
  if (code >= 51 && code <= 57) return '이슬비'
  if (code >= 61 && code <= 67) return '비'
  if (code >= 80 && code <= 82) return '소나기'
  if (code >= 95) return '뇌우'
  return '흐림'
}

/** Open-Meteo 일별 예보를 날짜별 장소 기준으로 가져옵니다. 실패하면 빈 객체. */
export function useWeather(days: Day[]) {
  const [data, setData] = useState<Record<string, DayWeather>>({})
  useEffect(() => {
    let alive = true
    Promise.allSettled(
      days.map(async (d) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${d.weather.lat}&longitude=${d.weather.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${d.date}&end_date=${d.date}`
        const r = await fetch(url)
        if (!r.ok) throw new Error(String(r.status))
        const j = await r.json()
        const w: DayWeather = {
          code: j.daily.weather_code[0],
          max: Math.round(j.daily.temperature_2m_max[0]),
          min: Math.round(j.daily.temperature_2m_min[0]),
          pop: j.daily.precipitation_probability_max[0] ?? 0,
        }
        return [d.date, w] as const
      }),
    )
      .then((rs) => {
        if (!alive) return
        setData(Object.fromEntries(rs.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))))
      })
    return () => {
      alive = false
    }
  }, [days])
  return data
}
