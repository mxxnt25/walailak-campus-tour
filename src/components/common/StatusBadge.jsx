import Badge from './Badge'
import { getStatusMeta } from '../../utils/status'

export default function StatusBadge({ status }) {
  const { label, tone } = getStatusMeta(status)

  return (
    <Badge color={tone}>
      {label}
    </Badge>
  )
}