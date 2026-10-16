import { useEffect, useRef, useState } from 'react'
import { KAKAO_KEY } from '../lib'
import { pinHtml, popupHtml, type Focus, type Links, type Pin } from './DayMap'

// 카카오 지도 SDK는 공식 타입 패키지가 없어서 쓰는 부분만 any로 다룹니다.
type K = any

let loading: Promise<K> | null = null

/** 키가 없거나 도메인이 등록되지 않았으면 SDK 스크립트가 실패해서 reject돼요. */
function loadKakao(): Promise<K> {
  if (!KAKAO_KEY) return Promise.reject(new Error('no key'))
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_KEY)}&autoload=false`
    s.async = true
    s.onload = () => {
      const kakao = (window as unknown as { kakao?: K }).kakao
      if (!kakao?.maps) {
        loading = null
        reject(new Error('Kakao Maps SDK unavailable'))
        return
      }
      kakao.maps.load(() => resolve(kakao))
    }
    s.onerror = () => {
      loading = null
      reject(new Error('Kakao Maps script failed'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export function KakaoMap({ pins, focus, onFail, links }: { pins: Pin[]; focus: Focus; onFail: () => void; links: Links }) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<K>(null)
  const kRef = useRef<K>(null)
  const pop = useRef<K>(null)
  const me = useRef<K>(null)
  const touch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(touch)
  const [locating, setLocating] = useState(false)

  const openPop = (p: Pin) => {
    const kakao = kRef.current
    const map = mapRef.current
    if (!kakao || !map) return
    pop.current?.setMap(null)
    const content = document.createElement('div')
    content.className = 'kpop'
    content.innerHTML = popupHtml(p, links)
    pop.current = new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(p.lat, p.lng), content, yAnchor: 1, zIndex: 30, clickable: true })
  }

  useEffect(() => {
    let alive = true
    loadKakao()
      .then((kakao) => {
        if (!alive || !el.current) return
        kRef.current = kakao
        // 핀이 바뀌면 지도를 새로 만들어서, 이전 지도가 남긴 DOM을 먼저 비워요.
        el.current.innerHTML = ''
        const map = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 8, draggable: !touch, scrollwheel: false })
        mapRef.current = map
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.BOTTOMRIGHT)
        kakao.maps.event.addListener(map, 'click', () => {
          pop.current?.setMap(null)
          if (touch) {
            map.setDraggable(true)
            setLocked(false)
          }
        })

        const route = pins.filter((p) => p.onRoute)
        if (route.length > 1) {
          new kakao.maps.Polyline({
            map,
            path: route.map((p) => new kakao.maps.LatLng(p.lat, p.lng)),
            strokeWeight: 2,
            // 카카오 지도는 다크 모드에서도 밝은 지도라서 테마 색 대신 어두운 색으로 고정해요.
            strokeColor: '#14171b',
            strokeOpacity: 0.6,
            strokeStyle: 'shortdash',
          })
        }

        const bounds = new kakao.maps.LatLngBounds()
        for (const p of pins) {
          const content = document.createElement('span')
          content.className = 'mk'
          content.innerHTML = pinHtml(p)
          content.title = p.place.name
          content.style.cursor = 'pointer'
          content.addEventListener('click', () => openPop(p))
          const ll = new kakao.maps.LatLng(p.lat, p.lng)
          new kakao.maps.CustomOverlay({ map, position: ll, content, yAnchor: 1, zIndex: p.kind === 'hotel' ? 0 : 10, clickable: true })
          bounds.extend(ll)
        }
        if (pins.length > 1) {
          map.setBounds(bounds, 36, 36, 36, 36)
          if (map.getLevel() < 4) map.setLevel(4)
        } else if (pins.length === 1) {
          map.setCenter(new kakao.maps.LatLng(pins[0].lat, pins[0].lng))
          map.setLevel(4)
        }
        setReady(true)
      })
      .catch(() => alive && onFail())
    return () => {
      alive = false
      pop.current = null
      me.current = null
      mapRef.current = null
      setReady(false)
    }
  }, [pins, onFail, links, touch])

  useEffect(() => {
    const kakao = kRef.current
    const map = mapRef.current
    if (!focus || !map || !ready) return
    const p = pins.find((x) => x.key === focus.key)
    if (!p) return
    map.panTo(new kakao.maps.LatLng(p.lat, p.lng))
    if (map.getLevel() > 5) map.setLevel(5)
    openPop(p)
  }, [focus, ready, pins, links])

  const locate = () => {
    const kakao = kRef.current
    const map = mapRef.current
    if (!map || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const ll = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
        if (me.current) me.current.setPosition(ll)
        else {
          const dot = document.createElement('span')
          dot.className = 'me-pin'
          me.current = new kakao.maps.CustomOverlay({ map, position: ll, content: dot, zIndex: 20 })
        }
        map.setLevel(4)
        map.panTo(ll)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="map-wrap">
      <div ref={el} className="map" role="region" aria-label="지도" />
      <button type="button" className="map-btn kmap" onClick={locate} disabled={locating || !ready}>
        {locating ? '찾는 중…' : '내 위치'}
      </button>
      {ready && locked && <div className="map-hint">탭하면 지도를 움직일 수 있어요</div>}
    </div>
  )
}
