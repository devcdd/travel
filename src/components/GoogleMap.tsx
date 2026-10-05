import { useEffect, useRef, useState } from 'react'
import { GMAPS_MAP_ID, loadGoogleMaps } from '../gmaps'
import { esc, popupHtml, type Focus, type Pin } from './DayMap'

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#14171b'

export function GoogleMap({ pins, focus, onFail }: { pins: Pin[]; focus: Focus; onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const info = useRef<google.maps.InfoWindow | null>(null)
  const markers = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({})
  const me = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    let alive = true
    loadGoogleMaps()
      .then(() => {
        if (!alive || !el.current) return
        const map = new google.maps.Map(el.current, {
          mapId: GMAPS_MAP_ID,
          colorScheme: google.maps.ColorScheme.FOLLOW_SYSTEM,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          clickableIcons: false,
          // 휴대폰에서는 두 손가락으로 지도를 움직이고 한 손가락은 페이지 스크롤에 씁니다.
          gestureHandling: 'cooperative',
          center: { lat: 25.04, lng: 121.53 },
          zoom: 12,
        })
        mapRef.current = map
        info.current = new google.maps.InfoWindow({ headerDisabled: true })
        map.addListener('click', () => info.current?.close())

        const route = pins.filter((p) => p.onRoute)
        if (route.length > 1) {
          new google.maps.Polyline({
            map,
            path: route.map((p) => ({ lat: p.lat, lng: p.lng })),
            strokeOpacity: 0,
            icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeColor: cssVar('--fg'), scale: 2 }, offset: '0', repeat: '10px' }],
          })
        }

        markers.current = {}
        const bounds = new google.maps.LatLngBounds()
        for (const p of pins) {
          const content = document.createElement('span')
          content.className = `pin pin-${p.kind}`
          content.innerHTML = esc(p.label)
          const m = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: p.lat, lng: p.lng },
            content,
            title: p.place.name,
            zIndex: p.kind === 'hotel' ? 0 : 10,
            gmpClickable: true,
          })
          m.addEventListener('gmp-click', () => {
            info.current?.setContent(popupHtml(p))
            info.current?.open({ map, anchor: m })
          })
          markers.current[p.key] = m
          bounds.extend({ lat: p.lat, lng: p.lng })
        }
        if (pins.length > 1) {
          map.fitBounds(bounds, 36)
          google.maps.event.addListenerOnce(map, 'idle', () => {
            if ((map.getZoom() ?? 0) > 15) map.setZoom(15)
          })
        } else if (pins.length === 1) {
          map.setCenter(bounds.getCenter())
          map.setZoom(15)
        }
        setReady(true)
      })
      .catch(() => alive && onFail())
    return () => {
      alive = false
      // 인증 실패 직후에는 Google 내부 상태가 깨져 있어 정리 중 예외가 날 수 있습니다.
      Object.values(markers.current).forEach((m) => {
        try {
          m.map = null
        } catch {
          /* 무시 */
        }
      })
      markers.current = {}
      mapRef.current = null
    }
  }, [pins, onFail])

  useEffect(() => {
    const map = mapRef.current
    if (!focus || !map || !ready) return
    const m = markers.current[focus.key]
    const p = pins.find((x) => x.key === focus.key)
    if (!m || !p) return
    map.panTo({ lat: p.lat, lng: p.lng })
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14)
    info.current?.setContent(popupHtml(p))
    info.current?.open({ map, anchor: m })
  }, [focus, ready, pins])

  const locate = () => {
    const map = mapRef.current
    if (!map || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        if (me.current) me.current.position = ll
        else {
          const dot = document.createElement('span')
          dot.className = 'me-pin'
          me.current = new google.maps.marker.AdvancedMarkerElement({ map, position: ll, content: dot, title: '내 위치', zIndex: 20 })
        }
        map.panTo(ll)
        map.setZoom(15)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="map-wrap">
      <div ref={el} className="map" role="region" aria-label="이날 동선 지도" />
      <button type="button" className="map-btn gmap" onClick={locate} disabled={locating || !ready}>
        {locating ? '찾는 중…' : '내 위치'}
      </button>
    </div>
  )
}
