const EPS = 1e-9

function sampleUniform(minValue, maxValue) {
  if (maxValue <= minValue) {
    return Math.max(minValue, EPS)
  }

  return minValue + (maxValue - minValue) * Math.random()
}

function sampleExponential(rate) {
  if (rate <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const uniform = Math.max(Math.random(), EPS)
  return -Math.log(uniform) / rate
}

function genInterarrivalTime(lambda, sigma) {
  if (lambda <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const mean = 1 / lambda
  const halfRange = sigma * Math.sqrt(3)
  const minValue = Math.max(EPS, mean - halfRange)
  const maxValue = minValue + 2 * (mean - minValue)

  if (minValue >= maxValue) {
    return minValue
  }

  return sampleUniform(minValue, maxValue)
}

function genServiceTime(mu) {
  return sampleExponential(mu)
}

export function simulateQueue({ lambda1, lambda2, mu1, mu2, sigma1, sigma2, limitValue }) {
  let currentTime = 0
  let serverBusy = false
  const queue = []
  let nextArrival1 = genInterarrivalTime(lambda1, sigma1)
  let nextArrival2 = genInterarrivalTime(lambda2, sigma2)
  let serviceEnd = Number.POSITIVE_INFINITY

  const stats = {
    generated1: 0,
    generated2: 0,
    served1: 0,
    served2: 0,
    waitTime1: 0,
    waitTime2: 0,
  }

  let currentRequest = null

  const shouldContinue = () => {
    const totalGenerated = stats.generated1 + stats.generated2

    if (totalGenerated < limitValue) {
      return true
    }

    return serverBusy || queue.length > 0
  }

  const shouldGenerate = () => stats.generated1 + stats.generated2 < limitValue

  const handleArrival = (requestType) => {
    const request = { type: requestType, arrivalTime: currentTime }

    if (requestType === 1) {
      stats.generated1 += 1
    } else {
      stats.generated2 += 1
    }

    if (!serverBusy) {
      serverBusy = true
      currentRequest = request
      const serviceTime = genServiceTime(requestType === 1 ? mu1 : mu2)
      serviceEnd = currentTime + serviceTime
      if (requestType === 1) {
        stats.served1 += 1
      } else {
        stats.served2 += 1
      }
    } else {
      queue.push(request)
    }

    if (requestType === 1) {
      nextArrival1 = currentTime + genInterarrivalTime(lambda1, sigma1)
    } else {
      nextArrival2 = currentTime + genInterarrivalTime(lambda2, sigma2)
    }
  }

  const handleServiceCompletion = () => {
    if (queue.length === 0) {
      serverBusy = false
      currentRequest = null
      serviceEnd = Number.POSITIVE_INFINITY
      return
    }

    const nextRequest = queue.pop()
    currentRequest = nextRequest
    const waitTime = Math.max(currentTime - nextRequest.arrivalTime, 0)
    const serviceTime = genServiceTime(nextRequest.type === 1 ? mu1 : mu2)
    serviceEnd = currentTime + serviceTime

    if (nextRequest.type === 1) {
      stats.waitTime1 += waitTime
      stats.served1 += 1
    } else {
      stats.waitTime2 += waitTime
      stats.served2 += 1
    }
  }

  while (shouldContinue()) {
    const eventCandidates = {}

    if (shouldGenerate()) {
      eventCandidates.arrival1 = nextArrival1
      eventCandidates.arrival2 = nextArrival2
    }

    if (serverBusy) {
      eventCandidates.serviceEnd = serviceEnd
    }

    const entries = Object.entries(eventCandidates)
    if (entries.length === 0) {
      break
    }

    const [eventType, nextEventTime] = entries.reduce((best, current) =>
      current[1] < best[1] ? current : best,
    )

    if (!Number.isFinite(nextEventTime)) {
      break
    }

    currentTime = nextEventTime

    if (eventType === 'arrival1') {
      handleArrival(1)
    } else if (eventType === 'arrival2') {
      handleArrival(2)
    } else {
      handleServiceCompletion()
    }
  }

  const totalServed = stats.served1 + stats.served2
  const totalWait = stats.waitTime1 + stats.waitTime2

  return {
    avg_wait_total: totalServed > 0 ? totalWait / totalServed : 0,
    totalServed,
    currentRequest,
  }
}
