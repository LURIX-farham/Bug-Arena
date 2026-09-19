const challenge = {
  id: 1015, slug: 'priority-queue', title: 'Priority Queue Fix', description: 'Process jobs by highest priority while preserving arrival order for ties.',
  language: 'Python', difficulty: 'Hard', category: 'Data Structures', status: 'published',
  timeLimit: 900, baseScore: 700, hardeningBonus: 320, bugType: 'logic',
  skills: ["Sorting","Stability"], estimatedTime: 15, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'صف اولویت', description: 'کارها را بر اساس بیشترین اولویت پردازش کن و ترتیب ورود مساوی‌ها را حفظ کن.', category: 'Data Structures' } },
  tags: ["Python","Sorting","Stability"],
  evaluation: { type: 'python', functionName: 'process_jobs', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [[{"id":"A","priority":1},{"id":"B","priority":3},{"id":"C","priority":3}]], expected: ["B","C","A"] },
      { id: 2, name: 'Case 2', type: 'core', args: [[{id:'x',priority:0},{id:'y',priority:-1}]], expected: ["x","y"] },
      { id: 3, name: 'Case 3', type: 'hidden', args: [[]], expected: [] },
      { id: 4, name: 'Case 4', type: 'hidden', args: [[{id:'first',priority:5},{id:'second',priority:5}]], expected: ["first","second"] },
  ] },
  code: "def process_jobs(jobs):\n    return [job['id'] for job in sorted(jobs, key=lambda job: job['priority'])]",
}

export default challenge
