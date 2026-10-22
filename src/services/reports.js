import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { adviceText, formatPercent, overallStats, subjectStats } from './attendance';
import { STATUS, longDate, toDateKey } from './utils';
import { shareFile } from './native';

function summaryRows(subjects, records) {
  return subjects.map((s) => {
    const st = subjectStats(s, records);
    return {
      name: s.name,
      teacher: s.teacher || '',
      attended: st.attended,
      total: st.total,
      percent: formatPercent(st.percent),
      target: `${s.target}%`,
      advice: adviceText(st),
    };
  });
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvLine = (cells) => cells.map(csvCell).join(',');

export async function exportCsv({ subjects, records }) {
  const names = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const lines = [
    csvLine(['Subject', 'Teacher', 'Attended', 'Total', 'Attendance', 'Target', 'Status']),
    ...summaryRows(subjects, records).map((r) =>
      csvLine([r.name, r.teacher, r.attended, r.total, r.percent, r.target, r.advice])
    ),
    '',
    csvLine(['Date', 'Subject', 'Status', 'Note']),
    ...[...records]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => csvLine([r.date, names[r.subjectId] ?? 'Deleted subject', STATUS[r.status].label, r.note])),
  ];
  await shareFile({
    fileName: `attendance_${toDateKey()}.csv`,
    content: lines.join('\n'),
    mimeType: 'text/csv',
    title: 'Attendance report (CSV)',
  });
}

export async function exportPdf({ subjects, records, studentName }) {
  const doc = new jsPDF();
  const overall = overallStats(subjects, records);
  const teal = [13, 148, 136];

  doc.setFillColor(...teal);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('AttendEase — Attendance Report', 14, 16);
  doc.setFontSize(11);
  doc.text(`${studentName ? `${studentName} · ` : ''}Generated ${longDate(toDateKey())}`, 14, 25);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.text(
    `Overall attendance: ${formatPercent(overall.percent)}  (${overall.attended} of ${overall.total} classes)`,
    14,
    44
  );

  autoTable(doc, {
    startY: 50,
    head: [['Subject', 'Attended', 'Total', '%', 'Target', 'Advice']],
    body: summaryRows(subjects, records).map((r) => [r.name, r.attended, r.total, r.percent, r.target, r.advice]),
    headStyles: { fillColor: teal },
    styles: { fontSize: 10 },
    columnStyles: { 5: { cellWidth: 70 } },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 3) return;
      const subject = subjects[data.row.index];
      const pct = subjectStats(subject, records).percent;
      if (pct !== null) data.cell.styles.textColor = pct < subject.target ? [220, 38, 38] : [22, 163, 74];
    },
  });

  const names = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const history = [...records].sort((a, b) => b.date.localeCompare(a.date));
  if (history.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Date', 'Subject', 'Status', 'Note']],
      body: history.map((r) => [r.date, names[r.subjectId] ?? 'Deleted subject', STATUS[r.status].label, r.note || '']),
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 9 },
    });
  }

  const base64 = doc.output('datauristring').split(',')[1];
  await shareFile({
    fileName: `attendance_${toDateKey()}.pdf`,
    content: base64,
    base64: true,
    mimeType: 'application/pdf',
    title: 'Attendance report (PDF)',
  });
}
