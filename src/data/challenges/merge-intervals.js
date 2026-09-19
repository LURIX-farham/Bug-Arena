const challenge = {
  id: 1009, slug: 'merge-intervals', title: 'Merge Intervals', description: 'Merge overlapping numeric intervals into a compact ordered list.',
  language: 'Python', difficulty: 'Hard', category: 'Algorithms', status: 'published',
  timeLimit: 900, baseScore: 700, hardeningBonus: 320, bugType: 'logic',
  skills: ["Intervals","Sorting"], estimatedTime: 15, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'ادغام بازه‌ها', description: 'بازه‌های هم‌پوشان را به یک فهرست مرتب و فشرده تبدیل کن.', category: 'Algorithms' } },
  tags: ["Python","Intervals","Sorting"],
  evaluation: { type: 'python', functionName: 'merge_intervals', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [[[1,3],[2,6],[8,10]]], expected: [[1,6],[8,10]] },
      { id: 2, name: 'Case 2', type: 'core', args: [[[1,4],[4,5]]], expected: [[1,5]] },
      { id: 3, name: 'Case 3', type: 'hidden', args: [[[5,7],[1,2],[2,4]]], expected: [[1,4],[5,7]] },
      { id: 4, name: 'Case 4', type: 'hidden', args: [[]], expected: [] },
  ] },
  code: "def merge_intervals(intervals):\n    intervals = sorted(intervals)\n    merged = []\n    for start, end in intervals:\n        if not merged or start >= merged[-1][1]:\n            merged.append([start, end])\n        else:\n            merged[-1][1] = max(merged[-1][1], end)\n    return merged",
}

export default challenge
