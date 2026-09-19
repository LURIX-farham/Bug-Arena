const challenge = {
  id: 1006, slug: 'boundary-window', title: 'Boundary Window', description: 'Calculate the maximum value inside each fixed-size window.',
  language: 'Python', difficulty: 'Medium', category: 'Algorithms', status: 'published',
  timeLimit: 780, baseScore: 520, hardeningBonus: 240, bugType: 'logic',
  skills: ["Arrays","Sliding Window"], estimatedTime: 10, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'محفظه مرزی', description: 'بیشترین مقدار هر پنجره با اندازه ثابت را محاسبه کن.', category: 'Algorithms' } },
  tags: ["Python","Arrays","Sliding Window"],
  evaluation: { type: 'python', functionName: 'max_windows', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [[1,3,2,5],2], expected: [3,3,5] },
      { id: 2, name: 'Case 2', type: 'core', args: [[4,1,7,2,6],3], expected: [7,7,7] },
      { id: 3, name: 'Case 3', type: 'hidden', args: [[1,2],3], expected: [] },
      { id: 4, name: 'Case 4', type: 'hidden', args: [[9,1,5],1], expected: [9,1,5] },
  ] },
  code: "def max_windows(values, window):\n    return [max(values[i:i + window]) for i in range(len(values) - window)]",
}

export default challenge
