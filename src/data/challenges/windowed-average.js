const challenge = {
  id: 1004,
  slug: 'windowed-average',
  title: 'Windowed Average',
  description: 'Calculate a moving average for each complete window of values.',
  language: 'Python',
  difficulty: 'Medium',
  category: 'Algorithms',
  status: 'published',
  timeLimit: 840,
  baseScore: 560,
  hardeningBonus: 260,
  bugType: 'algorithm',
  skills: ['Lists', 'Sliding Window', 'Statistics'],
  estimatedTime: 12,
  version: 1,
  hints: ['Read the expected behavior carefully.', 'Check the hidden edge cases after the core fix.'],
  explanation: 'The starter implementation contains a deliberate defect. The accepted solution must satisfy the complete challenge contract.',
  i18n: {
    fa: { title: 'میانگین پنجره‌ای', description: 'برای هر پنجره کامل از مقادیر، میانگین متحرک را محاسبه کن.', category: 'الگوریتم‌ها' },
  },
  tags: ['Python', 'Lists', 'Algorithms'],
  evaluation: {
    type: 'python',
    functionName: 'moving_average',
    tests: [
      { id: 1, name: 'Basic window', type: 'core', args: [[1, 2, 3, 4], 2], expected: [1.5, 2.5, 3.5] },
      { id: 2, name: 'Window of three', type: 'core', args: [[2, 4, 6, 8], 3], expected: [4, 6] },
      { id: 101, name: 'Decimal values', type: 'hidden', args: [[1, 2, 2, 5], 3], expected: [1.6666666666666667, 3.0] },
      { id: 102, name: 'Too-large window', type: 'hidden', args: [[1, 2], 3], expected: [] },
    ],
  },
  code: `def moving_average(values, window):\n    return [\n        sum(values[i:i + window]) / window\n        for i in range(len(values) - window)\n    ]`,
}

export default challenge
