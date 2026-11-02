/**
 * KrishiVayu Government-Portal Light Theme Tokens
 * Unified design system source for colors, risk palettes, shadows, and radii.
 */

export const THEME_TOKENS = {
  colors: {
    bgPage: '#F5F7FA',
    bgCard: '#FFFFFF',
    border: '#D9DEE5',
    borderMuted: '#E5E9F0',
    textPrimary: '#1B2430',
    textSecondary: '#5B6675',
    textMuted: '#8892A0',
    primaryNavy: '#1F3A5F',
    primaryNavyHover: '#162C49',
    cleanGreen: '#2E7D32',
    cleanGreenHover: '#236327',
  },
  risk: {
    critical: {
      hex: '#C62828',
      label: 'Critical',
      bgMuted: '#FFEBEE',
      borderMuted: '#FFCDD2',
    },
    high: {
      hex: '#E65100',
      label: 'High',
      bgMuted: '#FFF3E0',
      borderMuted: '#FFE0B2',
    },
    moderate: {
      hex: '#F9A825',
      label: 'Moderate',
      bgMuted: '#FFFDE7',
      borderMuted: '#FFF9C4',
    },
    low: {
      hex: '#2E7D32',
      label: 'Low',
      bgMuted: '#E8F5E9',
      borderMuted: '#C8E6C9',
    },
  },
  radii: {
    card: '8px',
    pill: '9999px',
  },
  shadow: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },
} as const;

export function getRiskColor(score: number): string {
  if (score >= 75) return THEME_TOKENS.risk.critical.hex;
  if (score >= 51) return THEME_TOKENS.risk.high.hex;
  if (score >= 26) return THEME_TOKENS.risk.moderate.hex;
  return THEME_TOKENS.risk.low.hex;
}

export function getRiskBadgeClasses(level: 'critical' | 'high' | 'moderate' | 'low'): string {
  switch (level) {
    case 'critical':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'high':
      return 'bg-orange-50 text-orange-700 border border-orange-200';
    case 'moderate':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'low':
      return 'bg-green-50 text-green-700 border border-green-200';
  }
}
