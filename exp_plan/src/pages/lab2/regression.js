import { simulateQueue, validateParams } from '../lab1/simulation/index.js'
import { FACTOR_DEFS } from './constants.js'

const buildTerms = (includeInteractions) => {
  const terms = FACTOR_DEFS.map((factor, index) => ({
    key: factor.key,
    keys: [factor.key],
    label: `x${index + 1}`,
  }))

  if (!includeInteractions) {
    return terms
  }

  for (let i = 0; i < FACTOR_DEFS.length; i += 1) {
    for (let j = i + 1; j < FACTOR_DEFS.length; j += 1) {
      terms.push({
        key: `${FACTOR_DEFS[i].key}:${FACTOR_DEFS[j].key}`,
        keys: [FACTOR_DEFS[i].key, FACTOR_DEFS[j].key],
        label: `x${i + 1}x${j + 1}`,
      })
    }
  }

  return terms
}

const parseLab2Inputs = (inputs) => ({
  requestLimit: Number(inputs.requestLimit),
  priorityType: Number(inputs.priorityType),
  preemptionPolicy: inputs.preemptionPolicy,
  replications: Number(inputs.replications),
  comparisonReplications: Number(inputs.comparisonReplications),
  factorRanges: FACTOR_DEFS.reduce((acc, factor) => {
    acc[factor.key] = {
      min: Number(inputs.factorRanges[factor.key].min),
      max: Number(inputs.factorRanges[factor.key].max),
    }
    return acc
  }, {}),
})

export function validateLab2Inputs(parsed) {
  if (
    Number.isNaN(parsed.requestLimit) ||
    Number.isNaN(parsed.replications) ||
    Number.isNaN(parsed.comparisonReplications)
  ) {
    return 'Заполните параметры эксперимента корректными числами.'
  }

  if (!Number.isInteger(parsed.requestLimit) || parsed.requestLimit <= 0) {
    return 'Количество заявок должно быть положительным целым числом.'
  }

  if (!Number.isInteger(parsed.replications) || parsed.replications <= 0) {
    return 'Количество повторов в ПФЭ должно быть положительным целым числом.'
  }

  if (!Number.isInteger(parsed.comparisonReplications) || parsed.comparisonReplications <= 0) {
    return 'Количество повторов для сравнения должно быть положительным целым числом.'
  }

  for (const factor of FACTOR_DEFS) {
    const range = parsed.factorRanges[factor.key]

    if (Number.isNaN(range.min) || Number.isNaN(range.max)) {
      return `Для фактора ${factor.label} задайте обе границы интервала.`
    }

    if (range.min >= range.max) {
      return `Для фактора ${factor.label} нижняя граница должна быть меньше верхней.`
    }

    if ((factor.key.startsWith('lambda') || factor.key.startsWith('mu')) && range.min <= 0) {
      return `Для фактора ${factor.label} границы должны быть больше нуля.`
    }

    if (factor.key.startsWith('sigma') && range.min < 0) {
      return `Для фактора ${factor.label} нижняя граница не может быть отрицательной.`
    }
  }

  return ''
}

const createCenterDeltaMap = (factorRanges) =>
  FACTOR_DEFS.reduce(
    (acc, factor) => {
      const { min, max } = factorRanges[factor.key]
      acc.centers[factor.key] = (min + max) / 2
      acc.deltas[factor.key] = (max - min) / 2
      return acc
    },
    { centers: {}, deltas: {} },
  )

const buildDesignMatrix = (factorRanges) => {
  const runCount = 2 ** FACTOR_DEFS.length
  const partialTerms = buildTerms(true)

  return Array.from({ length: runCount }, (_, index) => {
    const coded = {}
    const natural = {}

    FACTOR_DEFS.forEach((factor, factorIndex) => {
      const level = ((index >> factorIndex) & 1) === 1 ? 1 : -1
      coded[factor.key] = level
      natural[factor.key] = level === -1 ? factorRanges[factor.key].min : factorRanges[factor.key].max
    })

    const termValues = partialTerms.reduce(
      (acc, term) => {
        acc[term.key] = term.keys.reduce((product, key) => product * coded[key], 1)
        return acc
      },
      { x0: 1 },
    )

    return { run: index + 1, coded, natural, termValues }
  })
}

const averageResponse = (natural, commonParams, responseKey, replications, seedBase) => {
  let total = 0

  for (let index = 0; index < replications; index += 1) {
    const params = {
      ...natural,
      requestLimit: commonParams.requestLimit,
      priorityType: commonParams.priorityType,
      preemptionPolicy: commonParams.preemptionPolicy,
      seed: (seedBase + index * 2654435761) >>> 0,
    }

    const validationError = validateParams(params)
    if (validationError) {
      throw new Error(validationError)
    }

    total += simulateQueue(params)[responseKey]
  }

  return total / replications
}

const calculateCoefficients = (experiments, terms) => {
  const count = experiments.length
  const coefficients = {
    b0: experiments.reduce((sum, experiment) => sum + experiment.response, 0) / count,
  }

  terms.forEach((term) => {
    coefficients[term.key] =
      experiments.reduce(
        (sum, experiment) => sum + experiment.response * experiment.termValues[term.key],
        0,
      ) / count
  })

  return coefficients
}

const predictByCoefficients = (coded, coefficients, terms) =>
  terms.reduce((sum, term) => {
    const value = term.keys.reduce((product, key) => product * coded[key], 1)
    return sum + coefficients[term.key] * value
  }, coefficients.b0)

