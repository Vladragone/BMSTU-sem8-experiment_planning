import { useMemo, useState } from 'react'
import './Lab1Page.css'
import LineChart from './components/LineChart'
import { DEFAULT_INPUTS } from './constants'
import { formatNumber } from './formatters'
import {
  buildCurves,
  calculateServiceMeans,
  parseInputs,
  simulateQueue,
  validateParams,
} from './simulation'

function Lab1Page({ onBack }) {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [result, setResult] = useState(null)
  const [curves, setCurves] = useState([])
  const [error, setError] = useState('')

  const means = useMemo(() => {
    return calculateServiceMeans(Number(inputs.mu1), Number(inputs.mu2))
  }, [inputs.mu1, inputs.mu2])

  const setField = (key) => (event) => {
    setInputs((prev) => ({
      ...prev,
      [key]: event.target.value,
    }))
  }

  const runSimulation = () => {
    const randomSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
    const params = parseInputs(inputs, randomSeed)
    const validationError = validateParams(params)

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setResult(simulateQueue(params))
    setCurves(buildCurves(params))
  }

  return (
    <main className="page">
      <section className="panel lab1-panel">
        <div className="lab1-header">
          <h1>Лабораторная работа №1</h1>
          <p className="subtitle">Имитационная модель одноканальной СМО с абсолютным приоритетом</p>
        </div>

        <section className="form-grid">
          <label>
            λ1 (интенсивность типа 1)
            <input type="number" step="0.01" value={inputs.lambda1} onChange={setField('lambda1')} />
          </label>
          <label>
            λ2 (интенсивность типа 2)
            <input type="number" step="0.01" value={inputs.lambda2} onChange={setField('lambda2')} />
          </label>
          <label>
            μ1 (интенсивность обслуживания типа 1)
            <input type="number" step="0.01" value={inputs.mu1} onChange={setField('mu1')} />
          </label>
          <label>
            μ2 (интенсивность обслуживания типа 2)
            <input type="number" step="0.01" value={inputs.mu2} onChange={setField('mu2')} />
          </label>
          <label>
            σ1 (СКО обслуживания типа 1)
            <input type="number" step="0.01" value={inputs.sigma1} onChange={setField('sigma1')} />
          </label>
          <label>
            σ2 (СКО обслуживания типа 2)
            <input type="number" step="0.01" value={inputs.sigma2} onChange={setField('sigma2')} />
          </label>
          <label>
            Время моделирования
            <input type="number" step="10" value={inputs.timeLimit} onChange={setField('timeLimit')} />
          </label>
        </section>

        <section className="options-grid">
          <label>
            Приоритетный тип заявок
            <select value={inputs.priorityType} onChange={setField('priorityType')}>
              <option value="1">Тип 1 приоритетнее</option>
              <option value="2">Тип 2 приоритетнее</option>
            </select>
          </label>
          <label>
            Что делать с прерванной заявкой
            <select value={inputs.preemptionPolicy} onChange={setField('preemptionPolicy')}>
              <option value="queue">Вернуть в начало очереди</option>
              <option value="drop">Отбросить заявку</option>
            </select>
          </label>
        </section>

        <section className="service-hint">
          <p>Для нормального закона обслуживания используется среднее время 1/μ и заданное СКО σ.</p>
          <p>Формулы: ρi = λi / μi, R = ρ1 + ρ2, tпреб = tобработки + tожидания.</p>
          <p>
            Среднее время обслуживания: тип 1 = {formatNumber(means.serviceMean1, 3)}, тип 2 = {formatNumber(means.serviceMean2, 3)}.
          </p>
        </section>

        <div className="actions-row">
          <button className="lab-button" type="button" onClick={runSimulation}>
            Запустить моделирование
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <h3>Расчетная загрузка</h3>
                <p>ρ1 = {formatNumber(result.rho1, 3)}</p>
                <p>ρ2 = {formatNumber(result.rho2, 3)}</p>
                <p>R = {formatNumber(result.theoreticalR, 3)}</p>
              </article>

              <article className="metric-card">
                <h3>Фактическая загрузка</h3>
                <p>Rфакт = {formatNumber(result.factualR, 3)}</p>
                <p>Обслужено: {result.completedTotal}</p>
                <p>Прервано и отброшено: {result.dropped}</p>
              </article>

              <article className="metric-card">
                <h3>Выходные параметры</h3>
                <p>Среднее t ожидания = {formatNumber(result.avgWaitOverall, 3)}</p>
                <p>Среднее t пребывания = {formatNumber(result.avgStayOverall, 3)}</p>
              </article>
            </section>

            <section className="table-wrap">
              <h3>Разбивка по типам заявок</h3>
              <table>
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Обслужено</th>
                    <th>t ожидания</th>
                    <th>t пребывания</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Тип 1</td>
                    <td>{result.byType[1].completed}</td>
                    <td>{formatNumber(result.byType[1].avgWait, 3)}</td>
                    <td>{formatNumber(result.byType[1].avgStay, 3)}</td>
                  </tr>
                  <tr>
                    <td>Тип 2</td>
                    <td>{result.byType[2].completed}</td>
                    <td>{formatNumber(result.byType[2].avgWait, 3)}</td>
                    <td>{formatNumber(result.byType[2].avgStay, 3)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="charts-grid">
              {curves.map((curve) => (
                <LineChart
                  key={curve.key}
                  title={curve.label}
                  xLabel={curve.key === 'R' ? 'R' : curve.key}
                  points={curve.points}
                />
              ))}
            </section>
          </>
        )}

        <button className="lab-button main-menu-button" type="button" onClick={onBack}>
          Главное меню
        </button>
      </section>
    </main>
  )
}

export default Lab1Page
