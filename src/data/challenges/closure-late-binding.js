const challenge = {
  id: 1022,
  slug: 'closure-late-binding',
  title: 'Late Binding Closure',
  description: 'Build multipliers for indices 0..n-1 and return each applied to 2. Each index must use its own factor.',
  language: 'Python',
  difficulty: 'Hard',
  category: 'Functions',
  status: 'published',
  timeLimit: 720,
  baseScore: 520,
  hardeningBonus: 220,
  bugType: 'closure',
  skills: ['Closures', 'Scope', 'Lambdas'],
  estimatedTime: 10,
  version: 1,
  hints: ['Loop variables are captured by reference.', 'Bind the current value as a default argument.'],
  explanation: 'All closures capture the same loop variable. Default-argument binding freezes the value at definition time.',
  i18n: {
    fa: { title: 'کلوزر با اتصال دیرهنگام', description: 'ضرب‌کننده‌ها برای 0..n-1 بساز و هر کدام را روی 2 اعمال کن.', category: 'توابع' },
  },
  tags: ['Python', 'Hard', 'Closures'],
  evaluation: {
    type: 'python',
    functionName: 'make_multipliers',
    tests: [
      { id: 1, name: 'Three multipliers', type: 'core', args: [3], expected: [0, 2, 4] },
      { id: 2, name: 'Single', type: 'core', args: [1], expected: [0] },
      { id: 3, name: 'Five', type: 'core', args: [5], expected: [0, 2, 4, 6, 8] },
      { id: 101, name: 'Empty', type: 'hidden', args: [0], expected: [] },
    ],
  },
  code: `def make_multipliers(n):\n    funcs = []\n    for i in range(n):\n        funcs.append(lambda x: x * i)\n    return [f(2) for f in funcs]`,
}

export default challenge
