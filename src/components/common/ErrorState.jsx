export default function ErrorState({ message = 'เกิดข้อผิดพลาด' }) {
  return (
    <div className="flex items-center justify-center p-8 text-danger">
      {message}
    </div>
  )
}