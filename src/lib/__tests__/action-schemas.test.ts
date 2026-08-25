import { ActionType, ACTION_TYPE_VALUES } from '@/app/constants/action-types';
import { ActionTypeSchema, foodSchema, updateActionSchema } from '@/lib/action-schemas';

describe('ActionTypeSchema', () => {
  it.each(ACTION_TYPE_VALUES)('accepts %s', (value) => {
    expect(ActionTypeSchema.safeParse(value).success).toBe(true);
  });

  it('rejects a value outside ACTION_TYPE_VALUES', () => {
    expect(ActionTypeSchema.safeParse('NOT_A_TYPE').success).toBe(false);
  });
});

describe('foodSchema', () => {
  it('accepts a payload without foodCarbs (optional)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Grilled chicken',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBeUndefined();
    }
  });

  it('accepts foodCarbs at the lower boundary (0.5)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Apple',
      foodCarbs: 0.5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBe(0.5);
    }
  });

  it('accepts foodCarbs at the upper boundary (10)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Large pasta plate',
      foodCarbs: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBe(10);
    }
  });

  it('accepts a mid-range half-step value (2.5)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Sandwich',
      foodCarbs: 2.5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBe(2.5);
    }
  });

  it('rejects foodCarbs below the minimum (0)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Snack',
      foodCarbs: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects foodCarbs above the maximum (10.5)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Feast',
      foodCarbs: 10.5,
    });

    expect(result.success).toBe(false);
  });

  it('rejects foodCarbs that is not a multiple of 0.5 (1.3)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Snack',
      foodCarbs: 1.3,
    });

    expect(result.success).toBe(false);
  });

  it('accepts foodCarbs set to null (clearing the value)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Snack',
      foodCarbs: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBeNull();
    }
  });

  it('accepts a payload without foodImageKey (optional)', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Grilled chicken',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodImageKey).toBeUndefined();
    }
  });

  it('accepts a payload with foodImageKey set', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodDescription: 'Grilled chicken',
      foodImageKey: 'food/user-123/abc.jpg',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodImageKey).toBe('food/user-123/abc.jpg');
    }
  });

  it('rejects when foodDescription is missing regardless of foodCarbs', () => {
    const result = foodSchema.safeParse({
      type: ActionType.FOOD,
      foodCarbs: 2,
    });

    expect(result.success).toBe(false);
  });
});

describe('updateActionSchema — foodCarbs', () => {
  it('accepts a partial update with only foodCarbs set', () => {
    const result = updateActionSchema.safeParse({ foodCarbs: 3 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBe(3);
    }
  });

  it('rejects a partial update with an out-of-range foodCarbs', () => {
    const result = updateActionSchema.safeParse({ foodCarbs: 15 });

    expect(result.success).toBe(false);
  });

  it('rejects a partial update with a non-half-step foodCarbs', () => {
    const result = updateActionSchema.safeParse({ foodCarbs: 1.3 });

    expect(result.success).toBe(false);
  });

  it('allows omitting foodCarbs entirely', () => {
    const result = updateActionSchema.safeParse({ notes: 'no carbs field here' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodCarbs).toBeUndefined();
    }
  });
});

describe('updateActionSchema — foodImageKey', () => {
  it('accepts a partial update setting foodImageKey', () => {
    const result = updateActionSchema.safeParse({ foodImageKey: 'food/user-123/abc.jpg' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodImageKey).toBe('food/user-123/abc.jpg');
    }
  });

  it('accepts foodImageKey set to null (clearing the photo)', () => {
    const result = updateActionSchema.safeParse({ foodImageKey: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodImageKey).toBeNull();
    }
  });

  it('allows omitting foodImageKey entirely', () => {
    const result = updateActionSchema.safeParse({ notes: 'no image field here' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foodImageKey).toBeUndefined();
    }
  });
});
