import { ACTION_TYPE_VALUES } from '@/app/constants/action-types';

describe('ACTION_TYPE_VALUES', () => {
  it('contains all 10 ActionType values with no duplicates', () => {
    expect(ACTION_TYPE_VALUES).toHaveLength(10);
    expect(ACTION_TYPE_VALUES).toContain('BLOOD_GLUCOSE');
    expect(ACTION_TYPE_VALUES).toContain('INSULIN');
    expect(ACTION_TYPE_VALUES).toContain('MEDICATION');
    expect(ACTION_TYPE_VALUES).toContain('FOOD');
    expect(ACTION_TYPE_VALUES).toContain('EXERCISE');
    expect(ACTION_TYPE_VALUES).toContain('SLEEP');
    expect(ACTION_TYPE_VALUES).toContain('SYMPTOMS');
    expect(ACTION_TYPE_VALUES).toContain('WEIGHT');
    expect(ACTION_TYPE_VALUES).toContain('HYDRATION');
    expect(ACTION_TYPE_VALUES).toContain('BLOOD_PRESSURE');
    expect(new Set(ACTION_TYPE_VALUES).size).toBe(ACTION_TYPE_VALUES.length);
  });
});
