import { useTrip } from '../context'

/** 현지어 이름. lang 속성으로 기기가 알맞은 현지어 글꼴을 고르게 합니다. */
export function Local({ children }: { children?: string }) {
  const { lang } = useTrip()
  if (!children) return null
  return (
    <span className="local" lang={lang}>
      {children}
    </span>
  )
}
