/**
 * KrishiVayu Safe CSV Export Utility
 * Implements strict formula-injection protection (RFC 4180 + Excel DDE guard).
 * Prepends single quote `'` to any cell starting with `=`, `+`, `-`, or `@`.
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Formula injection prevention
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(sanitizeCsvCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
