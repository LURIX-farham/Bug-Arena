export function calculateScore({
  challenge,
  timeLeft,
  attempts,
  coreFixed,
  hardened,
}) {
  if (!challenge || !coreFixed) {
    return {
      score: 0,
      baseScore: 0,
      speedBonus: 0,
      attemptBonus: 0,
      hardeningBonus: 0,
    }
  }


  /*
   * -----------------------------------------
   * BASE SCORE
   * -----------------------------------------
   *
   * This represents the actual value of
   * solving the challenge.
   */

  const baseScore =
    challenge.baseScore ?? 500


  /*
   * -----------------------------------------
   * SPEED BONUS
   * -----------------------------------------
   *
   * Faster solutions receive more points.
   *
   * We calculate this from the percentage
   * of time remaining.
   */

  const timeLimit =
    challenge.timeLimit ?? 300


  const timeRatio =
    Math.max(
      0,
      Math.min(
        1,
        timeLeft / timeLimit
      )
    )


  const speedBonus =
    Math.round(
      baseScore *
      0.4 *
      timeRatio
    )


  /*
   * -----------------------------------------
   * ATTEMPT BONUS
   * -----------------------------------------
   *
   * Fewer attempts = better bonus.
   */

  let attemptBonus = 0


  if (attempts <= 1) {

    attemptBonus =
      Math.round(
        baseScore * 0.2
      )

  } else if (attempts === 2) {

    attemptBonus =
      Math.round(
        baseScore * 0.12
      )

  } else if (attempts === 3) {

    attemptBonus =
      Math.round(
        baseScore * 0.06
      )
  }


  /*
   * -----------------------------------------
   * HARDENING BONUS
   * -----------------------------------------
   */

  const hardeningBonus =
    hardened
      ? (
          challenge.hardeningBonus
          ?? Math.round(
            baseScore * 0.5
          )
        )
      : 0


  /*
   * -----------------------------------------
   * FINAL SCORE
   * -----------------------------------------
   */

  const score =
    baseScore +
    speedBonus +
    attemptBonus +
    hardeningBonus


  return {
    score,

    baseScore,

    speedBonus,

    attemptBonus,

    hardeningBonus,
  }
}