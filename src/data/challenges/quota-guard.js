const challenge = {
  id: 1007, slug: 'quota-guard', title: 'Quota Guard', description: 'Return whether a request is allowed without exceeding the quota.',
  language: 'Python', difficulty: 'Easy', category: 'Backend Logic', status: 'published',
  timeLimit: 600, baseScore: 350, hardeningBonus: 180, bugType: 'logic',
  skills: ["Conditions","Backend"], estimatedTime: 6, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'محافظ سهمیه', description: 'مشخص کن درخواست بدون عبور از سهمیه مجاز است یا نه.', category: 'Backend Logic' } },
  tags: ["Python","Conditions","Backend"],
  evaluation: { type: 'python', functionName: 'is_allowed', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [8,10,2], expected: true },
      { id: 2, name: 'Case 2', type: 'core', args: [9,10,1], expected: true },
      { id: 3, name: 'Case 3', type: 'hidden', args: [10,10,1], expected: false },
      { id: 4, name: 'Case 4', type: 'hidden', args: [0,0,0], expected: true },
  ] },
  code: "def is_allowed(used, quota, cost):\n    return used + cost < quota",
}

export default challenge
