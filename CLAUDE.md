# travel

여러 여행 일정을 모아 보는 개인용 정적 사이트. Vite + React 19 + TypeScript.
배포 주소는 https://blog.cdd.co.kr/travel/ (GitHub `devcdd/travel`, `main`에 push하면 GitHub Actions가 빌드·배포).

## 명령

```bash
pnpm dev         # 개발 서버 (content/를 고치면 자동 새로고침)
pnpm check       # 타입 검사 + content/만 빠르게 검사
pnpm build       # 타입 검사 + content 검사 + 빌드
pnpm schema      # scripts/content-schema.ts를 고친 뒤 VS Code용 JSON 스키마 다시 만들기
```

## 구조

- `content/` 여행 데이터. 코드를 건드리지 않고 여기만 고쳐서 일정을 관리합니다.
  - `countries/<코드>.yaml` 나라 공통 정보: 시간대, 현지어(lang), 통화, 택시 카드 문장, 노선 코드 색(`lines`), 현지 정보, 긴급 전화, 앱, 공통 체크리스트, 회화 표현(`phrases`, 있으면 "회화" 탭)
  - `trips/<여행 id>/` 여행 하나. 폴더 이름이 주소가 됩니다 (`#/taipei-2026/d2`).
    - `trip.yaml` 제목, 기간, 나라 코드, 숙소, 항공편과 숙소 예약 정보(`flights`, `stay`), 숙소 시설(`facilities`), 이 여행만의 정보·앱
    - `places.yaml` 장소 목록. 다른 파일에서 id로 참조
    - `days/01.yaml …` 하루 일정. 파일 이름 순서가 Day 1, 2, 3이고 URL 탭 id는 `d1`, `d2` …
    - `food.yaml`, `checklist.yaml` (선택), `notes.md` (선택, 있으면 "메모" 탭)
    - `dishes.yaml` (선택, 있으면 "대표 음식" 탭) 음식 종류마다 설명과 대표 맛집. 맛집은 `places.yaml` id로 넣고 `area`에 동네나 겹치는 일정을 적어요
  - `.schema/` `pnpm schema`로 만든 JSON 스키마. `.vscode/settings.json`이 YAML 파일에 연결해 자동완성·검사를 해 줍니다 (Red Hat YAML 확장).
- `scripts/content-schema.ts` YAML 형식(zod). 에러 메시지는 한국어.
- `scripts/content-plugin.ts` 빌드할 때 content/를 읽고 검사·조립해 `virtual:trips` 모듈로 넘깁니다. 장소 id, 노선 코드, 날짜 범위, 체크리스트 id 중복까지 검사하고 문제가 있으면 파일 경로와 위치를 모아 빌드를 멈춥니다.
- `src/types.ts` 화면이 읽는 조립된 데이터 모양. `src/components/`가 화면.

## 새 여행 추가

1. 처음 가는 나라면 `content/countries/<코드>.yaml`을 만듭니다 (`tw.yaml` 참고).
2. `content/trips/<영문-소문자-id>/`에 `trip.yaml`, `places.yaml`, `days/01.yaml …`을 만듭니다. 목록에는 자동으로 나타나고, 최신 여행이 위로 옵니다.
3. `pnpm check`로 확인합니다.

## content 작성 규칙

- 본문에서 `**굵게**`, 노선 코드 `{BL10}`을 쓸 수 있습니다. 노선 코드의 글자 부분은 나라 파일 `lines`에 있어야 합니다.
- 시각은 `"15:30"`처럼 따옴표로 씁니다. 시각이 아닌 말(`도착`, `출발 3시간 전`)도 됩니다.
- 이동 안내 줄은 `{ time, move }`, 나머지는 `kind`(meet·sight·food·free)와 `title`이 필요합니다. 선택지(`alts`)에는 순서대로 A, B, C가 붙습니다.
- `local`(현지어 이름)을 생략하면 장소의 `local`을 씁니다.
- 체크리스트 `id`는 체크 상태를 저장하는 키라서 한번 정하면 바꾸지 않습니다.
- 모르는 좌표를 지어내지 않습니다. 확실하지 않으면 `lat`/`lng`를 빼세요 (지도 핀만 빠지고 버튼은 동작).
- 가격, 영업시간, 예약 규칙은 출처를 확인하고 씁니다. 확인하지 못한 내용은 본문에 "확인하지 못했어요"라고 분명히 적습니다.
- App Store 앱 id는 `https://itunes.apple.com/lookup?id=<id>&country=kr`로 한국 스토어에 있는지 확인합니다.

