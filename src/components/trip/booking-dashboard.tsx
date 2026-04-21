'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BookingItem {
  id: string;
  name: string;
  type: 'activity' | 'restaurant' | 'hotel';
  bookingUrl?: string;
  urgencyLevel?: number;
  date?: string;
  onMarkBooked?: (booked: boolean) => void;
  isBooked?: boolean;
}

interface BookingDashboardProps {
  items: BookingItem[];
  show?: boolean;
}

const BookingDashboard: React.FC<BookingDashboardProps> = ({
  items = [],
  show = true,
}) => {
  if (!show || items.length === 0) {
    return null;
  }

  const sortedItems = [...items].sort((a, b) => (b.urgencyLevel || 0) - (a.urgencyLevel || 0));

  const typeIcons = {
    activity: '🎭',
    restaurant: '🍽️',
    hotel: '🏨',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Book These This Week
          </span>
          <Badge variant="default">{items.length}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-[var(--color-surface-container-low)] rounded-[12px] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl">{typeIcons[item.type]}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-on-surface)] truncate">
                    {item.name}
                  </p>
                  {item.date && (
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{item.date}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {item.bookingUrl && (
                  <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="sm"
                      variant="default"
                    >
                      Book
                    </Button>
                  </a>
                )}
                {item.onMarkBooked && (
                  <Button
                    size="sm"
                    variant={item.isBooked ? 'default' : 'outline'}
                    onClick={() => item.onMarkBooked?.(!item.isBooked)}
                  >
                    {item.isBooked ? '✓' : 'Done'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--color-on-surface-variant)] mt-4">
          📌 These items require immediate booking. Plan ahead for the best availability.
        </p>
      </CardContent>
    </Card>
  );
};

export { BookingDashboard };
