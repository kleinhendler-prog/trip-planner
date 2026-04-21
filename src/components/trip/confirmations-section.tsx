'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ConfirmationEmail {
  subject: string;
  sender: string;
  date: string;
  confirmationNumber?: string;
  details: Record<string, string>;
}

interface ConfirmationGroup {
  type: 'flights' | 'hotels' | 'activities';
  count: number;
  confirmations: ConfirmationEmail[];
}

interface ConfirmationsSectionProps {
  emailForwarding: string;
  groups: ConfirmationGroup[];
  onCopyEmail?: (email: string) => void;
}

const CONFIRMATION_ICONS = {
  flights: '✈️',
  hotels: '🏨',
  activities: '🎭',
};

const ConfirmationsSection: React.FC<ConfirmationsSectionProps> = ({
  emailForwarding,
  groups = [],
  onCopyEmail,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailForwarding);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Email Forwarding Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">📧</span>
            Confirmation Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-on-surface)]">
            Forward your confirmation emails to this address to keep everything organized:
          </p>

          <div className="flex items-center gap-2 p-3 bg-[var(--color-primary-fixed)] border border-[var(--color-primary-fixed)] rounded-[12px]">
            <code className="text-sm font-mono text-[var(--color-primary)] flex-1 truncate">
              {emailForwarding}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyEmail}
            >
              {copiedEmail ? '✓ Copied' : 'Copy'}
            </Button>
          </div>

          <p className="text-xs text-[var(--color-on-surface-variant)]">
            💡 We'll parse confirmations and track your bookings automatically.
          </p>
        </CardContent>
      </Card>

      {/* Confirmations by Type */}
      {groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Confirmations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groups.map((group) => (
              <div key={group.type} className="border-b border-[var(--color-outline-variant)] pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {CONFIRMATION_ICONS[group.type]}
                  </span>
                  <h3 className="font-semibold text-[var(--color-on-surface)] capitalize">
                    {group.type}
                  </h3>
                  <Badge variant="secondary">{group.count}</Badge>
                </div>

                <div className="space-y-2">
                  {group.confirmations.map((conf, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[var(--color-surface-container-low)] rounded-[12px] border border-[var(--color-outline-variant)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-on-surface)]">
                            {conf.subject}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                            {conf.sender}
                          </p>
                          {conf.confirmationNumber && (
                            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                              Conf #: <code className="font-mono">{conf.confirmationNumber}</code>
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--color-on-surface-variant)] flex-shrink-0 whitespace-nowrap">
                          {conf.date}
                        </span>
                      </div>

                      {/* Details */}
                      {Object.entries(conf.details).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--color-outline-variant)] space-y-1">
                          {Object.entries(conf.details).map(([key, value]) => (
                            <div key={key} className="text-xs flex justify-between">
                              <span className="text-[var(--color-on-surface-variant)]">{key}:</span>
                              <span className="text-[var(--color-on-surface)] font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && (
        <Card className="bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              No confirmations received yet. Forward your booking confirmations to the email above to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { ConfirmationsSection };
