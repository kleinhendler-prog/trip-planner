'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Restaurant } from '@/types';
import { PRICE_LEVEL_LABELS } from '@/lib/constants';

interface RestaurantCardProps {
  restaurant: Restaurant;
  photo?: string;
  onMarkBooked?: (booked: boolean) => void;
  isBooked?: boolean;
  reservationStatus?: 'REQUIRED' | 'RECOMMENDED' | 'WALK_IN_OK';
  estimatedCost?: number;
  localTips?: Array<{ text: string; source: string; sourceUrl?: string }>;
  mealType?: string;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  photo,
  onMarkBooked,
  isBooked = false,
  reservationStatus,
  estimatedCost,
  localTips = [],
  mealType = 'Dining',
}) => {
  const [tipVotes, setTipVotes] = useState<Record<number, 'up' | 'down' | null>>({});

  const handleTipVote = (index: number, vote: 'up' | 'down') => {
    setTipVotes((prev) => ({
      ...prev,
      [index]: prev[index] === vote ? null : vote,
    }));
  };

  const reservationColors = {
    REQUIRED: 'destructive',
    RECOMMENDED: 'warning',
    WALK_IN_OK: 'success',
  } as const;

  return (
    <Card className="overflow-hidden">
      {/* Photo */}
      {photo && (
        <div className="h-40 overflow-hidden bg-[var(--color-surface-container-high)]">
          <img
            src={photo}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{restaurant.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {restaurant.cuisine && (
                <Badge variant="secondary">
                  {Array.isArray(restaurant.cuisine)
                    ? restaurant.cuisine.join(', ')
                    : restaurant.cuisine}
                </Badge>
              )}
              {restaurant.priceLevel && (
                <Badge variant="secondary">
                  {PRICE_LEVEL_LABELS[restaurant.priceLevel]}
                </Badge>
              )}
              {restaurant.rating && (
                <Badge variant="default">⭐ {restaurant.rating.toFixed(1)}</Badge>
              )}
              {isBooked && (
                <Badge variant="success">✓ Booked</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meal Type and Cost */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-on-surface)]">{mealType}</p>
          {estimatedCost && (
            <Badge variant="default">${estimatedCost.toFixed(0)}</Badge>
          )}
        </div>

        {/* Description placeholder */}
        {restaurant.dietaryOptions && restaurant.dietaryOptions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">Dietary Options:</p>
            <div className="flex flex-wrap gap-1">
              {restaurant.dietaryOptions.map((option) => (
                <Badge key={option} variant="outline">
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reservation Status */}
        {reservationStatus && (
          <div>
            <Badge
              variant={reservationColors[reservationStatus]}
              className="w-full text-center justify-center py-2"
            >
              {reservationStatus === 'REQUIRED'
                ? 'Requires Reservation'
                : reservationStatus === 'RECOMMENDED'
                ? 'Reservation Recommended'
                : 'Walk-ins Welcome'}
            </Badge>
          </div>
        )}

        {/* Local Tips */}
        {localTips.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-on-surface)]">Local Tips</p>
            {localTips.slice(0, 2).map((tip, idx) => (
              <div
                key={idx}
                className="bg-[#fef08a] border border-[#854d0e] rounded-md p-2 space-y-2"
              >
                <p className="text-sm italic text-[var(--color-on-surface)]">{tip.text}</p>
                <div className="flex items-center justify-between">
                  <a
                    href={tip.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {tip.source}
                  </a>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleTipVote(idx, 'up')}
                      className="text-lg hover:scale-125 transition"
                    >
                      {tipVotes[idx] === 'up' ? '👍' : '🤍'}
                    </button>
                    <button
                      onClick={() => handleTipVote(idx, 'down')}
                      className="text-lg hover:scale-125 transition"
                    >
                      {tipVotes[idx] === 'down' ? '👎' : '🤍'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Links and Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={`https://maps.google.com/maps/search/${encodeURIComponent(
              restaurant.name
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Google Maps
            </Button>
          </a>

          {restaurant.bookingUrl && (
            <a href={restaurant.bookingUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                Reserve Now
              </Button>
            </a>
          )}

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

export { RestaurantCard };
