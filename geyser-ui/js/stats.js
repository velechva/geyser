const START_BONUS = 30,
      BONUS_PERIOD = 24 * 60 * 60 * 60;

function calculateRewardMultiplier(stakingSeconds) {
    return START_BONUS + (stakingSeconds * (100 - START_BONUS)) / BONUS_PERIOD
}

function _estimatedRewards(tokens, seconds) {
    const totalBalanceFloat = 100000000000 //parseFloat(totalBalance)
    if (totalBalanceFloat <= 0) { return 0; }

    const unlockBalanceFloat = parseFloat(unlockedBalance)
    const userTokenBalanceFloat = parseFloat(userTokenBalance)
    const rewardMult = parseFloat(calculateRewardMultiplier(seconds))

    return tokens * ((unlockBalanceFloat * userTokenBalanceFloat) / totalBalanceFloat) * (START_BONUS + rewardMult) / 100
}

function calculateEstimatedRewards(tokens) {
    const oneMonthSeconds = 2.628e+6
    return _estimatedRewards(tokens, oneMonthSeconds)
}

function calculateApy(tokens) {
    const oneYearSeconds = 3.154e+7
    const rewards = _estimatedRewards(tokens, oneYearSeconds)

    return 100 - 100 * ((tokens + rewards) / tokens)
}
