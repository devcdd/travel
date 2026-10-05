# 타이베이 3박 4일 (2026.10.07 – 10.10)

Vite + React 19 정적 사이트. 배포 주소: https://blog.cdd.co.kr/travel/

첫 화면에서 여행을 고르고(`#/`), 여행별 일정은 `#/<여행 id>/<탭>` 주소로 열립니다. 여행 데이터는 `src/trips/`에 여행마다 파일 하나씩 두고 `src/trips/index.ts`에 등록합니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
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
