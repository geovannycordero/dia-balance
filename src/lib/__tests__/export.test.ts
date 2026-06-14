import { exportToPDF } from '../export';

const mockSave = jest.fn();
const mockText = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetFont = jest.fn();
const mockSetFillColor = jest.fn();
const mockSetTextColor = jest.fn();
const mockRect = jest.fn();
const mockAddPage = jest.fn();
const mockAddImage = jest.fn();
const mockGetNumberOfPages = jest.fn(() => 1);
const mockSetPage = jest.fn();
const mockSplitTextToSize = jest.fn((text: string) => [text]);
const mockGetInternalPageSize = jest.fn(() => ({ getWidth: () => 210, getHeight: () => 297 }));

const mockDoc = {
  save: mockSave,
  text: mockText,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setFillColor: mockSetFillColor,
  setTextColor: mockSetTextColor,
  rect: mockRect,
  addPage: mockAddPage,
  addImage: mockAddImage,
  getNumberOfPages: mockGetNumberOfPages,
  setPage: mockSetPage,
  splitTextToSize: mockSplitTextToSize,
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  lastAutoTable: { finalY: 50 },
};

const mockAutoTable = jest.fn();

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(() => mockDoc),
}));

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: (...args: unknown[]) => {
    mockAutoTable(...args);
    mockDoc.lastAutoTable = { finalY: 50 };
  },
}));

jest.mock('@/lib/date-utils', () => ({
  formatDateDDMMYYYY: jest.fn((d: unknown) => String(d)),
  formatDateTimeDDMMYYYY: jest.fn((d: unknown) => String(d)),
}));

const baseData = {
  range: { from: '2024-01-01T00:00:00Z', to: '2024-01-07T23:59:59Z' },
  bloodGlucose: [] as { timestamp: string; value: number; context?: string; notes?: string | null }[],
  insulin: [] as { timestamp: string; units: number; insulinType?: string; notes?: string | null }[],
  exercise: [] as { timestamp: string; type?: string; duration: number; intensity?: string }[],
  sleep: [] as { timestamp: string; hours: number; quality?: number | null }[],
  weight: [] as { timestamp: string; value: number; unit?: string | null }[],
  hydration: [] as { timestamp: string; amount: number }[],
  bloodPressure: [] as { timestamp: string; systolic: number; diastolic: number; category: string; notes?: string | null }[],
  dailyGlucoseSummary: [],
  dailyBloodPressureSummary: [],
  hydrationByDay: [],
  weightTrend: [],
  bpGlucoseCorrelation: null,
  timeInRanges: null,
  glucoseStats: null,
  insights: [],
};

function getAutoTableCallForHead(head: string[]): Record<string, unknown> | undefined {
  const calls = mockAutoTable.mock.calls as Array<[unknown, Record<string, unknown>]>;
  return calls.find(([, opts]) => {
    const h = opts.head as string[][];
    return Array.isArray(h) && Array.isArray(h[0]) && head.every((col) => h[0].includes(col));
  })?.[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.lastAutoTable = { finalY: 50 };
});

describe('exportToPDF — blood glucose table', () => {
  const glucoseTimestamp = '2024-01-01T10:00:00Z';

  it('includes a Notes column header', () => {
    exportToPDF({
      ...baseData,
      bloodGlucose: [{ timestamp: glucoseTimestamp, value: 120, context: 'fasting' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Value', 'Context', 'Notes']);
    expect(call).toBeDefined();
  });

  it('renders the note text in the row when notes is present', () => {
    exportToPDF({
      ...baseData,
      bloodGlucose: [{ timestamp: glucoseTimestamp, value: 120, context: 'fasting', notes: 'Felt dizzy' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Value', 'Context', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('Felt dizzy');
  });

  it('renders "-" in the notes cell when notes is absent', () => {
    exportToPDF({
      ...baseData,
      bloodGlucose: [{ timestamp: glucoseTimestamp, value: 120, context: 'fasting' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Value', 'Context', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('-');
  });

  it('renders "-" in the notes cell when notes is null', () => {
    exportToPDF({
      ...baseData,
      bloodGlucose: [{ timestamp: glucoseTimestamp, value: 120, notes: null }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Value', 'Context', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('-');
  });
});

describe('exportToPDF — blood pressure table', () => {
  const bpTimestamp = '2024-01-01T10:00:00Z';

  it('includes a Notes column header', () => {
    exportToPDF({
      ...baseData,
      bloodPressure: [{ timestamp: bpTimestamp, systolic: 120, diastolic: 80, category: 'normal' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Reading', 'Category', 'Notes']);
    expect(call).toBeDefined();
  });

  it('renders the note text in the row when notes is present', () => {
    exportToPDF({
      ...baseData,
      bloodPressure: [{ timestamp: bpTimestamp, systolic: 120, diastolic: 80, category: 'normal', notes: 'After morning walk' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Reading', 'Category', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('After morning walk');
  });

  it('renders "-" in the notes cell when notes is absent', () => {
    exportToPDF({
      ...baseData,
      bloodPressure: [{ timestamp: bpTimestamp, systolic: 120, diastolic: 80, category: 'normal' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Reading', 'Category', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('-');
  });
});

describe('exportToPDF — insulin table', () => {
  const insulinTimestamp = '2024-01-01T10:00:00Z';

  it('includes a Notes column header', () => {
    exportToPDF({
      ...baseData,
      insulin: [{ timestamp: insulinTimestamp, units: 10, insulinType: 'rapid-acting' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Units', 'Type', 'Notes']);
    expect(call).toBeDefined();
  });

  it('renders the note text in the row when notes is present', () => {
    exportToPDF({
      ...baseData,
      insulin: [{ timestamp: insulinTimestamp, units: 10, insulinType: 'rapid-acting', notes: 'Taken after lunch' }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Units', 'Type', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('Taken after lunch');
  });

  it('renders "-" in the notes cell when notes is absent', () => {
    exportToPDF({
      ...baseData,
      insulin: [{ timestamp: insulinTimestamp, units: 10 }],
    });

    const call = getAutoTableCallForHead(['Timestamp', 'Units', 'Type', 'Notes']);
    const body = call?.body as string[][];
    expect(body[0][3]).toBe('-');
  });
});
