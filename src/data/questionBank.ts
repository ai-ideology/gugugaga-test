import source from '../../方案/二游玩家身份测试_正式题库_v0.1.md?raw'
import type { EvidenceLevel, Question, QuestionOption, QuestionStage } from '../types'

function clean(value: string) {
  return value.replace(/\*\*/g, '').replace(/\`/g, '').trim()
}

function parseSpecial(block: string, kind: 'NONE' | 'NA'): QuestionOption | null {
  const line = block.split('\n').map((item) => item.replace(/\r$/, '')).find((item) => item.startsWith(`- **${kind} /`))
  if (!line) return null
  const match = line.match(/^-[^：]+：(.+?)(?:\s*→\s*(.+))?$/)
  if (!match) return null
  return {
    id: kind,
    label: clean(match[1]),
    updates: clean(match[2] || ''),
    evidence: kind === 'NA' ? 'E1' : 'E2',
    special: kind,
  }
}

function parseBlock(id: string, block: string): Question {
  const prompt = block.match(/\*\*题目\*\*：(.+)/)?.[1]?.trim() || id
  const field = (name: string, fallback = '') =>
    block.match(new RegExp(`^- \\\`${name}\\\`: \\\`(.+)\\\``, 'm'))?.[1] || fallback
  const stage = field('stage', 'core') as QuestionStage
  const type = field('type', 'single_choice')
  const options: QuestionOption[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const match = line.match(/^\|\s*([A-Z])\s*\|\s*(.*?)\s*\|\s*`([^\`]*)`\s*\|\s*`(E[123])`\s*\|$/)
    if (!match) continue
    options.push({
      id: match[1],
      label: clean(match[2]),
      updates: clean(match[3]),
      evidence: match[4] as EvidenceLevel,
    })
  }

  const none = parseSpecial(block, 'NONE')
  const na = parseSpecial(block, 'NA')
  if (none) options.push(none)
  if (na) options.push(na)

  const multiple = type.includes('multi_select')
  const explicitMax = Number(type.match(/max(\d+)/)?.[1])
  const supports = block
    .match(/- \*\*主要支持身份\*\*：(.+)/)?.[1]
    ?.split(/[、，,]/)
    .map(clean)
    .filter(Boolean) || []

  return {
    id,
    stage,
    type,
    prompt,
    options,
    routeIf: field('route_if', 'always'),
    skipIf: field('skip_if', 'none'),
    multiple,
    min: 1,
    max: multiple ? (Number.isFinite(explicitMax) && explicitMax > 0 ? explicitMax : options.filter((item) => !item.special).length) : 1,
    supports,
    whyTemplate: block.match(/- \*\*why_you_template\*\*：(.+)/)?.[1]?.trim() || '你的选择呈现出稳定的游玩偏好。',
  }
}

function parseQuestionBank(markdown: string) {
  const matches = [...markdown.matchAll(/^### `([A-Z]+\d+)`\s*$/gm)]
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length
    const end = matches[index + 1]?.index ?? markdown.length
    return parseBlock(match[1], markdown.slice(start, end))
  })
}

export const questions = parseQuestionBank(source)
export const questionById = Object.fromEntries(questions.map((question) => [question.id, question])) as Record<string, Question>
export const questionsByStage = {
  gate: questions.filter((question) => question.stage === 'gate'),
  core: questions.filter((question) => question.stage === 'core'),
  route: questions.filter((question) => question.stage === 'route'),
  confirm: questions.filter((question) => question.stage === 'confirm'),
}

export const questionBankMeta = {
  version: '0.1',
  poolSize: questions.length,
  typicalRange: '27–35',
  hardCap: 44,
}
