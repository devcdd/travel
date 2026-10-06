// VS Code 자동완성용 JSON 스키마를 content/.schema/에 만듭니다. content-schema.ts를 고친 뒤 `pnpm schema`로 다시 만드세요.
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { SCHEMAS } from './content-schema.ts'

const out = path.resolve(import.meta.dirname, '../content/.schema')
fs.mkdirSync(out, { recursive: true })
for (const [name, schema] of Object.entries(SCHEMAS)) {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(json, null, 2) + '\n')
}
console.log(`content/.schema/에 ${Object.keys(SCHEMAS).length}개 스키마를 만들었어요`)
