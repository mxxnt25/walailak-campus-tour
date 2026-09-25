// Shared route discovery for the home page and the route directory.
// Keep search local to the already public, active routes; do not widen RLS.
export function normalizeRouteSearch(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('th-TH')
    .trim()
    .replace(/\s+/g, ' ')
}

export function filterDiscoverableRoutes(routes, keyword) {
  const terms = normalizeRouteSearch(keyword).split(' ').filter(Boolean)
  if (terms.length === 0) return routes

  return routes.filter((route) => {
    const searchableText = normalizeRouteSearch([
      route.name,
      route.description,
      ...(route.search_stops ?? []).flatMap((stop) => [stop.name, stop.description]),
    ].join(' '))

    return terms.every((term) => searchableText.includes(term))
  })
}

// A stop image is an optional URL provided by an admin. Never render a non-image
// URL scheme from the database; local public assets are also supported.
export function getSafeRouteImageUrl(value) {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return url
  }

  try {
    const parsed = new URL(url)
    return ['https:', 'http:'].includes(parsed.protocol) && parsed.hostname
      ? url
      : null
  } catch {
    return null
  }
}

export function addStopDiscovery(routes, stops) {
  const byRouteId = new Map()

  for (const stop of stops ?? []) {
    if (!stop.route_id) continue
    if (!byRouteId.has(stop.route_id)) byRouteId.set(stop.route_id, [])
    byRouteId.get(stop.route_id).push(stop)
  }

  return routes.map((route) => {
    const routeStops = byRouteId.get(route.id) ?? []
    const image = routeStops
      .map((stop) => getSafeRouteImageUrl(stop.image_url))
      .find(Boolean) ?? null

    return {
      ...route,
      search_stops: routeStops.map((stop) => ({
        name: stop.name,
        description: stop.description,
      })),
      cover_image_url: image,
    }
  })
}
