import { DEFAULT_GENERATORS, FACTOR_DEFS } from './constants'
import { simulateQueue } from './simulation'

const EPS = 1e-9

const factorIndexMap = FACTOR_DEFS.reduce((acc, factor, index) => {
  acc[factor.key] = index
  return acc
}, {})

const subscripts = { 1: '₁', 2: '₂', 3: '₃', 4: '₄' }

const formatSigned = (value, digits = 6) => {
  const rounded = Number(value.toFixed(digits))
  if (Object.is(rounded, -0)) {
    return '0.000000'
  }
  return rounded.toFixed(digits)
}

const sortEffect = (effect) => effect.slice().sort((left, right) => factorIndexMap[left] - factorIndexMap[right])

const effectKey = (effect) => sortEffect(effect).join('|')

const getFactorName = (effect) =>
  effect.length === 0
    ? 'b₀'
    : `b${sortEffect(effect)
        .map((name) => factorIndexMap[name] + 1)
        .join('')}`

const normalizedSymbol = (name) => `x${subscripts[factorIndexMap[name] + 1]}`

const naturalSymbol = (name) => FACTOR_DEFS.find((factor) => factor.key === name)?.naturalName ?? name

const parseNumber = (value) => Number(value)

const getCentersAndDeltas = (factors) =>
  FACTOR_DEFS.reduce(
    (acc, factor) => {
      const [minValue, maxValue] = factors[factor.key]
      acc.centers[factor.key] = (minValue + maxValue) / 2
      acc.deltas[factor.key] = (maxValue - minValue) / 2
      return acc
    },
    { centers: {}, deltas: {} },
  )

const normalizedToNatural = (normRow, factorNames, factors) =>
  factorNames.reduce((acc, name, index) => {
    const [minValue, maxValue] = factors[name]
    const center = (minValue + maxValue) / 2
    const delta = (maxValue - minValue) / 2
    acc[name] = center + delta * normRow[index]
    return acc
  }, {})

const xorEffects = (left, right) => {
  const result = new Set(left)
  right.forEach((item) => {
    if (result.has(item)) {
      result.delete(item)
    } else {
      result.add(item)
    }
  })
  return sortEffect([...result])
}

function getAllEffects(factorNames) {
  const effects = [[]]
  const total = 1 << factorNames.length

  for (let mask = 1; mask < total; mask += 1) {
    const effect = []
    factorNames.forEach((name, index) => {
      if ((mask & (1 << index)) !== 0) {
        effect.push(name)
      }
    })
    effects.push(effect)
  }

  return effects
}

function getFeatureValue(normRow, factorNames, feature) {
  if (feature.length === 0) {
    return 1
  }

  return feature.reduce((product, name) => product * normRow[factorNames.indexOf(name)], 1)
}

function calculateNaturalCoefficients(normCoefficients, factorNames, factors) {
  const naturalCoefficients = new Map()
  const { centers, deltas } = getCentersAndDeltas(factors)

  normCoefficients.forEach((normValue, key) => {
    const normFactors = key ? key.split('|') : []
    let currentPoly = new Map([['', normValue]])

    normFactors.forEach((factorName) => {
      const nextPoly = new Map()

      currentPoly.forEach((termCoef, termKey) => {
        const termFactors = termKey ? termKey.split('|') : []
        const withFactor = effectKey([...termFactors, factorName])
        nextPoly.set(withFactor, (nextPoly.get(withFactor) ?? 0) + termCoef / deltas[factorName])
        nextPoly.set(
          termKey,
          (nextPoly.get(termKey) ?? 0) - (termCoef * centers[factorName]) / deltas[factorName],
        )
      })

      currentPoly = nextPoly
    })

    currentPoly.forEach((termCoef, termKey) => {
      naturalCoefficients.set(termKey, (naturalCoefficients.get(termKey) ?? 0) + termCoef)
    })
  })

  return naturalCoefficients
}

function getRegressionEquationString(coefficients, factorNames, natural = false) {
  const keys = [...coefficients.keys()].sort((left, right) => {
    const leftParts = left ? left.split('|') : []
    const rightParts = right ? right.split('|') : []
    if (leftParts.length !== rightParts.length) {
      return leftParts.length - rightParts.length
    }
    return left.localeCompare(right)
  })

  const chunks = [`y = ${Number((coefficients.get('') ?? 0).toFixed(4))}`]

  keys.forEach((key) => {
    if (!key) {
      return
    }

    const coefficient = coefficients.get(key) ?? 0
    if (Math.abs(coefficient) < EPS) {
      return
    }

    const names = key.split('|')
    const symbols = natural
      ? names.map((name) => naturalSymbol(name)).join('·')
      : names.map((name) => normalizedSymbol(name)).join('·')
    const sign = coefficient < 0 ? ' - ' : ' + '
    chunks.push(`${sign}${Math.abs(coefficient).toFixed(4)}·${symbols}`)
  })

  return chunks.join('')
}

