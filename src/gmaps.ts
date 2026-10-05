import { GMAPS_KEY } from './lib'

/** Advanced Marker와 다크 모드를 쓰려면 Map ID가 필요합니다. 없으면 Google의 테스트용 DEMO_MAP_ID를 씁니다. */
export const GMAPS_MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '').trim() || 'DEMO_MAP_ID'

let loading: Promise<void> | null = null
let authFailed = false
const authListeners = new Set<() => void>()

/** 키가 잘못됐거나 리퍼러가 막히면 Google이 window.gm_authFailure를 호출합니다. */
export function onAuthFailure(cb: () => void) {
  if (authFailed) cb()
  authListeners.add(cb)
  return () => {
    authListeners.delete(cb)
  }
}

export function loadGoogleMaps(): Promise<void> {
  if (!GMAPS_KEY) return Promise.reject(new Error('no key'))
  if (loading) return loading
  window.gm_authFailure = () => {
    authFailed = true
    authListeners.forEach((cb) => cb())
  }
  loading = new Promise<void>((resolve, reject) => {
    const cb = `__gmapsReady${Date.now()}`
    ;(window as unknown as Record<string, () => void>)[cb] = () => resolve()
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}&v=weekly&loading=async&language=ko&libraries=marker&callback=${cb}`
    s.async = true
    s.onerror = () => {
      loading = null
      reject(new Error('Google Maps script failed'))
    }
    document.head.appendChild(s)
  })
  return loading
}
