import source from '../../方案/二游玩家73身份_结果页文案扩展版_v0.1.md?raw'

export interface IdentityResultCopy {
  typicalBehaviors: string[]
  resonanceQuote: string
  longDescription: string
}

function cleanQuoted(value: string) {
  return value.trim().replace(/^[“\"]|[”\"]$/g, '')
}

export function parseIdentityCopy(markdown: string) {
  const result: Record<string, IdentityResultCopy> = {}
  const blocks = markdown.split(/(?=^### \d+\. )/m)

  for (const block of blocks) {
    const heading = block.match(/^### \d+\. (.+)$/m)
    if (!heading) continue
    const behaviorsSection = block.match(/\*\*典型行为\*\*\s*\n([\s\S]*?)(?=\n\*\*共鸣金句)/)
    const typicalBehaviors = (behaviorsSection?.[1].match(/^- (.+)$/gm) || [])
      .map((line) => line.replace(/^- /, '').trim())
      .slice(0, 3)
    const quote = block.match(/\*\*共鸣金句：\*\*\s*(.+)$/m)?.[1] || ''
    const longDescription = block.match(/\*\*身份描述长文：\*\*\s*(.+)$/m)?.[1]?.trim() || ''
    result[heading[1].trim()] = {
      typicalBehaviors,
      resonanceQuote: cleanQuoted(quote),
      longDescription,
    }
  }

  return result
}

export const identityResultCopy = parseIdentityCopy(source)
