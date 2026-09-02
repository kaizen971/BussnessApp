export const MONTH_HISTORY_LIMIT = 11

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function monthKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

export function monthLabel(date) {
  const label = date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function getMonthBounds(date) {
  const start = startOfMonth(date)
  const end = shiftMonth(start, 1)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

export function isSameMonth(left, right) {
  return monthKey(left) === monthKey(right)
}
