import { EPS } from '../constants.js'
import { createRng, sampleExponential, sampleNormal } from './rng.js'

export function simulateQueue(params) {
  const {
    lambda1,
    lambda2,
    mu1,
    mu2,
    sigma1,
    sigma2,
    timeLimit,
    requestLimit,
    priorityType,
    preemptionPolicy,
    seed,
  } = params

  const rng = createRng(seed)
  const serviceMean = { 1: 1 / mu1, 2: 1 / mu2 }
  const serviceSigma = { 1: sigma1, 2: sigma2 }
  const rates = { 1: lambda1, 2: lambda2 }
  const lowPriorityType = priorityType === 1 ? 2 : 1
  const limitByRequests = requestLimit !== undefined

  const queue = { 1: [], 2: [] }
  const byType = {
    1: { completed: 0, waitSum: 0, staySum: 0 },
    2: { completed: 0, waitSum: 0, staySum: 0 },
  }

  let now = 0
  let busyTime = 0
  let dropped = 0
  let arrivedTotal = 0
  let server = null

  const canScheduleArrival = () => !limitByRequests || arrivedTotal < requestLimit

  let nextArrival1 = canScheduleArrival() ? sampleExponential(rates[1], rng) : Number.POSITIVE_INFINITY
  let nextArrival2 = canScheduleArrival() ? sampleExponential(rates[2], rng) : Number.POSITIVE_INFINITY

  const enqueue = (job) => {
    queue[job.type].push(job)
  }

  const enqueueFront = (job) => {
    queue[job.type].unshift(job)
  }

  const dequeueNext = () => {
    if (queue[priorityType].length > 0) {
      return queue[priorityType].shift()
    }

    if (queue[lowPriorityType].length > 0) {
      return queue[lowPriorityType].shift()
    }

    return null
  }

  const createJob = (type, arrivalTime) => {
    const serviceTime = sampleNormal(serviceMean[type], serviceSigma[type], rng)

    return {
      type,
      arrivalTime,
      totalService: serviceTime,
      remaining: serviceTime,
      startedAt: null,
    }
  }

  const startService = (job) => {
    job.startedAt = now
    server = job
  }

  const maybeStartNext = () => {
    if (server !== null) {
      return
    }

    const nextJob = dequeueNext()
    if (nextJob) {
      startService(nextJob)
    }
  }

  const handleArrival = (type) => {
    arrivedTotal += 1
    const job = createJob(type, now)

    if (server === null) {
      startService(job)
      return
    }

    if (type === priorityType && server.type !== priorityType) {
      const elapsed = now - server.startedAt
      server.remaining = Math.max(server.remaining - elapsed, EPS)

      if (preemptionPolicy === 'queue') {
        enqueueFront(server)
      } else {
        dropped += 1
      }

      startService(job)
      return
    }

    enqueue(job)
  }

  while (true) {
    if (limitByRequests && !canScheduleArrival() && !server && queue[1].length === 0 && queue[2].length === 0) {
      break
    }

    if (!limitByRequests && now >= timeLimit) {
      break
    }

    const nextCompletion = server ? now + server.remaining : Number.POSITIVE_INFINITY
    const stopTime = limitByRequests ? Number.POSITIVE_INFINITY : timeLimit
    const nextEventTime = Math.min(nextArrival1, nextArrival2, nextCompletion, stopTime)

    if (!Number.isFinite(nextEventTime)) {
      break
    }

    if (server) {
      busyTime += nextEventTime - now
    }

    now = nextEventTime

    const arrival1Now = Math.abs(nextArrival1 - now) < EPS
    const arrival2Now = Math.abs(nextArrival2 - now) < EPS
    const serviceEndsNow = server && Math.abs(nextCompletion - now) < EPS

    if (serviceEndsNow) {
      const job = server
      server = null

      const stay = now - job.arrivalTime
      const wait = Math.max(stay - job.totalService, 0)

      byType[job.type].completed += 1
      byType[job.type].waitSum += wait
      byType[job.type].staySum += stay
    }

    if (arrival1Now) {
      handleArrival(1)
      nextArrival1 = canScheduleArrival()
        ? now + sampleExponential(rates[1], rng)
        : Number.POSITIVE_INFINITY
    }

    if (arrival2Now) {
      handleArrival(2)
      nextArrival2 = canScheduleArrival()
        ? now + sampleExponential(rates[2], rng)
        : Number.POSITIVE_INFINITY
    }

    maybeStartNext()

    if (!Number.isFinite(nextArrival1) && !Number.isFinite(nextArrival2) && !server) {
      break
    }
  }

  const completedTotal = byType[1].completed + byType[2].completed
  const waitSumTotal = byType[1].waitSum + byType[2].waitSum
  const staySumTotal = byType[1].staySum + byType[2].staySum

  const rho1 = lambda1 / mu1
  const rho2 = lambda2 / mu2
  const theoreticalR = rho1 + rho2
  const observationWindow = limitByRequests ? now : timeLimit
  const factualR = observationWindow > 0 ? busyTime / observationWindow : 0

  return {
    rho1,
    rho2,
    theoreticalR,
    factualR,
    completedTotal,
    dropped,
    arrivedTotal,
    simulatedTime: now,
    avgWaitOverall: completedTotal > 0 ? waitSumTotal / completedTotal : 0,
    avgStayOverall: completedTotal > 0 ? staySumTotal / completedTotal : 0,
    byType: {
      1: {
        completed: byType[1].completed,
        avgWait: byType[1].completed > 0 ? byType[1].waitSum / byType[1].completed : 0,
        avgStay: byType[1].completed > 0 ? byType[1].staySum / byType[1].completed : 0,
      },
      2: {
        completed: byType[2].completed,
        avgWait: byType[2].completed > 0 ? byType[2].waitSum / byType[2].completed : 0,
        avgStay: byType[2].completed > 0 ? byType[2].staySum / byType[2].completed : 0,
      },
    },
  }
}
