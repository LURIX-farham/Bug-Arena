const challenge = {
  id: 1019,
  slug: 'integer-division',
  title: 'Integer Division Surprise',
  description: 'Compute the average of numbers as a float. The starter accidentally floors the result.',
  language: 'Python',
  difficulty: 'Easy',
  category: 'Basics',
  status: 'published',
  timeLimit: 480,
  baseScore: 260,
  hardeningBonus: 110,
  bugType: 'type-coercion',
  skills: ['Arithmetic', 'Types'],
  estimatedTime: 4,
  version: 1,
  hints: ['In Python 3, / already yields a float — but // does not.', 'Empty list should return 0.0.'],
  explanation: 'Using // performs floor division. The challenge expects a true arithmetic mean as float.',
  i18n: {
    fa: { title: 'تقسیم صحیح غافلگیرکننده', description: 'میانگین اعداد را به صورت float محاسبه کن. کد اولیه نتیجه را به اشتباه floor می‌کند.', category: 'مقدماتی' },
  },
  tags: ['Python', 'Easy', 'Arithmetic'],
  evaluation: {
    type: 'python',
    functionName: 'mean',
    tests: [
      { id: 1, name: 'Simple average', type: 'core', args: [[1, 2, 3]], expected: 2.0 },
      { id: 2, name: 'Odd sum', type: 'core', args: [[1, 2]], expected: 1.5 },
      { id: 3, name: 'Empty', type: 'core', args: [[]], expected: 0.0 },
      { id: 101, name: 'Negatives', type: 'hidden', args: [[-2, -4]], expected: -3.0 },
    ],
  },
  code: `def mean(nums):\n    if not nums:\n        return 0.0\n    return sum(nums) // len(nums)`,
}

export default challenge
