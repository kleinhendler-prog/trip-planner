'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip, Day, Activity } from '@/types';
import { DAY_COLORS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface TripMapProps {
  trip: Trip;
}

interface MarkerData {
  id: string;
  title: string;
  type: string;
  dayNumber: number;
  lat: number;
  lng: number;
  order: number;
  googleMapsUrl?: string;
}

const BoundsUpdater: React.FC<{ markers: MarkerData[] }> = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng])
    );

    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, map]);

  return null;
};

const NumberedMarker: React.FC<{
  lat: number;
  lng: number;
  number: number;
  dayColor: string;
  title: string;
  type: string;
  googleMapsUrl?: string;
}> = ({ lat, lng, number, dayColor, title, type, googleMapsUrl }) => {
  const svgString = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${dayColor}" stroke="white" stroke-width="2"/>
      <text x="20" y="26" font-size="20" font-weight="bold" text-anchor="middle" fill="white">${number}</text>
    </svg>
  `;

  const icon = L.divIcon({
    html: svgString,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -10],
    className: 'numbered-marker',
  });

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div className="p-2">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-gray-600 capitalize">{type}</p>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

const TripMapContent: React.FC<{
  markers: MarkerData[];
  visibleDays: Set<number>;
  trip: Trip;
}> = ({ markers, visibleDays, trip }) => {
  const filteredMarkers = markers.filter((m) => visibleDays.has(m.dayNumber));

  return (
    <>
      <BoundsUpdater markers={filteredMarkers} />
      {filteredMarkers.map((marker) => (
        <NumberedMarker
          key={marker.id}
          lat={marker.lat}
          lng={marker.lng}
          number={marker.order}
          dayColor={DAY_COLORS[marker.dayNumber - 1]}
          title={marker.title}
          type={marker.type}
          googleMapsUrl={marker.googleMapsUrl}
        />
      ))}
    </>
  );
};

const TripMap: React.FC<TripMapProps> = ({ trip }) => {
  const [visibleDays, setVisibleDays] = useState<Set<number>>(
    new Set(trip.days.map((_, i) => i + 1))
  );
  const mapRef = useRef<L.Map | null>(null);

  const markers: MarkerData[] = [];
  const defaultCenter: [number, number] = trip.destinationCoordinates
    ? [trip.destinationCoordinates.lat, trip.destinationCoordinates.lng]
    : [51.505, -0.09];

  trip.days.forEach((day) => {
    const dayColor = DAY_COLORS[day.dayNumber - 1];
    let activityOrder = 1;
    let restaurantOrder = 1;

    day.activities.forEach((activity) => {
      if (activity.location?.lat && activity.location?.lng) {
        markers.push({
          id: activity.id,
          title: activity.title,
          type: activity.type,
          dayNumber: day.dayNumber,
          lat: activity.location.lat,
          lng: activity.location.lng,
          order: activityOrder++,
          googleMapsUrl: activity.externalLinks?.googleMaps,
        });
      }
    });

    day.meals.forEach((meal) => {
      if (meal.restaurant.lat && meal.restaurant.lng) {
        markers.push({
          id: meal.id,
          title: meal.restaurant.name,
          type: 'dining',
          dayNumber: day.dayNumber,
          lat: meal.restaurant.lat,
          lng: meal.restaurant.lng,
          order: restaurantOrder++,
          googleMapsUrl: meal.restaurant.website,
        });
      }
    });
  });

  const toggleDay = (dayNumber: number) => {
    const newVisible = new Set(visibleDays);
    if (newVisible.has(dayNumber)) {
      newVisible.delete(dayNumber);
    } else {
      newVisible.add(dayNumber);
    }
    setVisibleDays(newVisible);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Day Filter Checkboxes */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Day</h3>
        <div className="flex flex-wrap gap-3">
          {trip.days.map((day) => (
            <label
              key={day.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={visibleDays.has(day.dayNumber)}
                onChange={() => toggleDay(day.dayNumber)}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: DAY_COLORS[day.dayNumber - 1] }}
              />
              <span className="text-sm text-gray-700">
                Day {day.dayNumber}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <TripMapContent
            markers={markers}
            visibleDays={visibleDays}
            trip={trip}
          />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {trip.days.map((day) => (
            <div key={day.id} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: DAY_COLORS[day.dayNumber - 1] }}
              />
              <span className="text-gray-700">Day {day.dayNumber}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { TripMap };
