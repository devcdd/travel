// 화면이 읽는 여행 데이터. content/의 YAML을 scripts/content-plugin.ts가 검사·조립해서 이 모양으로 넘겨줍니다.
// 텍스트 안의 **굵게**, {BL10} 같은 노선 코드는 <Rich>가 렌더링합니다.

export interface Place {
  name: string
  /** 현지어 이름 */
  local: string
  /** Google 지도 검색어 */
  q: string
  lat?: number
  lng?: number
  /** 택시 카드에 보여줄 현지어 주소 */
  address?: string
}

export type Kind = 'meet' | 'sight' | 'food' | 'free' | 'move'
export type Tone = 'ok' | 'warn' | 'idea'

export interface Link { label: string; href: string }

export interface Alt {
  tag: string
  title: string
  local?: string
  desc: string
  place?: Place
  /** 예약 페이지 등 외부 링크 */
  links?: Link[]
  tips?: string[]
}

export interface Stop {
  time: string
  /** 이동 줄이거나 시각이 아닌 라벨(예: '도착')이면 true */
  soft: boolean
  kind: Kind
  kindLabel?: string
  title?: string
  local?: string
  place?: Place
  meta?: string[]
  desc?: string
  tips?: string[]
  /** 예약·조회 페이지 같은 외부 링크 */
  links?: Link[]
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
  links?: Link[]
}

export interface FoodItem {
  title: string
  local?: string
  when: string
  desc: string
  order?: string
  /** 웨이팅 하는 방법. remote는 가게에 가지 않고 대기를 걸 수 있는지, href는 대기를 걸거나 순서를 보는 페이지 */
  wait?: { remote: boolean; href?: string; steps: string[] }
  place: Place
  links?: Link[]
}
export interface Dish {
  name: string
  local?: string
  desc: string
  spots: { place: Place; area?: string; note: string; links?: Link[] }[]
}
export interface GuideItem { day: string; title: string; place: Place; body: string; points?: string[] }
export interface CheckItem { id: string; title: string; desc: string; due: string; group?: string }
export interface InfoItem { group?: string; title: string; body?: string; points?: string[] }

export interface AppItem {
  name: string
  /** 이름 옆에 작게 보일 설명 */
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
  /** 숙소 카드 보조 설명, {BL10} 같은 노선 코드 사용 가능 */
  access: string
  nights: number
}

export interface FlightEnd { airport: string; time: string; terminal?: string }
export interface Flight {
  label: string
  date: string
  airline: string
  flight: string
  from: FlightEnd
  to: FlightEnd
  duration?: string
  tips?: string[]
}

export interface Ticket {
  title: string
  date: string
  status: string
  /** 미리 끝낸 일이면 true, 현장에서 할 일이면 false */
  done: boolean
  facts: { k: string; v: string }[]
  points?: string[]
}

export interface Line { name: string; color: string; text?: string }

export interface Trip {
  /** URL에 쓰는 id (#/taipei-2026). content/trips/의 폴더 이름 */
  id: string
  title: string
  country: string
  countryCode: string
  city: string
  /** 화면 상단 작은 경로 표기, 예: ICN → TPE */
  route: string
  start: string
  end: string
  timeZone: string
  /** 현지어 BCP 47 코드 (예: zh-TW) */
  lang: string
  currency: { code: string; symbol: string; quick: number[] }
  /** 택시 카드의 "여기로 가 주세요" 현지어 문장 */
  taxiAsk: string
  /** 본문의 {BL10} 같은 노선 코드 → 노선 이름과 색 */
  lines: Record<string, Line>
  summary: string
  hotel: Hotel
  days: Day[]
  food: FoodItem[]
  /** 대표 음식과 종류별 맛집 (dishes.yaml이 없으면 빈 배열, 탭도 숨겨요) */
  dishes: Dish[]
  /** 가는 곳의 유래와 설명 (guide.yaml이 없으면 빈 배열, 탭도 숨겨요) */
  guide: GuideItem[]
  checklist: CheckItem[]
  apps: AppItem[]
  info: InfoItem[]
  emergency: { label: string; number: string }[]
  /** 자주 쓰는 현지어 표현과 한글 발음 */
  phrases: { group: string; ko: string; local: string; say: string; note?: string }[]
  flights: Flight[]
  /** 숙소 예약 정보 (체크인 시간, 조식 등) */
  stay: { k: string; v: string }[]
  /** 숙소 시설과 이용 안내 (수영장, 짐 보관 등) */
  facilities: { k: string; v: string }[]
  tickets: Ticket[]
  /** notes.md를 HTML로 바꾼 것 (없으면 메모 탭을 숨겨요) */
  notes?: string
}
