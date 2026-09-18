export type DomainId = 'R' | 'C' | 'I' | 'S'
export type DomainState = 'ACTIVE' | 'LOW' | 'NONE' | 'SELF_LIMIT' | 'UNKNOWN'
export type QuestionStage = 'gate' | 'core' | 'route' | 'confirm'
export type EvidenceLevel = 'E1' | 'E2' | 'E3'
export type IdentityLevel = 'main' | 'branch' | 'rare_composite' | 'hidden'
export type IdentityRarity = 'gold' | 'purple' | 'none'

export interface QuestionOption {
  id: string
  label: string
  updates: string
  evidence: EvidenceLevel
  special?: 'NONE' | 'NA'
}

export interface Question {
  id: string
  stage: QuestionStage
  type: string
  prompt: string
  options: QuestionOption[]
  routeIf: string
  skipIf: string
  multiple: boolean
  min: number
  max: number
  supports: string[]
  whyTemplate: string
}

export type AnswerValue = string | string[]
export type Answers = Record<string, AnswerValue>

export interface Observation {
  questionId: string
  optionId: string
  path: string
  value: number | string | null
  evidence: EvidenceLevel
  label: string
  whyTemplate: string
}

export interface FeatureValue {
  value: number | string | null
  confidence: number
  evidenceCount: number
  questionIds: string[]
  state: 'VALUE' | 'NA' | 'UNKNOWN'
}

export interface FeatureState {
  values: Record<string, FeatureValue>
  domains: Record<DomainId, DomainState>
  observations: Observation[]
  answeredCount: number
}

export interface IdentityCondition {
  path: string
  direction?: 'high' | 'low'
  threshold?: number
  weight?: number
}

export interface IdentityDefinition {
  id: string
  ordinal: number
  name: string
  familyId: string
  familyName: string
  level: IdentityLevel
  mask: string
  formula: string
  summary: string
  typicalBehaviors: string[]
  resonanceQuote: string
  longDescription: string
  image?: string
  thumbnailImage?: string
  conditions: IdentityCondition[]
  parentId?: string
  requiredDirect?: string
  replaceParent?: boolean
  theme: [string, string]
}

export type IdentityStatus =
  | 'INELIGIBLE'
  | 'LOW_EVIDENCE'
  | 'CANDIDATE'
  | 'PURPLE'
  | 'GOLD'
  | 'REJECTED'
  | 'SUPPRESSED_BY_CHILD'
  | 'SUPPRESSED_BY_DEDUP'

export interface EvidenceItem {
  questionId: string
  label: string
  evidence: EvidenceLevel
  paths: string[]
}

export interface IdentityEvaluation {
  identity: IdentityDefinition
  fit: number
  evidenceConfidence: number
  distinctEvidenceItems: number
  status: IdentityStatus
  rarity: IdentityRarity
  evidenceItems: EvidenceItem[]
  rankScore: number
  reason?: string
}

export interface QuizResult {
  primary: IdentityEvaluation
  gold: IdentityEvaluation[]
  purple: IdentityEvaluation[]
  suppressed: IdentityEvaluation[]
  allEvaluations: IdentityEvaluation[]
  featureState: FeatureState
  completedAt: string
  versions: {
    identity: '0.6.1'
    feature: '0.1'
    questionBank: '0.1'
    engine: '1.0'
  }
}

export interface IdentityEvaluationSnapshot {
  identityId: string
  fit: number
  evidenceConfidence: number
  distinctEvidenceItems: number
  status: IdentityStatus
  rarity: IdentityRarity
  evidenceItems: EvidenceItem[]
  rankScore: number
  reason?: string
}

export interface ResultSnapshot {
  primary: IdentityEvaluationSnapshot
  gold: IdentityEvaluationSnapshot[]
  purple: IdentityEvaluationSnapshot[]
  suppressed: IdentityEvaluationSnapshot[]
  completedAt: string
  versions: QuizResult['versions']
}

export interface QuizState {
  version: 6
  currentIndex: number
  route: string[]
  answers: Answers
  startedAt: string
  completed: boolean
  revealSeen: boolean
  resultSnapshot?: ResultSnapshot
}
