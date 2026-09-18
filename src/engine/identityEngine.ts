import { identities } from '../data/identitySystem'
import { identityById } from '../data/identitySystem'
import { buildFeatureState, featureNumber } from './featureEngine'
import type {
  Answers,
  EvidenceItem,
  FeatureState,
  IdentityCondition,
  IdentityDefinition,
  IdentityEvaluation,
  IdentityRarity,
  QuizResult,
  ResultSnapshot,
} from '../types'

const evidenceWeight = { E1: 0.6, E2: 1, E3: 1.5 } as const

function positiveFit(value: number, threshold: number) {
  return value >= threshold
    ? 70 + (30 * (value - threshold)) / Math.max(1, 100 - threshold)
    : (70 * value) / Math.max(1, threshold)
}

function negativeFit(value: number, threshold: number) {
  return value <= threshold
    ? 70 + (30 * (threshold - value)) / Math.max(1, threshold)
    : (70 * (100 - value)) / Math.max(1, 100 - threshold)
}

function conditionFit(condition: IdentityCondition, state: FeatureState) {
  const value = featureNumber(state, condition.path)
  if (value === null) return null
  return condition.direction === 'low'
    ? negativeFit(value, condition.threshold ?? 70)
    : positiveFit(value, condition.threshold ?? 70)
}

function relatedPaths(path: string) {
  if (path === 'R01.emotion') return ['R01.xp', 'R01.story', 'R01.companion', 'R01.performance']
  if (path === 'S03.info') return ['S03.official', 'S03.leak']
  if (path === 'C07.knowledge') return ['C07', 'C08']
  return [path]
}

function evidenceFor(identity: IdentityDefinition, state: FeatureState): EvidenceItem[] {
  const paths = identity.conditions.flatMap((condition) => relatedPaths(condition.path))
  const byQuestion = new Map<string, EvidenceItem>()
  for (const observation of state.observations) {
    if (!paths.includes(observation.path)) continue
    const current = byQuestion.get(observation.questionId)
    const next = {
      questionId: observation.questionId,
      label: observation.label,
      evidence: observation.evidence,
      paths: [...new Set([...(current?.paths || []), observation.path])],
    }
    if (!current || evidenceWeight[observation.evidence] >= evidenceWeight[current.evidence]) byQuestion.set(observation.questionId, next)
  }
  return [...byQuestion.values()].sort((a, b) => evidenceWeight[b.evidence] - evidenceWeight[a.evidence])
}

function domainGate(identity: IdentityDefinition, state: FeatureState) {
  if (identity.level === 'hidden') return true
  const bits = identity.mask.split('')
  const domains = ['R', 'C', 'I', 'S'] as const
  return bits.every((bit, index) => bit === '0' || !['NONE', 'UNKNOWN'].includes(state.domains[domains[index]]))
}