function predictByNaturalCoefficients(naturalCoefficients, naturalValues) {
  let prediction = 0

  naturalCoefficients.forEach((coefficient, key) => {
    const names = key ? key.split('|') : []
    const termValue = names.reduce((product, name) => product * naturalValues[name], coefficient)
    prediction += termValue
  })

  return Math.max(0, prediction)
}

function getCoefficientEntries(coefficients) {
  return [...coefficients.entries()]
    .sort((left, right) => {
      const leftParts = left[0] ? left[0].split('|') : []
      const rightParts = right[0] ? right[0].split('|') : []
      if (leftParts.length !== rightParts.length) {
        return leftParts.length - rightParts.length
      }
      return left[0].localeCompare(right[0])
    })
    .map(([key, value]) => ({
      key,
      name: getFactorName(key ? key.split('|') : []),
      value,
    }))
}

function createFullFactorialDesign(factorNames) {
  const total = 2 ** factorNames.length
  return Array.from({ length: total }, (_, rowIndex) =>
    factorNames.map((_, factorIndex) => (((rowIndex >> factorIndex) & 1) === 1 ? 1 : -1)),
  )
}

function parseGenerators(generatorsText) {
  const generators = generatorsText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return generators.map((generator) => {
    const normalized = generator.replaceAll(' ', '').toLowerCase()
    const [targetPart, sourcePart] = normalized.split('=')

    if (!targetPart || !sourcePart || !targetPart.startsWith('x')) {
      throw new Error(`Неверный формат генератора: "${generator}".`)
    }

    const targetIndex = Number(targetPart.slice(1)) - 1
    const sources = [...sourcePart.matchAll(/(-?x\d+)/g)].map((match) => {
      const term = match[1]
      const sign = term.startsWith('-') ? -1 : 1
      const index = Number(term.replace('-', '').slice(1)) - 1
      return { index, sign }
    })

    return {
      raw: generator,
      targetIndex,
      sources,
    }
  })
}

function getDefiningRelations(factorNames, generators) {
  if (generators.length === 0) {
    return []
  }

  const fullRelations = new Map()

  generators.forEach((generator) => {
    const relation = sortEffect([
      factorNames[generator.targetIndex],
      ...generator.sources.map((source) => factorNames[source.index]),
    ])
    fullRelations.set(effectKey(relation), relation)
  })

  let changed = true
  while (changed) {
    changed = false
    const existing = [...fullRelations.values()]

    existing.forEach((left) => {
      existing.forEach((right) => {
        const relation = xorEffects(left, right)
        if (relation.length === 0) {
          return
        }
        const key = effectKey(relation)
        if (!fullRelations.has(key)) {
          fullRelations.set(key, relation)
          changed = true
        }
      })
    })
  }

  return [...fullRelations.values()].sort((left, right) => left.length - right.length || effectKey(left).localeCompare(effectKey(right)))
}

function createFractionalDesign(factorNames, pValue, generators) {
  const baseK = factorNames.length - pValue
  const rowCount = 2 ** baseK
  const generatedIndices = new Set(generators.map((generator) => generator.targetIndex))
  let baseIndices = factorNames.map((_, index) => index).filter((index) => !generatedIndices.has(index))

  if (baseIndices.length < baseK) {
    baseIndices = Array.from({ length: baseK }, (_, index) => index)
  }

  const matrix = Array.from({ length: rowCount }, () => Array.from({ length: factorNames.length }, () => 1))

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    baseIndices.forEach((factorIndex, baseIndex) => {
      matrix[rowIndex][factorIndex] = ((rowIndex >> baseIndex) & 1) === 1 ? 1 : -1
    })

    generators.forEach((generator) => {
      matrix[rowIndex][generator.targetIndex] = generator.sources.reduce(
        (product, source) => product * matrix[rowIndex][source.index] * source.sign,
        1,
      )
    })
  }

  return matrix
}

