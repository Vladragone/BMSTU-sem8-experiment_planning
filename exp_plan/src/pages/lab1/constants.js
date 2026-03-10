export const DEFAULT_INPUTS = {
  lambda1: '1',
  lambda2: '1.5',
  mu1: '6',
  mu2: '8',
  sigma1: '0.1',
  sigma2: '0.15',
  timeLimit: '25000',
  priorityType: '1',
  preemptionPolicy: 'queue',
}

export const EPS = 1e-9

export const CURVE_SCALES = Array.from({ length: 25 }, (_, i) => 0.4 + i * 0.05)
export const CURVE_RUNS_PER_POINT = 50

export const CURVE_DEFS = [
  { id: 't1-lambda1', xKey: 'lambda1', xLabel: 'lambda1', waitType: 1, label: 't1 от lambda1' },
  { id: 't2-lambda2', xKey: 'lambda2', xLabel: 'lambda2', waitType: 2, label: 't2 от lambda2' },
  { id: 't1-m1', xKey: 'mu1', xLabel: 'm1', waitType: 1, label: 't1 от m1' },
  { id: 't2-m2', xKey: 'mu2', xLabel: 'm2', waitType: 2, label: 't2 от m2' },
  { id: 't1-r', xKey: 'R', xLabel: 'R', waitType: 1, label: 't1 от R' },
  { id: 't2-r', xKey: 'R', xLabel: 'R', waitType: 2, label: 't2 от R' },
]
