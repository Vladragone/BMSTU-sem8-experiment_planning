import { useMemo, useState } from 'react'
import './Lab2Page.css'
import { formatNumber } from '../lab1/formatters'
import { exportWorkbookAsExcel } from '../../utils/excel'
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

const DESIGN_HEADERS = ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6']
const DESIGN_KEYS = ['x0', ...FACTOR_DEFS.map((factor) => factor.key)]

const getAbsoluteError = (experimental, predicted) => Math.abs(experimental - predicted)

const getRelativeError = (experimental, predicted) => {
  if (Math.abs(experimental) < 1e-9) {
    return 0
  }

  return (Math.abs(experimental - predicted) / Math.abs(experimental)) * 100
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
              {DESIGN_HEADERS.map((header) => (
                <th key={header}>{header}</th>
              ))}
              {FACTOR_DEFS.map((factor) => (
                <th key={factor.key}>{factor.label}</th>
              ))}
              <th>y экс</th>
              <th>y лин</th>
              <th>y нелин</th>
              <th>|y_экс - y_лин|</th>
              <th>|y_экс - y_лин|, %</th>
              <th>|y_экс - y_нелин|</th>
              <th>|y_экс - y_нелин|, %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.run}>
                <td>{row.run}</td>
                {DESIGN_KEYS.map((key) => (
                  <td key={`${row.run}-${key}`}>{key === 'x0' ? 1 : row.coded[key]}</td>
                ))}
                {FACTOR_DEFS.map((factor) => (
                  <td key={`${row.run}-${factor.key}-natural`}>
                    {formatNumber(row.natural[factor.key], 3)}
                  </td>
                ))}
                <td>{formatNumber(row.experimental, 4)}</td>
                <td>{formatNumber(row.linearPredicted, 4)}</td>
                <td>{formatNumber(row.nonlinearPredicted, 4)}</td>
                <td>{formatNumber(row.linearAbsoluteError, 4)}</td>
                <td>{formatNumber(row.linearRelativeError, 2)}</td>
                <td>{formatNumber(row.nonlinearAbsoluteError, 4)}</td>
                <td>{formatNumber(row.nonlinearRelativeError, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const buildCoefficientSection = (title, coefficients, terms) => ({
  title,
  header: ['Коэффициент', 'Значение'],
  rows: [
    ['b0', Number(coefficients.b0.toFixed(6))],
    ...terms.map((term) => [term.label, Number(coefficients[term.key].toFixed(6))]),
  ],
})

const buildExperimentSection = (title, rows) => ({
  title,
  header: [
    '№',
    ...DESIGN_HEADERS,
    ...FACTOR_DEFS.map((factor) => factor.label),
    'y экспериментальное',
    'y линейное',
    'y нелинейное',
    '|y_экс - y_лин|',
    '|y_экс - y_лин|, %',
    '|y_экс - y_нелин|',
    '|y_экс - y_нелин|, %',
  ],
  rows: rows.map((row) => [
    row.run,
    ...DESIGN_KEYS.map((key) => (key === 'x0' ? 1 : row.coded[key])),
    ...FACTOR_DEFS.map((factor) => Number(row.natural[factor.key].toFixed(3))),
    Number(row.experimental.toFixed(4)),
    Number(row.linearPredicted.toFixed(4)),
    Number(row.nonlinearPredicted.toFixed(4)),
    Number(row.linearAbsoluteError.toFixed(4)),
    Number(row.linearRelativeError.toFixed(2)),
    Number(row.nonlinearAbsoluteError.toFixed(4)),
    Number(row.nonlinearRelativeError.toFixed(2)),
  ]),
})

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

  const comparisonRows = useMemo(() => {
    if (!result) {
      return []
    }

    return result.experiments.map((experiment, index) => {
      const linearExperiment = result.linear.experiments[index]
      const nonlinearExperiment = result.partial.experiments[index]

      return {
        ...experiment,
        experimental: experiment.response,
        linearPredicted: linearExperiment.predicted,
        nonlinearPredicted: nonlinearExperiment.predicted,
        linearAbsoluteError: getAbsoluteError(experiment.response, linearExperiment.predicted),
        linearRelativeError: getRelativeError(experiment.response, linearExperiment.predicted),
        nonlinearAbsoluteError: getAbsoluteError(experiment.response, nonlinearExperiment.predicted),
        nonlinearRelativeError: getRelativeError(experiment.response, nonlinearExperiment.predicted),
      }
    })
  }, [result])

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

  const exportTables = () => {
    if (!result) {
      return
    }

    const sections = [
      buildCoefficientSection(
        'Коэффициенты линейной регрессии',
        result.linear.coefficients,
        result.linear.terms,
      ),
      buildCoefficientSection(
        'Коэффициенты частично нелинейной модели',
        result.partial.coefficients,
        result.partial.terms,
      ),
      buildExperimentSection('Таблица опытов и сравнения моделей', comparisonRows),
    ]

    if (comparison) {
      sections.push({
        title: 'Сравнение расчетного и имитационного значения в центре плана',
        header: [...FACTOR_DEFS.map((factor) => factor.label), 'ŷ', 'y', 'Δ = ŷ - y'],
        rows: [
          [
            ...FACTOR_DEFS.map((factor) => Number(comparison.comparisonPoint[factor.key].toFixed(3))),
            Number(comparison.predicted.toFixed(4)),
            Number(comparison.actual.toFixed(4)),
            Number(comparison.errorValue.toFixed(4)),
          ],
        ],
      })
    }

    exportWorkbookAsExcel('lab2-results.xls', [
      {
        name: 'Lab2 report',
        title: 'Лабораторная работа №2',
        sections,
      },
    ])
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
            Количество заявок
            <input
              type="number"
              min="1"
              step="100"
              value={inputs.requestLimit}
              onChange={setField('requestLimit')}
            />
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
          {result && (
            <button className="lab-button" type="button" onClick={exportTables}>
              Сохранить в Excel
            </button>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <h3>План эксперимента</h3>
                <p>Число факторов: {FACTOR_DEFS.length}</p>
                <p>Число опытов: {result.experiments.length}</p>
                <p>Заявок на прогон: {result.parsed.requestLimit}</p>
                <p>Повторов на опыт: {result.parsed.replications}</p>
              </article>
              <article className="metric-card">
                <h3>Линейная модель</h3>
                <p>Коэффициентов: {1 + result.linear.terms.length}</p>
                <p>
                  Средняя |Δ|:{' '}
                  {formatNumber(
                    comparisonRows.reduce((sum, row) => sum + row.linearAbsoluteError, 0) /
                      comparisonRows.length,
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
                    comparisonRows.reduce((sum, row) => sum + row.nonlinearAbsoluteError, 0) /
                      comparisonRows.length,
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
              title="Коэффициенты частично нелинейной модели"
              coefficients={result.partial.coefficients}
              terms={result.partial.terms}
            />

            <ExperimentTable
              title="Таблица опытов и сравнения моделей"
              rows={comparisonRows}
            />

            {comparison && (
              <section className="table-wrap">
                <h3>Сравнение расчётного и имитационного значения в центре плана</h3>
                <table>
                  <thead>
                    <tr>
                      {FACTOR_DEFS.map((factor) => (
                        <th key={factor.key}>{factor.label}</th>
                      ))}
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
