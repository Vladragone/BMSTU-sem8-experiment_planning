import { DEFAULT_INPUTS } from '../lab1/constants'

const createRange = (center, spread) => ({
  min: (center - spread).toFixed(3),
  max: (center + spread).toFixed(3),
})

export const FACTOR_DEFS = [
  {
    key: 'lambda1',
    label: 'λ1',
    description: 'Интенсивность поступления заявок типа 1',
    naturalName: 'λ1',
    range: createRange(Number(DEFAULT_INPUTS.lambda1), 0.06),
  },
  {
    key: 'lambda2',
    label: 'λ2',
    description: 'Интенсивность поступления заявок типа 2',
    naturalName: 'λ2',
    range: createRange(Number(DEFAULT_INPUTS.lambda2), 0.06),
  },
  {
    key: 'mu1',
    label: 'μ1',
    description: 'Интенсивность обслуживания заявок типа 1',
    naturalName: 'μ1',
    range: createRange(Number(DEFAULT_INPUTS.mu1), 0.2),
  },
  {
    key: 'mu2',
    label: 'μ2',
    description: 'Интенсивность обслуживания заявок типа 2',
    naturalName: 'μ2',
    range: createRange(Number(DEFAULT_INPUTS.mu2), 0.2),
  },
  {
    key: 'sigma1',
    label: 'σ1',
    description: 'Среднеквадратическое отклонение обслуживания типа 1',
    naturalName: 'σ1',
    range: createRange(Number(DEFAULT_INPUTS.sigma1), 0.03),
  },
  {
    key: 'sigma2',
    label: 'σ2',
    description: 'Среднеквадратическое отклонение обслуживания типа 2',
    naturalName: 'σ2',
    range: createRange(Number(DEFAULT_INPUTS.sigma2), 0.03),
  },
]

export const DEFAULT_LAB2_INPUTS = {
  timeLimit: DEFAULT_INPUTS.timeLimit,
  priorityType: DEFAULT_INPUTS.priorityType,
  preemptionPolicy: DEFAULT_INPUTS.preemptionPolicy,
  replications: '3',
  comparisonReplications: '1',
  factorRanges: FACTOR_DEFS.reduce((acc, factor) => {
    acc[factor.key] = { ...factor.range }
    return acc
  }, {}),
}

export const RESPONSE_OPTIONS = [
  { key: 'avgWaitOverall', label: 'Среднее время ожидания' },
  { key: 'avgStayOverall', label: 'Среднее время пребывания' },
]
