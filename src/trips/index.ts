import { TRIPS } from 'virtual:trips'

/** 여행 데이터는 content/trips/에 있어요. 폴더를 추가하면 자동으로 목록에 나타나요. */
export { TRIPS }

export const findTrip = (id: string) => TRIPS.find((t) => t.id === id)
