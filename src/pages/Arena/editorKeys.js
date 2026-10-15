/**
 * Pure text-editing helpers for the Arena code editor (a plain <textarea>).
 * Every function takes the current value + selection and returns
 * { value, start, end } describing the edit, or null when nothing changes.
 * Keeping them pure makes them trivial to unit-test.
 */

export const INDENT = '    ' // Python convention: 4 spaces

function lineStart(value, index) {
  return value.lastIndexOf('\n', index - 1) + 1
}

function lineEnd(value, index) {
  const end = value.indexOf('\n', index)
  return end === -1 ? value.length : end
}

/** Tab / Shift+Tab. Multi-line selections indent or outdent every line. */
export function indentEdit(value, start, end, outdent = false) {
  const multiLine = value.slice(start, end).includes('\n')

  if (!multiLine && !outdent) {
    // Insert spaces up to the next 4-column tab stop.
    const col = start - lineStart(value, start)
    const spaces = ' '.repeat(INDENT.length - (col % INDENT.length))
    const next = value.slice(0, start) + spaces + value.slice(end)
    const caret = start + spaces.length
    return { value: next, start: caret, end: caret }
  }

  const blockStart = lineStart(value, start)
  // A selection ending exactly at the start of a line should not touch that line.
  const effectiveEnd = end > start && value[end - 1] === '\n' ? end - 1 : end
  const blockEnd = lineEnd(value, effectiveEnd)
  const lines = value.slice(blockStart, blockEnd).split('\n')

  let firstDelta = 0
  let totalDelta = 0
  const edited = lines.map((line, i) => {
    let result = line
    let delta = 0
    if (outdent) {
      const match = line.match(/^ {1,4}|^\t/)
      if (match) {
        result = line.slice(match[0].length)
        delta = -match[0].length
      }
    } else if (line.length > 0) {
      result = INDENT + line
      delta = INDENT.length
    }
    if (i === 0) firstDelta = delta
    totalDelta += delta
    return result
  })

  if (totalDelta === 0) return null

  const next = value.slice(0, blockStart) + edited.join('\n') + value.slice(blockEnd)
  const newStart = Math.max(blockStart, start + firstDelta)
  return { value: next, start: newStart, end: Math.max(newStart, end + totalDelta) }
}

/** Enter: keep the current line's indentation; add one level after a ':' line. */
export function newlineEdit(value, start, end) {
  const before = value.slice(lineStart(value, start), start)
  const indent = before.match(/^[ \t]*/)[0]
  const opensBlock = /:\s*(#.*)?$/.test(before)
  const insert = '\n' + indent + (opensBlock ? INDENT : '')
  const next = value.slice(0, start) + insert + value.slice(end)
  const caret = start + insert.length
  return { value: next, start: caret, end: caret }
}
