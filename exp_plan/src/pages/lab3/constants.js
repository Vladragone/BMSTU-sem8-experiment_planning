export const FACTOR_DEFS = [
  {
    key: 'lambda1',
    label: 'λ₁ (поступление тип 1)',
    shortLabel: 'λ₁',
    naturalName: 'λ₁',
    defaultMin: '1.0',
    defaultMax: '1.5',
  },
  {
    key: 'lambda2',
    label: 'λ₂ (поступление тип 2)',
    shortLabel: 'λ₂',
    naturalName: 'λ₂',
    defaultMin: '1.0',
    defaultMax: '2.0',
  },
  {
    key: 'mu1',
    label: 'μ₁ (обслуживание тип 1)',
    shortLabel: 'μ₁',
    naturalName: 'μ₁',
    defaultMin: '9.0',
    defaultMax: '11.0',
  },
  {
    key: 'mu2',
    label: 'μ₂ (обслуживание тип 2)',
    shortLabel: 'μ₂',
    naturalName: 'μ₂',
    defaultMin: '11.0',
    defaultMax: '13.0',
  },
]

export const FRACTION_OPTIONS = ['1/2', '1/4', '1/8']

export const DEFAULT_GENERATORS = {
  '1/2': ['x4=x1*x2*x3'],
  '1/4': ['x3=x1*x2', 'x4=x1*x3'],
  '1/8': ['x2=x1', 'x3=x1', 'x4=-x1'],
}

export const DEFAULT_LAB3_INPUTS = {
  expType: 'ПФЭ',
  fraction: '1/2',
  compareWithPfe: true,
  replications: '6',
  requestLimit: '10000',
  sigma1: '0.1',
  sigma2: '0.1',
  generators: DEFAULT_GENERATORS['1/2'].join(', '),
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
