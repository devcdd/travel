import { createContext, useContext } from 'react'
import type { Place, Trip } from './types'

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
