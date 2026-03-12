const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const buildCell = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
  }

  return `<Cell><Data ss:Type="String">${escapeXml(value ?? '')}</Data></Cell>`
}

const buildRow = (cells) => `<Row>${cells.map(buildCell).join('')}</Row>`

const buildSectionRows = (section) => {
  const rows = []

  if (section.title) {
    rows.push(buildRow([section.title]))
  }

  if (section.header) {
    rows.push(buildRow(section.header))
  }

  ;(section.rows ?? []).forEach((row) => {
    rows.push(buildRow(row))
  })

  return rows
}

const buildWorksheet = (sheet) => {
  const rows = []

  if (sheet.title) {
    rows.push(buildRow([sheet.title]))
    rows.push(buildRow([]))
  }

  if (sheet.sections?.length) {
    sheet.sections.forEach((section, index) => {
      rows.push(...buildSectionRows(section))

      if (index < sheet.sections.length - 1) {
        rows.push(buildRow([]))
        rows.push(buildRow([]))
      }
    })
  } else {
    if (sheet.header) {
      rows.push(buildRow(sheet.header))
    }

    ;(sheet.rows ?? []).forEach((row) => {
      rows.push(buildRow(row))
    })
  }

  return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rows.join('')}</Table></Worksheet>`
}

export function exportWorkbookAsExcel(filename, sheets) {
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${sheets.map(buildWorksheet).join('')}
</Workbook>`

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
