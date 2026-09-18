import { questionById } from '../data/questionBank'
import type { Answers, DomainId, DomainState, EvidenceLevel, FeatureState, FeatureValue, Observation } from '../types'

const evidenceWeight: Record<EvidenceLevel, number> = { E1: 0.6, E2: 1, E3: 1.5 }

function parseValue(raw: string): number | string | null {
  const value = raw.trim()
  if (value === 'NA') return null
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  if (value === '3plus') return 3
  return value
}

function parseUpdates(updates: string) {
  return updates
    .split(';')
    .map((part) => part.trim())
    .map((part) => part.match(/^([A-Z][A-Z0-9_]*(?:\.[a-z_]+)?)\s*=\s*([\w.]+)$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ path: match[1], value: parseValue(match[2]) }))
}

export function answersToObservations(answers: Answers): Observation[] {
  const observations: Observation[] = []
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = questionById[questionId]
    if (!question) continue
    const selected = Array.isArray(answer) ? answer : [answer]
    for (const optionId of selected) {
      const option = question.options.find((item) => item.id === optionId)
      if (!option) continue
      for (const update of parseUpdates(option.updates)) {
        observations.push({
          questionId,
          optionId,
          path: update.path,
          value: update.value,
          evidence: option.evidence,
          label: option.label,
          whyTemplate: question.whyTemplate,
        })
      }
    }
  }
  return observations
}

function aggregatePath(path: string, observations: Observation[]): FeatureValue {
  const hits = observations.filter((observation) => observation.path === path)
  if (!hits.length) return { value: null, confidence: 0, evidenceCount: 0, questionIds: [], state: 'UNKNOWN' }
  const valid = hits.filter((hit) => typeof hit.value === 'number')
  const categorical = hits.filter((hit) => typeof hit.value === 'string')
  const questionIds = [...new Set(hits.map((hit) => hit.questionId))]
  const weight = hits.reduce((sum, hit) => sum + evidenceWeight[hit.evidence], 0)
  if (valid.length) {
    const numericWeight = valid.reduce((sum, hit) => sum + evidenceWeight[hit.evidence], 0)
    const value = valid.reduce((sum, hit) => sum + Number(hit.value) * evidenceWeight[hit.evidence], 0) / numericWeight
    return {
      value: Math.round(value * 10) / 10,
      confidence: Math.min(1, weight / 2.2) * (questionIds.length === 1 ? 0.65 : 1),
      evidenceCount: hits.length,
      questionIds,
      state: 'VALUE',
    }
  }
  if (categorical.length) {
    const last = categorical[categorical.length - 1]
    return {
      value: last.value,
      confidence: Math.min(1, weight / 2.2),
      evidenceCount: hits.length,
      questionIds,
      state: 'VALUE',
    }
  }
  return { value: null, confidence: Math.min(1, weight / 2.2), evidenceCount: hits.length, questionIds, state: 'NA' }
}

function addDerived(values: Record<string, FeatureValue>, path: string, sources: string[], mode: 'max' | 'mean' = 'max') {
  const sourceValues = sources.map((source) => values[source]).filter((value) => typeof value?.value === 'number')
  if (!sourceValues.length) return
  const nums = sourceValues.map((value) => Number(value.value))
  const value = mode === 'max' ? Math.max(...nums) : nums.reduce((sum, item) => sum + item, 0) / nums.length
  values[path] = {
    value: Math.round(value),
    confidence: Math.max(...sourceValues.map((item) => item.confidence)),
    evidenceCount: sourceValues.reduce((sum, item) => sum + item.evidenceCount, 0),
    questionIds: [...new Set(sourceValues.flatMap((item) => item.questionIds))],
    state: 'VALUE',
  }
}

function getDomainState(domain: DomainId, values: Record<string, FeatureValue>): DomainState {
  const gate = values[`${domain}_GATE`]?.value
  if (gate === 'ACTIVE' || gate === 'LOW' || gate === 'NONE' || gate === 'SELF_LIMIT') return gate
  if (domain === 'I') return 'ACTIVE'
  return 'UNKNOWN'
}

export function buildFeatureState(answers: Answers): FeatureState {
  const observations = answersToObservations(answers)
  const paths = [...new Set(observations.map((observation) => observation.path))]
  const values = Object.fromEntries(paths.map((path) => [path, aggregatePath(path, observations)])) as Record<string, FeatureValue>

  addDerived(values, 'R01.emotion', ['R01.xp', 'R01.story', 'R01.companion', 'R01.performance'])
  addDerived(values, 'S03.info', ['S03.official', 'S03.leak'])
  addDerived(values, 'C07.knowledge', ['C07', 'C08'])

  const contentComponents = Object.entries(values)
    .filter(([path, value]) => path.startsWith('C01.') && typeof value.value === 'number' && Number(value.value) >= 55)
  if (!values.C13 && contentComponents.length) {
    values.C13 = {
      value: Math.min(100, contentComponents.length * 18),
      confidence: Math.min(1, contentComponents.length / 5),
      evidenceCount: contentComponents.length,
      questionIds: [...new Set(contentComponents.flatMap(([, value]) => value.questionIds))],
      state: 'VALUE',
    }
  }

  return {
    values,
    domains: {
      R: getDomainState('R', values),
      C: getDomainState('C', values),
      I: getDomainState('I', values),
      S: getDomainState('S', values),
    },
    observations,
    answeredCount: Object.keys(answers).length,
  }
}

export function featureNumber(state: FeatureState, path: string) {
  const value = state.values[path]?.value
  return typeof value === 'number' ? value : null
}

export function featureText(state: FeatureState, path: string) {
  const value = state.values[path]?.value
  return typeof value === 'string' ? value : null
}
