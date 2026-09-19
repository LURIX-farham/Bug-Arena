export function getLocalizedChallenge(challenge, language) {
  if (!challenge) return challenge
  return challenge.i18n?.[language] ? { ...challenge, ...challenge.i18n[language], i18n: challenge.i18n } : challenge
}
