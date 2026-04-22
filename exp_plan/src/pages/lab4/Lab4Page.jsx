import { useMemo, useState } from 'react'
import { exportWorkbookAsExcel } from '../../utils/excel'
import { formatNumber } from '../lab1/formatters'
import '../lab1/Lab1Page.css'
import '../lab3/Lab3Page.css'
import './Lab4Page.css'
import { DEFAULT_LAB4_INPUTS, FACTOR_DEFS } from './constants'
import { runLab4Experiment, STAR_ALPHA, validateLab4Point } from './regression'

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
              <tr key={row.key}>
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

function ResultTable({ rows }) {
  return (
    <section className="table-wrap">
      <h3>Матрица ОЦКП и результаты</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>№</th>
              {FACTOR_DEFS.map((factor) => (
                <th key={`${factor.key}-coded`}>{factor.codeLabel}</th>
              ))}
              {FACTOR_DEFS.map((factor) => (
                <th key={`${factor.key}-natural`}>{factor.naturalLabel}</th>
              ))}
              <th>ȳ</th>
              <th>ŷ норм</th>
              <th>ŷ натур</th>
              <th>|Δ норм|</th>
              <th>|Δ натур|</th>
              <th>δ норм, %</th>
              <th>δ натур, %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.expNum}>
                <td>{row.expNum}</td>
                {row.normalized.map((value, index) => (
                  <td key={`${row.expNum}-n-${index}`}>{formatNumber(value, 4)}</td>
                ))}
                {row.natural.map((value, index) => (
                  <td key={`${row.expNum}-a-${index}`}>{formatNumber(value, 4)}</td>
                ))}
                <td>{formatNumber(row.yMean, 6)}</td>
                <td>{formatNumber(row.yNormalized, 6)}</td>
                <td>{formatNumber(row.yNatural, 6)}</td>
                <td>{formatNumber(row.errorNormalized, 6)}</td>
                <td>{formatNumber(row.errorNatural, 6)}</td>
                <td>{formatNumber(row.relErrorNormalizedPerc, 2)}</td>
                <td>{formatNumber(row.relErrorNaturalPerc, 2)}</td>
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

function buildResultSection(rows) {
  return {
    title: 'Матрица ОЦКП и результаты',
    header: [
      '№',
      ...FACTOR_DEFS.map((factor) => factor.codeLabel),
      ...FACTOR_DEFS.map((factor) => factor.naturalLabel),
      'ȳ',
      'ŷ норм',
      'ŷ натур',
      '|Δ норм|',
      '|Δ натур|',
      'δ норм, %',
      'δ натур, %',
    ],
    rows: rows.map((row) => [
      row.expNum,
      ...row.normalized.map((value) => Number(value.toFixed(4))),
      ...row.natural.map((value) => Number(value.toFixed(4))),
      Number(row.yMean.toFixed(6)),
      Number(row.yNormalized.toFixed(6)),
      Number(row.yNatural.toFixed(6)),
      Number(row.errorNormalized.toFixed(6)),
      Number(row.errorNatural.toFixed(6)),
      Number(row.relErrorNormalizedPerc.toFixed(2)),
      Number(row.relErrorNaturalPerc.toFixed(2)),
    ]),
  }
}

function saveExcelReport(result, validation) {
  const sections = [
    {
      title: 'Константы ОЦКП',
      header: ['Параметр', 'Значение'],
      rows: [
        ['N', result.constants.runCount],
        ['a', Number(result.constants.a.toFixed(6))],
        ['alpha', Number(result.constants.alpha.toFixed(6))],
        ['Повторов', result.parsed.replications],
        ['Лимит заявок', result.parsed.requestLimit],
        ['σ1', Number(result.parsed.sigma1.toFixed(4))],
        ['σ2', Number(result.parsed.sigma2.toFixed(4))],
      ],
    },
    buildCoefficientSection('Нормированная модель', result.normalizedModel.coefficientRows),
    buildCoefficientSection('Натуральная модель', result.naturalModel.coefficientRows),
    {
      title: 'Уравнения регрессии',
      rows: [
        ['Нормированное уравнение', result.normalizedModel.equation],
        ['Натуральное уравнение', result.naturalModel.equation],
      ],
    },
    buildResultSection(result.rows),
  ]

  if (validation) {
    sections.push({
      title: 'Проверка в точке',
      rows: [
        ['Кодированная точка', validation.normalized.map((value) => value.toFixed(4)).join('; ')],
        ['Натуральная точка', validation.natural.map((value) => value.toFixed(4)).join('; ')],
        ['ŷ норм', Number(validation.predictedNormalized.toFixed(6))],
        ['ŷ натур', Number(validation.predictedNatural.toFixed(6))],
        ['y имитация', Number(validation.actual.toFixed(6))],
        ['|Δ норм|', Number(validation.errorNormalized.toFixed(6))],
        ['|Δ натур|', Number(validation.errorNatural.toFixed(6))],
      ],
    })
  }

  exportWorkbookAsExcel('lab4-results.xls', [
    {
      name: 'Lab4 report',
      title: 'Лабораторная работа №4',
      sections,
    },
  ])
}

function Lab4Page({ onBack }) {
  const [inputs, setInputs] = useState(DEFAULT_LAB4_INPUTS)
  const [result, setResult] = useState(null)
  const [validation, setValidation] = useState(null)
  const [validationText, setValidationText] = useState('')
  const [error, setError] = useState('')

  const factorCenters = useMemo(
    () =>
      FACTOR_DEFS.reduce((acc, factor) => {
        const min = Number(inputs.factorRanges[factor.key].min)
        const max = Number(inputs.factorRanges[factor.key].max)
        acc[factor.key] = Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : 0
        return acc
      }, {}),
    [inputs.factorRanges],
  )

  const updateField = (key) => (event) => {
    setInputs((prev) => ({
      ...prev,
      [key]: event.target.value,
    }))
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
    const nextResult = runLab4Experiment(inputs)

    if (nextResult.error) {
      setError(nextResult.error)
      setResult(null)
      setValidation(null)
      setValidationText('')
      return
    }

    setResult(nextResult)
    setValidation(null)
    setValidationText('')
    setError('')
  }

  const runValidation = () => {
    if (!result) {
      return
    }

    const nextValidation = validateLab4Point(result, inputs.validationPoint)
    if (nextValidation.error) {
      setError(nextValidation.error)
      setValidation(null)
      setValidationText('')
      return
    }

    setValidation(nextValidation)
    setValidationText(nextValidation.text)
    setError('')
  }

  return (
    <main className="page">
      <section className="panel lab4-panel">
        <div className="lab2-header">
          <h1>Лабораторная работа №4: ОЦКП для модели СМО</h1>
          <p className="subtitle">
            Центральный композиционный план для системы с двумя генераторами и двумя
            интенсивностями обслуживания.
          </p>
        </div>

        <section className="service-hint">
          <p>Отклик модели: среднее время ожидания заявки в очереди.</p>
          <p>План: 2^4 + 2·4 + 1 = 25 опытов, включая звёздные точки и центр плана.</p>
          <p>Для проверки можно задать произвольную точку в нормированном факторном пространстве.</p>
        </section>

        <section className="lab4-constants">
          <article className="lab4-card">
            <h3>Константы плана</h3>
            <p>a = {formatNumber(result?.constants.a ?? 0.8, 6)}</p>
            <p>α = {formatNumber(result?.constants.alpha ?? STAR_ALPHA, 6)}</p>
            <p>Число опытов = {result?.constants.runCount ?? 25}</p>
          </article>
          <article className="lab4-card">
            <h3>Параметры имитации</h3>
            <p>Повторов на точку: {inputs.replications}</p>
            <p>Лимит обработанных заявок: {inputs.requestLimit}</p>
            <p>σ1 = {inputs.sigma1}, σ2 = {inputs.sigma2}</p>
          </article>
          <article className="lab4-card">
            <h3>Проверка точки</h3>
            <p>Координаты задаются в кодированных факторах x1..x4.</p>
            <p>Допустимый диапазон: от -{formatNumber(STAR_ALPHA, 3)} до {formatNumber(STAR_ALPHA, 3)}.</p>
          </article>
        </section>

        <section className="lab4-grid">
          <label>
            Повторов на опыт
            <input type="number" min="1" value={inputs.replications} onChange={updateField('replications')} />
          </label>
          <label>
            Лимит обработанных заявок
            <input type="number" min="1" value={inputs.requestLimit} onChange={updateField('requestLimit')} />
          </label>
          <label>
            σ1
            <input type="number" min="0" step="0.001" value={inputs.sigma1} onChange={updateField('sigma1')} />
          </label>
          <label>
            σ2
            <input type="number" min="0" step="0.001" value={inputs.sigma2} onChange={updateField('sigma2')} />
          </label>
        </section>

        <section className="table-wrap">
          <h3>Диапазоны факторов</h3>
          <div className="lab3-factor-table">
            {FACTOR_DEFS.map((factor) => (
              <div key={factor.key} className="lab4-factor-row">
                <span>{factor.label}</span>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.factorRanges[factor.key].min}
                  onChange={updateFactorRange(factor.key, 'min')}
                />
                <span className="lab3-range-dash">-</span>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.factorRanges[factor.key].max}
                  onChange={updateFactorRange(factor.key, 'max')}
                />
                <span className="lab3-center-note">центр: {formatNumber(factorCenters[factor.key], 4)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="actions-row">
          <button className="lab-button" type="button" onClick={runExperiment}>
            Выполнить ОЦКП
          </button>
          {result && (
            <button className="lab-button" type="button" onClick={() => saveExcelReport(result, validation)}>
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
                <p>Факторов: {FACTOR_DEFS.length}</p>
                <p>Опыты: {result.constants.runCount}</p>
                <p>Повторов: {result.parsed.replications}</p>
              </article>
              <article className="metric-card">
                <h3>Нормированная модель</h3>
                <p>Коэффициентов: {result.normalizedModel.coefficients.length}</p>
                <p>
                  Средняя |Δ|:{' '}
                  {formatNumber(
                    result.rows.reduce((sum, row) => sum + row.errorNormalized, 0) / result.rows.length,
                    6,
                  )}
                </p>
              </article>
              <article className="metric-card">
                <h3>Натуральная модель</h3>
                <p>Коэффициентов: {result.naturalModel.coefficients.length}</p>
                <p>
                  Средняя |Δ|:{' '}
                  {formatNumber(
                    result.rows.reduce((sum, row) => sum + row.errorNatural, 0) / result.rows.length,
                    6,
                  )}
                </p>
              </article>
            </section>

            <section className="lab4-equations">
              <article className="equation-card">
                <h3>Уравнение в нормированных факторах</h3>
                <p>{result.normalizedModel.equation}</p>
              </article>
              <article className="equation-card">
                <h3>Уравнение в натуральных факторах</h3>
                <p>{result.naturalModel.equation}</p>
              </article>
            </section>

            <CoefficientTable title="Коэффициенты нормированной модели" rows={result.normalizedModel.coefficientRows} />
            <CoefficientTable title="Коэффициенты натуральной модели" rows={result.naturalModel.coefficientRows} />
            <ResultTable rows={result.rows} />

            <section className="table-wrap">
              <h3>Проверка модели в произвольной точке</h3>
              <p className="lab4-note">Введите координаты в кодированном пространстве факторов.</p>
              <div className="lab4-validation-grid">
                {FACTOR_DEFS.map((factor) => (
                  <label key={factor.key}>
                    {factor.codeLabel}
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
                  Проверить точку
                </button>
              </div>
            </section>

            <TextBlock title="Результат проверки" value={validationText || 'Проверка ещё не выполнялась.'} />
          </>
        )}

        <button className="lab-button main-menu-button" type="button" onClick={onBack}>
          Главное меню
        </button>
      </section>
    </main>
  )
}

export default Lab4Page