function runExperimentMatrix({ matrix, factorNames, factors, replications, sigma1, sigma2, limitValue, features }) {
  const yValues = []
  const results = matrix.map((normRow, index) => {
    const naturalValues = normalizedToNatural(normRow, factorNames, factors)
    let total = 0

    for (let replication = 0; replication < replications; replication += 1) {
      total += simulateQueue({
        ...naturalValues,
        sigma1,
        sigma2,
        limitValue,
      }).avg_wait_total
    }

    const yMean = total / replications
    yValues.push(yMean)

    return {
      expNum: index + 1,
      normalized: normRow,
      natural: naturalValues,
      yMean,
    }
  })

  const normCoefficients = new Map()
  features.forEach((feature) => {
    const key = effectKey(feature)
    const value =
      results.reduce(
        (sum, result) => sum + result.yMean * getFeatureValue(result.normalized, factorNames, feature),
        0,
      ) / results.length
    normCoefficients.set(key, value)
  })

  const linearNormCoefficients = new Map(
    [...normCoefficients.entries()].filter(([key]) => (key ? key.split('|').length : 0) <= 1),
  )
  const naturalLinearCoefficients = calculateNaturalCoefficients(linearNormCoefficients, factorNames, factors)
  const naturalNonlinearCoefficients = calculateNaturalCoefficients(normCoefficients, factorNames, factors)

  const resultRows = results.map((result) => {
    const yLinear = predictByNaturalCoefficients(naturalLinearCoefficients, result.natural)
    const yNonlinear = predictByNaturalCoefficients(naturalNonlinearCoefficients, result.natural)
    const errorLinear = Math.abs(result.yMean - yLinear)
    const errorNonlinear = Math.abs(result.yMean - yNonlinear)

    return {
      ...result,
      yLinear,
      yNonlinear,
      errorLinear,
      errorNonlinear,
      relErrorLinearPerc: Math.abs(result.yMean) > EPS ? (errorLinear / result.yMean) * 100 : 0,
      relErrorNonlinearPerc: Math.abs(result.yMean) > EPS ? (errorNonlinear / result.yMean) * 100 : 0,
    }
  })

  return {
    factorNames,
    matrix,
    results: resultRows,
    coefficientsLinear: linearNormCoefficients,
    coefficientsNonlinear: normCoefficients,
    naturalLinearCoefficients,
    naturalNonlinearCoefficients,
    normalizedEquationLinear: getRegressionEquationString(linearNormCoefficients, factorNames, false),
    normalizedEquationNonlinear: getRegressionEquationString(normCoefficients, factorNames, false),
    naturalEquationLinear: getRegressionEquationString(naturalLinearCoefficients, factorNames, true),
    naturalEquationNonlinear: getRegressionEquationString(naturalNonlinearCoefficients, factorNames, true),
  }
}

function buildPfeResult(factors, params) {
  const factorNames = FACTOR_DEFS.map((factor) => factor.key)
  const features = getAllEffects(factorNames)
  const matrix = createFullFactorialDesign(factorNames)

  return runExperimentMatrix({
    matrix,
    factorNames,
    factors,
    replications: params.replications,
    sigma1: params.sigma1,
    sigma2: params.sigma2,
    limitValue: params.requestLimit,
    features,
  })
}

function buildDfeResult(factors, params) {
  const factorNames = FACTOR_DEFS.map((factor) => factor.key)
  const pValue = { '1/2': 1, '1/4': 2, '1/8': 3 }[params.fraction]
  const generators = parseGenerators(params.generators)
  const matrix = createFractionalDesign(factorNames, pValue, generators)
  const baseK = factorNames.length - pValue
  const baseFactorNames = factorNames.slice(0, baseK)
  const features = getAllEffects(baseFactorNames)
  const experiment = runExperimentMatrix({
    matrix,
    factorNames,
    factors,
    replications: params.replications,
    sigma1: params.sigma1,
    sigma2: params.sigma2,
    limitValue: params.requestLimit,
    features,
  })

  const definingRelations = getDefiningRelations(factorNames, generators)
  const aliases = buildAliases(factorNames, definingRelations)

  return {
    ...experiment,
    pValue,
    generators,
    aliasingStr: buildAliasingString(factorNames, pValue, definingRelations, aliases),
  }
}

function buildAliases(factorNames, definingRelations) {
  const allEffects = getAllEffects(factorNames)
  const processed = new Set()
  const groups = []

  allEffects.forEach((effect) => {
    const key = effectKey(effect)
    if (processed.has(key)) {
      return
    }

    const current = new Map()
    current.set(key, effect)
    definingRelations.forEach((relation) => {
      const alias = xorEffects(effect, relation)
      current.set(effectKey(alias), alias)
    })

    const sorted = [...current.values()].sort(
      (left, right) => left.length - right.length || effectKey(left).localeCompare(effectKey(right)),
    )
    sorted.forEach((item) => processed.add(effectKey(item)))
    groups.push(sorted)
  })

  return groups.sort(
    (left, right) =>
      left[0].length - right[0].length || effectKey(left[0]).localeCompare(effectKey(right[0])),
  )
}

