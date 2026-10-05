// 텍스트 안의 **굵게**, {R03} 같은 MRT 역 코드는 <Rich>가 렌더링합니다.

export interface Place {
  name: string
  zh: string
  /** Google 지도 검색어 */
  q: string
  lat?: number
  lng?: number
  /** 택시 카드에 보여줄 주소 */
  address?: string
}

export type Kind = 'meet' | 'sight' | 'food' | 'free' | 'move'
export type Tone = 'ok' | 'warn' | 'idea'

export interface Link { label: string; href: string }

export interface Alt {
  tag: string
  title: string
  zh?: string
  desc: string
  place?: Place
  /** 예약 페이지 등 외부 링크 */
  links?: Link[]
  tips?: string[]
}

export interface Stop {
  time: string
  /** 시각이 아닌 라벨(예: '도착')이면 true */
  soft?: boolean
  kind: Kind
  kindLabel?: string
  title?: string
  zh?: string
  place?: Place
  meta?: string[]
  desc?: string
  tips?: string[]
  alts?: Alt[]
  /** 투어 버스로 이동하는 곳은 길찾기 버튼을 숨깁니다 */
  tour?: boolean
  /** 하루 동선(Google 지도 경로, 지도 경로선)에서 제외 */
  offRoute?: boolean
}

export interface Day {
  id: string
  n: number
  date: string
  label: string
  short: string
  title: string
  lead: string
  chips: { tone: Tone; text: string }[]
  facts: { k: string; v: string }[]
  weather: { lat: number; lng: number; where: string }
  stops: Stop[]
  links?: { label: string; href: string }[]
}

export interface FoodItem { title: string; zh: string; when: string; desc: string; order?: string; place: Place; links?: Link[] }
export interface CheckItem { id: string; title: string; desc: string; due: string }

export interface AppItem {
  name: string
  /** 스토어에 표시되는 원래 이름이 다르면 적습니다 */
  store?: string
  group: string
  desc: string
  must?: boolean
  /** App Store 앱 id (숫자) */
  ios?: string
  /** 설치 없이 웹으로 쓰는 경우 */
  web?: string
}

export interface Hotel extends Place {
  /** 숙소 카드 보조 설명, {BL10} 같은 역 코드 사용 가능 */
  access: string
  nights: number
}

export interface Trip {
  /** URL에 쓰는 id (#/taipei-2026) */
  id: string
  title: string
  country: string
  city: string
  /** 화면 상단 작은 경로 표기, 예: ICN → TPE */
  route: string
  start: string
  end: string
  timeZone: string
  currency: { code: string; symbol: string; quick: number[] }
  summary: string
  hotel: Hotel
  days: Day[]
  food: FoodItem[]
  checklist: CheckItem[]
  apps: AppItem[]
  info: [string, string][]
  emergency: { label: string; number: string }[]
  footer: string
}

