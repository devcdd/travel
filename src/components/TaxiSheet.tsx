import { useEffect } from 'react'
import type { Place } from '../data'
import { copyText, mapUrl } from '../lib'
import { useActions } from '../context'

/** 택시 기사에게 그대로 보여주는 전체 화면 카드 */
export function TaxiSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const { toast } = useActions()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const text = place.address ? `${place.zh}\n${place.address}` : place.zh

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="택시 카드" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <p className="sheet-hint">기사님께 이 화면을 보여주세요</p>
        <p className="sheet-ask">請帶我到</p>
        <p className="sheet-zh">{place.zh}</p>
        {place.address && <p className="sheet-addr">{place.address}</p>}
        <p className="sheet-ko">{place.name}</p>
        <div className="acts">
          <button
            type="button"
            className="btn"
            onClick={async () => toast((await copyText(text)) ? '주소를 복사했어요' : '복사하지 못했어요. 길게 눌러 선택하세요')}
          >
            주소 복사
          </button>
          <a className="btn" href={mapUrl(place)} target="_blank" rel="noopener">
            지도
          </a>
          <button type="button" className="btn primary" onClick={onClose} autoFocus>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
