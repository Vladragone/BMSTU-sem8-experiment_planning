export function parseInputs(inputs, seed) {
  const hasTimeLimit = inputs.timeLimit !== undefined && inputs.timeLimit !== ''
  const hasRequestLimit = inputs.requestLimit !== undefined && inputs.requestLimit !== ''

  return {
    lambda1: Number(inputs.lambda1),
    lambda2: Number(inputs.lambda2),
    mu1: Number(inputs.mu1),
    mu2: Number(inputs.mu2),
    sigma1: Number(inputs.sigma1),
    sigma2: Number(inputs.sigma2),
    timeLimit: hasTimeLimit ? Number(inputs.timeLimit) : undefined,
    requestLimit: hasRequestLimit ? Number(inputs.requestLimit) : undefined,
    priorityType: Number(inputs.priorityType),
    preemptionPolicy: inputs.preemptionPolicy,
    seed,
  }
}

export function validateParams(params) {
  const numericValues = [
    params.lambda1,
    params.lambda2,
    params.mu1,
    params.mu2,
    params.sigma1,
    params.sigma2,
  ]

  if (
    numericValues.some((value) => Number.isNaN(value)) ||
    (params.timeLimit !== undefined && Number.isNaN(params.timeLimit)) ||
    (params.requestLimit !== undefined && Number.isNaN(params.requestLimit))
  ) {
    return 'Заполните все числовые поля корректными значениями.'
  }

  if (params.lambda1 <= 0 || params.lambda2 <= 0 || params.mu1 <= 0 || params.mu2 <= 0) {
    return 'Интенсивности λ и μ должны быть больше нуля.'
  }

  if (params.sigma1 < 0 || params.sigma2 < 0) {
    return 'СКО обслуживания не может быть отрицательным.'
  }

  if (params.timeLimit === undefined && params.requestLimit === undefined) {
    return 'Задайте либо время моделирования, либо количество заявок.'
  }

  if (params.timeLimit !== undefined && params.timeLimit <= 0) {
    return 'Время моделирования должно быть больше нуля.'
  }

  if (
    params.requestLimit !== undefined &&
    (!Number.isInteger(params.requestLimit) || params.requestLimit <= 0)
  ) {
    return 'Количество заявок должно быть положительным целым числом.'
  }

  return ''
}

export function calculateServiceMeans(mu1, mu2) {
  return {
    serviceMean1: mu1 > 0 ? 1 / mu1 : 0,
    serviceMean2: mu2 > 0 ? 1 / mu2 : 0,
  }
}
