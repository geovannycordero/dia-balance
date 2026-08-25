import { ACTION_TYPE_VALUES } from '@/app/constants/action-types';
import { DEFAULT_PREFERENCES, UserPreferencesSchema, getUserPreferences } from '@/lib/user-preferences';

describe('UserPreferencesSchema — enabledActionTypes', () => {
  it.each(ACTION_TYPE_VALUES)('accepts %s in enabledActionTypes', (value) => {
    const result = UserPreferencesSchema.safeParse({
      ...DEFAULT_PREFERENCES,
      enabledActionTypes: [value],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a value outside ACTION_TYPE_VALUES', () => {
    const result = UserPreferencesSchema.safeParse({
      ...DEFAULT_PREFERENCES,
      enabledActionTypes: ['NOT_A_TYPE'],
    });

    expect(result.success).toBe(false);
  });
});

describe('getUserPreferences', () => {
  it('returns DEFAULT_PREFERENCES when preferences is null', () => {
    expect(getUserPreferences({ preferences: null })).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns DEFAULT_PREFERENCES when preferences fails schema validation', () => {
    expect(getUserPreferences({ preferences: { enabledActionTypes: ['NOT_A_TYPE'] } })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('returns the parsed preferences when valid', () => {
    const valid = {
      enabledActionTypes: [ACTION_TYPE_VALUES[0]],
      enabledAnalytics: DEFAULT_PREFERENCES.enabledAnalytics,
    };

    expect(getUserPreferences({ preferences: valid })).toEqual(valid);
  });
});