function buildAliasingString(factorNames, pValue, definingRelations, aliases) {
  const minLen = definingRelations.length > 0 ? Math.min(...definingRelations.map((item) => item.length)) : Infinity
  const resolutionMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' }
  const resolution = resolutionMap[minLen] ?? 'VI+'

  const lines = [`ДФЭ 2^(${factorNames.length}-${pValue}), Разрешение: ${resolution}`]
  lines.push('Определяющие соотношения:')
  definingRelations.forEach((relation) => {
    lines.push(`  I = ${relation.map((name) => `x${factorIndexMap[name] + 1}`).join('')}`)
  })
  lines.push('')
  lines.push('Схема смешивания:')

  aliases.forEach((group) => {
    if (group.length <= 1) {
      return
    }

    lines.push(`  ${group.map((effect) => getFactorName(effect)).join(' = ')}`)
  })

  return lines.join('\n')
}

function buildValidationOutput({ pfe, dfe, validationPoint, params, factors }) {
  const experiment = pfe ?? dfe
  const factorNames = experiment.factorNames
  const normValues = factorNames.map((name) => validationPoint[name])
  const naturalValues = normalizedToNatural(normValues, factorNames, factors)
  const hasExtrapolation = Object.values(validationPoint).some((value) => value < -1 || value > 1)

  let total = 0
  for (let replication = 0; replication < params.replications; replication += 1) {
    total += simulateQueue({
      ...naturalValues,
      sigma1: params.sigma1,
      sigma2: params.sigma2,
      limitValue: params.requestLimit,
    }).avg_wait_total
  }
  const yReal = total / params.replications

  let output = `Вход (норм): ${JSON.stringify(validationPoint)}\n`
  output += `Вход (натур): ${JSON.stringify(
    Object.fromEntries(
      Object.entries(naturalValues).map(([key, value]) => [key, Number(value.toFixed(3))]),
    ),
  )}\n\n`
  if (hasExtrapolation) {
    output += 'ВНИМАНИЕ: точка находится вне диапазона [-1; 1], результат является экстраполяцией.\n\n'
  }
  output += `РЕАЛЬНОЕ СРЕДНЕЕ ВРЕМЯ ОЖИДАНИЯ (y_real): ${formatSigned(yReal)}\n`
  output += `${'='.repeat(60)}\n\n`

  if (pfe && dfe) {
    output += `СРАВНЕНИЕ ПРЕДСКАЗАНИЙ ПФЭ И ДФЭ:\n${'-'.repeat(60)}\n\n`
    ;[
      ['Линейная модель', true],
      ['Нелинейная модель', false],
    ].forEach(([title, linearOnly]) => {
      const pfePred = predictByNaturalCoefficients(
        linearOnly ? pfe.naturalLinearCoefficients : pfe.naturalNonlinearCoefficients,
        naturalValues,
      )
      const dfePred = predictByNaturalCoefficients(
        linearOnly ? dfe.naturalLinearCoefficients : dfe.naturalNonlinearCoefficients,
        naturalValues,
      )
      const pfeErr = yReal - pfePred
      const dfeErr = yReal - dfePred
      const pfePerc = Math.abs(yReal) > EPS ? (Math.abs(pfeErr) / Math.abs(yReal)) * 100 : 0
      const dfePerc = Math.abs(yReal) > EPS ? (Math.abs(dfeErr) / Math.abs(yReal)) * 100 : 0

      output += `${title}:\n`
      output += `  ПФЭ:  y_pred = ${formatSigned(pfePred)} | ошибка = ${pfeErr >= 0 ? '+' : ''}${formatSigned(
        pfeErr,
      )} | δ = ${pfePerc.toFixed(2)}%\n`
      output += `  ДФЭ:  y_pred = ${formatSigned(dfePred)} | ошибка = ${dfeErr >= 0 ? '+' : ''}${formatSigned(
        dfeErr,
      )} | δ = ${dfePerc.toFixed(2)}%\n\n`
    })
  } else {
    ;[
      ['Линейная модель', true],
      ['Нелинейная модель', false],
    ].forEach(([title, linearOnly]) => {
      const predicted = predictByNaturalCoefficients(
        linearOnly ? experiment.naturalLinearCoefficients : experiment.naturalNonlinearCoefficients,
        naturalValues,
      )
      const error = yReal - predicted
      const percent = Math.abs(yReal) > EPS ? (Math.abs(error) / Math.abs(yReal)) * 100 : 0

      output += `${title}:\n`
      output += `  Предсказание (y_pred): ${formatSigned(predicted)}\n`
      output += `  Ошибка (y_real - y_pred): ${error >= 0 ? '+' : ''}${formatSigned(error)}\n`
      output += `  Отн. погрешность: ${percent.toFixed(2)}%\n\n`
    })
  }

  return output
}

