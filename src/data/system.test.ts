import { describe, expect, it } from 'vitest'
import { features } from './features'
import { identityResultCopy } from './identityCopy'
import { identities, publicIdentities } from './identitySystem'
import { questions, questionsByStage } from './questionBank'

describe('frozen identity system data', () => {
  it('loads the complete 65-question adaptive pool', () => {
    expect(questions).toHaveLength(65)
    expect(questionsByStage.gate).toHaveLength(6)
    expect(questionsByStage.core).toHaveLength(18)
    expect(questionsByStage.route).toHaveLength(30)
    expect(questionsByStage.confirm).toHaveLength(11)
    expect(new Set(questions.map((question) => question.id)).size).toBe(65)
    expect(questions.every((question) => question.options.length >= 2)).toBe(true)
  })

  it('loads 36 features and 73 identities', () => {
    expect(features).toHaveLength(36)
    expect(identities).toHaveLength(73)
    expect(publicIdentities).toHaveLength(72)
    expect(new Set(identities.map((identity) => identity.id)).size).toBe(73)
    expect(identities.every((identity) => identity.conditions.length > 0)).toBe(true)
  })

  it('loads complete result copy for all identities', () => {
    expect(Object.keys(identityResultCopy)).toHaveLength(73)
    expect(identities.every((identity) => identity.typicalBehaviors.length === 3)).toBe(true)
    expect(identities.every((identity) => identity.resonanceQuote && identity.longDescription)).toBe(true)
  })

  it('resolves artwork for each identity', () => {
    expect(identities.filter((identity) => !identity.image).map((identity) => identity.name)).toEqual([])
    expect(identities.filter((identity) => !identity.thumbnailImage).map((identity) => identity.name)).toEqual([])
  })
})
