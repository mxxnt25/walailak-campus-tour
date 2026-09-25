// Presentation-only labels: keep canonical incident status/severity values in the database.
export const INCIDENT_SEVERITY_LABELS = Object.freeze({
  LOW: 'ต่ำ',
  MEDIUM: 'ปานกลาง',
  HIGH: 'สูง',
  EMERGENCY: 'ฉุกเฉิน',
})

export function getIncidentSeverityLabel(severity) {
  return INCIDENT_SEVERITY_LABELS[String(severity ?? '').trim().toUpperCase()]
    ?? 'ไม่ทราบระดับ'
}
