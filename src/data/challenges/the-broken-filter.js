const challenge = {
  id: 1001,
  slug: 'the-broken-filter',
  title: 'The Broken Filter',
  description: 'Users disappear from the result after applying a case-insensitive search.',
  language: 'Python',
  difficulty: 'Easy',
  category: 'Logic',
  status: 'published',
  timeLimit: 720,
  baseScore: 350,
  hardeningBonus: 180,
  bugType: 'logic',
  skills: ['Filtering', 'Strings', 'Edge Cases'],
  estimatedTime: 8,
  version: 1,
  hints: ['Read the expected behavior carefully.', 'Check the hidden edge cases after the core fix.'],
  explanation: 'The starter implementation contains a deliberate defect. The accepted solution must satisfy the complete challenge contract.',
  i18n: {
    fa: { title: 'فیلتر خراب', description: 'بعد از جست‌وجوی بدون حساسیت به حروف بزرگ و کوچک، بعضی کاربران از نتیجه حذف می‌شوند.', category: 'منطق' },
  },
  tags: ['Python', 'Filtering', 'Logic'],
  evaluation: {
    type: 'python',
    functionName: 'filter_users',
    tests: [
      { id: 1, name: 'Basic filtering', type: 'core', args: [[{ name: 'Ali' }, { name: 'Sara' }, { name: 'Reza' }], 'Ali'], expected: ['Ali'] },
      { id: 2, name: 'Case insensitive search', type: 'core', args: [[{ name: 'Ali' }, { name: 'Sara' }, { name: 'Reza' }], 'ali'], expected: ['Ali'] },
      { id: 3, name: 'Empty query', type: 'core', args: [[{ name: 'Ali' }, { name: 'Sara' }, { name: 'Reza' }], ''], expected: ['Ali', 'Sara', 'Reza'] },
      { id: 101, name: 'Mixed case search', type: 'hidden', args: [[{ name: 'Ali' }, { name: 'ALIREZA' }, { name: 'Sara' }], 'aLi'], expected: ['Ali', 'ALIREZA'] },
      { id: 102, name: 'Whitespace query', type: 'hidden', args: [[{ name: 'Ali' }, { name: 'Sara' }], ' '], expected: [] },
    ],
  },
  code: `def filter_users(users, query):\n    return [\n        user["name"] for user in users\n        if query in user["name"]\n    ]`,
}

export default challenge
