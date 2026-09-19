const challenge = {
  id: 1002,
  slug: 'duplicate-signal',
  title: 'Duplicate Signal',
  description: 'A telemetry list should keep the first occurrence of each signal while preserving order.',
  language: 'Python',
  difficulty: 'Easy',
  category: 'Data Structures',
  status: 'published',
  timeLimit: 600,
  baseScore: 380,
  hardeningBonus: 190,
  bugType: 'data-structure',
  skills: ['Arrays', 'Deduplication', 'Order'],
  estimatedTime: 6,
  version: 1,
  hints: ['Read the expected behavior carefully.', 'Check the hidden edge cases after the core fix.'],
  explanation: 'The starter implementation contains a deliberate defect. The accepted solution must satisfy the complete challenge contract.',
  i18n: {
    fa: { title: 'سیگنال تکراری', description: 'فهرست تله‌متری باید اولین رخداد هر سیگنال را نگه دارد و ترتیب اصلی را حفظ کند.', category: 'ساختار داده' },
  },
  tags: ['Python', 'Arrays', 'Deduplication'],
  evaluation: {
    type: 'python',
    functionName: 'unique_signals',
    tests: [
      { id: 1, name: 'Remove duplicates', type: 'core', args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] },
      { id: 2, name: 'Preserve order', type: 'core', args: [['b', 'a', 'b', 'c', 'a']], expected: ['b', 'a', 'c'] },
      { id: 3, name: 'Empty list', type: 'core', args: [[]], expected: [] },
      { id: 101, name: 'Boolean values', type: 'hidden', args: [[true, false, true, false]], expected: [true, false] },
    ],
  },
  code: `def unique_signals(signals):\n    return sorted(set(signals))`,
}

export default challenge
