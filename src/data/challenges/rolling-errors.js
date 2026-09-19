const challenge = {
  id: 1014, slug: 'rolling-errors', title: 'Rolling Error Rate', description: 'Calculate error rate for each complete window of request outcomes.',
  language: 'Python', difficulty: 'Hard', category: 'Telemetry', status: 'published',
  timeLimit: 900, baseScore: 700, hardeningBonus: 320, bugType: 'logic',
  skills: ["Statistics","Sliding Window"], estimatedTime: 15, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'نرخ خطای لغزان', description: 'نرخ خطا را برای هر پنجره کامل از وضعیت درخواست‌ها محاسبه کن.', category: 'Telemetry' } },
  tags: ["Python","Statistics","Sliding Window"],
  evaluation: { type: 'python', functionName: 'error_rates', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [[1,0,1,1],2], expected: [0.5,0.5,1] },
      { id: 2, name: 'Case 2', type: 'core', args: [[0,0,1,0,1],3], expected: [0.3333333333333333,0.3333333333333333,0.6666666666666666] },
      { id: 3, name: 'Case 3', type: 'hidden', args: [[0,0],3], expected: [] },
      { id: 4, name: 'Case 4', type: 'hidden', args: [[1,1,0],1], expected: [1,1,0] },
  ] },
  code: "def error_rates(outcomes, window):\n    return [sum(outcomes[i:i + window]) / window for i in range(len(outcomes) - window)]",
}

export default challenge
