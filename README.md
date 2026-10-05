# 타이베이 3박 4일 (2026.10.07 – 10.10)

Vite + React 19 정적 사이트. 일정 데이터는 전부 `src/data.ts`에 있습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
```

## Google 지도 키 (선택)

`.env.example`을 `.env`로 복사하고 `VITE_GOOGLE_MAPS_API_KEY`를 채우면 Google 지도 임베드(하루 경로, 장소 미리보기)가 켜집니다.
키가 없어도 OpenStreetMap 번호 지도와 Google 지도 길찾기 링크는 그대로 동작합니다.

Google Cloud Console에서 할 일:

1. **Maps Embed API** 사용 설정
2. 키 제한 → HTTP 리퍼러: `http://localhost:5173/*`, `http://localhost:4173/*`, `https://<github-username>.github.io/*`
3. API 제한 → Maps Embed API

키는 빌드 결과물에 들어가 브라우저에 노출되므로 리퍼러 제한이 필수입니다.

## GitHub Pages 배포

1. GitHub 저장소에 push (`main` 브랜치)
2. Settings → Pages → Source: **GitHub Actions**
3. Settings → Secrets and variables → Actions → `VITE_GOOGLE_MAPS_API_KEY` 등록 (선택)

`.github/workflows/deploy.yml`이 push마다 빌드해서 배포합니다. `vite.config.ts`의 `base: './'` 덕분에 저장소 이름과 상관없이 동작합니다.
