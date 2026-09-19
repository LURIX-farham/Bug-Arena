const challenge = {
  id: 1011, slug: 'parse-version', title: 'Version Parser', description: 'Compare semantic version strings and return the larger version.',
  language: 'Python', difficulty: 'Medium', category: 'Backend Logic', status: 'published',
  timeLimit: 780, baseScore: 520, hardeningBonus: 240, bugType: 'logic',
  skills: ["Parsing","Strings"], estimatedTime: 10, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'تحلیل نسخه', description: 'دو نسخه معنایی را مقایسه کن و نسخه بزرگ‌تر را برگردان.', category: 'Backend Logic' } },
  tags: ["Python","Parsing","Strings"],
  evaluation: { type: 'python', functionName: 'max_version', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: ["1.2.10","1.2.9"], expected: "1.2.10" },
      { id: 2, name: 'Case 2', type: 'core', args: ["2.0","2.0.0"], expected: "2.0" },
      { id: 3, name: 'Case 3', type: 'hidden', args: ["1.4.0","1.4.1"], expected: "1.4.1" },
      { id: 4, name: 'Case 4', type: 'hidden', args: ["1.0.0","1.0.0"], expected: "1.0.0" },
  ] },
  code: "def max_version(a, b):\n    def parts(value):\n        return tuple(int(x) for x in value.split('.'))\n    return a if parts(a) > parts(b) else b",
}

export default challenge
