'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeatherData } from '@/types';

interface RainSwap {
  dayNumber: number;
  alternativeActivityName: string;
}

interface WeatherBannerProps {
  climateInfo?: string;
  backupInfo?: string;
  dailyWeather?: Array<{
    dayNumber: number;
    weather: WeatherData;
    rainSwaps?: RainSwap[];
  }>;
  onApplyAllSwaps?: () => void;
  onReviewIndividually?: () => void;
}

const getWeatherIcon = (condition: string): string => {
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('rainy')) return '🌧️';
  if (lower.includes('sunny') || lower.includes('clear')) return '☀️';
  if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
  if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('wind')) return '💨';
  return '🌡️';
};

const WeatherBanner: React.FC<WeatherBannerProps> = ({
  climateInfo,
  backupInfo,
  dailyWeather = [],
  onApplyAllSwaps,
  onReviewIndividually,
}) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Check if there are rainy days
  const rainyDays = dailyWeather.filter((item) =>
    item.weather.condition.toLowerCase().includes('rain')
  );

  return (
    <div className="space-y-4">
      {/* Tier A: Climate Banner */}
      {climateInfo && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              Climate Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-800">{climateInfo}</p>
            {backupInfo && (
              <p className="text-xs text-gray-600 italic">
                📍 {backupInfo}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tier B: Daily Weather Pills & Rain Swaps */}
      {dailyWeather.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Weather</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Weather Pills */}
            <div className="flex flex-wrap gap-2">
              {dailyWeather.map((item) => (
                <button
                  key={item.dayNumber}
                  onClick={() =>
                    setExpandedDay(
                      expandedDay === item.dayNumber ? null : item.dayNumber
                    )
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">
                    {getWeatherIcon(item.weather.condition)}
                  </span>
                  <span className="text-sm font-medium">
                    Day {item.dayNumber}
                  </span>
                  <span className="text-sm text-gray-600">
                    {Math.round(item.weather.highTemp)}°
                  </span>
                </button>
              ))}
            </div>

            {/* Expanded Day Details */}
            {expandedDay !== null && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {dailyWeather
                  .filter((item) => item.dayNumber === expandedDay)
                  .map((item) => (
                    <div key={item.dayNumber} className="space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Day {item.dayNumber} Weather
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          {item.weather.condition}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.round(item.weather.lowTemp)}° - {Math.round(item.weather.highTemp)}°C
                          {item.weather.precipitation > 0 && (
                            <span> • {Math.round(item.weather.precipitation)}mm rain</span>
                          )}
                        </p>
                      </div>

                      {/* Rain Swaps */}
                      {item.rainSwaps && item.rainSwaps.length > 0 && (
                        <div className="border-t border-gray-300 pt-3">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            💡 Rainy Day Alternatives
                          </p>
                          {item.rainSwaps.map((swap, idx) => (
                            <div key={idx} className="text-sm text-gray-700 mb-2">
                              <Badge variant="secondary" className="mr-2">
                                Alternative
                              </Badge>
                              {swap.alternativeActivityName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Rain Swap Actions */}
            {rainyDays.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3 flex gap-2">
                {onApplyAllSwaps && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onApplyAllSwaps}
                  >
                    Apply All Swaps
                  </Button>
                )}
                {onReviewIndividually && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReviewIndividually}
                  >
                    Review Individually
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { WeatherBanner };
