const challenge = {
  id: 1003,
  slug: 'priority-inversion',
  title: 'Priority Inversion',
  description: 'Tasks must be ordered by priority, but tasks with the same priority must keep their original order.',
  language: 'Python',
  difficulty: 'Medium',
  category: 'Algorithms',
  status: 'published',
  timeLimit: 720,
  baseScore: 520,
  hardeningBonus: 240,
  bugType: 'sorting',
  skills: ['Sorting', 'Stability', 'Ordering'],
  estimatedTime: 10,
  version: 1,
  hints: ['Read the expected behavior carefully.', 'Check the hidden edge cases after the core fix.'],
  explanation: 'The starter implementation contains a deliberate defect. The accepted solution must satisfy the complete challenge contract.',
  i18n: {
    fa: { title: 'وارونگی اولویت', description: 'وظایف باید بر اساس اولویت مرتب شوند، اما وظایف با اولویت برابر باید ترتیب اولیه خود را حفظ کنند.', category: 'الگوریتم‌ها' },
  },
  tags: ['Python', 'Sorting', 'Stability'],
  evaluation: {
    type: 'python',
    functionName: 'sort_tasks',
    tests: [
      { id: 1, name: 'Highest priority first', type: 'core', args: [[{ name: 'A', priority: 1 }, { name: 'B', priority: 3 }, { name: 'C', priority: 2 }]], expected: ['B', 'C', 'A'] },
      { id: 2, name: 'Stable ties', type: 'core', args: [[{ name: 'A', priority: 2 }, { name: 'B', priority: 2 }, { name: 'C', priority: 1 }]], expected: ['A', 'B', 'C'] },
      { id: 101, name: 'Negative priority', type: 'hidden', args: [[{ name: 'A', priority: -1 }, { name: 'B', priority: 0 }, { name: 'C', priority: -3 }]], expected: ['B', 'A', 'C'] },
    ],
  },
  code: `def sort_tasks(tasks):\n    return [\n        task["name"]\n        for task in sorted(tasks, key=lambda task: task["priority"])\n    ]`,
}

export default challenge
