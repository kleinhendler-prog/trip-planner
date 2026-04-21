'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Hotel } from '@/types';
import { PRICE_LEVEL_LABELS } from '@/lib/constants';

interface HotelCardProps {
  hotel: Hotel;
  photo?: string;
  nights?: number;
  onMarkBooked?: (booked: boolean) => void;
  isBooked?: boolean;
  description?: string;
}

const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  photo,
  nights = 1,
  onMarkBooked,
  isBooked = false,
  description,
}) => {
  const totalCost = hotel.pricePerNight ? hotel.pricePerNight * nights : undefined;
  const starRating = Math.round((hotel.rating || 0) / 0.5) * 0.5;

  return (
    <Card className="overflow-hidden">
      {/* Photo */}
      {photo && (
        <div className="h-40 overflow-hidden bg-[var(--color-surface-container-high)]">
          <img
            src={photo}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{hotel.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {starRating > 0 && (
                <Badge variant="default">
                  {'⭐'.repeat(Math.floor(starRating))}
                  {starRating % 1 !== 0 && '✨'}
                  {' '}
                  {hotel.rating?.toFixed(1)}
                </Badge>
              )}
              {hotel.priceLevel && (
                <Badge variant="secondary">
                  {PRICE_LEVEL_LABELS[hotel.priceLevel]}
                </Badge>
              )}
              {isBooked && (
                <Badge variant="success">✓ Booked</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Why this hotel */}
        {description && (
          <p className="text-sm text-[var(--color-on-surface)]">{description}</p>
        )}

        {/* Room details */}
        {hotel.roomType && (
          <div className="text-sm text-[var(--color-on-surface-variant)]">
            <span className="font-medium">Room Type:</span> {hotel.roomType}
          </div>
        )}

        {/* Dates */}
        <div className="text-sm text-[var(--color-on-surface-variant)]">
          <span className="font-medium">Check-in:</span> {new Date(hotel.checkInDate).toLocaleDateString()}
          <br />
          <span className="font-medium">Check-out:</span> {new Date(hotel.checkOutDate).toLocaleDateString()}
        </div>

        {/* Amenities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[var(--color-on-surface)] mb-2">Amenities</p>
            <div className="flex flex-wrap gap-1">
              {hotel.amenities.map((amenity) => (
                <Badge key={amenity} variant="outline">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="bg-[var(--color-primary-fixed)] border border-[var(--color-primary-fixed)] rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Per night</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">
                ${hotel.pricePerNight?.toFixed(0) || 'TBD'}
              </p>
            </div>
            {totalCost && (
              <div className="text-right">
                <p className="text-xs text-[var(--color-on-surface-variant)]">Total ({nights} nights)</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">
                  ${totalCost.toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Links and Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={`https://maps.google.com/maps/search/${encodeURIComponent(
              hotel.name
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Google Maps
            </Button>
          </a>

          <a
            href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
              hotel.name
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Booking.com
            </Button>
          </a>

          {onMarkBooked && (
            <Button
              variant={isBooked ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMarkBooked(!isBooked)}
            >
              {isBooked ? '✓ Booked' : 'Mark as Booked'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { HotelCard };
