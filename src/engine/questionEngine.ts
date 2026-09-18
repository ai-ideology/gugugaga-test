import { questionsByStage } from '../data/questionBank'
import { buildFeatureState, featureNumber, featureText } from './featureEngine'
import { evaluateIdentities } from './identityEngine'
import type { Answers, FeatureState, IdentityEvaluation, Question } from '../types'

function splitTopLevel(expression: string, operator: ' or ' | ' and ') {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index]
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (depth === 0 && expression.slice(index, index + operator.length) === operator) {
      parts.push(expression.slice(start, index))
      start = index + operator.length
      index += operator.length - 1
    }
  }
  if (parts.length) parts.push(expression.slice(start))
  return parts
}

function stripParens(value: string) {
  let result = value.trim()
  while (result.startsWith('(') && result.endsWith(')')) {
    let depth = 0
    let wraps = true
    for (let index = 0; index < result.length; index += 1) {
      if (result[index] === '(') depth += 1
      if (result[index] === ')') depth -= 1
      if (depth === 0 && index < result.length - 1) { wraps = false; break }
    }
    if (!wraps) break
    result = result.slice(1, -1).trim()
  }
  return result
}

function candidates(evaluations: IdentityEvaluation[]) {
  return evaluations.filter((item) => item.fit >= 55 && item.status !== 'REJECTED')
}

function atomValue(atom: string, state: FeatureState, evaluations: IdentityEvaluation[]) {
  const value = stripParens(atom)
  if (!value || value === 'always' || value === 'none') return value === 'always'

  const candidateGroup = value.match(/^\((.+)\) candidate$/)
  if (candidateGroup) {
    const names = candidateGroup[1].split(' or ').map((name) => name.trim())
    return candidates(evaluations).some((item) => names.includes(item.identity.name))
  }

  const familyCandidate = value.match(/^(F\d\d) candidate$/)
  if (familyCandidate) return candidates(evaluations).some((item) => item.identity.familyId === familyCandidate[1])

  const identityCandidate = value.match(/^(.+?) candidate$/)
  if (identityCandidate) return candidates(evaluations).some((item) => item.identity.name === identityCandidate[1])

  if (value === 'R06 confidence low') return (state.values.R06?.confidence || 0) < .8
  if (value === 'C01 has >=4 components >=55') {
    return Object.entries(state.values).filter(([path, item]) => path.startsWith('C01.') && typeof item.value === 'number' && item.value >= 55).length >= 4
  }
  if (value === 'S07 any component >=65') {
    return Object.entries(state.values).some(([path, item]) => path.startsWith('S07.') && typeof item.value === 'number' && item.value >= 65)
  }

  const compare = value.match(/^([A-Z][A-Z0-9_]*(?:\.[a-z_]+)?)\s*(>=|<=|!=|=|<|>)\s*([\w.]+)$/i)
  if (!compare) return false
  const [, path, operator, targetRaw] = compare
  const numericTarget = Number(targetRaw)
  const current = Number.isFinite(numericTarget) ? featureNumber(state, path) : featureText(state, path)
  if (current === null) return false
  const target = Number.isFinite(numericTarget) ? numericTarget : targetRaw
  if (operator === '=') return current === target
  if (operator === '!=') return current !== target
  if (typeof current !== 'number' || typeof target !== 'number') return false
  if (operator === '>=') return current >= target
  if (operator === '<=') return current <= target
  if (operator === '>') return current > target
  return current < target
}

export function evaluateRouteExpression(expression: string, state: FeatureState, evaluations: IdentityEvaluation[]): boolean {
  const clean = stripParens(expression)
  const orParts = splitTopLevel(clean, ' or ')
  if (orParts.length) return orParts.some((part) => evaluateRouteExpression(part, state, evaluations))
  const andParts = splitTopLevel(clean, ' and ')
  if (andParts.length) return andParts.every((part) => evaluateRouteExpression(part, state, evaluations))
  return atomValue(clean, state, evaluations)
}

function eligible(question: Question, state: FeatureState, evaluations: IdentityEvaluation[]) {
  if (question.skipIf !== 'none' && evaluateRouteExpression(question.skipIf, state, evaluations)) return false
  return evaluateRouteExpression(question.routeIf, state, evaluations)
}

function routeScore(question: Question, state: FeatureState, evaluations: IdentityEvaluation[]) {
  const fitByName = new Map(evaluations.map((item) => [item.identity.name, item.fit]))
  const identityImpact = Math.max(0, ...question.supports.map((name) => fitByName.get(name) || 0))
  const updatePaths = question.options.flatMap((option) =>
    [...option.updates.matchAll(/([A-Z][A-Z0-9_]*(?:\.[a-z_]+)?)\s*=/gi)].map((match) => match[1]))
  const unknownBonus = [...new Set(updatePaths)].filter((path) => !state.values[path] || state.values[path].confidence < .6).length * 5
  return identityImpact + unknownBonus
}

export function nextQuestionId(answers: Answers, route: string[]): string | null {
  const state = buildFeatureState(answers)
  const evaluations = evaluateIdentities(state)
  const answered = new Set(Object.keys(answers))

  const gate = questionsByStage.gate.find((question) => !answered.has(question.id))
  if (gate) return gate.id

  const core = questionsByStage.core.find((question) => !answered.has(question.id) && eligible(question, state, evaluations))
  if (core) return core.id

  const routeCount = route.filter((id) => id.startsWith('RT')).length
  if (routeCount < 8) {
    const routeCandidate = questionsByStage.route
      .filter((question) => !answered.has(question.id) && eligible(question, state, evaluations))
      .sort((a, b) => routeScore(b, state, evaluations) - routeScore(a, state, evaluations) || a.id.localeCompare(b.id))[0]
    if (routeCandidate) return routeCandidate.id
  }

  const confirmCount = route.filter((id) => id.startsWith('CF')).length
  if (confirmCount < 3) {
    const confirmation = questionsByStage.confirm
      .filter((question) => !answered.has(question.id) && eligible(question, state, evaluations))
      .sort((a, b) => routeScore(b, state, evaluations) - routeScore(a, state, evaluations) || a.id.localeCompare(b.id))[0]
    if (confirmation) return confirmation.id
  }

  return null
}

export function progressFor(route: string[], currentIndex: number) {
  const currentId = route[currentIndex] || route[route.length - 1] || 'G01'
  const answered = Math.max(0, currentIndex)
  if (currentId.startsWith('G')) return Math.min(18, (answered / 6) * 18)
  if (currentId.startsWith('K')) return 18 + Math.min(44, (route.filter((id, index) => index < currentIndex && id.startsWith('K')).length / 18) * 44)
  if (currentId.startsWith('RT')) return 62 + Math.min(26, (route.filter((id, index) => index < currentIndex && id.startsWith('RT')).length / 8) * 26)
  return 88 + Math.min(11, (route.filter((id, index) => index < currentIndex && id.startsWith('CF')).length / 3) * 11)
}