function evaluateOne(identity: IdentityDefinition, state: FeatureState): IdentityEvaluation {
  if (!identity.conditions.length || !domainGate(identity, state)) {
    return { identity, fit: 0, evidenceConfidence: 0, distinctEvidenceItems: 0, status: 'INELIGIBLE', rarity: 'none', evidenceItems: [], rankScore: 0, reason: 'GATE' }
  }

  if (identity.level === 'hidden') {
    const activeDomains = Object.values(state.domains).filter((value) => value === 'ACTIVE' || value === 'SELF_LIMIT').length
    const lowInput = featureNumber(state, 'I02') ?? 100
    const coverage = state.answeredCount / 24
    const fit = Math.max(0, 100 - activeDomains * 24 - Math.max(0, lowInput - 25))
    const eligible = activeDomains <= 1 && lowInput <= 25 && coverage >= .65
    return {
      identity, fit, evidenceConfidence: Math.min(1, coverage), distinctEvidenceItems: state.answeredCount,
      status: eligible ? 'GOLD' : 'INELIGIBLE', rarity: eligible ? 'gold' : 'none', evidenceItems: [], rankScore: fit,
    }
  }

  const parts = identity.conditions.map((condition) => ({ condition, fit: conditionFit(condition, state) }))
  if (parts.some((part) => part.fit === null)) {
    return { identity, fit: 0, evidenceConfidence: 0, distinctEvidenceItems: 0, status: 'LOW_EVIDENCE', rarity: 'none', evidenceItems: [], rankScore: 0, reason: 'CORE_NA' }
  }

  const weightedMean = parts.reduce((sum, part) => sum + Number(part.fit) * (part.condition.weight ?? 1), 0)
    / parts.reduce((sum, part) => sum + (part.condition.weight ?? 1), 0)
  let fit = weightedMean
  if (identity.level === 'rare_composite') {
    const min = Math.min(...parts.map((part) => Number(part.fit)))
    fit = min * .6 + weightedMean * .4
  }

  const evidenceItems = evidenceFor(identity, state)
  const weight = evidenceItems.reduce((sum, item) => sum + evidenceWeight[item.evidence], 0)
  const evidenceConfidence = Math.min(1, weight / 2.2) * (evidenceItems.length === 1 ? .65 : 1)
  const direct = identity.requiredDirect
    ? state.observations.find((observation) => observation.path === identity.requiredDirect && observation.evidence === 'E3' && Number(observation.value) >= 75)
    : undefined
  const directPassed = !identity.requiredDirect || Boolean(direct)

  let rarity: IdentityRarity = 'none'
  let status: IdentityEvaluation['status'] = fit < 55 ? 'INELIGIBLE' : 'LOW_EVIDENCE'
  if (fit >= 80 && evidenceConfidence >= .8 && evidenceItems.length >= 2 && directPassed) {
    rarity = 'gold'
    status = 'GOLD'
  } else if (fit >= 65 && evidenceConfidence >= .6 && directPassed) {
    rarity = 'purple'
    status = 'PURPLE'
  } else if (fit >= 55) {
    status = evidenceItems.length ? 'CANDIDATE' : 'LOW_EVIDENCE'
  }

  const specificity = identity.level === 'rare_composite' ? 100 : identity.level === 'branch' ? 80 : 60
  const rankScore = .55 * fit + .25 * evidenceConfidence * 100 + .1 * specificity + 5
  return {
    identity,
    fit: Math.round(fit),
    evidenceConfidence: Math.round(evidenceConfidence * 100) / 100,
    distinctEvidenceItems: evidenceItems.length,
    status,
    rarity,
    evidenceItems,
    rankScore: Math.round(rankScore * 10) / 10,
    reason: !directPassed ? 'DIRECT_EVIDENCE' : undefined,
  }
}

function overlap(a: IdentityEvaluation, b: IdentityEvaluation) {
  const left = new Set(a.evidenceItems.map((item) => item.questionId))
  const right = new Set(b.evidenceItems.map((item) => item.questionId))
  const union = new Set([...left, ...right])
  if (!union.size) return 0
  return [...left].filter((id) => right.has(id)).length / union.size
}

function applyHierarchy(evaluations: IdentityEvaluation[]) {
  const byId = new Map(evaluations.map((evaluation) => [evaluation.identity.id, evaluation]))
  for (const evaluation of evaluations) {
    const parent = evaluation.identity.parentId ? byId.get(evaluation.identity.parentId) : undefined
    if (!parent || evaluation.rarity === 'none' || parent.fit < 65) {
      if (evaluation.identity.level === 'branch' && evaluation.rarity !== 'none') {
        evaluation.rarity = 'none'
        evaluation.status = 'LOW_EVIDENCE'
        evaluation.reason = 'PARENT_NOT_ESTABLISHED'
      }
      continue
    }
    if (evaluation.identity.replaceParent && parent.rarity !== 'none') {
      parent.rarity = 'none'
      parent.status = 'SUPPRESSED_BY_CHILD'
    }
  }
}

