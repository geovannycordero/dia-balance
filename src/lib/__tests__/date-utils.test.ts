import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../date-utils';

describe('formatDateDDMMYYYY', () => {
  it('zero-pads a single-digit day and month', () => {
    expect(formatDateDDMMYYYY(new Date(2024, 0, 5))).toBe('05/01/2024');
  });

  it('passes through double-digit day and month unchanged', () => {
    expect(formatDateDDMMYYYY(new Date(2024, 11, 25))).toBe('25/12/2024');
  });

  it('accepts an ISO string as well as a Date object', () => {
    const date = new Date(2024, 0, 5);
    expect(formatDateDDMMYYYY(date.toISOString())).toBe(formatDateDDMMYYYY(date));
  });
});

describe('formatDateTimeDDMMYYYY', () => {
  it('zero-pads single-digit hour and minute', () => {
    expect(formatDateTimeDDMMYYYY(new Date(2024, 0, 5, 3, 5))).toBe('05/01/2024 03:05');
  });

  it('renders midnight as 00:00, not 24:00', () => {
    expect(formatDateTimeDDMMYYYY(new Date(2024, 0, 5, 0, 0))).toBe('05/01/2024 00:00');
  });

  it('passes through double-digit hour and minute unchanged', () => {
    expect(formatDateTimeDDMMYYYY(new Date(2024, 0, 5, 23, 45))).toBe('05/01/2024 23:45');
  });

  it('accepts an ISO string as well as a Date object', () => {
    const date = new Date(2024, 0, 5, 14, 30);
    expect(formatDateTimeDDMMYYYY(date.toISOString())).toBe(formatDateTimeDDMMYYYY(date));
  });
});
