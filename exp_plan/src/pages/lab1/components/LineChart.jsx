import { EPS } from '../constants'
import { formatNumber } from '../formatters'

function LineChart({ title, xLabel, points }) {
  if (!points || points.length === 0) {
    return null
  }

  const width = 460
  const height = 280
  const padLeft = 58
  const padRight = 18
  const padTop = 18
  const padBottom = 52

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const xSpan = Math.max(maxX - minX, EPS)
  const ySpan = Math.max(maxY - minY, EPS)

  const mapX = (x) => padLeft + ((x - minX) / xSpan) * (width - padLeft - padRight)
  const mapY = (y) => height - padBottom - ((y - minY) / ySpan) * (height - padTop - padBottom)
  const polyline = points.map((point) => `${mapX(point.x)},${mapY(point.y)}`).join(' ')
  const tickCount = 6

  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const ratio = i / (tickCount - 1)
    const value = minX + ratio * xSpan
    const x = mapX(value)
    return { value, x }
  })

  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const ratio = i / (tickCount - 1)
    const value = minY + ratio * ySpan
    const y = mapY(value)
    return { value, y }
  })

  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {xTicks.map((tick, index) => (
          <line key={`gx-${index}`} x1={tick.x} y1={padTop} x2={tick.x} y2={height - padBottom} className="grid-line" />
        ))}
        {yTicks.map((tick, index) => (
          <line key={`gy-${index}`} x1={padLeft} y1={tick.y} x2={width - padRight} y2={tick.y} className="grid-line" />
        ))}

        <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} className="axis" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} className="axis" />
        <polyline className="line" points={polyline} />

        {xTicks.map((tick, index) => (
          <text key={`tx-${index}`} x={tick.x} y={height - padBottom + 16} textAnchor="middle" className="tick">
            {formatNumber(tick.value, 2)}
          </text>
        ))}
        {yTicks.map((tick, index) => (
          <text key={`ty-${index}`} x={padLeft - 8} y={tick.y + 3} textAnchor="end" className="tick">
            {formatNumber(tick.value, 2)}
          </text>
        ))}

        <text x={(padLeft + width - padRight) / 2} y={height - 10} textAnchor="middle" className="label">{xLabel}</text>
        <text
          x={18}
          y={(padTop + height - padBottom) / 2}
          transform={`rotate(-90 18 ${(padTop + height - padBottom) / 2})`}
          textAnchor="middle"
          className="label"
        >
          t ожидания
        </text>
      </svg>
    </article>
  )
}

export default LineChart
