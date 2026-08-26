export default function LoadingState({ message = 'กำลังโหลด...' }) {
  return (
    <div className="flex items-center justify-center p-8 text-textSecondary">
      {message}
    </div>
  )
}