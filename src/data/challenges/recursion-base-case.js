const challenge = {
  id: 1023,
  slug: 'recursion-base-case',
  title: 'Broken Base Case',
  description: 'Compute factorial of a non-negative integer. The base case is wrong.',
  language: 'Python',
  difficulty: 'Medium',
  category: 'Algorithms',
  status: 'published',
  timeLimit: 600,
  baseScore: 380,
  hardeningBonus: 160,
  bugType: 'recursion',
  skills: ['Recursion', 'Base cases'],
  estimatedTime: 6,
  version: 1,
  hints: ['0! is 1.', 'Guard the base case properly.'],
  explanation: 'Base case used n == 1 only, so factorial(0) fails.',
  i18n: {
    fa: { title: 'پایهٔ بازگشتی خراب', description: 'فاکتوریل عدد نامنفی را حساب کن. base case اشتباه است.', category: 'الگوریتم' },
  },
  tags: ['Python', 'Medium', 'Recursion'],
  evaluation: {
    type: 'python',
    functionName: 'factorial',
    tests: [
      { id: 1, name: 'Five', type: 'core', args: [5], expected: 120 },
      { id: 2, name: 'Zero', type: 'core', args: [0], expected: 1 },
      { id: 3, name: 'One', type: 'core', args: [1], expected: 1 },
      { id: 101, name: 'Six', type: 'hidden', args: [6], expected: 720 },
    ],
  },
  code: `def factorial(n):\n    if n == 1:\n        return 1\n    return n * factorial(n - 1)`,
}

export default challenge