function validateInputs(parsed) {
  if (!Number.isInteger(parsed.replications) || parsed.replications <= 0) {
    return 'Повторов опыта должно быть положительное целое число.'
  }

  if (!Number.isInteger(parsed.requestLimit) || parsed.requestLimit <= 0) {
    return 'Лимит заявок должен быть положительным целым числом.'
  }

  if (!Number.isFinite(parsed.sigma1) || parsed.sigma1 < 0 || !Number.isFinite(parsed.sigma2) || parsed.sigma2 < 0) {
    return 'σ₁ и σ₂ должны быть неотрицательными числами.'
  }

  for (const factor of FACTOR_DEFS) {
    const range = parsed.factors[factor.key]
    if (!Number.isFinite(range[0]) || !Number.isFinite(range[1])) {
      return `Для фактора ${factor.shortLabel} задайте оба значения интервала.`
    }
    if (range[0] >= range[1]) {
      return `Для фактора ${factor.shortLabel} минимальное значение должно быть меньше максимального.`
    }
  }

  if (parsed.expType === 'ДФЭ' && !parsed.generators.trim()) {
    return 'Для ДФЭ укажите генераторы.'
  }

  return ''
}

function parseInputs(inputs) {
  return {
    expType: inputs.expType,
    fraction: inputs.fraction,
    compareWithPfe: Boolean(inputs.compareWithPfe),
    replications: parseInt(inputs.replications, 10),
    requestLimit: parseInt(inputs.requestLimit, 10),
    sigma1: parseNumber(inputs.sigma1),
    sigma2: parseNumber(inputs.sigma2),
    generators: inputs.generators,
    factors: FACTOR_DEFS.reduce((acc, factor) => {
      acc[factor.key] = [
        parseNumber(inputs.factorRanges[factor.key].min),
        parseNumber(inputs.factorRanges[factor.key].max),
      ]
      return acc
    }, {}),
  }
}

function makeExperimentOutput(experiment, kind) {
  if (!experiment) {
    return null
  }

  return {
    kind,
    factorNames: experiment.factorNames,
    rows: experiment.results,
    coefficientsLinear: getCoefficientEntries(experiment.coefficientsLinear),
    coefficientsNonlinear: getCoefficientEntries(experiment.coefficientsNonlinear),
    normalizedEquationLinear: experiment.normalizedEquationLinear,
    normalizedEquationNonlinear: experiment.normalizedEquationNonlinear,
    naturalEquationLinear: experiment.naturalEquationLinear,
    naturalEquationNonlinear: experiment.naturalEquationNonlinear,
    aliasingStr: experiment.aliasingStr ?? '',
    pValue: experiment.pValue ?? null,
  }
}

export function getDefaultGenerators(fraction) {
  return DEFAULT_GENERATORS[fraction]?.join(', ') ?? ''
}

export function runLab3Experiment(inputs) {
  const parsed = parseInputs(inputs)
  const error = validateInputs(parsed)
  if (error) {
    return { error }
  }

  try {
    let pfe = null
    let dfe = null

    if (parsed.expType === 'ПФЭ') {
      pfe = buildPfeResult(parsed.factors, parsed)
    } else {
      dfe = buildDfeResult(parsed.factors, parsed)
      if (parsed.compareWithPfe) {
        pfe = buildPfeResult(parsed.factors, parsed)
      }
    }

    return {
      error: '',
      parsed,
      pfe: makeExperimentOutput(pfe, 'ПФЭ'),
      dfe: makeExperimentOutput(dfe, 'ДФЭ'),
      raw: { pfe, dfe, factors: parsed.factors, params: parsed },
    }
  } catch (caughtError) {
    return {
      error: caughtError instanceof Error ? caughtError.message : 'Не удалось выполнить эксперимент.',
    }
  }
}

export function validateAtPoint(result, validationPointInput) {
  const validationPoint = {}

  for (const factor of FACTOR_DEFS) {
    const value = Number(validationPointInput[factor.key])
    if (!Number.isFinite(value)) {
      return { error: `Для фактора ${factor.shortLabel} задайте числовое значение.` }
    }
    validationPoint[factor.key] = value
  }

  return {
    error: '',
    text: buildValidationOutput({
      pfe: result.raw.pfe,
      dfe: result.raw.dfe,
      validationPoint,
      params: result.raw.params,
      factors: result.raw.factors,
    }),
  }
}
