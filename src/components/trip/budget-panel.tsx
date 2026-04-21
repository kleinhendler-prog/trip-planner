'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BudgetBreakdown {
  activities: number;
  meals: number;
  hotels: number;
}

interface BudgetPanelProps {
  breakdown: BudgetBreakdown;
  travelers: number;
  currency?: 'USD' | 'EUR';
  onCurrencyChange?: (currency: 'USD' | 'EUR') => void;
  collapsed?: boolean;
}

const BudgetPanel: React.FC<BudgetPanelProps> = ({
  breakdown,
  travelers,
  currency = 'USD',
  onCurrencyChange,
  collapsed: initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const currencySymbol = currency === 'USD' ? '$' : '€';
  const total = breakdown.activities + breakdown.meals + breakdown.hotels;
  const perPerson = total / travelers;

  return (
    <Card>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full text-left hover:bg-[var(--color-surface-container-low)] transition-colors"
      >
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-lg">Budget Summary</CardTitle>
          <div className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-[var(--color-on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </CardHeader>
      </button>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Currency Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-on-surface-variant)]">Currency:</span>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange?.(e.target.value as 'USD' | 'EUR')}
              className="px-3 py-1 border border-[var(--color-outline-variant)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-on-surface)]">Activities</span>
              <span className="font-medium">{currencySymbol}{breakdown.activities.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-on-surface)]">Meals & Restaurants</span>
              <span className="font-medium">{currencySymbol}{breakdown.meals.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-on-surface)]">Hotels & Accommodations</span>
              <span className="font-medium">{currencySymbol}{breakdown.hotels.toFixed(0)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-[var(--color-outline-variant)] pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-on-surface)]">Total</span>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {currencySymbol}{total.toFixed(0)}
              </span>
            </div>

            {/* Per Person */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[var(--color-on-surface-variant)]">Per person ({travelers} travelers)</span>
              <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                {currencySymbol}{perPerson.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#fef08a] border border-[#854d0e] rounded-md p-2">
            <p className="text-xs text-[#854d0e]">
              💡 Estimates only — actual prices vary. Review each item for accurate costs.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export { BudgetPanel };
