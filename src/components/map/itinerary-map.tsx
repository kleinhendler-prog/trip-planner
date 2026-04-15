'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DAY_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

interface Activity {
  time: string;
  name: string;
  type: string;
  location?: { name: string; address?: string; lat?: number; lng?: number };
}

interface Day {
  dayNumber: number;
  date: string;
  activities: Activity[];
}

interface ItineraryMapProps {
  days: Day[];
}

interface MarkerInfo {
  dayNumber: number;
  order: number;
  lat: number;
  lng: number;
  name: string;
  time: string;
  type: string;
}

const numberedIcon = (number: number, color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:${color};
      color:white;
      width:30px;height:30px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:bold;font-size:13px;
      border:3px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const BoundsUpdater: React.FC<{ markers: MarkerInfo[] }> = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [markers, map]);
  return null;
};

export default function ItineraryMap({ days }: ItineraryMapProps) {
  // Collect all markers with coordinates
  const markers: MarkerInfo[] = [];
  days.forEach((day) => {
    day.activities.forEach((act, idx) => {
      if (act.location?.lat != null && act.location?.lng != null) {
        markers.push({
          dayNumber: day.dayNumber,
          order: idx + 1,
          lat: act.location.lat,
          lng: act.location.lng,
          name: act.name,
          time: act.time,
          type: act.type,
        });
      }
    });
  });

  if (markers.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded border text-gray-500 text-sm">
        No location data available for the map
      </div>
    );
  }

  // Build lines per day
  const dayLines: Array<{ day: number; color: string; positions: [number, number][] }> = [];
  days.forEach((day) => {
    const dayMarkers = markers.filter((m) => m.dayNumber === day.dayNumber);
    if (dayMarkers.length >= 2) {
      dayLines.push({
        day: day.dayNumber,
        color: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length],
        positions: dayMarkers.map((m) => [m.lat, m.lng] as [number, number]),
      });
    }
  });

  const center: [number, number] = [markers[0].lat, markers[0].lng];

  return (
    <div className="relative h-[500px] w-full rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <BoundsUpdater markers={markers} />
        {dayLines.map((line) => (
          <Polyline key={line.day} positions={line.positions} color={line.color} weight={3} opacity={0.6} dashArray="5, 10" />
        ))}
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={[m.lat, m.lng]}
            icon={numberedIcon(m.order, DAY_COLORS[(m.dayNumber - 1) % DAY_COLORS.length])}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-gray-600">Day {m.dayNumber} · {m.time}</div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {/* Day legend */}
      <div className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-md p-2 max-w-[180px]">
        <div className="text-xs font-semibold mb-1">Days</div>
        <div className="flex flex-wrap gap-1">
          {days.map((day) => (
            <div
              key={day.dayNumber}
              className="flex items-center gap-1 text-xs"
              style={{ color: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
              />
              <span className="text-gray-700">{day.dayNumber}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