const expandNormalizedModel = (coefficients, terms, centers, deltas) => {
  const naturalCoefficients = new Map([['', coefficients.b0]])

  const addCoefficient = (key, value) => {
    naturalCoefficients.set(key, (naturalCoefficients.get(key) ?? 0) + value)
  }

  terms.forEach((term) => {
    const normalizedCoefficient = coefficients[term.key]
    let partialProducts = [{ key: '', coefficient: normalizedCoefficient }]

    term.keys.forEach((factorKey) => {
      const nextProducts = []

      partialProducts.forEach((product) => {
        nextProducts.push({
          key: product.key ? `${product.key}:${factorKey}` : factorKey,
          coefficient: product.coefficient / deltas[factorKey],
        })
        nextProducts.push({
          key: product.key,
          coefficient: (-product.coefficient * centers[factorKey]) / deltas[factorKey],
        })
      })

      partialProducts = nextProducts
    })

    partialProducts.forEach((product) => {
      addCoefficient(product.key, product.coefficient)
    })
  })

  return {
    intercept: naturalCoefficients.get('') ?? 0,
    terms: FACTOR_DEFS.map((factor) => ({
      name: factor.naturalName,
      coefficient: naturalCoefficients.get(factor.key) ?? 0,
    })),
    interactionTerms: Array.from(naturalCoefficients.entries())
      .filter(([key]) => key && key.includes(':'))
      .map(([key, coefficient]) => ({
        factors: key.split(':').map(
          (factorKey) => FACTOR_DEFS.find((factor) => factor.key === factorKey).naturalName,
        ),
        coefficient,
      })),
  }
}

const formatEquationCoefficient = (value) => {
  const rounded = Number(value.toFixed(6))
  return Object.is(rounded, -0) ? '0' : `${rounded}`
}

const buildNormalizedEquation = (coefficients, terms) => {
  const chunks = [`ŷ = ${formatEquationCoefficient(coefficients.b0)}`]

  terms.forEach((term) => {
    const coefficient = coefficients[term.key]
    const sign = coefficient >= 0 ? '+' : '-'
    chunks.push(`${sign} ${formatEquationCoefficient(Math.abs(coefficient))}${term.label}`)
  })

  return chunks.join(' ')
}

const buildNaturalEquation = (model) => {
  const chunks = [`ŷ = ${formatEquationCoefficient(model.intercept)}`]

  model.terms.forEach((term) => {
    const sign = term.coefficient >= 0 ? '+' : '-'
    chunks.push(`${sign} ${formatEquationCoefficient(Math.abs(term.coefficient))}${term.name}`)
  })

  model.interactionTerms.forEach((term) => {
    const sign = term.coefficient >= 0 ? '+' : '-'
    chunks.push(
      `${sign} ${formatEquationCoefficient(Math.abs(term.coefficient))}${term.factors.join('')}`,
    )
  })

  return chunks.join(' ')
}

const attachPredictions = (experiments, coefficients, terms) =>
  experiments.map((experiment) => {
    const predicted = predictByCoefficients(experiment.coded, coefficients, terms)
    return {
      ...experiment,
      predicted,
      error: predicted - experiment.response,
    }
  })

export function runFullFactorExperiment(inputs, responseKey) {
  const parsed = parseLab2Inputs(inputs)
  const validationError = validateLab2Inputs(parsed)

  if (validationError) {
    return { error: validationError }
  }

  const { centers, deltas } = createCenterDeltaMap(parsed.factorRanges)
  const linearTerms = buildTerms(false)
  const partialTerms = buildTerms(true)

  let experiments

  try {
    experiments = buildDesignMatrix(parsed.factorRanges).map((row, index) => ({
      ...row,
      response: averageResponse(
        row.natural,
        parsed,
        responseKey,
        parsed.replications,
        123456789 + index * 977,
      ),
    }))
  } catch (error) {
    return { error: error.message }
  }

  const linearCoefficients = calculateCoefficients(experiments, linearTerms)
  const partialCoefficients = calculateCoefficients(experiments, partialTerms)

  return {
    error: '',
    parsed,
    centers,
    deltas,
    experiments,
    linear: {
      terms: linearTerms,
      coefficients: linearCoefficients,
      normalizedEquation: buildNormalizedEquation(linearCoefficients, linearTerms),
      naturalEquation: buildNaturalEquation(
        expandNormalizedModel(linearCoefficients, linearTerms, centers, deltas),
      ),
      experiments: attachPredictions(experiments, linearCoefficients, linearTerms),
    },
    partial: {
      terms: partialTerms,
      coefficients: partialCoefficients,
      normalizedEquation: buildNormalizedEquation(partialCoefficients, partialTerms),
      naturalEquation: buildNaturalEquation(
        expandNormalizedModel(partialCoefficients, partialTerms, centers, deltas),
      ),
      experiments: attachPredictions(experiments, partialCoefficients, partialTerms),
    },
  }
}

export function compareAtCenter(inputs, responseKey, modelType = 'partial') {
  const experimentResult = runFullFactorExperiment(inputs, responseKey)
  if (experimentResult.error) {
    return experimentResult
  }

  const { parsed, centers, deltas } = experimentResult
  const model = modelType === 'linear' ? experimentResult.linear : experimentResult.partial
  const comparisonPoint = { ...centers }

  const coded = FACTOR_DEFS.reduce((acc, factor) => {
    acc[factor.key] =
      deltas[factor.key] === 0
        ? 0
        : (comparisonPoint[factor.key] - centers[factor.key]) / deltas[factor.key]
    return acc
  }, {})

  let actual

  try {
    actual = averageResponse(
      comparisonPoint,
      parsed,
      responseKey,
      parsed.comparisonReplications,
      987654321,
    )
  } catch (error) {
    return { error: error.message }
  }

  const predicted = predictByCoefficients(coded, model.coefficients, model.terms)

  return {
    error: '',
    comparisonPoint,
    predicted,
    actual,
    errorValue: predicted - actual,
  }
}
