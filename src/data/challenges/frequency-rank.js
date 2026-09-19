const challenge = {
  id: 1010, slug: 'frequency-rank', title: 'Frequency Rank', description: 'Return the most frequent values, breaking ties by first appearance.',
  language: 'Python', difficulty: 'Medium', category: 'Data Structures', status: 'published',
  timeLimit: 780, baseScore: 520, hardeningBonus: 240, bugType: 'logic',
  skills: ["Hash Map","Counting"], estimatedTime: 10, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'رتبه فراوانی', description: 'پرتکرارترین مقادیر را با شکستن تساوی بر اساس اولین رخداد برگردان.', category: 'Data Structures' } },
  tags: ["Python","Hash Map","Counting"],
  evaluation: { type: 'python', functionName: 'frequency_rank', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [[3,1,3,2,1,3],2], expected: [3,1] },
      { id: 2, name: 'Case 2', type: 'core', args: [["b","a","a","b"],2], expected: ["b","a"] },
      { id: 3, name: 'Case 3', type: 'hidden', args: [[1,2,3],5], expected: [1,2,3] },
      { id: 4, name: 'Case 4', type: 'hidden', args: [[],3], expected: [] },
  ] },
  code: "def frequency_rank(values, limit):\n    counts = {}\n    order = {}\n    for index, value in enumerate(values):\n        counts[value] = counts.get(value, 0) + 1\n        order.setdefault(value, index)\n    ranked = sorted(counts, key=lambda value: (-counts[value], value))\n    return ranked[:limit]",
}

export default challenge
