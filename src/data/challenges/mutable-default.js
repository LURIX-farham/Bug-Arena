const challenge = {
  id: 1018,
  slug: 'mutable-default',
  title: 'Mutable Default Trap',
  description: 'Append a value to a list and return it. Calls should not share state across invocations.',
  language: 'Python',
  difficulty: 'Easy',
  category: 'Basics',
  status: 'published',
  timeLimit: 480,
  baseScore: 300,
  hardeningBonus: 140,
  bugType: 'mutable-default',
  skills: ['Defaults', 'Lists', 'State'],
  estimatedTime: 5,
  version: 1,
  hints: ['Default argument objects are evaluated once.', 'Use None and create a new list inside.'],
  explanation: 'Using a mutable list as a default argument reuses the same list across calls.',
  i18n: {
    fa: { title: 'تله مقدار پیش‌فرض تغییرپذیر', description: 'یک مقدار به لیست اضافه کن و برگردان. فراخوانی‌ها نباید state مشترک داشته باشند.', category: 'مقدماتی' },
  },
  tags: ['Python', 'Easy', 'Defaults'],
  evaluation: {
    type: 'python',
    functionName: 'append_item',
    tests: [
      { id: 1, name: 'First call', type: 'core', args: [1], expected: [1] },
      { id: 2, name: 'Independent second call', type: 'core', args: [2], expected: [2] },
      { id: 3, name: 'With explicit list', type: 'core', args: [3, [0]], expected: [0, 3] },
      { id: 101, name: 'String value', type: 'hidden', args: ['x'], expected: ['x'] },
    ],
  },
  code: `def append_item(value, bucket=[]):\n    bucket.append(value)\n    return bucket`,
}

export default challenge
