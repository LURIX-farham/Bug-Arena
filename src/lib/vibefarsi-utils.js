/**
 * VibeFarsi-style Persian utilities for Bug Arena.
 * Use only when language === 'fa'. English mode keeps Latin digits.
 */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** Convert Latin digits in a string/number to Persian digits: 1405 → ۱۴۰۵ */
export function fa(value) {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

/** Persian digits back to Latin (for parsing user input). */
export function en(value) {
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

/** Thousands-separated number. In FA mode uses Persian digits + Persian separator. */
export function faNumber(value, language = 'fa') {
  const n = Math.round(Number(value) || 0)
  const formatted = n.toLocaleString('en-US')
  if (language !== 'fa') return formatted
  return fa(formatted).replace(/,/g, '٬')
}

/** Locale-aware number: Persian digits only when language is fa. */
export function localizeNumber(value, language) {
  return faNumber(value, language)
}

/** Percent with correct digits and sign. */
export function faPercent(value, digits = 0, language = 'fa') {
  const raw = Number(value).toFixed(digits)
  if (language !== 'fa') return `${raw}%`
  return `${fa(raw)}٪`
}

/** File size in human form. */
export function faFileSize(bytes, language = 'fa') {
  if (bytes < 1024) {
    return language === 'fa' ? `${fa(bytes)} بایت` : `${bytes} B`
  }
  if (bytes < 1024 ** 2) {
    const kb = (bytes / 1024).toFixed(0)
    return language === 'fa' ? `${fa(kb)} کیلوبایت` : `${kb} KB`
  }
  const mb = (bytes / 1024 ** 2).toFixed(1)
  if (language !== 'fa') return `${mb} MB`
  return `${fa(mb).replace('.', '٫')} مگابایت`
}

/** Format date with locale. */
export function localizeDate(date, language, options = {}) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', options)
}
