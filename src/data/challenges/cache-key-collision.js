const challenge = {
  id: 1005,
  slug: 'cache-key-collision',
  title: 'Cache Key Collision',
  description: 'Normalize a request path and query parameters into a deterministic cache key.',
  language: 'Python',
  difficulty: 'Hard',
  category: 'Backend Logic',
  status: 'published',
  timeLimit: 900,
  baseScore: 700,
  hardeningBonus: 320,
  bugType: 'normalization',
  skills: ['Strings', 'Normalization', 'Backend'],
  estimatedTime: 15,
  version: 1,
  hints: ['Read the expected behavior carefully.', 'Check the hidden edge cases after the core fix.'],
  explanation: 'The starter implementation contains a deliberate defect. The accepted solution must satisfy the complete challenge contract.',
  i18n: {
    fa: { title: 'تداخل کلید کش', description: 'مسیر درخواست و پارامترهای query را به یک کلید کش قطعی و یکسان تبدیل کن.', category: 'منطق بک‌اند' },
  },
  tags: ['Python', 'Strings', 'Normalization'],
  evaluation: {
    type: 'python',
    functionName: 'cache_key',
    tests: [
      { id: 1, name: 'Basic key', type: 'core', args: ['/Users', { page: 2, sort: 'name' }], expected: '/users?page=2&sort=name' },
      { id: 2, name: 'Sorted parameters', type: 'core', args: ['/search', { z: '9', a: '1' }], expected: '/search?a=1&z=9' },
      { id: 101, name: 'Uppercase path', type: 'hidden', args: ['/API/Users/', { q: 'Ali' }], expected: '/api/users?q=Ali' },
      { id: 102, name: 'Empty query', type: 'hidden', args: ['/health/', {}], expected: '/health' },
    ],
  },
  code: `def cache_key(path, params):\n    return path + '?' + '&'.join(f'{k}={v}' for k, v in params.items())`,
}

export default challenge
