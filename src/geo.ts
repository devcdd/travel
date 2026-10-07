import { useEffect, useState } from 'react'
import type { Place } from './types'

export interface Geo { pos: { lat: number; lng: number } | null; error: string | null }

/** on일 때만 위치를 받아요. 움직이면 계속 갱신돼요. */
export function useGeo(on: boolean): Geo {
  const [geo, setGeo] = useState<Geo>({ pos: null, error: null })
  useEffect(() => {
    if (!on) return
    if (!navigator.geolocation) {
      setGeo({ pos: null, error: '이 브라우저는 위치를 지원하지 않아요' })
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setGeo({ pos: { lat: p.coords.latitude, lng: p.coords.longitude }, error: null }),
      (e) => setGeo((g) => ({ ...g, error: e.code === e.PERMISSION_DENIED ? '위치 권한을 허용해 주세요' : '위치를 가져오지 못했어요' })),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [on])
  return geo
}

/** 직선거리(m). 좌표가 없는 장소는 Infinity라서 정렬하면 맨 뒤로 가요. */
export function distance(from: Geo['pos'], p: Place) {
  if (!from || p.lat == null || p.lng == null) return Infinity
  const R = 6_371_000
  const rad = Math.PI / 180
  const dLat = (p.lat - from.lat) * rad
  const dLng = (p.lng - from.lng) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(p.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export const fmtDistance = (m: number) => (m === Infinity ? '거리 모름' : m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`)

export const byDistance = <T,>(items: T[], from: Geo['pos'], place: (x: T) => Place) =>
  from ? [...items].sort((a, b) => distance(from, place(a)) - distance(from, place(b))) : items
