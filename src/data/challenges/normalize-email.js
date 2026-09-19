const challenge = {
  id: 1013, slug: 'normalize-email', title: 'Email Normalizer', description: 'Normalize an email address for duplicate-account detection.',
  language: 'Python', difficulty: 'Easy', category: 'Data Cleaning', status: 'published',
  timeLimit: 600, baseScore: 350, hardeningBonus: 180, bugType: 'logic',
  skills: ["Strings","Normalization"], estimatedTime: 6, version: 1,
  hints: ['Read the function contract carefully.', 'Check edge cases before changing the algorithm.'],
  explanation: 'The starter implementation violates the challenge contract. A correct solution must satisfy every core and hidden test.',
  i18n: { fa: { title: 'نرمال‌سازی ایمیل', description: 'ایمیل را برای تشخیص حساب‌های تکراری نرمال کن.', category: 'Data Cleaning' } },
  tags: ["Python","Strings","Normalization"],
  evaluation: { type: 'python', functionName: 'normalize_email', tests: [
      { id: 1, name: 'Case 1', type: 'core', args: [" Alice@Example.COM "], expected: "alice@example.com" },
      { id: 2, name: 'Case 2', type: 'core', args: ["BOB@MAIL.com"], expected: "bob@mail.com" },
      { id: 3, name: 'Case 3', type: 'hidden', args: ["Carol@Example.org"], expected: "carol@example.org" },
      { id: 4, name: 'Case 4', type: 'hidden', args: [" dave@EXAMPLE.ORG "], expected: "dave@example.org" },
  ] },
  code: "def normalize_email(email):\n    local, domain = email.strip().split('@', 1)\n    return local + '@' + domain.lower()",
}

export default challenge
