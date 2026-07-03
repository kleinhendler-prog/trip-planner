'use client';

import React from 'react';

interface GuidePanelProps {
  title: string;
  narration: string;
}

const GuidePanel: React.FC<GuidePanelProps> = ({ title, narration }) => {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>

      {/* Narration Content */}
      <div className="prose prose-sm max-w-none">
        <div className="space-y-4">
          {narration.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="text-gray-700 leading-relaxed text-base">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Word Count */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        {narration.split(/\s+/).length} words
      </div>
    </div>
  );
};

export { GuidePanel };
