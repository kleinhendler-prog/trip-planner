'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UrgentItem {
  id: string;
  name: string;
  type: 'activity' | 'restaurant' | 'hotel';
  urgencyReason: string;
  urgencyLevel: number; // 1-5, higher = more urgent
  bookingUrl?: string;
  onMarkBooked?: (booked: boolean) => void;
  isBooked?: boolean;
}

interface UrgencyBannerProps {
  items: UrgentItem[];
  show?: boolean;
}

const UrgencyBanner: React.FC<UrgencyBannerProps> = ({
  items = [],
  show = true,
}) => {
  const [bookedItems, setBookedItems] = useState<Set<string>>(new Set());

  if (!show || items.length === 0) {
    return null;
  }

  const sortedItems = [...items].sort((a, b) => b.urgencyLevel - a.urgencyLevel);

  const handleToggleBooked = (itemId: string) => {
    const newBooked = new Set(bookedItems);
    if (newBooked.has(itemId)) {
      newBooked.delete(itemId);
    } else {
      newBooked.add(itemId);
    }
    setBookedItems(newBooked);
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-red-100 border-b border-red-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-red-900 flex items-center gap-2">
          <span className="text-2xl">⏰</span>
          Book These Soon
        </h2>
        <p className="text-sm text-red-800 mt-1">
          {items.length} item{items.length !== 1 ? 's' : ''} require immediate attention
        </p>
      </div>

      {/* Items List */}
      <div className="p-4 space-y-3">
        {sortedItems.map((item) => {
          const isBooked = bookedItems.has(item.id) || item.isBooked;
          const urgencyColors = {
            5: 'destructive',
            4: 'destructive',
            3: 'warning',
            2: 'warning',
            1: 'default',
          } as const;

          return (
            <Card key={item.id} className={isBooked ? 'bg-green-50 border-green-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.urgencyReason}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={urgencyColors[item.urgencyLevel as keyof typeof urgencyColors]}>
                        {'🔴'.repeat(item.urgencyLevel)}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {item.type}
                      </Badge>
                      {isBooked && (
                        <Badge variant="success">✓ Booked</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {item.bookingUrl && (
                      <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="default"
                          size="sm"
                        >
                          Book Now
                        </Button>
                      </a>
                    )}
                    <Button
                      variant={isBooked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        handleToggleBooked(item.id);
                        item.onMarkBooked?.(!isBooked);
                      }}
                    >
                      {isBooked ? '✓' : 'Mark as Booked'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export { UrgencyBanner };
