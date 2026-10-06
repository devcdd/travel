// 빌드하지 않고 content/만 빠르게 검사합니다: `pnpm check`
import path from 'node:path'
import { loadContent } from './content-plugin.ts'

try {
  const { trips } = loadContent(path.resolve(import.meta.dirname, '../content'))
  console.log(`문제없어요. 여행 ${trips.length}개: ${trips.map((t) => `${t.id}(${t.days.length}일)`).join(', ')}`)
} catch (e) {
  console.error((e as Error).message)
  process.exit(1)
}
