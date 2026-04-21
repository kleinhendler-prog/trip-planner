'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Day } from '@/types';

interface DayCardProps {
  day: Day;
  dayIndex: number;
  onRegenerate?: () => void;
  onAddNote?: (note: string) => void;
  onExpand?: (expanded: boolean) => void;
  defaultExpanded?: boolean;
  weatherIcon?: string;
  weatherCondition?: string;
  dailyBudget?: number;
  budgetTarget?: number;
  activitiesJsx?: React.ReactNode;
  mealsJsx?: React.ReactNode;
}

const DayCard: React.FC<DayCardProps> = ({
  day,
  dayIndex,
  onRegenerate,
  onAddNote,
  onExpand,
  defaultExpanded = dayIndex === 0,
  weatherIcon,
  weatherCondition,
  dailyBudget = 0,
  budgetTarget = 150,
  activitiesJsx,
  mealsJsx,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [noteText, setNoteText] = useState(day.notes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleToggleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpand?.(newState);
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await onAddNote?.(noteText);
    } finally {
      setIsSavingNote(false);
    }
  };

  const isOverBudget = dailyBudget > budgetTarget;
  const dateObj = new Date(day.date);
  const dateString = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full text-left hover:bg-[var(--color-surface-container-low)] transition-colors"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl font-bold text-[var(--color-primary)]">Day {day.dayNumber}</div>
              <div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{dateString}</p>
                {day.theme && <p className="text-xs text-[var(--color-on-surface-variant)] italic">{day.theme}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {weatherIcon && (
                <div className="text-center">
                  <div className="text-2xl">{weatherIcon}</div>
                  {weatherCondition && (
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{weatherCondition}</p>
                  )}
                </div>
              )}

              {isOverBudget && (
                <Badge variant="destructive" title="Over budget">
                  Over Budget
                </Badge>
              )}

              <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-[var(--color-on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
        </CardHeader>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="space-y-4 border-t border-[var(--color-outline-variant)] pt-4">
          {/* Activities */}
          {activitiesJsx && (
            <div>
              <h3 className="font-semibold text-[var(--color-on-surface)] mb-3">Activities</h3>
              <div className="space-y-3">{activitiesJsx}</div>
            </div>
          )}

          {/* Meals */}
          {mealsJsx && (
            <div>
              <h3 className="font-semibold text-[var(--color-on-surface)] mb-3">Meals</h3>
              <div className="space-y-3">{mealsJsx}</div>
            </div>
          )}

          {/* Daily Budget */}
          <div className="bg-[var(--color-surface-container-low)] rounded-md p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-on-surface)]">Daily Budget</span>
              <div className="text-right">
                <p className={`text-lg font-bold ${isOverBudget ? 'text-[var(--color-error)]' : 'text-[#166534]'}`}>
                  ${dailyBudget.toFixed(0)} / ${budgetTarget.toFixed(0)}
                </p>
                {isOverBudget && (
                  <p className="text-xs text-[var(--color-error)] mt-1">
                    +${(dailyBudget - budgetTarget).toFixed(0)} over
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="text-sm font-medium text-[var(--color-on-surface)] block mb-2">
              Day Notes
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add personal notes about this day..."
              className="w-full px-3 py-2 border border-[var(--color-outline-variant)] rounded-md text-sm text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              rows={3}
            />
            {noteText !== day.notes && (
              <Button
                size="sm"
                className="mt-2"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? 'Saving...' : 'Save Note'}
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-outline-variant)]">
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
              >
                🔄 Regenerate This Day
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export { DayCard };
