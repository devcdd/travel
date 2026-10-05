# 타이베이 3박 4일 (2026.10.07 – 10.10)

Vite + React 19 정적 사이트. 배포 주소: https://blog.cdd.co.kr/travel/

첫 화면에서 여행을 고르고(`#/`), 여행별 일정은 `#/<여행 id>/<탭>` 주소로 열립니다.

## 일정 관리

일정은 코드가 아니라 `content/`의 YAML 파일로 관리합니다.

```
content/
  countries/tw.yaml          # 대만 공통: 앱, 현지 정보, 긴급 전화, 통화, 노선 색
  trips/taipei-2026/
    trip.yaml                # 제목, 기간, 숙소
    places.yaml              # 장소 (id로 참조)
    days/01.yaml … 04.yaml   # 하루 일정
    food.yaml                # 먹을 것
    checklist.yaml           # 예약·준비
    notes.md                 # (선택) 메모 탭
```

새 여행은 `content/trips/`에 폴더를 하나 만들면 자동으로 목록에 나타납니다. 빌드할 때 형식과 장소 id, 노선 코드를 검사해서, 틀린 곳이 있으면 파일과 위치를 알려 주고 배포를 멈춥니다. 자세한 작성 규칙은 `CLAUDE.md`에 있습니다.

VS Code에서 Red Hat YAML 확장을 설치하면 YAML 파일에서 자동완성과 검사가 됩니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # content/와 타입만 빠르게 검사
npm run build    # dist/ 생성
```

## Google 지도 키 (선택)

`.env.example`을 `.env`로 복사하고 `VITE_GOOGLE_MAPS_API_KEY`를 채우면 날짜별 지도가 Google 지도로 바뀌고, Google 경로 탭과 장소 미리보기가 켜집니다.
키가 없거나 인증에 실패하면 OpenStreetMap 번호 지도로 자동 전환되고, Google 지도 길찾기 링크는 그대로 동작합니다.

Google Cloud Console에서 할 일:

1. **Maps JavaScript API**, **Maps Embed API** 사용 설정
2. 키 제한 → HTTP 리퍼러: `https://blog.cdd.co.kr/travel/*`, 로컬 개발용 `http://localhost:5173/*`
3. API 제한 → 위 두 API

키는 빌드 결과물에 들어가 브라우저에 노출되므로 리퍼러 제한이 필수입니다.

## GitHub Pages 배포

1. GitHub 저장소에 push (`main` 브랜치)
2. Settings → Pages → Source: **GitHub Actions**
3. Settings → Secrets and variables → Actions → `VITE_GOOGLE_MAPS_API_KEY` 등록 (선택)

`.github/workflows/deploy.yml`이 push마다 빌드해서 배포합니다. 계정 대표 사이트(devcdd.github.io)에 커스텀 도메인 `blog.cdd.co.kr`이 걸려 있어서 이 프로젝트는 `blog.cdd.co.kr/travel/`로 서비스됩니다.
