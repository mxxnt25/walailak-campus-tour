export const STATUS_META = Object.freeze({
  ACCEPTED: {
    label: 'รับแล้ว',
    tone: 'success',
  },
  ACTIVE: {
    label: 'ใช้งานอยู่',
    tone: 'success',
  },
  CANCELLED: {
    label: 'ยกเลิกแล้ว',
    tone: 'danger',
  },
  CLOSED: {
    label: 'ปิดแล้ว',
    tone: 'primary',
  },
  COMPLETED: {
    label: 'เสร็จสิ้น',
    tone: 'success',
  },
  CONFIRMED: {
    label: 'ยืนยันแล้ว',
    tone: 'success',
  },
  DEACTIVATED: {
    label: 'ปิดการใช้งาน',
    tone: 'danger',
  },
  FULL: {
  label: 'เต็มแล้ว',
  tone: 'warning',
},

  HIDDEN: {
    label: 'ซ่อนอยู่',
    tone: 'warning',
  },
  IN_PROGRESS: {
    label: 'กำลังดำเนินการ',
    tone: 'primary',
  },
  INACTIVE: {
    label: 'ไม่ได้ใช้งาน',
    tone: 'warning',
  },
  OPEN: {
    label: 'เปิดอยู่',
    tone: 'primary',
  },
  RESOLVED: {
    label: 'แก้ไขแล้ว',
    tone: 'success',
  },
})

const UNKNOWN_STATUS = Object.freeze({
  label: 'ไม่ทราบสถานะ',
  tone: 'primary',
})

function normalizeStatus(status) {
  return String(status ?? '').trim().toUpperCase()
}

export function getStatusMeta(status) {
  return STATUS_META[normalizeStatus(status)] ?? UNKNOWN_STATUS
}

export function getStatusLabel(status) {
  return getStatusMeta(status).label
}

export function getStatusTone(status) {
  return getStatusMeta(status).tone
}