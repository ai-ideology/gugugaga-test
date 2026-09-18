import source from '../../方案/二游玩家身份测试_36底层特征与题目覆盖矩阵_v0.1.md?raw'
import type { DomainId } from '../types'

export interface FeatureDefinition {
  code: string
  name: string
  domain: DomainId
  type: string
  tier: string
  evidence: string
  identities: string[]
}

function parse(markdown: string) {
  const result: FeatureDefinition[] = []
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const match = line.match(/^\| `([RCIS]\d\d)` \| \*\*(.+?)\*\* \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/)
    if (!match) continue
    result.push({
      code: match[1],
      name: match[2],
      domain: match[1][0] as DomainId,
      type: match[3],
      tier: match[4],
      evidence: match[5],
      identities: match[6].split(/[、，]/).map((item) => item.trim()).filter(Boolean),
    })
  }
  return result
}

export const features = parse(source)
export const domains: Record<DomainId, { name: string; english: string; description: string; color: string }> = {
  R: { name: '角色关系', english: 'ROLE', description: '角色为何吸引你，以及你如何维系喜欢。', color: '#ed7895' },
  C: { name: '内容玩法', english: 'CONTENT', description: '剧情、探索、战斗与专项玩法怎样构成乐趣。', color: '#6775d8' },
  I: { name: '投入方式', english: 'INVESTMENT', description: '你的时间与精力按怎样的节律流动。', color: '#e69b55' },
  S: { name: '玩家关系', english: 'SOCIAL', description: '社区、同好与表达在体验中占据什么位置。', color: '#51a99e' },
}
