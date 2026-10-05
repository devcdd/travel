import { useState } from 'react'
import type { Place } from '../data'
import { HOTEL } from '../data'
import { GMAPS_KEY, dirUrl, embedPlaceUrl, mapUrl } from '../lib'
import { useActions } from '../context'

/** 장소마다 붙는 Google 지도 바로가기 버튼 묶음. API 키가 있으면 지도 미리보기도 펼칩니다. */
export function PlaceActions({ place, tour, compact }: { place: Place; tour?: boolean; compact?: boolean }) {
  const { openTaxi } = useActions()
  const [preview, setPreview] = useState(false)
  const isHotel = place.q === HOTEL.q
  return (
    <>
      <div className={`acts${compact ? ' compact' : ''}`}>
        {!tour && (
          <a className="btn primary" href={dirUrl(place)} target="_blank" rel="noopener">
            길찾기
          </a>
        )}
        <a className="btn" href={mapUrl(place)} target="_blank" rel="noopener">
          지도
        </a>
        {!tour && !isHotel && !compact && (
          <a className="btn" href={dirUrl(place, HOTEL)} target="_blank" rel="noopener">
            숙소에서
          </a>
        )}
        {!tour && (
          <button type="button" className="btn" onClick={() => openTaxi(place)}>
            택시 카드
          </button>
        )}
        {GMAPS_KEY && (
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
