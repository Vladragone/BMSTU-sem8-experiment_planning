import { useMemo, useState } from 'react'
import { exportWorkbookAsExcel } from '../../utils/excel'
import { formatNumber } from '../lab1/formatters'
import { DEFAULT_LAB3_INPUTS, FACTOR_DEFS, FRACTION_OPTIONS } from './constants'
import './Lab3Page.css'
import { getDefaultGenerators, runLab3Experiment, validateAtPoint } from './regression'

function TextBlock({ title, value }) {
  return (
    <section className="table-wrap">
      <h3>{title}</h3>
      <pre className="lab3-pre">{value}</pre>
    </section>
  )
}

function CoefficientTable({ title, rows }) {
  return (
    <section className="table-wrap">
      <h3>{title}</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Коэффициент</th>
              <th>Значение</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{formatNumber(row.value, 6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ExperimentResultTable({ title, rows, factorNames }) {
  return (
    <section className="table-wrap">
      <h3>{title}</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>№</th>
              {factorNames.map((_, index) => (
                <th key={`norm-${index + 1}`}>x{index + 1}</th>
              ))}
              <th>ȳ</th>
              <th>y лин</th>
              <th>y нелин</th>
              <th>|Δ лин|</th>
              <th>|Δ нелин|</th>
              <th>δ лин, %</th>
              <th>δ нелин, %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.expNum}>
                <td>{row.expNum}</td>
                {row.normalized.map((value, index) => (
                  <td key={`${row.expNum}-${index + 1}`}>{value}</td>
                ))}
                <td>{formatNumber(row.yMean, 6)}</td>
                <td>{formatNumber(row.yLinear, 6)}</td>
                <td>{formatNumber(row.yNonlinear, 6)}</td>
                <td>{formatNumber(row.errorLinear, 6)}</td>
                <td>{formatNumber(row.errorNonlinear, 6)}</td>
                <td>{formatNumber(row.relErrorLinearPerc, 2)}</td>
                <td>{formatNumber(row.relErrorNonlinearPerc, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function buildCoefficientSection(title, rows) {
  return {
    title,
    header: ['Коэффициент', 'Значение'],
    rows: rows.map((row) => [row.name, Number(row.value.toFixed(6))]),
  }
}

function buildResultSection(title, experiment) {
  return {
    title,
    header: [
      '№',
      ...experiment.factorNames.map((_, index) => `x${index + 1}`),
      'ȳ',
      'y лин',
      'y нелин',
      '|Δ лин|',
      '|Δ нелин|',
      'δ лин, %',
      'δ нелин, %',
    ],
    rows: experiment.rows.map((row) => [
      row.expNum,
      ...row.normalized,
      Number(row.yMean.toFixed(6)),
      Number(row.yLinear.toFixed(6)),
      Number(row.yNonlinear.toFixed(6)),
      Number(row.errorLinear.toFixed(6)),
      Number(row.errorNonlinear.toFixed(6)),
      Number(row.relErrorLinearPerc.toFixed(2)),
      Number(row.relErrorNonlinearPerc.toFixed(2)),
    ]),
  }
}

function buildEquationSection(title, experiment) {
  return {
    title,
    rows: [
      ['Линейная модель, нормированные факторы', experiment.normalizedEquationLinear],
      ['Линейная модель, натуральные факторы', experiment.naturalEquationLinear],
      ['Нелинейная модель, нормированные факторы', experiment.normalizedEquationNonlinear],
      ['Нелинейная модель, натуральные факторы', experiment.naturalEquationNonlinear],
    ],
  }
}

function saveExcelReport(result) {
  const sheets = []

  if (result.pfe) {
    sheets.push({
      name: 'PFE',
      title: 'Отчет ПФЭ',
      sections: [
        buildCoefficientSection('Линейная модель', result.pfe.coefficientsLinear),
        buildCoefficientSection('Нелинейная модель', result.pfe.coefficientsNonlinear),
        buildEquationSection('Уравнения регрессии', result.pfe),
        buildResultSection('Матрица и результаты ПФЭ', result.pfe),
      ],
    })
  }

  if (result.dfe) {
    const sections = [
      {
        title: 'Схема смешивания',
        rows: result.dfe.aliasingStr.split('\n').map((line) => [line]),
      },
      buildCoefficientSection('Линейная модель', result.dfe.coefficientsLinear),
      buildCoefficientSection('Нелинейная модель', result.dfe.coefficientsNonlinear),
      buildEquationSection('Уравнения регрессии', result.dfe),
      buildResultSection('Матрица и результаты ДФЭ', result.dfe),
    ]

    sheets.push({
      name: 'DFE',
      title: 'Отчет ДФЭ',
      sections,
    })
  }

  exportWorkbookAsExcel('lab3-results.xls', sheets)
}

function Lab3Page({ onBack }) {
  const [inputs, setInputs] = useState(DEFAULT_LAB3_INPUTS)
  const [result, setResult] = useState(null)
  const [validationText, setValidationText] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [activeTab, setActiveTab] = useState('setup')

  const factorCenters = useMemo(
    () =>
      FACTOR_DEFS.reduce((acc, factor) => {
        const minValue = Number(inputs.factorRanges[factor.key].min)
        const maxValue = Number(inputs.factorRanges[factor.key].max)
        acc[factor.key] =
          Number.isFinite(minValue) && Number.isFinite(maxValue) ? (minValue + maxValue) / 2 : 0
        return acc
      }, {}),
    [inputs.factorRanges],
  )

  const updateField = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setInputs((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'expType' && value === 'ПФЭ') {
        next.generators = getDefaultGenerators(next.fraction)
      }
      if (key === 'fraction') {
        next.generators = getDefaultGenerators(value)
      }
      return next
    })
  }

  const updateFactorRange = (factorKey, bound) => (event) => {
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

  const updateValidationPoint = (factorKey) => (event) => {
    const value = event.target.value
    setInputs((prev) => ({
      ...prev,
      validationPoint: {
        ...prev.validationPoint,
        [factorKey]: value,
      },
    }))
  }

  const runExperiment = () => {
    setProgress('Подготовка...')
    const nextResult = runLab3Experiment(inputs)

    if (nextResult.error) {
      setError(nextResult.error)
      setResult(null)
      setValidationText('')
      setProgress('')
      return
    }

    setResult(nextResult)
    setError('')
    setValidationText('')
    setProgress('Готово.')
    setActiveTab('results')
  }

  const runValidation = () => {
    if (!result) {
      return
    }

    const validation = validateAtPoint(result, inputs.validationPoint)
    if (validation.error) {
      setError(validation.error)
      setValidationText('')
      return
    }

    setError('')
    setValidationText(validation.text)
    setActiveTab('validation')
  }

  const tabsEnabled = {
    results: Boolean(result),
    validation: Boolean(result),
  }

  const displayedExperiment = result?.pfe ?? result?.dfe ?? null

  return (
    <main className="page">
      <section className="panel lab3-python-panel">
        <div className="lab2-header">
          <h1>Лабораторная работа №3: ПФЭ и ДФЭ на модели СМО</h1>
        </div>

        <div className="lab3-tabs">
          <button
            className={`lab3-tab ${activeTab === 'setup' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('setup')}
          >
            Настройка
          </button>
          <button
            className={`lab3-tab ${activeTab === 'results' ? 'active' : ''}`}
            type="button"
            disabled={!tabsEnabled.results}
            onClick={() => setActiveTab('results')}
          >
            Уравнения и результаты
          </button>
          <button
            className={`lab3-tab ${activeTab === 'validation' ? 'active' : ''}`}
            type="button"
            disabled={!tabsEnabled.validation}
            onClick={() => setActiveTab('validation')}
          >
            Проверка
          </button>
        </div>

        {activeTab === 'setup' && (
          <div className="lab3-tab-panel">
            <section className="lab3-frame">
              <h3>Тип эксперимента</h3>
              <div className="lab3-inline-grid">
                <label>
                  Тип:
                  <select value={inputs.expType} onChange={updateField('expType')}>
                    <option value="ПФЭ">ПФЭ</option>
                    <option value="ДФЭ">ДФЭ</option>
                  </select>
                </label>
                <label>
                  Дробность (для ДФЭ):
                  <select
                    value={inputs.fraction}
                    onChange={updateField('fraction')}
                    disabled={inputs.expType !== 'ДФЭ'}
                  >
                    {FRACTION_OPTIONS.map((fraction) => (
                      <option key={fraction} value={fraction}>
                        {fraction}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lab3-check">
                  <input
                    type="checkbox"
                    checked={inputs.compareWithPfe}
                    onChange={updateField('compareWithPfe')}
                    disabled={inputs.expType !== 'ДФЭ'}
                  />
                  Сравнить с ПФЭ
                </label>
              </div>
            </section>

            <section className="lab3-frame">
              <h3>Настройка ПФЭ 2⁴ / ДФЭ</h3>
              <div className="lab3-factor-table">
                <div className="lab3-factor-head">Факторы (натуральные значения)</div>
                {FACTOR_DEFS.map((factor) => (
                  <div key={factor.key} className="lab3-factor-row">
                    <span>{factor.label}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.factorRanges[factor.key].min}
                      onChange={updateFactorRange(factor.key, 'min')}
                    />
                    <span className="lab3-range-dash">-</span>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.factorRanges[factor.key].max}
                      onChange={updateFactorRange(factor.key, 'max')}
                    />
                    <span className="lab3-center-note">центр: {formatNumber(factorCenters[factor.key], 3)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="lab3-frame">
              <h3>Параметры опыта</h3>
              <div className="lab3-inline-grid two">
                <label>
                  Повторов опыта:
                  <input type="number" min="1" value={inputs.replications} onChange={updateField('replications')} />
                </label>
                <label>
                  Лимит заявок:
                  <input type="number" min="1" value={inputs.requestLimit} onChange={updateField('requestLimit')} />
                </label>
                <label>
                  σ₁ (СКО поступления):
                  <input type="number" step="0.01" min="0" value={inputs.sigma1} onChange={updateField('sigma1')} />
                </label>
                <label>
                  σ₂ (СКО поступления):
                  <input type="number" step="0.01" min="0" value={inputs.sigma2} onChange={updateField('sigma2')} />
                </label>
              </div>
            </section>

            {inputs.expType === 'ДФЭ' && (
              <section className="lab3-frame">
                <h3>Генераторы ДФЭ (через запятую, пример: x4=x1*x2*x3)</h3>
                <input type="text" value={inputs.generators} onChange={updateField('generators')} />
              </section>
            )}

            <div className="actions-row">
              <button className="lab-button" type="button" onClick={runExperiment}>
                Запуск
              </button>
              {result && (
                <button className="lab-button" type="button" onClick={() => saveExcelReport(result)}>
                  Скачать Excel
                </button>
              )}
            </div>

            {progress && <p className="lab3-progress">{progress}</p>}
            {error && <p className="error-text">{error}</p>}
          </div>
        )}

        {activeTab === 'results' && result && (
          <div className="lab3-tab-panel">
            {result.dfe && (
              <TextBlock title="Схема смешивания (ДФЭ)" value={result.dfe.aliasingStr} />
            )}

            {result.pfe && result.dfe ? (
              <section className="table-wrap">
                <h3>Коэффициенты регрессии</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Коэффициент</th>
                        <th>ПФЭ</th>
                        <th>ДФЭ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.pfe.coefficientsNonlinear.map((row) => {
                        const dfeRow = result.dfe.coefficientsNonlinear.find((item) => item.key === row.key)
                        return (
                          <tr key={row.name}>
                            <td>{row.name}</td>
                            <td>{formatNumber(row.value, 6)}</td>
                            <td>{formatNumber(dfeRow?.value ?? 0, 6)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <CoefficientTable
                title="Коэффициенты регрессии"
                rows={(result.pfe ?? result.dfe).coefficientsNonlinear}
              />
            )}

            {result.pfe && (
              <>
                <TextBlock title="ПФЭ: линейная модель, нормированные факторы" value={result.pfe.normalizedEquationLinear} />
                <TextBlock title="ПФЭ: линейная модель, натуральные факторы" value={result.pfe.naturalEquationLinear} />
                <TextBlock title="ПФЭ: нелинейная модель, нормированные факторы" value={result.pfe.normalizedEquationNonlinear} />
                <TextBlock title="ПФЭ: нелинейная модель, натуральные факторы" value={result.pfe.naturalEquationNonlinear} />
                <ExperimentResultTable title="Матрица планирования и результаты ПФЭ" rows={result.pfe.rows} factorNames={result.pfe.factorNames} />
              </>
            )}

            {result.dfe && (
              <>
                <TextBlock title="ДФЭ: линейная модель, нормированные факторы" value={result.dfe.normalizedEquationLinear} />
                <TextBlock title="ДФЭ: линейная модель, натуральные факторы" value={result.dfe.naturalEquationLinear} />
                <TextBlock title="ДФЭ: нелинейная модель, нормированные факторы" value={result.dfe.normalizedEquationNonlinear} />
                <TextBlock title="ДФЭ: нелинейная модель, натуральные факторы" value={result.dfe.naturalEquationNonlinear} />
                <ExperimentResultTable title="Матрица планирования и результаты ДФЭ" rows={result.dfe.rows} factorNames={result.dfe.factorNames} />
              </>
            )}
          </div>
        )}

        {activeTab === 'validation' && result && (
          <div className="lab3-tab-panel">
            <section className="lab3-frame">
              <h3>Ввод нормированных значений xᵢ (от -1 до 1)</h3>
              <div className="lab3-validation-grid">
                {FACTOR_DEFS.map((factor, index) => (
                  <label key={factor.key}>
                    x{index + 1}
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.validationPoint[factor.key]}
                      onChange={updateValidationPoint(factor.key)}
                    />
                  </label>
                ))}
              </div>
              <div className="actions-row">
                <button className="lab-button" type="button" onClick={runValidation}>
                  Проверить в точке
                </button>
              </div>
            </section>

            <TextBlock title="Результат проверки" value={validationText || 'Проверка ещё не выполнялась.'} />
          </div>
        )}

        <button className="lab-button main-menu-button" type="button" onClick={onBack}>
          Главное меню
        </button>
      </section>
    </main>
  )
}

export default Lab3Page
