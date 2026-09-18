import { describe, expect, it } from 'vitest'
import { questionsByStage } from '../data/questionBank'
import { buildFeatureState } from './featureEngine'
import { calculateResult, createResultSnapshot, restoreResult } from './identityEngine'
import { nextQuestionId } from './questionEngine'
import type { Answers } from '../types'

const gateAnswers: Answers = {
  G01: ['A', 'B'],
  G02: ['A', 'B', 'H', 'I'],
  G03: 'A',
  G04: 'B',
  G05: 'C',
  G06: 'B',
}

describe('deterministic adaptive engine', () => {
  it('starts with gates and routes deterministically', () => {
    expect(nextQuestionId({}, ['G01'])).toBe('G01')
    expect(nextQuestionId({ G01: ['A'] }, ['G01'])).toBe('G02')
    expect(nextQuestionId(gateAnswers, questionsByStage.gate.map((question) => question.id))).toBe('K01')
  })

  it('keeps NA separate from a low score', () => {
    const state = buildFeatureState({ ...gateAnswers, K09: 'NA' })
    expect(state.values.C06.state).toBe('NA')
    expect(state.values.C06.value).toBeNull()
  })

  it('returns the same ranked identities for the same answers', () => {
    const answers: Answers = {
      ...gateAnswers,
      K01: ['C', 'D'], K02: 'A', K03: 'A', K04: 'A', K05: ['A', 'B'],
      K06: 'A', K07: 'A', K08: 'A', K09: 'A', K10: 'A', K11: 'B', K12: 'A',
      K13: 'A', K14: 'B', K15: 'A', K16: ['D', 'F'], K17: 'B', K18: 'B',
      RT01: 'A', RT02: 'A', RT07: 'A', RT08: ['A', 'D'], CF05: 'A',
    }
    const first = calculateResult(answers)
    const second = calculateResult(answers)
    expect(first.primary.identity.id).toBe(second.primary.identity.id)
    expect(first.allEvaluations.map((item) => [item.identity.id, item.fit, item.rarity]))
      .toEqual(second.allEvaluations.map((item) => [item.identity.id, item.fit, item.rarity]))
    const restored = restoreResult(answers, createResultSnapshot(first))
    expect(restored.gold.map((item) => item.identity.id)).toEqual(first.gold.map((item) => item.identity.id))
    expect(restored.completedAt).toBe(first.completedAt)
  })
})
