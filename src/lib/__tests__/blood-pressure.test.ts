import { getBloodPressureCategory } from '../blood-pressure';

describe('getBloodPressureCategory', () => {
  it('returns normal for well below elevated thresholds', () => {
    expect(getBloodPressureCategory(110, 70)).toBe('normal');
  });

  it('returns elevated at the 120 systolic boundary with diastolic below 80', () => {
    expect(getBloodPressureCategory(120, 70)).toBe('elevated');
  });

  it('returns elevated for 120-129 systolic with diastolic below 80', () => {
    expect(getBloodPressureCategory(125, 75)).toBe('elevated');
  });

  it('returns hypertension-stage-1 at the 130 systolic boundary', () => {
    expect(getBloodPressureCategory(130, 75)).toBe('hypertension-stage-1');
  });

  it('returns hypertension-stage-1 at the 80 diastolic boundary', () => {
    expect(getBloodPressureCategory(125, 80)).toBe('hypertension-stage-1');
  });

  it('returns hypertension-stage-2 at the 140 systolic boundary', () => {
    expect(getBloodPressureCategory(140, 85)).toBe('hypertension-stage-2');
  });

  it('returns hypertension-stage-2 at the 90 diastolic boundary', () => {
    expect(getBloodPressureCategory(135, 90)).toBe('hypertension-stage-2');
  });

  it('returns crisis above 180 systolic', () => {
    expect(getBloodPressureCategory(181, 100)).toBe('crisis');
  });

  it('returns crisis above 120 diastolic', () => {
    expect(getBloodPressureCategory(150, 121)).toBe('crisis');
  });

  it('does not treat exactly 180/120 as crisis (boundary is exclusive)', () => {
    expect(getBloodPressureCategory(180, 120)).toBe('hypertension-stage-2');
  });
});
