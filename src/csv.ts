export function encodeCsv(rows: readonly (readonly (string | number)[])[]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value)
          return /[",\r\n]/.test(text)
            ? `"${text.replaceAll('"', '""')}"`
            : text
        })
        .join(','),
    )
    .join('\r\n')
}
