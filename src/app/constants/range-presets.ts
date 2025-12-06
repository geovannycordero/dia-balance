export const enum RangePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = '7d',
  LAST_14_DAYS = '14d',
  LAST_30_DAYS = '30d',
}

// Export string values for use in non-TypeScript files
export const RANGE_PRESETS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_14_DAYS: '14d',
  LAST_30_DAYS: '30d',
} as const;
