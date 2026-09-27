const challenge = {
  id: 1024,
  slug: 'dict-key-error',
  title: 'Missing Key Guard',
  description: 'Count word frequencies. Missing keys must not raise KeyError.',
  language: 'Python',
  difficulty: 'Easy',
  category: 'Data Structures',
  status: 'published',
  timeLimit: 480,
  baseScore: 300,
  hardeningBonus: 130,
  bugType: 'key-error',
  skills: ['Dicts', 'Counting'],
  estimatedTime: 5,
  version: 1,
  hints: ['Use get with default, or defaultdict, or setdefault.', 'Empty input should return {}.'],
  explanation: 'Direct d[word] += 1 fails on the first occurrence.',
  i18n: {
    fa: { title: 'محافظ کلید گمشده', description: 'فرکانس کلمات را بشمار. کلیدهای غایب نباید KeyError بدهند.', category: 'ساختار داده' },
  },
  tags: ['Python', 'Easy', 'Dicts'],
  evaluation: {
    type: 'python',
    functionName: 'word_count',
    tests: [
      { id: 1, name: 'Basic', type: 'core', args: [['a', 'b', 'a']], expected: { 'a': 2, 'b': 1 } },
      { id: 2, name: 'Empty', type: 'core', args: [[]], expected: {} },
      { id: 3, name: 'All unique', type: 'core', args: [['x', 'y']], expected: { 'x': 1, 'y': 1 } },
      { id: 101, name: 'Repeated', type: 'hidden', args: [['z', 'z', 'z']], expected: { 'z': 3 } },
    ],
  },
  code: `def word_count(words):\n    counts = {}\n    for w in words:\n        counts[w] += 1\n    return counts`,
}

export default challenge
