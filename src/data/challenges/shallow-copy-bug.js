const challenge = {
  id: 1020,
  slug: 'shallow-copy-bug',
  title: 'Shallow Copy Trap',
  description: 'Return a defensive copy of a nested dict so mutating the result never mutates the original.',
  language: 'Python',
  difficulty: 'Medium',
  category: 'Data Structures',
  status: 'published',
  timeLimit: 600,
  baseScore: 420,
  hardeningBonus: 180,
  bugType: 'shallow-copy',
  skills: ['Copy', 'Dicts', 'Mutation'],
  estimatedTime: 8,
  version: 1,
  hints: ['dict.copy() is shallow.', 'Nested lists/dicts still share identity.'],
  explanation: 'A shallow copy shares nested objects. Use copy.deepcopy or rebuild nested structures.',
  i18n: {
    fa: { title: 'تله کپی سطحی', description: 'یک کپی دفاعی از دیکشنری تو در تو برگردان تا تغییر نتیجه، اصل را عوض نکند.', category: 'ساختار داده' },
  },
  tags: ['Python', 'Medium', 'Copy'],
  evaluation: {
    type: 'python',
    functionName: 'clone_config',
    tests: [
      { id: 1, name: 'Top-level isolation', type: 'core', args: [{ 'a': 1 }], expected: { 'a': 1 } },
      { id: 2, name: 'Nested list isolation', type: 'core', args: [{ 'items': [1, 2] }], expected: { 'items': [1, 2] } },
      { id: 3, name: 'Nested dict isolation', type: 'core', args: [{ 'meta': { 'x': 9 } }], expected: { 'meta': { 'x': 9 } } },
      { id: 101, name: 'Deep nesting', type: 'hidden', args: [{ 'a': { 'b': [1, { 'c': 2 }] } }], expected: { 'a': { 'b': [1, { 'c': 2 }] } } },
    ],
  },
  code: `def clone_config(config):\n    return config.copy()`,
}

export default challenge
