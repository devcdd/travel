import { createContext, useContext } from 'react'
import type { Place } from './data'

export interface Actions {
  openTaxi: (p: Place) => void
  toast: (msg: string) => void
}

export const ActionsContext = createContext<Actions>({ openTaxi: () => {}, toast: () => {} })
export const useActions = () => useContext(ActionsContext)
