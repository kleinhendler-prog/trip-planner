'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import type { Activity } from '@/types';

interface ActivityCardProps {
  activity: Activity;
  photo?: string;
  onReadGuide?: (narration: string) => void;
  onSwap?: () => void;
  reservationStatus?: 'REQUIRED' | 'RECOMMENDED' | 'WALK_IN_OK';
  specialNotes?: string;
  rainyDayAlternative?: string;
  localTips?: Array<{ text: string; source: string; sourceUrl?: string }>;
  isBooked?: boolean;
  onMarkBooked?: (booked: boolean) => void;
  estimatedCost?: number;
  priority?: number;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  photo,
  onReadGuide,
  onSwap,
  reservationStatus,
  specialNotes,
  rainyDayAlternative,
  localTips = [],
  isBooked = false,
  onMarkBooked,
  estimatedCost,
  priority = 0,
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
        <div className="h-40 overflow-hidden bg-gray-200">
          <img
            src={photo}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{activity.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {activity.duration && (
                <Badge variant="secondary">
                  {activity.duration} min
                </Badge>
              )}
              {reservationStatus && (
                <Badge variant={reservationColors[reservationStatus]}>
                  {reservationStatus === 'REQUIRED'
                    ? 'Requires Booking'
                    : reservationStatus === 'RECOMMENDED'
                    ? 'Booking Recommended'
                    : 'Walk-in OK'}
                </Badge>
              )}
              {estimatedCost && (
                <Badge variant="default">
                  ${estimatedCost.toFixed(0)}
                </Badge>
              )}
              {isBooked && (
                <Badge variant="success">✓ Booked</Badge>
              )}
            </div>
          </div>
          {rainyDayAlternative && (
            <Tooltip content={`Rainy day option: ${rainyDayAlternative}`}>
              <span className="text-2xl">🌦</span>
            </Tooltip>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {activity.description && (
          <p className="text-sm text-gray-700">{activity.description}</p>
        )}

        {/* Special Notes */}
        {specialNotes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-2">
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-yellow-800">{specialNotes}</p>
          </div>
        )}

        {/* Opening Hours */}
        {activity.startTime && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Time:</span> {activity.startTime}
            {activity.endTime && ` - ${activity.endTime}`}
          </div>
        )}

        {/* Local Tips */}
        {localTips.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Local Tips</p>
            {localTips.slice(0, 2).map((tip, idx) => (
              <div
                key={idx}
                className="bg-yellow-50 border border-yellow-200 rounded-md p-2 space-y-2"
              >
                <p className="text-sm italic text-gray-800">{tip.text}</p>
                <div className="flex items-center justify-between">
                  <a
                    href={tip.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {tip.source}
                  </a>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleTipVote(idx, 'up')}
                      className="text-lg hover:scale-125 transition"
                      title="Helpful"
                    >
                      {tipVotes[idx] === 'up' ? '👍' : '🤍'}
                    </button>
                    <button
                      onClick={() => handleTipVote(idx, 'down')}
                      className="text-lg hover:scale-125 transition"
                      title="Not helpful"
                    >
                      {tipVotes[idx] === 'down' ? '👎' : '🤍'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* External Links */}
        <div className="flex flex-wrap gap-2">
          {activity.externalLinks?.googleMaps && (
            <a
              href={activity.externalLinks.googleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Google Maps
            </a>
          )}
          {activity.bookingUrl && (
            <a href={activity.bookingUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
              >
                Get Tickets
              </Button>
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {priority >= 4 && onReadGuide && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReadGuide(activity.description || '')}
            >
              Read Guide
            </Button>
          )}
          {onSwap && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSwap}
            >
              Swap
            </Button>
          )}
          {onMarkBooked && (
            <Button
              variant={isBooked ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMarkBooked(!isBooked)}
            >
              {isBooked ? '✓ Mark as Booked' : 'Mark as Booked'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { ActivityCard };
