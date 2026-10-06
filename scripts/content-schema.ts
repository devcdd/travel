// content/ 아래 YAML 파일의 형식. 빌드할 때 이 규칙으로 검사하고, `pnpm schema`로 VS Code 자동완성용 JSON 스키마를 만듭니다.
import { z } from 'zod'

z.config(z.locales.ko())

const text = z.string().trim().min(1, '비어 있으면 안 돼요')
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 적어 주세요')
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, '#rrggbb 형식으로 적어 주세요')
/** places.yaml에 정의한 장소 id */
const placeId = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, '장소 id는 영문으로 시작해야 해요').describe('places.yaml에 정의한 장소 id')

export const Link = z.object({ label: text, href: z.url() }).strict()

export const Place = z
  .object({
    name: text.describe('한국어 이름'),
    local: text.describe('현지어 이름. 택시 카드에 크게 표시돼요'),
    q: text.describe('Google 지도 검색어'),
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: text.optional().describe('현지어 주소. 택시 카드와 주소 복사에 쓰여요'),
  })
  .strict()

export const Places = z.record(placeId, Place)

const Alt = z
  .object({
    title: text,
    local: text.optional(),
    place: placeId.optional(),
    desc: text,
    tips: z.array(text).optional(),
    links: z.array(Link).optional(),
  })
  .strict()

export const Stop = z
  .object({
    time: text.describe('HH:MM, 또는 "도착"처럼 시각이 아닌 말'),
    move: text.optional().describe('이동 안내 한 줄. 이 값이 있으면 이동 줄로 표시돼요'),
    kind: z.enum(['meet', 'sight', 'food', 'free']).optional().describe('meet 집합 · sight 관광 · food 식사 · free 자유'),
    label: text.optional().describe('종류 대신 보여줄 말 (예: 이른 저녁)'),
    title: text.optional(),
    local: text.optional().describe('생략하면 장소의 local을 써요'),
    place: placeId.optional(),
    meta: z.array(text).optional().describe('제목 아래 짧은 정보'),
    desc: text.optional(),
    tips: z.array(text).optional(),
    links: z.array(Link).optional().describe('예약·조회 페이지 같은 외부 링크'),
    alts: z.array(Alt).optional().describe('선택지. 순서대로 A, B, C가 붙어요'),
    tour: z.boolean().optional().describe('투어 버스로 가는 곳이면 true (길찾기 버튼 숨김)'),
    offRoute: z.boolean().optional().describe('하루 동선 경로에서 뺄 곳이면 true'),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.move) {
      for (const k of ['kind', 'title', 'place', 'alts', 'links'] as const)
        if (s[k] !== undefined) ctx.addIssue({ code: 'custom', path: [k], message: 'move 줄에는 쓰지 않아요' })
      return
    }
    if (!s.kind) ctx.addIssue({ code: 'custom', path: ['kind'], message: 'kind가 필요해요 (이동 줄이면 move를 쓰세요)' })
    if (!s.title) ctx.addIssue({ code: 'custom', path: ['title'], message: 'title이 필요해요' })
  })

export const Day = z
  .object({
    date,
    short: text.describe('탭에 보일 짧은 이름'),
    title: text,
    lead: text,
    chips: z.array(z.object({ tone: z.enum(['ok', 'warn', 'idea']), text }).strict()).min(1).describe('첫 번째 칩이 요약 목록에도 보여요'),
    facts: z.array(z.object({ label: text, value: text }).strict()).default([]),
    weather: z.object({ place: placeId, label: text }).strict().optional().describe('생략하면 숙소 기준 날씨'),
    links: z.array(Link).optional(),
    stops: z.array(Stop).min(1),
  })
  .strict()

const InfoItem = z
  .object({
    group: text.optional().describe('묶음 이름. 같은 묶음끼리 모아서 보여요 (없으면 "기타")'),
    title: text,
    body: text.optional().describe('짧은 설명 문장'),
    points: z.array(text).optional().describe('하나씩 끊어 볼 내용. 항목마다 한 문장씩'),
  })
  .strict()
  .refine((x) => x.body || x.points?.length, { message: 'body나 points 중 하나는 있어야 해요' })

const App = z
  .object({
    group: text,
    name: text,
    store: text.optional().describe('이름 옆에 작게 보일 설명'),
    desc: text,
    must: z.boolean().optional(),
    ios: z.string().regex(/^\d+$/, 'App Store 앱 id 숫자').optional(),
    web: z.url().optional(),
  })
  .strict()

const CheckItem = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, -만 써 주세요').describe('체크 상태 저장 키. 한번 정하면 바꾸지 마세요'),
    title: text,
    desc: text,
    due: text,
    group: text.optional().describe('묶음 이름 (예: 출발 전에, 짐 챙기기). 처음 나온 순서대로 보여요'),
  })
  .strict()

export const Checklist = z.array(CheckItem)

