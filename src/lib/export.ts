import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from './date-utils';

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable: {
    finalY: number;
  };
};

type ZoneStat = { pct: number; timeMinutes: number };

type AnalyticsData = {
  range: {
    from: string;
    to: string;
  };
  bloodGlucose: { timestamp: string; value: number; context?: string }[];
  insulin: { timestamp: string; units: number; insulinType?: string }[];
  exercise: { timestamp: string; type?: string; duration: number; intensity?: string }[];
  sleep: { timestamp: string; hours: number; quality?: number | null }[];
  weight: { timestamp: string; value: number; unit?: string | null }[];
  hydration: { timestamp: string; amount: number }[];
  bloodPressure: {
    timestamp: string;
    systolic: number;
    diastolic: number;
    category: string;
  }[];
  dailyGlucoseSummary: { date: string; avg: number; min: number; max: number; count: number }[];
  dailyBloodPressureSummary: {
    date: string;
    systolicAvg: number;
    systolicMin: number;
    systolicMax: number;
    systolicCount: number;
    diastolicAvg: number;
    diastolicMin: number;
    diastolicMax: number;
    diastolicCount: number;
  }[];
  hydrationByDay: { date: string; total: number }[];
  weightTrend: { timestamp: string; value: number; unit?: string | null }[];
  bpGlucoseCorrelation: { coefficient: number; strength: string; direction: string } | null;
  timeInRanges?: { veryLow: ZoneStat; low: ZoneStat; target: ZoneStat; high: ZoneStat; veryHigh: ZoneStat } | null;
  glucoseStats?: { averageGlucose: number; gmi: number; glucoseVariability: number; daysOfData: number } | null;
  insights: string[];
};

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function exportToPDF(data: AnalyticsData, agpChartImage?: string): void {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Page 1: Glucose Statistics & Targets ──────────────────────────────────

  if (data.bloodGlucose.length > 0 && data.glucoseStats && data.timeInRanges) {
    addGlucoseStatisticsPage(doc, data, margin, pageWidth, pageHeight);

    // ── Page 2: Time in Ranges ───────────────────────────────────────────────
    doc.addPage();
    addTimeInRangesPage(doc, data.timeInRanges, margin, pageWidth);

    // ── Page 3: AGP chart image (if captured) ────────────────────────────────
    if (agpChartImage) {
      doc.addPage();
      addAGPPage(doc, agpChartImage, margin, pageWidth);
    }

    // Start existing content on a new page
    doc.addPage();
  }

  // ── Existing content (now on subsequent pages) ───────────────────────────

  let yPos = margin;

  doc.setFontSize(20);
  doc.text('Dia Balance - Analytics Report', margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  const fromDate = formatDateDDMMYYYY(data.range.from);
  const toDate = formatDateDDMMYYYY(data.range.to);
  doc.text(`Period: ${fromDate} to ${toDate}`, margin, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.text('Summary Statistics', margin, yPos);
  yPos += 8;

  const summaryData: string[][] = [];
  if (data.bloodGlucose.length > 0) {
    const avg = data.bloodGlucose.reduce((s, r) => s + r.value, 0) / data.bloodGlucose.length;
    const min = Math.min(...data.bloodGlucose.map((r) => r.value));
    const max = Math.max(...data.bloodGlucose.map((r) => r.value));
    summaryData.push(['Blood Glucose', `${avg.toFixed(0)} mg/dL`, `Min: ${min}, Max: ${max}`]);
  }
  if (data.insulin.length > 0) {
    const total = data.insulin.reduce((s, r) => s + r.units, 0);
    summaryData.push(['Insulin', `${total.toFixed(1)} units`, `${data.insulin.length} doses`]);
  }
  if (data.exercise.length > 0) {
    const totalMinutes = data.exercise.reduce((s, r) => s + r.duration, 0);
    summaryData.push(['Exercise', `${totalMinutes} minutes`, `${data.exercise.length} sessions`]);
  }
  if (data.sleep.length > 0) {
    const avgHours = data.sleep.reduce((s, r) => s + r.hours, 0) / data.sleep.length;
    summaryData.push(['Sleep', `${avgHours.toFixed(1)} hours avg`, `${data.sleep.length} entries`]);
  }
  if (data.weight.length > 0) {
    const first = data.weight[0].value;
    const last = data.weight[data.weight.length - 1].value;
    summaryData.push(['Weight', `${last} ${data.weight[0].unit ?? 'kg'}`, `Change: ${(last - first).toFixed(1)}`]);
  }
  if (data.hydration.length > 0) {
    const total = data.hydration.reduce((s, r) => s + r.amount, 0);
    summaryData.push(['Hydration', `${total.toFixed(0)} total`, `${data.hydration.length} entries`]);
  }
  if (data.bloodPressure.length > 0) {
    const avgSystolic = data.bloodPressure.reduce((s, r) => s + r.systolic, 0) / data.bloodPressure.length;
    const avgDiastolic = data.bloodPressure.reduce((s, r) => s + r.diastolic, 0) / data.bloodPressure.length;
    summaryData.push(['Blood Pressure', `${avgSystolic.toFixed(0)}/${avgDiastolic.toFixed(0)} mm Hg avg`, `${data.bloodPressure.length} readings`]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value', 'Details']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [56, 189, 248] },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Blood Glucose Data
  if (data.bloodGlucose.length > 0) {
    if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.text('Blood Glucose Readings', margin, yPos);
    yPos += 8;

    const glucoseData: string[][] = [];
    const dayIndices: number[] = [];
    let currentDay = '';
    let dayIndex = -1;

    data.bloodGlucose.forEach((r) => {
      const dateObj = new Date(r.timestamp);
      const dayKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      if (dayKey !== currentDay) { currentDay = dayKey; dayIndex++; }
      glucoseData.push([formatDateTimeDDMMYYYY(r.timestamp), `${r.value} mg/dL`, r.context ?? '-']);
      dayIndices.push(dayIndex);
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Value', 'Context']],
      body: glucoseData,
      theme: 'plain',
      headStyles: { fillColor: [56, 189, 248] },
      margin: { left: margin, right: margin },
      didParseCell: function (data) {
        if (data.row.index >= 0 && dayIndices[data.row.index] !== undefined) {
          data.cell.styles.fillColor = dayIndices[data.row.index] % 2 === 0 ? [255, 255, 255] : [240, 240, 240];
        }
      },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Blood Pressure Data
  if (data.bloodPressure.length > 0) {
    if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.text('Blood Pressure Readings', margin, yPos);
    yPos += 8;

    const bpData = data.bloodPressure.map((r) => [
      formatDateTimeDDMMYYYY(r.timestamp),
      `${r.systolic}/${r.diastolic} mm Hg`,
      r.category === 'normal' ? 'Normal'
        : r.category === 'elevated' ? 'Elevated'
        : r.category === 'hypertension-stage-1' ? 'Stage 1'
        : r.category === 'hypertension-stage-2' ? 'Stage 2'
        : 'Crisis',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Reading', 'Category']],
      body: bpData.slice(0, 20),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
    if (data.bloodPressure.length > 20) {
      doc.setFontSize(10);
      doc.text(`Showing first 20 of ${data.bloodPressure.length} readings`, margin, yPos);
      yPos += 10;
    }

    if (data.bpGlucoseCorrelation) {
      if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
      doc.setFontSize(14);
      doc.text('Blood Pressure & Glucose Correlation', margin, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.text(`Correlation Coefficient (r): ${data.bpGlucoseCorrelation.coefficient.toFixed(2)}`, margin, yPos); yPos += 7;
      doc.text(`Strength: ${data.bpGlucoseCorrelation.strength.charAt(0).toUpperCase() + data.bpGlucoseCorrelation.strength.slice(1)}`, margin, yPos); yPos += 7;
      doc.text(`Direction: ${data.bpGlucoseCorrelation.direction.charAt(0).toUpperCase() + data.bpGlucoseCorrelation.direction.slice(1)}`, margin, yPos); yPos += 7;
      doc.text(
        data.bpGlucoseCorrelation.direction === 'positive'
          ? 'Higher glucose tends to coincide with higher blood pressure.'
          : 'Higher glucose tends to coincide with lower blood pressure.',
        margin, yPos,
      );
      yPos += 15;
    }
  }

  // Insulin Data
  if (data.insulin.length > 0) {
    if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.text('Insulin Doses', margin, yPos);
    yPos += 8;

    const insulinData = data.insulin.map((r) => [
      formatDateTimeDDMMYYYY(r.timestamp),
      `${r.units} units`,
      r.insulinType ?? '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Units', 'Type']],
      body: insulinData.slice(0, 20),
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
    if (data.insulin.length > 20) {
      doc.setFontSize(10);
      doc.text(`Showing first 20 of ${data.insulin.length} doses`, margin, yPos);
      yPos += 10;
    }
  }

  // Insights
  if (data.insights.length > 0) {
    if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.text('Insights', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    const maxWidth = pageWidth - margin * 2 - 10;
    const lineHeight = 6;

    data.insights.forEach((insight) => {
      const lines = doc.splitTextToSize(`• ${insight}`, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > pageHeight - 20) { doc.addPage(); yPos = margin; }
        doc.text(line, margin + 5, yPos);
        yPos += lineHeight;
      });
      yPos += 2;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 30, pageHeight - 10);
    doc.text(`Generated on ${formatDateTimeDDMMYYYY(new Date())}`, margin, pageHeight - 10);
  }

  const filename = `dia-balance-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// ── Infographic page helpers ─────────────────────────────────────────────────

function addGlucoseStatisticsPage(
  doc: JsPDFWithAutoTable,
  data: AnalyticsData,
  margin: number,
  pageWidth: number,
  pageHeight: number,
): void {
  const stats = data.glucoseStats!;
  let yPos = margin;

  // Section header
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('GLUCOSE STATISTICS AND TARGETS', margin + 3, yPos + 7);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPos += 16;

  // Date range + days
  const fromDate = formatDateDDMMYYYY(data.range.from);
  const toDate = formatDateDDMMYYYY(data.range.to);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fromDate} – ${toDate}`, margin, yPos);
  doc.text(`${stats.daysOfData} Days`, pageWidth - margin, yPos, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  yPos += 12;

  // Target ranges table
  const rangeRows = [
    ['Target Range 70–180 mg/dL', 'Greater than 70% (16h 48min)'],
    ['Below 70 mg/dL', 'Less than 4% (58min)'],
    ['Below 54 mg/dL', 'Less than 1% (14min)'],
    ['Above 180 mg/dL', 'Less than 25% (6h)'],
    ['Above 250 mg/dL', 'Less than 5% (1h 12min)'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Glucose Ranges', 'Targets % of Readings (Time/Day)']],
    body: rangeRows,
    theme: 'striped',
    headStyles: { fillColor: [200, 200, 200], textColor: [50, 50, 50], fontStyle: 'normal', fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right' } },
    foot: [['Each 5% increase in time in range (70–180 mg/dL) is clinically beneficial.', '']],
    footStyles: { fontSize: 8, fontStyle: 'italic', fillColor: [240, 240, 240], textColor: [100, 100, 100] },
  });

  yPos = doc.lastAutoTable.finalY + 12;

  if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin; }

  // Key stats
  const statRows = [
    ['Average Glucose', `${stats.averageGlucose} mg/dL`, 'Goal: ≤154 mg/dL'],
    ['Glucose Management Indicator (GMI)', `${stats.gmi}%`, 'Goal: ≤7.0%'],
    ['Glucose Variability (%CV)', `${stats.glucoseVariability}%`, 'Target: ≤36%'],
  ];

  autoTable(doc, {
    startY: yPos,
    body: statRows,
    theme: 'plain',
    bodyStyles: { fontSize: 11 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { fontStyle: 'bold', fontSize: 14, cellWidth: 30 },
      2: { textColor: [100, 100, 100], fontSize: 9 },
    },
  });
}

function addTimeInRangesPage(
  doc: JsPDFWithAutoTable,
  tir: { veryLow: ZoneStat; low: ZoneStat; target: ZoneStat; high: ZoneStat; veryHigh: ZoneStat },
  margin: number,
  pageWidth: number,
): void {
  let yPos = margin;

  // Section header
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TIME IN RANGES', margin + 3, yPos + 7);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPos += 18;

  const zones = [
    { label: 'Very High', range: '>250 mg/dL', stat: tir.veryHigh, rgb: [249, 115, 22] as [number, number, number] },
    { label: 'High', range: '181–250 mg/dL', stat: tir.high, rgb: [234, 179, 8] as [number, number, number] },
    { label: 'Target Range', range: '70–180 mg/dL', stat: tir.target, rgb: [34, 197, 94] as [number, number, number] },
    { label: 'Low', range: '54–69 mg/dL', stat: tir.low, rgb: [252, 165, 165] as [number, number, number] },
    { label: 'Very Low', range: '<54 mg/dL', stat: tir.veryLow, rgb: [239, 68, 68] as [number, number, number] },
  ];

  const barX = margin;
  const barW = 20;
  const totalBarH = 120;
  const barY = yPos;

  // Draw stacked vertical bar
  let currentY = barY;
  for (const z of zones) {
    const h = Math.max((z.stat.pct / 100) * totalBarH, z.stat.pct > 0 ? 2 : 0);
    doc.setFillColor(...z.rgb);
    doc.rect(barX, currentY, barW, h, 'F');
    currentY += h;
  }

  // Zone labels to the right of the bar
  const labelX = barX + barW + 6;
  let labelY = barY + 5;
  for (const z of zones) {
    const h = Math.max((z.stat.pct / 100) * totalBarH, z.stat.pct > 0 ? 2 : 0);
    const centerY = labelY + h / 2 - 5;

    doc.setFillColor(...z.rgb);
    doc.rect(labelX, centerY, 5, 5, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${z.label}  ${z.range}`, labelX + 7, centerY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${z.stat.pct}%`, pageWidth - margin - 30, centerY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`(${fmtTime(z.stat.timeMinutes)})`, pageWidth - margin, centerY + 4, { align: 'right' });

    labelY += h;
  }

  yPos = barY + totalBarH + 16;

  // Combined High bracket note
  const highCombined = tir.high.pct + tir.veryHigh.pct;
  const lowCombined = tir.low.pct + tir.veryLow.pct;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Combined Above Range: ${highCombined}%  (goal <25%)`, margin, yPos); yPos += 6;
  doc.text(`Combined Below Range: ${lowCombined}%  (goal <4%)`, margin, yPos); yPos += 6;
  doc.text(`Time in Target (70–180 mg/dL): ${tir.target.pct}%  (goal >70%)`, margin, yPos);
  doc.setTextColor(0, 0, 0);
}

function addAGPPage(
  doc: JsPDFWithAutoTable,
  imageDataUrl: string,
  margin: number,
  pageWidth: number,
): void {
  let yPos = margin;

  // Section header
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AMBULATORY GLUCOSE PROFILE (AGP)', margin + 3, yPos + 7);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPos += 14;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'AGP is a summary of glucose values from the report period, with median (50%) and other percentiles shown as if occurring in a single day.',
    margin,
    yPos,
    { maxWidth: pageWidth - margin * 2 },
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  yPos += 14;

  const imgW = pageWidth - margin * 2;
  const imgH = 90;
  doc.addImage(imageDataUrl, 'PNG', margin, yPos, imgW, imgH);
}
