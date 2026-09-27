const challenge = {
  id: 1017,
  slug: 'off-by-one-slice',
  title: 'Off-By-One Slice',
  description: 'Return the middle window of length k from a list. The starter is one index short on the end.',
  language: 'Python',
  difficulty: 'Easy',
  category: 'Basics',
  status: 'published',
  timeLimit: 480,
  baseScore: 280,
  hardeningBonus: 120,
  bugType: 'off-by-one',
  skills: ['Indexing', 'Slicing', 'Bounds'],
  estimatedTime: 5,
  version: 1,
  hints: ['Check whether the end index is exclusive.', 'What happens when k equals the list length?'],
  explanation: 'Python slices are exclusive on the right. The starter uses start + k - 1 which drops the last element of the window.',
  i18n: {
    fa: { title: 'برش آف‌بای‌وان', description: 'پنجره میانی به طول k را از لیست برگردان. کد اولیه یک ایندکس از انتها کم دارد.', category: 'مقدماتی' },
  },
  tags: ['Python', 'Easy', 'Off-by-one'],
  evaluation: {
    type: 'python',
    functionName: 'middle_window',
    tests: [
      { id: 1, name: 'Basic middle', type: 'core', args: [[1, 2, 3, 4, 5], 3], expected: [2, 3, 4] },
      { id: 2, name: 'Full length', type: 'core', args: [[10, 20, 30], 3], expected: [10, 20, 30] },
      { id: 3, name: 'Single element', type: 'core', args: [[7, 8, 9], 1], expected: [8] },
      { id: 101, name: 'Even length list', type: 'hidden', args: [[1, 2, 3, 4], 2], expected: [2, 3] },
    ],
  },
  code: `def middle_window(items, k):\n    start = (len(items) - k) // 2\n    return items[start:start + k - 1]`,
}

export default challenge
