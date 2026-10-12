import { useState } from 'react'
import type { Link, Place } from '../types'
import { embedPlaceUrl } from '../lib'
import { useActions, useMaps, useTrip } from '../context'
import { DayMap } from './DayMap'

/** 장소마다 붙는 지도 앱 바로가기 버튼 묶음. 지도 키가 있으면 미리보기도 펼칩니다 (국내는 좌표가 있는 곳만). */
export function PlaceActions({ place, tour, compact, links }: { place: Place; tour?: boolean; compact?: boolean; links?: Link[] }) {
  const { openTaxi } = useActions()
  const { hotel, taxiAsk } = useTrip()
  const { mapUrl, dirUrl, gmaps, kmaps } = useMaps()
  const kpin = kmaps && place.lat != null && place.lng != null
  const [preview, setPreview] = useState(false)
  const isHotel = place.q === hotel.q
  return (
    <>
      <div className={`acts${compact ? ' compact' : ''}`}>
        {links?.map((l) => (
          <a key={l.href} className="btn book" href={l.href} target="_blank" rel="noopener">
            {l.label}
          </a>
        ))}
        {!tour && (
          <a className="btn primary" href={dirUrl(place)} target="_blank" rel="noopener">
            길찾기
          </a>
        )}
        <a className="btn" href={mapUrl(place)} target="_blank" rel="noopener">
          지도
        </a>
        {!tour && !isHotel && !compact && (
          <a className="btn" href={dirUrl(place, hotel)} target="_blank" rel="noopener">
            숙소에서
          </a>
        )}
        {!tour && taxiAsk && (
          <button type="button" className="btn" onClick={() => openTaxi(place)}>
            택시 카드
          </button>
        )}
        {(gmaps || kpin) && (
          <button type="button" className="btn" aria-expanded={preview} onClick={() => setPreview((v) => !v)}>
            {preview ? '미리보기 닫기' : '미리보기'}
          </button>
        )}
      </div>
      {preview && kpin && (
        <div className="embed-map">
          <DayMap pins={[{ key: 'p', label: '•', lat: place.lat!, lng: place.lng!, place, kind: isHotel ? 'hotel' : 'sight', onRoute: false }]} focus={null} />
        </div>
      )}
      {preview && gmaps && (
        <iframe className="embed" title={`${place.name} 지도`} src={embedPlaceUrl(place)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      )}
    </>
  )
}
