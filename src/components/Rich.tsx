import { Fragment } from 'react'
import { useTrip } from '../context'
import { toKrw, useKrwRate } from '../rate'

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

/** 금액 뒤에 원화 환산을 붙여요. 빌드할 때 숫자 범위의 줄표 양옆에 WORD JOINER가 들어가 있어요. */
function Money({ text }: { text: string }) {
  const { currency } = useTrip()
  const rate = useKrwRate(currency.code)
  const sym = currency.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${sym}[\\d,.]*\\d(?:\u2060?–\u2060?[\\d,.]*\\d)?)`, 'g')
  if (!rate) return <>{text}</>
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <Fragment key={i}>
            {part}
            <span className="krw"> (약 {toKrw(part.slice(currency.symbol.length).replace(/\u2060/g, ''), rate.krw)}원)</span>
          </Fragment>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

/** **굵게**와 {BL10} 같은 노선 코드를 렌더링하고, 금액에는 원화 환산을 붙입니다. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith('**'))
          return (
            <b key={i}>
              <Money text={part.slice(2, -2)} />
            </b>
          )
        if (part.startsWith('{')) return <Mrt key={i} code={part.slice(1, -1)} />
        return <Money key={i} text={part} />
      })}
    </>
  )
}
