// A public review is associated with its route_id by the existing M6 database
// trigger; never infer the route from a reviewer or from a booking on the client.
export function buildRouteReviewSummaries(rows = []) {
  const aggregate = {}
  for (const review of rows) {
    const routeId = review?.route_id
    const rating = Number(review?.overall_rating)
    if (!routeId || !Number.isInteger(rating) || rating < 1 || rating > 5) continue
    const entry = aggregate[routeId] ?? { count: 0, total: 0 }
    entry.count += 1
    entry.total += rating
    aggregate[routeId] = entry
  }
  return Object.fromEntries(
    Object.entries(aggregate).map(([routeId, { count, total }]) => [
      routeId,
      { count, rating: Number((total / count).toFixed(1)) },
    ]),
  )
}
