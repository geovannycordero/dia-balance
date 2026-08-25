export function getBloodPressureCategory(
  systolic: number,
  diastolic: number,
): 'normal' | 'elevated' | 'hypertension-stage-1' | 'hypertension-stage-2' | 'crisis' {
  if (systolic > 180 || diastolic > 120) {
    return 'crisis';
  }
  if (systolic >= 140 || diastolic >= 90) {
    return 'hypertension-stage-2';
  }
  if (systolic >= 130 || diastolic >= 80) {
    return 'hypertension-stage-1';
  }
  if (systolic >= 120) {
    return 'elevated';
  }
  return 'normal';
}
