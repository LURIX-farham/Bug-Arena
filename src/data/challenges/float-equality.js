const challenge = {
  id: 1021,
  slug: 'float-equality',
  title: 'Float Equality Trap',
  description: 'Decide whether two floats are effectively equal for money-style values (2 decimal places).',
  language: 'Python',
  difficulty: 'Medium',
  category: 'Numerics',
  status: 'published',
  timeLimit: 600,
  baseScore: 400,
  hardeningBonus: 170,
  bugType: 'float-precision',
  skills: ['Floats', 'Comparison', 'Tolerance'],
  estimatedTime: 7,
  version: 1,
  hints: ['Direct == is fragile for floats.', 'Round or use an absolute tolerance around 1e-9 / cents.'],
  explanation: 'Floating point representation makes exact equality unreliable. Compare with a small epsilon or via quantized cents.',
  i18n: {
    fa: { title: 'تله برابری اعشاری', description: 'تعیین کن دو float برای مقادیر پولی (دو رقم اعشار) عملاً برابرند یا نه.', category: 'اعداد' },
  },
  tags: ['Python', 'Medium', 'Floats'],
  evaluation: {
    type: 'python',
    functionName: 'money_equal',
    tests: [
      { id: 1, name: 'Exact', type: 'core', args: [1.0, 1.0], expected: true },
      { id: 2, name: 'Classic 0.1+0.2', type: 'core', args: [0.1 + 0.2, 0.3], expected: true },
      { id: 3, name: 'Clearly different', type: 'core', args: [1.0, 1.02], expected: false },
      { id: 101, name: 'Near boundary', type: 'hidden', args: [10.005, 10.01], expected: true },
    ],
  },
  code: `def money_equal(a, b):\n    return a == b`,
}

export default challenge
