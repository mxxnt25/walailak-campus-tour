import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-card border border-border bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">
          Walailak Campus Tour
        </p>

        <h1 className="mt-4 text-6xl font-bold text-textPrimary">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-textPrimary">
          ไม่พบหน้าที่คุณต้องการ
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-textSecondary">
          หน้านี้อาจถูกย้าย ลบ หรือ URL ที่เปิดไม่ถูกต้อง
        </p>

        <div className="mt-6 flex justify-center">
          <Link to="/" className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}
