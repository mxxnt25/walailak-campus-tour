import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

function FitMapToStops({ stops }) {
  const map = useMap()

  useEffect(() => {
    const validStops = stops.filter(
      (stop) =>
        Number.isFinite(Number(stop.latitude)) &&
        Number.isFinite(Number(stop.longitude)),
    )

    if (validStops.length === 0) {
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
    })
  }, [map, stops])

  return null
}

function CampusMap({ stops = [] }) {
  const validStops = stops.filter(
    (stop) =>
      Number.isFinite(Number(stop.latitude)) &&
      Number.isFinite(Number(stop.longitude)),
  )

  if (validStops.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-textSecondary">
        ยังไม่มีข้อมูลตำแหน่งสำหรับแสดงบนแผนที่
      </div>
    )
  }

  const firstStop = validStops[0]

  const initialCenter = [
    Number(firstStop.latitude),
    Number(firstStop.longitude),
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <MapContainer
        center={initialCenter}
        zoom={16}
        scrollWheelZoom
        className="h-[320px] w-full sm:h-[420px]"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMapToStops stops={validStops} />

        {validStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[
              Number(stop.latitude),
              Number(stop.longitude),
            ]}
            icon={defaultIcon}
          >
            <Popup>
              <div>
                <div className="font-semibold">
                  จุดที่ {stop.stop_order}: {stop.name}
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
  )
}

export default CampusMap