export const Food = z.array(
  z
    .object({
      title: text,
      local: text.optional(),
      day: text.describe('배치한 날 (예: 10.07, 수시)'),
      desc: text,
      order: text.optional().describe('추천 메뉴 안내 문장'),
      wait: z
        .object({
          remote: z.boolean().describe('가게에 가지 않고 대기를 걸 수 있으면 true, 매장에서만 접수하면 false'),
          href: z.url().optional().describe('대기를 걸거나 순서를 확인하는 페이지 주소'),
          steps: z.array(text).min(1).describe('하는 순서대로 한 문장씩'),
        })
        .strict()
        .optional()
        .describe('웨이팅 하는 방법. 원격 웨이팅이 되는지와 순서'),
      place: placeId,
      links: z.array(Link).optional(),
    })
    .strict(),
)

export const Dishes = z.array(
  z
    .object({
      name: text.describe('음식 이름 (예: 샤오롱바오)'),
      local: text.optional(),
      desc: text.describe('어떤 음식인지와 먹는 요령'),
      spots: z
        .array(
          z
            .object({
              place: placeId,
              area: text.optional().describe('오른쪽에 작게 보일 동네나 일정 (예: 시먼딩, 10.09 저녁)'),
              note: text,
              links: z.array(Link).optional(),
            })
            .strict(),
        )
        .min(1)
        .describe('대표 맛집. 이름과 현지어 이름은 장소에서 가져와요'),
    })
    .strict(),
)

export const Country = z
  .object({
    name: text,
    timeZone: text.describe('IANA 시간대 (예: Asia/Taipei)'),
    lang: text.describe('현지어 BCP 47 코드 (예: zh-TW). 현지어 글꼴 선택에 쓰여요'),
    currency: z.object({ code: z.string().length(3), symbol: text, quick: z.array(z.number().positive()).min(1) }).strict(),
    taxi: z.object({ ask: text.describe('택시 카드 위에 보일 "여기로 가 주세요" 현지어 문장') }).strict(),
    lines: z
      .record(z.string().regex(/^[A-Z]+$/), z.object({ name: text, color: hex, text: hex.optional() }).strict())
      .default({})
      .describe('{BL10}처럼 본문에 쓰는 노선 코드와 색'),
    info: z.array(InfoItem).default([]),
    emergency: z.array(z.object({ label: text, number: text }).strict()).default([]),
    apps: z.array(App).default([]),
    checklist: Checklist.default([]),
  })
  .strict()

const FlightEnd = z
  .object({
    airport: text.describe('공항 이름 (예: 부산 김해)'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM 형식으로 적어 주세요').describe('현지 시각'),
    terminal: text.optional().describe('터미널 (예: 1터미널)'),
  })
  .strict()

const Flight = z
  .object({
    label: text.describe('가는 편, 오는 편처럼 짧게'),
    date,
    airline: text,
    flight: text.describe('편명 (예: KE2085)'),
    from: FlightEnd,
    to: FlightEnd,
    duration: text.optional().describe('비행 시간 (예: 2시간 30분)'),
    tips: z.array(text).optional(),
  })
  .strict()

export const Trip = z
  .object({
    title: text,
    country: z.string().describe('content/countries/<코드>.yaml의 코드'),
    city: text,
    route: text.describe('상단 작은 경로 표기 (예: ICN → TPE)'),
    start: date,
    end: date,
    summary: text,
    hotel: z.object({ place: placeId, access: text, nights: z.number().int().positive() }).strict(),
    info: z.array(InfoItem).default([]).describe('이 여행에만 해당하는 현지 정보. 나라 정보보다 먼저 보여요'),
    apps: z.array(App).default([]).describe('나라 공통 앱 목록 뒤에 더할 앱'),
    flights: z.array(Flight).default([]).describe('항공편. 있으면 "항공·숙소" 탭이 생겨요. 예약번호는 적지 마세요'),
    stay: z
      .array(z.object({ label: text, value: text }).strict())
      .default([])
      .describe('숙소 예약 정보 (체크인 시간, 조식 등). "항공·숙소" 탭에 숙소와 함께 보여요'),
    facilities: z
      .array(z.object({ label: text, value: text }).strict())
      .default([])
      .describe('숙소 시설과 이용 안내 (수영장, 짐 보관 등). "항공·숙소" 탭 맨 아래에 보여요'),
    tickets: z
      .array(
        z
          .object({
            title: text,
            date,
            status: text.describe('예: 예매 완료, 작성 완료, 현장 결제'),
            done: z.boolean().describe('미리 끝낸 일이면 true, 현장에서 할 일이면 false'),
            facts: z.array(z.object({ label: text, value: text }).strict()).default([]),
            points: z.array(text).optional(),
          })
          .strict(),
      )
      .default([])
      .describe('예매해 둔 티켓과 미리 끝낸 일. 있으면 "예매" 탭이 생겨요'),
  })
  .strict()
  .refine((t) => t.start <= t.end, { path: ['end'], message: 'end가 start보다 빠를 수 없어요' })

/** JSON 스키마로 내보낼 파일 종류 */
export const SCHEMAS = { country: Country, trip: Trip, places: Places, day: Day, food: Food, dishes: Dishes, checklist: Checklist }
