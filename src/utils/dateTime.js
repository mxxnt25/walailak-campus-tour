const THAI_LOCALE = 'th-TH'
const THAI_TIME_ZONE = 'Asia/Bangkok'
const EMPTY_VALUE = '-'

function toValidDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = toValidDate(value)

  if (!date) return EMPTY_VALUE

  return new Intl.DateTimeFormat(THAI_LOCALE, {
    timeZone: THAI_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatTime(value) {
  if (!value) return EMPTY_VALUE

  // รองรับค่าจากฐานข้อมูลที่เป็น TIME เช่น "13:00:00"
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)

    if (match) {
      const [, hour, minute] = match
      return `${hour.padStart(2, '0')}:${minute} น.`
    }
  }

  const date = toValidDate(value)

  if (!date) return EMPTY_VALUE

  return `${new Intl.DateTimeFormat(THAI_LOCALE, {
    timeZone: THAI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)} น.`
}

export function formatDateTime(value) {
  const date = toValidDate(value)

  if (!date) return EMPTY_VALUE

  return new Intl.DateTimeFormat(THAI_LOCALE, {
    timeZone: THAI_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}