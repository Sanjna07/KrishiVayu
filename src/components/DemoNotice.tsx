'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface DemoNoticeProps {
  allowDismiss?: boolean;
}

export function DemoNotice({ allowDismiss = false }: DemoNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && allowDismiss) return null;

  return (
    <div
      role="status"
      className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
        <span>
          <strong>Notice:</strong> Some listings and buyers use demo data.
        </span>
      </div>
      {allowDismiss && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-700 hover:text-amber-900 text-xs font-semibold px-2"
          aria-label="Dismiss notice"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
