import { createContext, useContext, useMemo } from 'react'
import type { Place, Trip } from './types'
import { GMAPS_KEY, KAKAO_KEY, mapLinks } from './lib'

export interface Actions {
  openTaxi: (p: Place) => void
  toast: (msg: string) => void
}

export const ActionsContext = createContext<Actions>({ openTaxi: () => {}, toast: () => {} })
export const useActions = () => useContext(ActionsContext)

export const TripContext = createContext<Trip | null>(null)
export function useTrip() {
  const t = useContext(TripContext)
  if (!t) throw new Error('TripContext 밖에서 useTrip을 호출했습니다')
  return t
}

/** 여행 나라에 맞는 지도 링크와, 페이지 안에 띄울 지도(gmaps, kmaps)를 쓸 수 있는지 */
export function useMaps() {
  const { maps } = useTrip()
  return useMemo(() => ({ ...mapLinks(maps), gmaps: maps === 'google' && !!GMAPS_KEY, kmaps: maps === 'kakao' && !!KAKAO_KEY }), [maps])
}
