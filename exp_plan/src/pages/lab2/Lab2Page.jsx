import { useMemo, useState } from 'react'
import './Lab2Page.css'
import { formatNumber } from '../lab1/formatters'
import { DEFAULT_LAB2_INPUTS, FACTOR_DEFS, RESPONSE_OPTIONS } from './constants'
import { compareAtCenter, runFullFactorExperiment } from './regression'

function CoefficientTable({ title, coefficients, terms }) {
  return (
    <section className="table-wrap">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Коэффициент</th>
            <th>Значение</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>b0</td>
            <td>{formatNumber(coefficients.b0, 6)}</td>
          </tr>
          {terms.map((term) => (
            <tr key={term.key}>
              <td>{term.label}</td>
              <td>{formatNumber(coefficients[term.key], 6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function ExperimentTable({ title, rows }) {
  return (
    <section className="table-wrap">
      <h3>{title}</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>x1</th>
              <th>x2</th>
              <th>x3</th>
              <th>x4</th>
              <th>x5</th>
              <th>x6</th>
              <th>λ1</th>
              <th>λ2</th>
              <th>μ1</th>
              <th>μ2</th>
              <th>σ1</th>
              <th>σ2</th>
              <th>y</th>
              <th>ŷ</th>
              <th>Δ = ŷ - y</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.run}>
                <td>{row.run}</td>
                {FACTOR_DEFS.map((factor) => (
                  <td key={`${row.run}-${factor.key}-coded`}>{row.coded[factor.key]}</td>
                ))}
                {FACTOR_DEFS.map((factor) => (
                  <td key={`${row.run}-${factor.key}-natural`}>
                    {formatNumber(row.natural[factor.key], 3)}
                  </td>
                ))}
                <td>{formatNumber(row.response, 4)}</td>
                <td>{formatNumber(row.predicted, 4)}</td>
                <td>{formatNumber(row.error, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Lab2Page({ onBack }) {
  const [inputs, setInputs] = useState(DEFAULT_LAB2_INPUTS)
  const [responseKey, setResponseKey] = useState(RESPONSE_OPTIONS[0].key)
  const [result, setResult] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [error, setError] = useState('')

  const factorCenters = useMemo(
    () =>
      FACTOR_DEFS.reduce((acc, factor) => {
        const min = Number(inputs.factorRanges[factor.key].min)
        const max = Number(inputs.factorRanges[factor.key].max)
        acc[factor.key] = Number.isNaN(min) || Number.isNaN(max) ? 0 : (min + max) / 2
        return acc
      }, {}),
    [inputs],
  )

  const setField = (key) => (event) => {
    setInputs((prev) => ({
      ...prev,
      [key]: event.target.value,
    }))
  }

  const setFactorRange = (factorKey, bound) => (event) => {
    const value = event.target.value
    setInputs((prev) => ({
      ...prev,
      factorRanges: {
        ...prev.factorRanges,
        [factorKey]: {
          ...prev.factorRanges[factorKey],
          [bound]: value,
        },
      },
    }))
  }

  const runExperiment = () => {
    const nextResult = runFullFactorExperiment(inputs, responseKey)

    if (nextResult.error) {
      setError(nextResult.error)
      setResult(null)
      setComparison(null)
      return
    }

    const nextComparison = compareAtCenter(inputs, responseKey)

    if (nextComparison.error) {
      setError(nextComparison.error)
      setResult(null)
      setComparison(null)
      return
    }

    setError('')
    setResult(nextResult)
    setComparison(nextComparison)
  }

  return (
    <main className="page">
      <section className="panel lab2-panel">
        <div className="lab2-header">
          <h1>Лабораторная работа №2</h1>
          <p className="subtitle">
            Полный факторный эксперимент для одноканальной СМО с двумя типами заявок
          </p>
        </div>

        <section className="service-hint">
          <p>План эксперимента: 2^6 для факторов λ1, λ2, μ1, μ2, σ1, σ2.</p>
          <p>Строятся линейная модель и частично нелинейная модель с парными взаимодействиями.</p>
          <p>Для сравнения расчётное значение проверяется имитацией в центре плана.</p>
        </section>

        <section className="lab2-controls">
          <label>
            Выходная величина
            <select value={responseKey} onChange={(event) => setResponseKey(event.target.value)}>
              {RESPONSE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Время моделирования
            <input type="number" step="100" value={inputs.timeLimit} onChange={setField('timeLimit')} />
          </label>
          <label>
            Повторов на опыт
            <input type="number" min="1" value={inputs.replications} onChange={setField('replications')} />
          </label>
          <label>
            Повторов для сравнения
            <input
              type="number"
              min="1"
              value={inputs.comparisonReplications}
              onChange={setField('comparisonReplications')}
            />
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
            Поведение прерванной заявки
            <select value={inputs.preemptionPolicy} onChange={setField('preemptionPolicy')}>
              <option value="queue">Вернуть в очередь</option>
              <option value="drop">Отбросить заявку</option>
            </select>
          </label>
        </section>

        <section className="factor-grid">
          {FACTOR_DEFS.map((factor) => (
            <article key={factor.key} className="factor-card">
              <h3>{factor.label}</h3>
              <p>{factor.description}</p>
              <label>
                Нижний уровень
                <input
                  type="number"
                  step="0.01"
                  value={inputs.factorRanges[factor.key].min}
                  onChange={setFactorRange(factor.key, 'min')}
                />
              </label>
              <label>
                Верхний уровень
                <input
                  type="number"
                  step="0.01"
                  value={inputs.factorRanges[factor.key].max}
                  onChange={setFactorRange(factor.key, 'max')}
                />
              </label>
              <p className="factor-center">Центр: {formatNumber(factorCenters[factor.key], 3)}</p>
            </article>
          ))}
        </section>

        <div className="actions-row">
          <button className="lab-button" type="button" onClick={runExperiment}>
            Выполнить ПФЭ
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <h3>План эксперимента</h3>
                <p>Число факторов: {FACTOR_DEFS.length}</p>
                <p>Число опытов: {result.experiments.length}</p>
                <p>Повторов на опыт: {result.parsed.replications}</p>
              </article>
              <article className="metric-card">
                <h3>Линейная модель</h3>
                <p>Коэффициентов: {1 + result.linear.terms.length}</p>
                <p>
                  Средняя |Δ|:{' '}
                  {formatNumber(
                    result.linear.experiments.reduce((sum, row) => sum + Math.abs(row.error), 0) /
                      result.linear.experiments.length,
                    4,
                  )}
                </p>
              </article>
              <article className="metric-card">
                <h3>Частично нелинейная модель</h3>
                <p>Коэффициентов: {1 + result.partial.terms.length}</p>
                <p>
                  Средняя |Δ|:{' '}
                  {formatNumber(
                    result.partial.experiments.reduce((sum, row) => sum + Math.abs(row.error), 0) /
                      result.partial.experiments.length,
                    4,
                  )}
                </p>
              </article>
            </section>

            <section className="equations-grid">
              <article className="equation-card">
                <h3>Линейное уравнение в нормированных факторах</h3>
                <p>{result.linear.normalizedEquation}</p>
              </article>
              <article className="equation-card">
                <h3>Линейное уравнение в натуральных факторах</h3>
                <p>{result.linear.naturalEquation}</p>
              </article>
              <article className="equation-card">
                <h3>Частично нелинейное уравнение в нормированных факторах</h3>
                <p>{result.partial.normalizedEquation}</p>
              </article>
              <article className="equation-card">
                <h3>Частично нелинейное уравнение в натуральных факторах</h3>
                <p>{result.partial.naturalEquation}</p>
              </article>
            </section>

            <CoefficientTable
              title="Коэффициенты линейной регрессии"
              coefficients={result.linear.coefficients}
              terms={result.linear.terms}
            />

            <CoefficientTable
              title="Коэффициенты частично нелинейной регрессии"
              coefficients={result.partial.coefficients}
              terms={result.partial.terms}
            />

            <ExperimentTable
              title="Таблица опытов и погрешностей для линейной модели"
              rows={result.linear.experiments}
            />

            <ExperimentTable
              title="Таблица опытов и погрешностей для частично нелинейной модели"
              rows={result.partial.experiments}
            />

            {comparison && (
              <section className="table-wrap">
                <h3>Сравнение расчётного и имитационного значения в центре плана</h3>
                <table>
                  <thead>
                    <tr>
                      <th>λ1</th>
                      <th>λ2</th>
                      <th>μ1</th>
                      <th>μ2</th>
                      <th>σ1</th>
                      <th>σ2</th>
                      <th>ŷ</th>
                      <th>y</th>
                      <th>Δ = ŷ - y</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {FACTOR_DEFS.map((factor) => (
                        <td key={factor.key}>
                          {formatNumber(comparison.comparisonPoint[factor.key], 3)}
                        </td>
                      ))}
                      <td>{formatNumber(comparison.predicted, 4)}</td>
                      <td>{formatNumber(comparison.actual, 4)}</td>
                      <td>{formatNumber(comparison.errorValue, 4)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        <button className="lab-button main-menu-button" type="button" onClick={onBack}>
          Главное меню
        </button>
      </section>
    </main>
  )
}

export default Lab2Page
