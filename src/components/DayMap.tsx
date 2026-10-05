import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { GMAPS_KEY } from '../lib'
import { onAuthFailure } from '../gmaps'
import { GoogleMap } from './GoogleMap'
import L from 'leaflet'
import type { Kind, Place } from '../types'
import { dirUrl, mapUrl } from '../lib'

export interface Pin {
  key: string
  label: string
  lat: number
  lng: number
  place: Place
  kind: Kind | 'hotel'
  /** 경로선에 포함할지 (선택지 핀은 제외) */
  onRoute: boolean
}

// 다크 모드는 CSS(--tile-filter)로 타일 색을 뒤집어 맞춥니다.
const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export type Focus = { key: string; n: number } | null

export const popupHtml = (p: Pin) =>
  `<div class="pop"><strong>${esc(p.place.name)}</strong><span>${esc(p.place.local)}</span>` +
  `<div class="pop-a"><a href="${mapUrl(p.place)}" target="_blank" rel="noopener">지도</a>` +
  `<a href="${dirUrl(p.place)}" target="_blank" rel="noopener">길찾기</a></div></div>`

/** API 키가 있으면 Google 지도, 없거나 인증에 실패하면 OpenStreetMap(Leaflet)으로 그립니다. */
export function DayMap({ pins, focus }: { pins: Pin[]; focus: Focus }) {
  const [failed, setFailed] = useState(false)
  const fail = useCallback(() => setFailed(true), [])
  useEffect(() => onAuthFailure(fail), [fail])
  if (!GMAPS_KEY || failed) return <LeafletMap pins={pins} focus={focus} />
  return (
    <MapBoundary fallback={<LeafletMap pins={pins} focus={focus} />}>
      <GoogleMap pins={pins} focus={focus} onFail={fail} />
    </MapBoundary>
  )
}

/** Google 지도에서 렌더링 오류가 나도 페이지 전체가 아니라 지도만 대체합니다. */
class MapBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children
  }
}

function LeafletMap({ pins, focus }: { pins: Pin[]; focus: Focus }) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markers = useRef<Record<string, L.Marker>>({})
  const me = useRef<L.CircleMarker | null>(null)
  const touch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const [locked, setLocked] = useState(touch)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!el.current) return
    const map = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, dragging: !touch, attributionControl: true })
    mapRef.current = map
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    map.attributionControl.setPrefix(false)
    L.tileLayer(TILE, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)

    const route = pins.filter((p) => p.onRoute)
    if (route.length > 1) {
      L.polyline(route.map((p) => [p.lat, p.lng] as L.LatLngTuple), { className: 'route-line', weight: 2, dashArray: '4 6' }).addTo(map)
    }

    markers.current = {}
    for (const p of pins) {
      const icon = L.divIcon({
        className: '',
        html: `<span class="pin pin-${p.kind}">${esc(p.label)}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      })
      const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: p.kind === 'hotel' ? -100 : 0 }).addTo(map)
      m.bindPopup(popupHtml(p), { closeButton: false })
      markers.current[p.key] = m
    }

    if (pins.length) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [28, 28], maxZoom: 15 })
    else map.setView([25.04, 121.53], 12)

    const unlock = () => {
      map.dragging.enable()
      setLocked(false)
    }
    if (touch) map.once('click', unlock)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [pins, touch])

  useEffect(() => {
    if (!focus || !mapRef.current) return
    const m = markers.current[focus.key]
    if (!m) return
    mapRef.current.flyTo(m.getLatLng(), Math.max(mapRef.current.getZoom(), 14), { duration: 0.6 })
    m.openPopup()
  }, [focus])

  const locate = () => {
    const map = mapRef.current
    if (!map || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const ll: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude]
        if (me.current) me.current.setLatLng(ll)
        else me.current = L.circleMarker(ll, { radius: 7, className: 'me-dot', weight: 3 }).addTo(map)
        map.flyTo(ll, 15, { duration: 0.6 })
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="map-wrap">
      <div ref={el} className="map" role="region" aria-label="이날 동선 지도" />
      <button type="button" className="map-btn" onClick={locate} disabled={locating}>
        {locating ? '찾는 중…' : '내 위치'}
      </button>
      {locked && <div className="map-hint">탭하면 지도를 움직일 수 있어요</div>}
    </div>
  )
}
