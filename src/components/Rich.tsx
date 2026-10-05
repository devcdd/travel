import { Fragment } from 'react'

const TOKEN = /(\*\*[^*]+\*\*|\{(?:R|BL|G|O|A|BR)\d+A?\})/g

export function Mrt({ code }: { code: string }) {
  const line = /^[A-Z]+/.exec(code)![0].toLowerCase()
  return <span className={`mrt ${line}`}>{code}</span>
}

/** **굵게**와 {BL10} 같은 MRT 역 코드를 렌더링합니다. */
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
