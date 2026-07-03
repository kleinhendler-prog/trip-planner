'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import type { TransitMode } from '@/types';

interface TransitIndicatorProps {
  mode: TransitMode;
  duration: number; // in minutes
  isApproximate?: boolean;
  className?: string;
}

const TRANSIT_ICONS: Record<TransitMode, string> = {
  walking: '🚶',
  public_transit: '🚇',
  taxi: '🚕',
  car_rental: '🚗',
  bike: '🚴',
};

const TRANSIT_LABELS: Record<TransitMode, string> = {
  walking: 'walk',
  public_transit: 'metro',
  taxi: 'taxi',
  car_rental: 'drive',
  bike: 'bike',
};

const TransitIndicator: React.FC<TransitIndicatorProps> = ({
  mode,
  duration,
  isApproximate = true,
  className = '',
}) => {
  const isLongTransit = duration > 45;
  const icon = TRANSIT_ICONS[mode];
  const label = TRANSIT_LABELS[mode];
  const prefix = isApproximate ? '~' : '';

  const content = `${prefix} ${duration} min ${label}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg">{icon}</span>
      {isLongTransit ? (
        <Tooltip content={`${duration} minutes of ${label} transit`}>
          <Badge variant="warning">{content}</Badge>
        </Tooltip>
      ) : (
        <span className="text-sm text-gray-600">{content}</span>
      )}
    </div>
  );
};

export { TransitIndicator };
