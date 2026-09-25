import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addStopDiscovery,
  filterDiscoverableRoutes,
  getSafeRouteImageUrl,
  normalizeRouteSearch,
} from '../src/utils/routeDiscovery.js'

const activeRoutes = [
  { id: 'one', name: 'Walailak Gateway', description: 'ประตูหลัก' },
  { id: 'two', name: 'สวนวลัยลักษณ์', description: 'ชมสวนในมหาวิทยาลัย' },
]

const stops = [
  { route_id: 'one', name: 'ทางเข้า', description: 'welcome point', image_url: 'javascript:alert(1)' },
  { route_id: 'one', name: 'หอประชุม', description: 'main hall', image_url: 'https://example.com/gateway.jpg' },
  { route_id: 'two', name: 'อ่างเก็บน้ำ', description: 'จุดชมวิว', image_url: null },
]

test('normalizes spaces, English case, and Thai text', () => {
  assert.equal(normalizeRouteSearch('  WALA   LAIK  '), 'wala laik')
  assert.equal(normalizeRouteSearch('  สวน   วลัยลักษณ์  '), 'สวน วลัยลักษณ์')
})

test('home search and route directory match route names, descriptions, and stop names', () => {
  const enriched = addStopDiscovery(activeRoutes, stops)
  assert.equal(filterDiscoverableRoutes(enriched, 'wala')[0].id, 'one')
  assert.equal(filterDiscoverableRoutes(enriched, 'สวน')[0].id, 'two')
  assert.equal(filterDiscoverableRoutes(enriched, 'main hall')[0].id, 'one')
  assert.equal(filterDiscoverableRoutes(enriched, 'อ่างเก็บน้ำ')[0].id, 'two')
  assert.deepEqual(filterDiscoverableRoutes(enriched, 'not here'), [])
  assert.deepEqual(filterDiscoverableRoutes(enriched, '   '), enriched)
})

test('chooses real stop photos without substituting the same generic campus photo', () => {
  const enriched = addStopDiscovery(activeRoutes, stops)
  assert.equal(enriched[0].cover_image_url, 'https://example.com/gateway.jpg')
  assert.equal(enriched[1].cover_image_url, null)
  assert.equal(enriched[0].search_stops.length, 2)
})

test('rejects unsafe image schemes and protocol-relative URLs', () => {
  assert.equal(getSafeRouteImageUrl('javascript:alert(1)'), null)
  assert.equal(getSafeRouteImageUrl('data:image/svg+xml,evil'), null)
  assert.equal(getSafeRouteImageUrl('//external.invalid/a.png'), null)
  assert.equal(getSafeRouteImageUrl('https://'), null)
  assert.equal(getSafeRouteImageUrl('  /images/home-campus.jpg '), '/images/home-campus.jpg')
  assert.equal(getSafeRouteImageUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg')
})

test('when stop lookup is unavailable, routes remain searchable by name', () => {
  const enriched = addStopDiscovery(activeRoutes, [])
  assert.deepEqual(filterDiscoverableRoutes(enriched, 'Walailak').map((route) => route.id), ['one'])
  assert.equal(enriched[0].cover_image_url, null)
})
