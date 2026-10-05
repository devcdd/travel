import type { Trip } from '../types'
import { taipei2026 } from './taipei-2026'

/** 새 여행은 파일을 하나 만들고 여기에 추가합니다. 최신 여행이 위로 옵니다. */
export const TRIPS: Trip[] = [taipei2026].sort((a, b) => b.start.localeCompare(a.start))

export const findTrip = (id: string) => TRIPS.find((t) => t.id === id)
