export const enum ActionType {
  BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
  INSULIN = 'INSULIN',
  MEDICATION = 'MEDICATION',
  FOOD = 'FOOD',
  EXERCISE = 'EXERCISE',
  SLEEP = 'SLEEP',
  SYMPTOMS = 'SYMPTOMS',
  WEIGHT = 'WEIGHT',
  HYDRATION = 'HYDRATION',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
}

export const ACTION_TYPE_VALUES = [
  ActionType.BLOOD_GLUCOSE,
  ActionType.INSULIN,
  ActionType.MEDICATION,
  ActionType.FOOD,
  ActionType.EXERCISE,
  ActionType.SLEEP,
  ActionType.SYMPTOMS,
  ActionType.WEIGHT,
  ActionType.HYDRATION,
  ActionType.BLOOD_PRESSURE,
] as const;
