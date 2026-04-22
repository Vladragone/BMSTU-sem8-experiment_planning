import { createRng } from '../lab1/simulation/rng'
import { FACTOR_DEFS } from './constants'

const BASE_SEEDS = {
  lambda1: 412,
  lambda2: 38212,
  mu1: 3632,
  mu2: 822383,
}

const FACTORIAL_LEVELS = [-1, 1]
const N0 = 16
const STAR_RUNS = N0 + FACTOR_DEFS.length * 2 + 1
export const NORMALIZING_A = Math.sqrt(N0 / STAR_RUNS)
export const STAR_ALPHA = 2 / Math.sqrt((Math.sqrt(N0 * STAR_RUNS) - N0) / 2)

const INTERACTION_PAIRS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
]

const EPS = 1e-9

function parseNumber(value, label, { allowZero = false } = {}) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`${label}: требуется ${allowZero ? 'неотрицательное' : 'положительное'} число.`)
  }
  return parsed
}

function parseFiniteNumber(value, label) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label}: требуется числовое значение.`)
  }
  return parsed
}

function createRange(minValue, maxValue, label) {
  const min = Number(minValue)
  const max = Number(maxValue)

  if (!Number.isFinite(min) || !Number.isFinite(max) || Math.abs(max - min) < EPS) {
    throw new Error(`${label}: границы диапазона заданы неверно.`)
  }

  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const center = (low + high) / 2
  const interval = (high - low) / 2

  return {
    low,
    high,
    center,
    interval,
    fromNormalized(value) {
      return center + interval * value
    },
    toNormalized(value) {
      return (value - center) / interval
    },
  }
}

function sampleRayleigh(lambda, rng) {
  const sigma = 1 / (lambda * Math.sqrt(Math.PI / 2))
  const u = Math.max(rng(), Number.MIN_VALUE)
  return sigma * Math.sqrt(-2 * Math.log(1 - u))
}

function sampleUniformByLambdaSigma(lambda, sigma, rng) {
  const mean = 1 / lambda
  const halfInterval = (sigma * Math.sqrt(12)) / 2
  let a = mean - halfInterval
  let b = mean + halfInterval

  if (a < 0) {
    a = 0
    b = 2 * mean
  }

  return a + (b - a) * rng()
}

function simulateQueuePoint(params, seedOffset = 0) {
  const { lambda1, lambda2, mu1, mu2, sigma1, sigma2, requestLimit } = params

  const rngArrival1 = createRng(BASE_SEEDS.lambda1 + seedOffset)
  const rngArrival2 = createRng(BASE_SEEDS.lambda2 + seedOffset)
  const rngService1 = createRng(BASE_SEEDS.mu1 + seedOffset)
  const rngService2 = createRng(BASE_SEEDS.mu2 + seedOffset)

  const queue = []

  let now = 0
  let processed = 0
  let waitSum = 0
  let nextArrival1 = sampleRayleigh(lambda1, rngArrival1)
  let nextArrival2 = sampleRayleigh(lambda2, rngArrival2)
  let server = null

  const getServiceTime = (type) =>
    type === 1
      ? sampleUniformByLambdaSigma(mu1, sigma1, rngService1)
      : sampleUniformByLambdaSigma(mu2, sigma2, rngService2)

  const startService = (job) => {
    waitSum += now - job.arrivalTime
    server = {
      type: job.type,
      completionTime: now + getServiceTime(job.type),
    }
  }

  while (processed < requestLimit) {
    const nextCompletion = server ? server.completionTime : Number.POSITIVE_INFINITY
    const nextEventTime = Math.min(nextArrival1, nextArrival2, nextCompletion)

    if (!Number.isFinite(nextEventTime)) {
      break
    }

    now = nextEventTime

    if (server && Math.abs(server.completionTime - now) < EPS) {
      processed += 1
      server = null

      if (processed >= requestLimit) {
        break
      }
    }

    if (Math.abs(nextArrival1 - now) < EPS) {
      queue.push({ type: 1, arrivalTime: now })
      nextArrival1 = now + sampleRayleigh(lambda1, rngArrival1)
    }

    if (Math.abs(nextArrival2 - now) < EPS) {
      queue.push({ type: 2, arrivalTime: now })
      nextArrival2 = now + sampleRayleigh(lambda2, rngArrival2)
    }

    if (!server && queue.length > 0) {
      startService(queue.shift())
    }
  }

  return processed > 0 ? waitSum / processed : 0
}

function buildStarTerms(labels, { expandedSquares = false } = {}) {
  const terms = []

  labels.forEach((label, index) => {
    terms.push({
      key: `b${terms.length + 1}`,
      label,
      getValue: (values) => values[index],
    })
  })

  INTERACTION_PAIRS.forEach(([left, right]) => {
    terms.push({
      key: `b${terms.length + 1}`,
      label: `${labels[left]}*${labels[right]}`,
      getValue: (values) => values[left] * values[right],
    })
  })

  labels.forEach((label, index) => {
    terms.push({
      key: `b${terms.length + 1}`,
      label: expandedSquares ? `${label}²` : `(${label}² - ${NORMALIZING_A.toFixed(4)})`,
      getValue: (values) =>
        expandedSquares ? values[index] * values[index] : values[index] * values[index] - NORMALIZING_A,
      squareIndex: index,
    })
  })

  return terms
}

function getDesignRows(ranges) {
  const factorialRows = []

  for (const x1 of FACTORIAL_LEVELS) {
    for (const x2 of FACTORIAL_LEVELS) {
      for (const x3 of FACTORIAL_LEVELS) {
        for (const x4 of FACTORIAL_LEVELS) {
          factorialRows.push([x1, x2, x3, x4])
        }
      }
    }
  }

  const starRows = FACTOR_DEFS.flatMap((_, index) => {
    const negative = [0, 0, 0, 0]
    const positive = [0, 0, 0, 0]
    negative[index] = -STAR_ALPHA
    positive[index] = STAR_ALPHA
    return [negative, positive]
  })

  const allRows = [...factorialRows, ...starRows, [0, 0, 0, 0]]

  return allRows.map((normalized, index) => ({
    expNum: index + 1,
    normalized,
    natural: FACTOR_DEFS.map((factor, factorIndex) =>
      ranges[factor.key].fromNormalized(normalized[factorIndex]),
    ),
  }))
}

function transpose(matrix) {
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]))
}

function multiplyMatrices(left, right) {
  return left.map((row) =>
    right[0].map((_, columnIndex) =>
      row.reduce((sum, value, index) => sum + value * right[index][columnIndex], 0),
    ),
  )
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0))
}

function solveLinearSystem(matrix, vector) {
  const size = matrix.length
  const augmented = matrix.map((row, index) => [...row, vector[index]])

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < EPS) {
      throw new Error('Не удалось решить систему уравнений для регрессии.')
    }

    if (maxRow !== pivot) {
      ;[augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]]
    }

    const pivotValue = augmented[pivot][pivot]
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue
      }

      const factor = augmented[row][pivot]
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column]
      }
    }
  }

  return augmented.map((row) => row[size])
}

function solveLeastSquares(matrix, response) {
  const transposed = transpose(matrix)
  const normalMatrix = multiplyMatrices(transposed, matrix)
  const normalVector = multiplyMatrixVector(transposed, response)
  return solveLinearSystem(normalMatrix, normalVector)
}

function buildRegressionMatrix(rows, terms, getValues) {
  return rows.map((row) => {
    const values = getValues(row)
    return [1, ...terms.map((term) => term.getValue(values))]
  })
}

function predictByCoefficients(coefficients, terms, values) {
  return terms.reduce((sum, term, index) => sum + coefficients[index + 1] * term.getValue(values), coefficients[0])
}

function formatCoefficient(value) {
  if (Math.abs(value) < 1e-10) {
    return '0'
  }
  return Number(value.toFixed(6)).toString()
}

function formatEquation(coefficients, terms, { expandSquares = false } = {}) {
  const parts = []
  let intercept = coefficients[0]

  if (expandSquares) {
    terms.forEach((term, index) => {
      if (typeof term.squareIndex === 'number') {
        intercept -= coefficients[index + 1] * NORMALIZING_A
      }
    })
  }

  parts.push(formatCoefficient(intercept))

  terms.forEach((term, index) => {
    const coefficient = coefficients[index + 1]
    if (Math.abs(coefficient) < 1e-10) {
      return
    }

    const sign = coefficient >= 0 ? '+' : '-'
    const label =
      expandSquares && typeof term.squareIndex === 'number'
        ? term.label.replace(` - ${NORMALIZING_A.toFixed(4)}`, '')
        : term.label
    parts.push(`${sign} ${formatCoefficient(Math.abs(coefficient))}*${label}`)
  })

  return `y = ${parts.join(' ')}`
}

function buildCoefficientRows(coefficients, terms) {
  return [
    { key: 'b0', name: 'b0', value: coefficients[0] },
    ...terms.map((term, index) => ({
      key: term.key,
      name: `${term.key} (${term.label})`,
      value: coefficients[index + 1],
    })),
  ]
}

function buildModel(rows, valuesSelector, labels, options = {}) {
  const terms = buildStarTerms(labels, options)
  const matrix = buildRegressionMatrix(rows, terms, valuesSelector)
  const response = rows.map((row) => row.yMean)
  const coefficients = solveLeastSquares(matrix, response)

  return {
    coefficients,
    coefficientRows: buildCoefficientRows(coefficients, terms),
    equation: formatEquation(coefficients, terms, options),
    predict(values) {
      return predictByCoefficients(coefficients, terms, values)
    },
  }
}

function parseInputs(inputs) {
  const replications = Math.trunc(parseNumber(inputs.replications, 'Количество повторов'))
  const requestLimit = Math.trunc(parseNumber(inputs.requestLimit, 'Лимит обработанных заявок'))
  const sigma1 = parseNumber(inputs.sigma1, 'σ1', { allowZero: true })
  const sigma2 = parseNumber(inputs.sigma2, 'σ2', { allowZero: true })

  const ranges = FACTOR_DEFS.reduce((acc, factor) => {
    acc[factor.key] = createRange(
      inputs.factorRanges[factor.key].min,
      inputs.factorRanges[factor.key].max,
      factor.label,
    )
    return acc
  }, {})

  return {
    replications,
    requestLimit,
    sigma1,
    sigma2,
    ranges,
  }
}

function calculateRowResponse(row, parsed, rowIndex) {
  const point = {
    lambda1: row.natural[0],
    lambda2: row.natural[1],
    mu1: row.natural[2],
    mu2: row.natural[3],
    sigma1: parsed.sigma1,
    sigma2: parsed.sigma2,
    requestLimit: parsed.requestLimit,
  }

  let total = 0
  for (let replication = 0; replication < parsed.replications; replication += 1) {
    total += simulateQueuePoint(point, rowIndex * 1000 + replication * 17)
  }

  return total / parsed.replications
}

function mapResultRows(rows, normalizedModel, naturalModel) {
  return rows.map((row) => {
    const yNormalized = normalizedModel.predict(row.normalized)
    const yNatural = naturalModel.predict(row.natural)

    return {
      ...row,
      yNormalized,
      yNatural,
      errorNormalized: Math.abs(yNormalized - row.yMean),
      errorNatural: Math.abs(yNatural - row.yMean),
      relErrorNormalizedPerc: Math.abs(row.yMean) < EPS ? 0 : (Math.abs(yNormalized - row.yMean) / Math.abs(row.yMean)) * 100,
      relErrorNaturalPerc: Math.abs(row.yMean) < EPS ? 0 : (Math.abs(yNatural - row.yMean) / Math.abs(row.yMean)) * 100,
    }
  })
}

export function runLab4Experiment(inputs) {
  try {
    const parsed = parseInputs(inputs)
    const rows = getDesignRows(parsed.ranges).map((row, index) => ({
      ...row,
      yMean: calculateRowResponse(row, parsed, index + 1),
    }))

    const normalizedModel = buildModel(rows, (row) => row.normalized, FACTOR_DEFS.map((factor) => factor.codeLabel))
    const naturalModel = buildModel(
      rows,
      (row) => row.natural,
      FACTOR_DEFS.map((factor) => factor.naturalLabel),
      { expandedSquares: true },
    )

    return {
      parsed,
      constants: {
        a: NORMALIZING_A,
        alpha: STAR_ALPHA,
        runCount: rows.length,
      },
      normalizedModel,
      naturalModel,
      rows: mapResultRows(rows, normalizedModel, naturalModel),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Не удалось выполнить расчёт.',
    }
  }
}

export function validateLab4Point(result, validationPoint) {
  try {
    const normalized = FACTOR_DEFS.map((factor) =>
      parseFiniteNumber(validationPoint[factor.key] ?? '0', factor.codeLabel),
    )

    if (normalized.some((value) => Math.abs(value) > STAR_ALPHA + EPS)) {
      throw new Error(`Координаты точки должны лежать в пределах от -${STAR_ALPHA.toFixed(3)} до ${STAR_ALPHA.toFixed(3)}.`)
    }

    const natural = FACTOR_DEFS.map((factor, index) =>
      result.parsed.ranges[factor.key].fromNormalized(normalized[index]),
    )

    let total = 0
    for (let replication = 0; replication < result.parsed.replications; replication += 1) {
      total += simulateQueuePoint(
        {
          lambda1: natural[0],
          lambda2: natural[1],
          mu1: natural[2],
          mu2: natural[3],
          sigma1: result.parsed.sigma1,
          sigma2: result.parsed.sigma2,
          requestLimit: result.parsed.requestLimit,
        },
        900000 + replication * 31,
      )
    }

    const actual = total / result.parsed.replications
    const predictedNormalized = result.normalizedModel.predict(normalized)
    const predictedNatural = result.naturalModel.predict(natural)

    return {
      normalized,
      natural,
      actual,
      predictedNormalized,
      predictedNatural,
      errorNormalized: Math.abs(predictedNormalized - actual),
      errorNatural: Math.abs(predictedNatural - actual),
      text: [
        `Нормированная точка: (${normalized.map((value) => value.toFixed(4)).join('; ')})`,
        `Натуральная точка: (${natural.map((value) => value.toFixed(4)).join('; ')})`,
        `ŷ по нормированной модели = ${predictedNormalized.toFixed(6)}`,
        `ŷ по натуральной модели = ${predictedNatural.toFixed(6)}`,
        `y по имитации = ${actual.toFixed(6)}`,
        `|Δ норм| = ${Math.abs(predictedNormalized - actual).toFixed(6)}`,
        `|Δ натур| = ${Math.abs(predictedNatural - actual).toFixed(6)}`,
      ].join('\n'),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Не удалось проверить точку.',
    }
  }
}
