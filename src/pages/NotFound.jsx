import { Link } from 'react-router-dom'
import Button from '../components/common/Button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
          <Link to="/">
            <Button>
              กลับหน้าหลัก
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
