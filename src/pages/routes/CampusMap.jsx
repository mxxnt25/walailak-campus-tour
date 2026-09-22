import { Component, useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('CampusMap render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState message="ไม่สามารถแสดงแผนที่ได้ในขณะนี้" />
      )
    }

    return this.props.children
  }
}

function FitMapToStops({ stops }) {
  const map = useMap()

  useEffect(() => {
    const validStops = stops.filter(
      (stop) =>
        Number.isFinite(Number(stop.latitude)) &&
        Number.isFinite(Number(stop.longitude)),
    )

    if (validStops.length === 0) return

    if (validStops.length === 1) {
      map.setView(
        [
          Number(validStops[0].latitude),
          Number(validStops[0].longitude),
        ],
        16,
      )
      return
    }

    const bounds = L.latLngBounds(
      validStops.map((stop) => [
        Number(stop.latitude),
        Number(stop.longitude),
      ]),
    )

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 17,
    })
  }, [map, stops])

  return null
}

function CampusMap({ stops = [] }) {
  const [tileState, setTileState] = useState('loading')
  const tileErrorRef = useRef(false)

  const validStops = stops.filter(
    (stop) =>
      Number.isFinite(Number(stop.latitude)) &&
      Number.isFinite(Number(stop.longitude)),
  )

  if (validStops.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีข้อมูลตำแหน่ง"
        description="จุดแวะที่มีพิกัดจะแสดงบนแผนที่เมื่อมีข้อมูลพร้อมใช้งาน"
      />
    )
  }

  const firstStop = validStops[0]

  const initialCenter = [
    Number(firstStop.latitude),
    Number(firstStop.longitude),
  ]

  return (
    <MapErrorBoundary>
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {tileState === 'loading' && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface/90">
            <LoadingState message="กำลังโหลดแผนที่..." />
          </div>
        )}

        {tileState === 'error' && (
          <div className="absolute inset-x-4 top-4 z-[600] rounded-card border border-danger/30 bg-surface shadow-lg">
            <ErrorState message="โหลดข้อมูลแผนที่ไม่สำเร็จ กรุณาลองใหม่ภายหลัง" />
          </div>
        )}

        <MapContainer
          center={initialCenter}
          zoom={16}
          scrollWheelZoom
          className="h-[320px] w-full sm:h-[420px] lg:h-[480px]"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              loading: () => {
                tileErrorRef.current = false
                setTileState('loading')
              },
              tileerror: () => {
                tileErrorRef.current = true
                setTileState('error')
              },
              load: () => {
                setTileState(
                  tileErrorRef.current ? 'error' : 'ready'
                )
              },
            }}
          />

          <FitMapToStops stops={validStops} />

          {validStops.map((stop, index) => (
            <Marker
              key={stop.id || `${stop.latitude}-${stop.longitude}-${index}`}
              position={[
                Number(stop.latitude),
                Number(stop.longitude),
              ]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <div className="font-semibold">
                    จุดที่ {stop.stop_order ?? index + 1}: {stop.name || 'ไม่ระบุชื่อจุด'}
                  </div>

                  {stop.description && (
                    <div className="mt-1 text-sm">
                      {stop.description}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </MapErrorBoundary>
  )
}

export default CampusMap
