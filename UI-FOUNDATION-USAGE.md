# Shared UI Foundation Usage

## Purpose

This foundation is shared across all final-fix modules.

Do not duplicate status labels, date/time formatters, or shared empty/status UI.

---

## 1. Status mapping

Use:

```js
import {
  getStatusMeta,
  getStatusLabel,
  getStatusTone,
} from './utils/status'
```

Prefer using the shared status component:

```jsx
<StatusBadge status={item.status} />
```

Instead of rendering raw enum values:

```jsx
{item.status}
```

---

## 2. StatusBadge

Import:

```js
import StatusBadge from './components/common/StatusBadge'
```

Usage:

```jsx
<StatusBadge status="COMPLETED" />
```

The component automatically maps the raw status to:

- Thai user-facing label
- shared badge tone

Do not manually assign random status colors on each page.

---

## 3. Date/time formatting

Import:

```js
import {
  formatDate,
  formatTime,
  formatDateTime,
} from './utils/dateTime'
```

Examples:

```jsx
{formatDate(item.created_at)}
{formatTime(schedule.start_time)}
{formatDateTime(item.updated_at)}
```

Do not create new local `Intl.DateTimeFormat` helpers unless the shared formatter cannot support the case.

---

## 4. EmptyState

Import:

```js
import EmptyState from './components/common/EmptyState'
```

Usage:

```jsx
<EmptyState
  title="ยังไม่มีข้อมูล"
  description="ข้อมูลจะแสดงเมื่อมีรายการในระบบ"
/>
```

Optional props:

- `icon`
- `action`
- `className`

---

## 5. Shared UI conventions

Use existing shared components where possible:

- `Button`
- `Badge`
- `Card`
- `Input`
- `LoadingState`
- `ErrorState`
- `EmptyState`
- `StatusBadge`

Use shared Tailwind theme tokens from `tailwind.config.js`.

Avoid:

- raw DB/Auth errors
- raw enum/status values
- random status colors
- duplicate date/time formatters
- browser-native alert/confirm in polished target flows

Keep:

- loading states intentional
- error states intentional
- empty states intentional
- visible keyboard focus
- consistent Thai/English wording
- consistent date/time display