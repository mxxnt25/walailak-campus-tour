import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Reset the previous page's scroll position before a new route paints. Keeping
// the scroll position from a long route/map page makes short loading pages jump
// as their content arrives; query-only search updates keep their position.
export default function ScrollOnRouteChange() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
