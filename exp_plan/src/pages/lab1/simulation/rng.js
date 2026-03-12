import { EPS } from '../constants.js'

export function createRng(seed) {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sampleExponential(rate, rng) {
  if (rate <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const u = Math.max(rng(), Number.MIN_VALUE)
  return -Math.log(u) / rate
}

export function sampleNormal(mean, stdDev, rng) {
  if (stdDev <= 0) {
    return Math.max(mean, EPS)
  }

  const u1 = Math.max(rng(), Number.MIN_VALUE)
  const u2 = Math.max(rng(), Number.MIN_VALUE)
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const value = mean + stdDev * z
  return Math.max(value, EPS)
}