function applyFamilyDedup(evaluations: IdentityEvaluation[]) {
  const visible = evaluations
    .filter((evaluation) => evaluation.rarity !== 'none')
    .sort((a, b) => b.rankScore - a.rankScore)
  for (let i = 0; i < visible.length; i += 1) {
    const winner = visible[i]
    if (winner.identity.level === 'rare_composite') continue
    for (let j = i + 1; j < visible.length; j += 1) {
      const candidate = visible[j]
      if (candidate.rarity === 'none' || candidate.identity.level === 'rare_composite') continue
      if (candidate.identity.familyId !== winner.identity.familyId) continue
      const sameCore = candidate.identity.conditions.some((condition) =>
        winner.identity.conditions.some((other) => other.path === condition.path))
      if (sameCore && overlap(winner, candidate) >= .75) {
        candidate.rarity = 'none'
        candidate.status = 'SUPPRESSED_BY_DEDUP'
      }
    }
  }
}

export function evaluateIdentities(state: FeatureState) {
  const evaluations = identities.map((identity) => evaluateOne(identity, state))
  applyHierarchy(evaluations)
  applyFamilyDedup(evaluations)
  return evaluations
}

export function calculateResult(answers: Answers): QuizResult {
  const state = buildFeatureState(answers)
  const allEvaluations = evaluateIdentities(state)
  const sort = (a: IdentityEvaluation, b: IdentityEvaluation) => b.rankScore - a.rankScore
  const gold = allEvaluations.filter((item) => item.rarity === 'gold').sort(sort)
  const purple = allEvaluations.filter((item) => item.rarity === 'purple').sort(sort).slice(0, 7)
  const suppressed = allEvaluations.filter((item) => item.status.startsWith('SUPPRESSED')).sort(sort)
  const fallback = [...allEvaluations].filter((item) => item.identity.level !== 'hidden').sort(sort)[0]
  const primary = gold[0] || purple[0] || fallback
  return {
    primary,
    gold,
    purple,
    suppressed,
    allEvaluations,
    featureState: state,
    completedAt: new Date().toISOString(),
    versions: { identity: '0.6.1', feature: '0.1', questionBank: '0.1', engine: '1.0' },
  }
}

function snapshotEvaluation(item: IdentityEvaluation) {
  return {
    identityId: item.identity.id,
    fit: item.fit,
    evidenceConfidence: item.evidenceConfidence,
    distinctEvidenceItems: item.distinctEvidenceItems,
    status: item.status,
    rarity: item.rarity,
    evidenceItems: item.evidenceItems,
    rankScore: item.rankScore,
    reason: item.reason,
  }
}

export function createResultSnapshot(result: QuizResult): ResultSnapshot {
  return {
    primary: snapshotEvaluation(result.primary),
    gold: result.gold.map(snapshotEvaluation),
    purple: result.purple.map(snapshotEvaluation),
    suppressed: result.suppressed.map(snapshotEvaluation),
    completedAt: result.completedAt,
    versions: result.versions,
  }
}

export function restoreResult(answers: Answers, snapshot?: ResultSnapshot): QuizResult {
  const current = calculateResult(answers)
  if (!snapshot || snapshot.versions.identity !== '0.6.1' || snapshot.versions.engine !== '1.0') return current
  const hydrate = (item: ResultSnapshot['primary']): IdentityEvaluation => ({
    identity: identityById[item.identityId],
    fit: item.fit,
    evidenceConfidence: item.evidenceConfidence,
    distinctEvidenceItems: item.distinctEvidenceItems,
    status: item.status,
    rarity: item.rarity,
    evidenceItems: item.evidenceItems,
    rankScore: item.rankScore,
    reason: item.reason,
  })
  return {
    ...current,
    primary: hydrate(snapshot.primary),
    gold: snapshot.gold.map(hydrate),
    purple: snapshot.purple.map(hydrate),
    suppressed: snapshot.suppressed.map(hydrate),
    completedAt: snapshot.completedAt,
    versions: snapshot.versions,
  }
}
