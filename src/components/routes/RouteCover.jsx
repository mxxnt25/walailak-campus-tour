import { useState } from 'react'
import { MapPinned } from 'lucide-react'
import { getSafeRouteImageUrl } from '../../utils/routeDiscovery'

export default function RouteCover({ src, alt, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const safeSrc = getSafeRouteImageUrl(src)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/20 ${className}`}>
      {safeSrc && !imageFailed ? (
        <img
          src={safeSrc}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-primary/75">
          <MapPinned size={30} aria-hidden="true" />
          <span className="text-xs font-medium">ยังไม่มีรูปภาพเส้นทางนี้</span>
        </div>
      )}
    </div>
  )
}
