import { CURVE_DEFS, CURVE_SCALES } from '../constants'
import { simulateQueue } from './engine'

export function buildCurves(baseParams) {
  return CURVE_DEFS.map((def, curveIndex) => {
    const points = CURVE_SCALES.map((scale, pointIndex) => {
      const params = {
        ...baseParams,
        seed: baseParams.seed + curveIndex * 1000 + pointIndex * 17,
      }

      if (def.key === 'lambda1') {
        params.lambda1 = baseParams.lambda1 * scale
      }

      if (def.key === 'lambda2') {
        params.lambda2 = baseParams.lambda2 * scale
      }

      if (def.key === 'mu1') {
        params.mu1 = baseParams.mu1 * scale
      }

      if (def.key === 'mu2') {
        params.mu2 = baseParams.mu2 * scale
      }

      if (def.key === 'R') {
        params.lambda1 = baseParams.lambda1 * scale
        params.lambda2 = baseParams.lambda2 * scale
      }

      const result = simulateQueue(params)
      const x = def.key === 'R' ? result.theoreticalR : params[def.key]
      return { x, y: result.avgWaitOverall }
    })

    return {
      key: def.key,
      label: def.label,
      points,
    }
  })
}
