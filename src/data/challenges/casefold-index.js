const challenge = {
  id: 1008, slug: 'casefold-index', title: 'Casefold Index', description: 'Find the first case-insensitive occurrence of a token in a list.',
  language: 'Python', difficulty: 'Easy', category: 'Logic', status: 'published',
  timeLimit: 600, baseScore: 350, hardeningBonus: 180, bugType: 'logic',
  skills: ["Strings","Search"], estimatedTime: 6, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'شاخص حروف', description: 'اولین رخداد بدون حساسیت به حروف را در فهرست پیدا کن.', category: 'Logic' } },
  tags: ["Python","Strings","Search"],
  evaluation: { type: 'python', functionName: 'find_token', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [["Alpha","Beta","GAMMA"],"gamma"], expected: 2 },
      { id: 2, name: 'Case 2', type: 'core', args: [["A","b","C"],"x"], expected: -1 },
      { id: 3, name: 'Case 3', type: 'hidden', args: [["Node","node"],"NODE"], expected: 0 },
      { id: 4, name: 'Case 4', type: 'hidden', args: [["Test"],"TEST"], expected: 0 },
  ] },
  code: "def find_token(items, token):\n    token = token.lower()\n    for index, item in enumerate(items):\n        if item == token:\n            return index\n    return -1",
}

export default challenge
