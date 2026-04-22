export const FACTOR_DEFS = [
  {
    key: 'lambda1',
    codeLabel: 'x1',
    naturalLabel: 'λ1',
    label: 'λ1 — интенсивность генератора 1',
    defaultMin: '0.1',
    defaultMax: '0.5',
  },
  {
    key: 'lambda2',
    codeLabel: 'x2',
    naturalLabel: 'λ2',
    label: 'λ2 — интенсивность генератора 2',
    defaultMin: '0.1',
    defaultMax: '0.5',
  },
  {
    key: 'mu1',
    codeLabel: 'x3',
    naturalLabel: 'μ1',
    label: 'μ1 — интенсивность обслуживания 1',
    defaultMin: '1.2',
    defaultMax: '1.6',
  },
  {
    key: 'mu2',
    codeLabel: 'x4',
    naturalLabel: 'μ2',
    label: 'μ2 — интенсивность обслуживания 2',
    defaultMin: '1.2',
    defaultMax: '1.6',
  },
]

export const DEFAULT_LAB4_INPUTS = {
  replications: '30',
  requestLimit: '500',
  sigma1: '0.02',
  sigma2: '0.02',
  factorRanges: FACTOR_DEFS.reduce((acc, factor) => {
    acc[factor.key] = {
      min: factor.defaultMin,
      max: factor.defaultMax,
    }
    return acc
  }, {}),
  validationPoint: FACTOR_DEFS.reduce((acc, factor) => {
    acc[factor.key] = '0'
    return acc
  }, {}),
}
