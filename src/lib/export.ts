import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { formatDateForDisplay, formatDateOnly } from './date-utils';

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable: {
    finalY: number;
  };
};

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
  insights: string[];
};

export function exportToPDF(data: AnalyticsData): void {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = margin;

  // Title
  doc.setFontSize(20);
  doc.text('Dia Balance - Analytics Report', margin, yPos);
  yPos += 10;

  // Date range - convert UTC dates to local timezone for display
  doc.setFontSize(12);
  const fromDate = formatDateOnly(data.range.from);
  const toDate = formatDateOnly(data.range.to);
  doc.text(`Period: ${fromDate} to ${toDate}`, margin, yPos);
  yPos += 15;

  // Summary statistics
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
    summaryData.push([
      'Weight',
      `${last} ${data.weight[0].unit ?? 'kg'}`,
      `Change: ${(last - first).toFixed(1)}`,
    ]);
  }
  if (data.hydration.length > 0) {
    const total = data.hydration.reduce((s, r) => s + r.amount, 0);
    summaryData.push([
      'Hydration',
      `${total.toFixed(0)} total`,
      `${data.hydration.length} entries`,
    ]);
  }
  if (data.bloodPressure.length > 0) {
    const avgSystolic =
      data.bloodPressure.reduce((s, r) => s + r.systolic, 0) / data.bloodPressure.length;
    const avgDiastolic =
      data.bloodPressure.reduce((s, r) => s + r.diastolic, 0) / data.bloodPressure.length;
    summaryData.push([
      'Blood Pressure',
      `${avgSystolic.toFixed(0)}/${avgDiastolic.toFixed(0)} mm Hg avg`,
      `${data.bloodPressure.length} readings`,
    ]);
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
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.text('Blood Glucose Readings', margin, yPos);
    yPos += 8;

    const glucoseData = data.bloodGlucose.map((r) => [
      formatDateForDisplay(r.timestamp),
      `${r.value} mg/dL`,
      r.context ?? '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Value', 'Context']],
      body: glucoseData.slice(0, 20), // Limit to first 20 entries
      theme: 'striped',
      headStyles: { fillColor: [56, 189, 248] },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
    if (data.bloodGlucose.length > 20) {
      doc.setFontSize(10);
      doc.text(`Showing first 20 of ${data.bloodGlucose.length} readings`, margin, yPos);
      yPos += 10;
    }
  }

  // Insulin Data
  if (data.insulin.length > 0) {
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.text('Insulin Doses', margin, yPos);
    yPos += 8;

    const insulinData = data.insulin.map((r) => [
      new Date(r.timestamp).toLocaleString(),
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

  // Blood Pressure Data
  if (data.bloodPressure.length > 0) {
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.text('Blood Pressure Readings', margin, yPos);
    yPos += 8;

    const bpData = data.bloodPressure.map((r) => [
      formatDateForDisplay(r.timestamp),
      `${r.systolic}/${r.diastolic} mm Hg`,
      r.category === 'normal'
        ? 'Normal'
        : r.category === 'elevated'
          ? 'Elevated'
          : r.category === 'hypertension-stage-1'
            ? 'Stage 1'
            : r.category === 'hypertension-stage-2'
              ? 'Stage 2'
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

    // Daily BP Summary
    if (data.dailyBloodPressureSummary.length > 0) {
      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(14);
      doc.text('Daily Blood Pressure Summary', margin, yPos);
      yPos += 8;

      const dailyBpData = data.dailyBloodPressureSummary.map((d) => [
        formatDateOnly(d.date),
        `${d.systolicAvg.toFixed(0)}/${d.diastolicAvg.toFixed(0)}`,
        `${d.systolicMin}-${d.systolicMax} / ${d.diastolicMin}-${d.diastolicMax}`,
        `${d.systolicCount} readings`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Avg (S/D)', 'Range (S/D)', 'Count']],
        body: dailyBpData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: margin, right: margin },
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Correlation Analysis
    if (data.bpGlucoseCorrelation) {
      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(14);
      doc.text('Blood Pressure & Glucose Correlation', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.text(
        `Correlation Coefficient (r): ${data.bpGlucoseCorrelation.coefficient.toFixed(2)}`,
        margin,
        yPos,
      );
      yPos += 7;
      doc.text(
        `Strength: ${data.bpGlucoseCorrelation.strength.charAt(0).toUpperCase() + data.bpGlucoseCorrelation.strength.slice(1)}`,
        margin,
        yPos,
      );
      yPos += 7;
      doc.text(
        `Direction: ${data.bpGlucoseCorrelation.direction.charAt(0).toUpperCase() + data.bpGlucoseCorrelation.direction.slice(1)}`,
        margin,
        yPos,
      );
      yPos += 7;
      doc.text(
        data.bpGlucoseCorrelation.direction === 'positive'
          ? 'Higher glucose tends to coincide with higher blood pressure.'
          : 'Higher glucose tends to coincide with lower blood pressure.',
        margin,
        yPos,
      );
      yPos += 15;
    }
  }

  // Insights
  if (data.insights.length > 0) {
    if (yPos > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.text('Insights', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    data.insights.forEach((insight) => {
      if (yPos > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(`• ${insight}`, margin + 5, yPos);
      yPos += 7;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 30,
      doc.internal.pageSize.getHeight() - 10,
    );
    doc.text(
      `Generated on ${new Date().toLocaleString()}`,
      margin,
      doc.internal.pageSize.getHeight() - 10,
    );
  }

  // Save the PDF
  const filename = `dia-balance-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
