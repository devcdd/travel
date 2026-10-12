import { useState } from 'react'
import type { Link, Place } from '../types'
import { embedPlaceUrl } from '../lib'
import { useActions, useMaps, useTrip } from '../context'

/** 장소마다 붙는 지도 앱 바로가기 버튼 묶음. Google 지도 키가 있는 해외 여행이면 지도 미리보기도 펼칩니다. */
export function PlaceActions({ place, tour, compact, links }: { place: Place; tour?: boolean; compact?: boolean; links?: Link[] }) {
  const { openTaxi } = useActions()
  const { hotel, taxiAsk } = useTrip()
  const { mapUrl, dirUrl, gmaps } = useMaps()
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
        {gmaps && (
          <button type="button" className="btn" aria-expanded={preview} onClick={() => setPreview((v) => !v)}>
            {preview ? '미리보기 닫기' : '미리보기'}
          </button>
        )}
      </div>
      {preview && (
        <iframe className="embed" title={`${place.name} 지도`} src={embedPlaceUrl(place)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      )}
    </>
  )
}
