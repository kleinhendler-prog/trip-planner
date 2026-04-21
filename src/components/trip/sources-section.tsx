'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Source {
  domain: string;
  name: string;
  tipCount: number;
  homepage?: string;
}

interface SourcesSectionProps {
  sources: Source[];
  defaultCollapsed?: boolean;
}

const SourcesSection: React.FC<SourcesSectionProps> = ({
  sources = [],
  defaultCollapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (sources.length === 0) {
    return null;
  }

  const sortedSources = [...sources].sort((a, b) => b.tipCount - a.tipCount);

  return (
    <Card>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full text-left hover:bg-[var(--color-surface-container-low)] transition-colors"
      >
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">📚</span>
            Sources Consulted
          </CardTitle>
          <div className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-[var(--color-on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </CardHeader>
      </button>

      {!isCollapsed && (
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {sortedSources.map((source) => (
              <div
                key={source.domain}
                className="flex items-center justify-between p-3 bg-[var(--color-surface-container-low)] rounded-[12px] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-on-surface)]">
                    {source.name}
                  </p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] truncate">
                    {source.domain}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Badge variant="secondary">
                    {source.tipCount} tip{source.tipCount !== 1 ? 's' : ''}
                  </Badge>
                  {source.homepage && (
                    <a
                      href={source.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:text-[var(--color-primary)] text-lg"
                      title="Visit website"
                    >
                      →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[var(--color-primary-fixed)] border border-[var(--color-primary-fixed)] rounded-[12px] p-3 text-xs text-[var(--color-primary)]">
            <p>
              ℹ️ These sources contributed tips and recommendations to your itinerary. We've vetted them for accuracy and relevance.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export { SourcesSection };