## 문장 스타일

사용자가 정한 말투입니다. 새 문장도 이렇게 씁니다.

- 친절하게 안내하는 해요체: "~예요", "~해요", "~하세요".
- 단어를 점(·)이나 쉼표로 끊어 나열하지 말고, 이어지는 문장으로 씁니다.
  - 나쁨: `**가격** 1인 NT$500–1,500, 봉사료 10% 별도.`
  - 좋음: `1인 NT$500–1,500 정도 생각하시면 되고, 봉사료 10%가 따로 붙어요.`
- 이동 안내는 화살표 나열 대신 타는 순서대로 풀어 씁니다.
- AI 같은 말투를 피합니다: 줄표(—) 삽입, "A가 아니라 B", 콜론 뒤 반전, 과장된 수식어.
- 제목, `meta`, `facts`, 칩처럼 한눈에 봐야 하는 짧은 정보는 짧게 둬도 됩니다.

## 디자인

- 색은 전부 `src/styles.css` 맨 위 토큰으로 정의하고 라이트·다크 두 테마를 함께 맞춥니다.
- 글꼴은 Pretendard (npm `pretendard`, 번들에 포함). 현지어 이름은 `<Local>` 컴포넌트가 `lang` 속성을 붙여 기기의 현지어 글꼴로 보여줍니다.
- 플랫한 스타일: 얇은 선, 그림자 없음. 720px 한 단, 휴대폰 우선.

## Google 지도

- 키는 `.env`의 `VITE_GOOGLE_MAPS_API_KEY` (커밋하지 않음), 배포용은 GitHub Actions secret 같은 이름.
- 키는 Maps JavaScript API와 Maps Embed API만 쓰고, HTTP 리퍼러가 `https://blog.cdd.co.kr/travel/*`로 제한돼 있습니다. localhost는 등록돼 있지 않아서 로컬에서는 OpenStreetMap 지도로 자동 전환됩니다. 정상 동작입니다.
- 키가 없거나 인증에 실패해도 페이지가 깨지지 않아야 합니다 (`DayMap`의 대체 지도와 오류 경계).

## 배포 주의

- 계정 대표 사이트 저장소 `devcdd.github.io`에 커스텀 도메인 `blog.cdd.co.kr`(블로그)이 걸려 있어서, 이 프로젝트는 `blog.cdd.co.kr/travel/`로 서비스됩니다. `devcdd.github.io/travel`로 바꾸려면 블로그 도메인을 떼야 하므로 하지 않습니다.
- `vite.config.ts`의 `base: './'`와 해시 라우팅(`#/…`) 덕분에 하위 경로에서도 동작합니다.

## 확인 방법

- 데이터만 바꿨다면 `pnpm check`.
- 화면을 바꿨다면 `pnpm build` 후 `pnpm exec vite preview --port 4173`, 헤드리스 Chrome으로 스크린샷을 찍어 봅니다 (Chrome 창 최소 너비가 500px이라 그보다 좁게는 안 찍힙니다).

## 커밋과 배포

- 파일을 고친 작업은 따로 말하지 않아도 위 확인을 마친 뒤 바로 커밋하고 `main`에 푸시합니다. 여행 중 휴대폰에서 바로 보기 위해서예요.
- 푸시한 뒤에는 GitHub Actions 배포가 성공했는지까지 확인합니다 (`gh run watch`).
- 확인이 실패했거나 사용자가 커밋하지 말라고 한 경우에는 푸시하지 않고 알립니다.
