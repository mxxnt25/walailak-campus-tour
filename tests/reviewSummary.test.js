import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRouteReviewSummaries } from '../src/utils/reviewSummary.js'

test('groups visible review scores by the route that was reviewed', () => {
  const result = buildRouteReviewSummaries([
    { route_id: 'route-a', overall_rating: 5 },
    { route_id: 'route-b', overall_rating: 3 },
    { route_id: 'route-a', overall_rating: 4 },
  ])
  assert.deepEqual(result, {
    'route-a': { rating: 4.5, count: 2 },
    'route-b': { rating: 3, count: 1 },
  })
})

test('ignores missing route IDs and invalid scores without inventing a rating', () => {
  assert.deepEqual(buildRouteReviewSummaries([
    { route_id: 'route-a', overall_rating: null },
    { route_id: 'route-a', overall_rating: 6 },
    { route_id: null, overall_rating: 5 },
  ]), {})
})
