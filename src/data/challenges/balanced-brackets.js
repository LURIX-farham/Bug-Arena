const challenge = {
  id: 1012, slug: 'balanced-brackets', title: 'Balanced Brackets', description: 'Check whether brackets are correctly nested and closed.',
  language: 'Python', difficulty: 'Medium', category: 'Parsing', status: 'published',
  timeLimit: 780, baseScore: 520, hardeningBonus: 240, bugType: 'logic',
  skills: ["Stack","Validation"], estimatedTime: 10, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'پرانتزهای متوازن', description: 'درستی تو در تو شدن و بسته شدن براکت‌ها را بررسی کن.', category: 'Parsing' } },
  tags: ["Python","Stack","Validation"],
  evaluation: { type: 'python', functionName: 'is_balanced', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: ["([])"], expected: true },
      { id: 2, name: 'Case 2', type: 'core', args: ["([)]"], expected: false },
      { id: 3, name: 'Case 3', type: 'hidden', args: ["hello {world}"], expected: true },
      { id: 4, name: 'Case 4', type: 'hidden', args: ["((("], expected: false },
  ] },
  code: "def is_balanced(text):\n    return sum(text.count(char) for char in '([{') == sum(text.count(char) for char in ')]}')",
}

export default challenge
