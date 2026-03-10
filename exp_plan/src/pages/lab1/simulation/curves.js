import {
  CURVE_DEFS,
  CURVE_RUNS_PER_POINT,
  CURVE_SCALES,
} from '../constants'
import { simulateQueue } from './engine'

function applyScale(baseParams, xKey, scale) {
  const params = { ...baseParams }

  if (xKey === 'lambda1') {
    params.lambda1 = baseParams.lambda1 * scale
  }

  if (xKey === 'lambda2') {
    params.lambda2 = baseParams.lambda2 * scale
  }

  if (xKey === 'mu1') {
    params.mu1 = baseParams.mu1 * scale
  }

  if (xKey === 'mu2') {
    params.mu2 = baseParams.mu2 * scale
  }

  if (xKey === 'R') {
    params.lambda1 = baseParams.lambda1 * scale
    params.lambda2 = baseParams.lambda2 * scale
  }

  return params
}

export function buildCurves(baseParams) {
  return CURVE_DEFS.map((def, curveIndex) => {
    const points = CURVE_SCALES.map((scale, pointIndex) => {
      const scaledParams = applyScale(baseParams, def.xKey, scale)
      let x = 0
      let ySum = 0

      for (let runIndex = 0; runIndex < CURVE_RUNS_PER_POINT; runIndex += 1) {
        const params = {
          ...scaledParams,
          seed: baseParams.seed + curveIndex * 100000 + pointIndex * 1000 + runIndex * 37,
        }

        const result = simulateQueue(params)
        x = def.xKey === 'R' ? result.theoreticalR : params[def.xKey]
        ySum += result.byType[def.waitType].avgWait
      }

      return { x, y: ySum / CURVE_RUNS_PER_POINT }
    })

    return {
      key: def.id,
      xLabel: def.xLabel,
      label: def.label,
      points,
    }
  })
}
