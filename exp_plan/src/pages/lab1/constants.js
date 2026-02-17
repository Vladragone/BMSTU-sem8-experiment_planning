export const DEFAULT_INPUTS = {
  lambda1: '0.28',
  lambda2: '0.22',
  mu1: '0.95',
  mu2: '1.15',
  sigma1: '0.08',
  sigma2: '0.10',
  timeLimit: '30000',
  priorityType: '1',
  preemptionPolicy: 'queue',
}

export const EPS = 1e-9

export const CURVE_SCALES = [0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.45]

export const CURVE_DEFS = [
  { key: 'lambda1', label: 't ожидания от λ1' },
  { key: 'lambda2', label: 't ожидания от λ2' },
  { key: 'mu1', label: 't ожидания от μ1' },
  { key: 'mu2', label: 't ожидания от μ2' },
  { key: 'R', label: 't ожидания от R' },
]
