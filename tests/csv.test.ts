import { sanitizeCsvCell } from '../src/lib/csvExport';

function runCsvTests() {
  console.log('--- RUNNING CSV EXPORT FORMULA INJECTION TESTS ---');

  const testCases = [
    { input: '=1+1', expected: `"'=1+1"` },
    { input: '+cmd|"/c calc"!A0', expected: `\"'+cmd|""/c calc""!A0\"` },
    { input: '-500', expected: `\"'-500\"` },
    { input: '@SUM(A1:A10)', expected: `\"'@SUM(A1:A10)\"` },
    { input: 'Bathinda', expected: `"Bathinda"` },
    { input: 42, expected: `"42"` },
  ];

  for (const tc of testCases) {
    const res = sanitizeCsvCell(tc.input);
    if (res !== tc.expected) {
      throw new Error(`Sanitizer failed for input ${tc.input}: expected ${tc.expected}, got ${res}`);
    }
  }

  console.log('✓ All formula-injection escape tests passed!');
}

runCsvTests();
