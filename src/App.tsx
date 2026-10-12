import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Place } from './types'
import { TRIPS, findTrip } from './trips'
import { ActionsContext } from './context'
import { Home } from './components/Home'
import { TaxiSheet } from './components/TaxiSheet'
import { TripPage, defaultTab, isTab } from './components/TripPage'

// 여행 페이지(<id>/index.html)는 <base href="../">가 있어서 어느 쪽으로 열어도 사이트 루트가 돼요. replaceState로 경로가 바뀌기 전에 한 번만 읽어요.
const ROOT = document.baseURI

type Route = { page: 'home' } | { page: 'trip'; tripId: string; tab: string }

/** #/ → 목록, #/taipei-2026/d2 → 여행·탭. 예전 주소(#d2)는 첫 여행으로 보냅니다. */
function parse(hash: string): Route {
  const h = hash.replace(/^#/, '')
  if (!h.startsWith('/')) {
    const legacy = TRIPS.find((t) => t.id === 'taipei-2026')
    if (legacy && h && isTab(legacy, h)) return { page: 'trip', tripId: legacy.id, tab: h }
    return { page: 'home' }
  }
  const [tripId, tab] = h.slice(1).split('/')
  const trip = tripId ? findTrip(tripId) : undefined
  if (!trip) return { page: 'home' }
  return { page: 'trip', tripId: trip.id, tab: tab && isTab(trip, tab) ? tab : defaultTab(trip) }
}

export default function App() {
  const [route, setRoute] = useState(() => parse(location.hash))
  const [taxi, setTaxi] = useState<Place | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    const onHash = () => {
      const next = parse(location.hash)
      setRoute((prev) => {
        if (prev.page !== next.page || (next.page === 'trip' && prev.page === 'trip' && prev.tripId !== next.tripId)) window.scrollTo({ top: 0 })
        return next
      })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 주소를 그대로 공유해도 여행별 미리보기 카드가 뜨도록 경로를 <여행 id>/로 맞춰요 (빌드 때 만든 페이지).
  const routeTrip = route.page === 'trip' ? route.tripId : ''
  useEffect(() => {
    if (route.page === 'home') document.title = '여행 일정'
    const want = new URL(routeTrip ? `${routeTrip}/` : './', ROOT).pathname
    if (location.pathname !== want) history.replaceState(history.state, '', want + location.hash)
  }, [route.page, routeTrip])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(''), 2200)
    return () => clearTimeout(t)
  }, [toastMsg])

  const closeTaxi = useCallback(() => setTaxi(null), [])
  const actions = useMemo(() => ({ openTaxi: setTaxi, toast: setToastMsg }), [])
  const trip = route.page === 'trip' ? findTrip(route.tripId) : undefined

  return (
    <ActionsContext.Provider value={actions}>
      {trip && route.page === 'trip' ? <TripPage trip={trip} tab={route.tab} /> : <Home />}
      {taxi && trip?.taxiAsk && <TaxiSheet place={taxi} ask={trip.taxiAsk} lang={trip.lang} onClose={closeTaxi} />}
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </ActionsContext.Provider>
  )
}
