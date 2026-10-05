import { Fragment } from 'react'
import { useTrip } from '../context'

const TOKEN = /(\*\*[^*]+\*\*|\{[A-Z]+\d+[A-Z]?\})/g

/** {BL10} 같은 노선 코드 배지. 노선 색은 나라 파일(content/countries/*.yaml)의 lines에서 가져와요. */
export function Mrt({ code }: { code: string }) {
  const { lines } = useTrip()
  const line = lines[/^[A-Z]+/.exec(code)![0]]
  if (!line) return <>{code}</>
  return (
    <span className="mrt" style={{ background: line.color, color: line.text ?? '#fff' }} title={line.name}>
      {code}
    </span>
  )
}

/** **굵게**와 {BL10} 같은 노선 코드를 렌더링합니다. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
        if (part.startsWith('{')) return <Mrt key={i} code={part.slice(1, -1)} />
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}
