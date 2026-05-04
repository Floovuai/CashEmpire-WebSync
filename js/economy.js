(function () {
  "use strict";

  const PHASE_ORDER = ["expansion", "peak", "recession", "recovery"];
  const PHASE_LABELS = {
    expansion: "Expansion",
    peak: "Pico",
    recession: "Recesion",
    recovery: "Recuperacion"
  };

  const PHASE_CONFIG = {
    expansion: {
      next: "peak",
      targets: {
        inflation: 0.045,
        interestRate: 0.052,
        gdpGrowth: 0.035,
        unemployment: 0.045,
        sentiment: 0.48,
        consumerConfidence: 70,
        oilPrice: 88,
        goldPrice: 1950
      },
      volatility: 0.006
    },
    peak: {
      next: "recession",
      targets: {
        inflation: 0.072,
        interestRate: 0.078,
        gdpGrowth: 0.014,
        unemployment: 0.052,
        sentiment: 0.1,
        consumerConfidence: 56,
        oilPrice: 96,
        goldPrice: 2050
      },
      volatility: 0.009
    },
    recession: {
      next: "recovery",
      targets: {
        inflation: 0.035,
        interestRate: 0.038,
        gdpGrowth: -0.028,
        unemployment: 0.09,
        sentiment: -0.48,
        consumerConfidence: 38,
        oilPrice: 68,
        goldPrice: 2300
      },
      volatility: 0.014
    },
    recovery: {
      next: "expansion",
      targets: {
        inflation: 0.028,
        interestRate: 0.032,
        gdpGrowth: 0.016,
        unemployment: 0.066,
        sentiment: 0.18,
        consumerConfidence: 52,
        oilPrice: 76,
        goldPrice: 2125
      },
      volatility: 0.008
    }
  };

  const DIFFICULTY_MULTIPLIERS = {
    facil: {
      volatility: 0.45,
      tax: 0.45,
      negativeEvents: 0.55,
      loanRate: 0.68,
      dividend: 1.18,
      marketDrift: 1.12,
      businessDemand: 1.08,
      businessCost: 0.95,
      collectionRate: 1.05,
      valuationDrift: 1.08,
      scenarioImpact: 0.92
    },
    normal: {
      volatility: 1,
      tax: 1,
      negativeEvents: 1,
      loanRate: 1,
      dividend: 1,
      marketDrift: 1,
      businessDemand: 1,
      businessCost: 1,
      collectionRate: 1,
      valuationDrift: 1,
      scenarioImpact: 1
    },
    dificil: {
      volatility: 1.44,
      tax: 1.18,
      negativeEvents: 1.22,
      loanRate: 1.22,
      dividend: 0.96,
      marketDrift: 1.005,
      businessDemand: 1.02,
      businessCost: 1.015,
      collectionRate: 1,
      valuationDrift: 1,
      scenarioImpact: 1.02
    },
    pesadilla: {
      volatility: 1.86,
      tax: 1.38,
      negativeEvents: 1.52,
      loanRate: 1.34,
      dividend: 0.9,
      marketDrift: 0.965,
      businessDemand: 0.99,
      businessCost: 1.03,
      collectionRate: 0.975,
      valuationDrift: 0.96,
      scenarioImpact: 1.06
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function signedNoise(scale) {
    return randomBetween(-scale, scale);
  }

  function nudge(current, target, strength, noise) {
    return current + (target - current) * strength + signedNoise(noise);
  }

  function getDifficultyMultiplier(difficulty) {
    return DIFFICULTY_MULTIPLIERS[difficulty] || DIFFICULTY_MULTIPLIERS.normal;
  }

  function getDifficultySettings(difficulty) {
    return getDifficultyMultiplier(difficulty);
  }

  function getPressure(macro) {
    if (macro.sentiment <= -0.25 || macro.phase === "recession") return "Refugio";
    if (macro.interestRate >= 0.075) return "Deuda cara";
    if (macro.inflation >= 0.065) return "Inflacion alta";
    if (macro.sentiment >= 0.32 && macro.gdpGrowth > 0) return "Riesgo activo";
    return "Balanceado";
  }

  function getSentimentLabel(sentiment) {
    if (sentiment >= 0.35) return "Bull";
    if (sentiment >= 0.1) return "Optimista";
    if (sentiment <= -0.35) return "Bear";
    if (sentiment <= -0.1) return "Defensivo";
    return "Neutral";
  }

  function createInitialMacro(difficulty) {
    const phase = "expansion";
    const config = PHASE_CONFIG[phase];

    return {
      phase,
      phaseLabel: PHASE_LABELS[phase],
      phaseDay: 1,
      phaseDuration: randomInt(60, 140),
      inflation: config.targets.inflation,
      interestRate: config.targets.interestRate,
      gdpGrowth: config.targets.gdpGrowth,
      unemployment: config.targets.unemployment,
      sentiment: config.targets.sentiment,
      sentimentLabel: getSentimentLabel(config.targets.sentiment),
      consumerConfidence: config.targets.consumerConfidence,
      exchangeRateIndex: 100,
      oilPrice: config.targets.oilPrice,
      goldPrice: config.targets.goldPrice,
      volatility: config.volatility * getDifficultyMultiplier(difficulty).volatility,
      lastDailyMarketDelta: 0,
      pressure: "Riesgo activo",
      activeEvents: [],
      lastPhaseChange: null
    };
  }

  function normalizeMacro(value, difficulty) {
    const fallback = createInitialMacro(difficulty);

    if (!isObject(value)) return fallback;

    const phase = PHASE_ORDER.includes(value.phase) ? value.phase : fallback.phase;
    const config = PHASE_CONFIG[phase];
    const multiplier = getDifficultyMultiplier(difficulty);
    const macro = {
      phase,
      phaseLabel: PHASE_LABELS[phase],
      phaseDay: clamp(Math.floor(Number(value.phaseDay) || fallback.phaseDay), 1, 180),
      phaseDuration: clamp(Math.floor(Number(value.phaseDuration) || fallback.phaseDuration), 30, 180),
      inflation: clamp(Number(value.inflation) || fallback.inflation, 0, 0.15),
      interestRate: clamp(Number(value.interestRate) || fallback.interestRate, 0, 0.15),
      gdpGrowth: clamp(Number(value.gdpGrowth) || fallback.gdpGrowth, -0.08, 0.08),
      unemployment: clamp(Number(value.unemployment) || fallback.unemployment, 0.02, 0.15),
      sentiment: clamp(Number(value.sentiment) || fallback.sentiment, -1, 1),
      consumerConfidence: clamp(Number(value.consumerConfidence) || fallback.consumerConfidence, 0, 100),
      exchangeRateIndex: clamp(Number(value.exchangeRateIndex) || fallback.exchangeRateIndex, 50, 180),
      oilPrice: clamp(Number(value.oilPrice) || fallback.oilPrice, 40, 200),
      goldPrice: clamp(Number(value.goldPrice) || fallback.goldPrice, 1000, 5000),
      volatility: clamp(Number(value.volatility) || config.volatility * multiplier.volatility, 0.002, 0.04),
      lastDailyMarketDelta: clamp(Number(value.lastDailyMarketDelta) || 0, -0.08, 0.08),
      activeEvents: Array.isArray(value.activeEvents) ? value.activeEvents.slice(0, 4) : [],
      lastPhaseChange: isObject(value.lastPhaseChange) ? value.lastPhaseChange : null
    };

    macro.sentimentLabel = getSentimentLabel(macro.sentiment);
    macro.pressure = getPressure(macro);
    return macro;
  }

  function shouldTransition(macro) {
    if (macro.phaseDay >= macro.phaseDuration) return true;
    if (macro.phaseDay < 30) return false;

    const progress = macro.phaseDay / macro.phaseDuration;
    const probability = clamp((progress - 0.65) * 0.08, 0, 0.035);
    return Math.random() < probability;
  }

  function advancePhase(macro) {
    const currentPhase = macro.phase;
    const nextPhase = PHASE_CONFIG[currentPhase].next;

    return {
      ...macro,
      phase: nextPhase,
      phaseLabel: PHASE_LABELS[nextPhase],
      phaseDay: 1,
      phaseDuration: randomInt(30, 180),
      lastPhaseChange: {
        from: currentPhase,
        to: nextPhase
      }
    };
  }

  function tickOneDay(macro, difficulty) {
    let next = normalizeMacro(macro, difficulty);

    next.phaseDay += 1;
    if (shouldTransition(next)) {
      next = advancePhase(next);
    } else {
      next.lastPhaseChange = null;
    }

    const config = PHASE_CONFIG[next.phase];
    const multiplier = getDifficultyMultiplier(difficulty);
    const volatility = config.volatility * multiplier.volatility;
    const targets = config.targets;

    next.inflation = clamp(nudge(next.inflation, targets.inflation, 0.018, 0.00045 * multiplier.volatility), 0, 0.15);
    next.gdpGrowth = clamp(nudge(next.gdpGrowth, targets.gdpGrowth, 0.02, 0.0008 * multiplier.volatility), -0.08, 0.08);
    next.unemployment = clamp(nudge(next.unemployment, targets.unemployment, 0.018, 0.0005 * multiplier.volatility), 0.02, 0.15);

    const rateTarget = clamp(targets.interestRate + (next.inflation - 0.035) * 0.25, 0, 0.15);
    next.interestRate = clamp(nudge(next.interestRate, rateTarget, 0.02, 0.00045 * multiplier.volatility), 0, 0.15);

    const sentimentTarget = clamp(
      targets.sentiment + next.gdpGrowth * 3 - Math.max(0, next.interestRate - 0.06) * 2,
      -1,
      1
    );
    next.sentiment = clamp(nudge(next.sentiment, sentimentTarget, 0.04, 0.018 * multiplier.volatility), -1, 1);
    next.consumerConfidence = clamp(nudge(next.consumerConfidence, targets.consumerConfidence, 0.025, 0.5 * multiplier.volatility), 0, 100);
    next.oilPrice = clamp(nudge(next.oilPrice, targets.oilPrice, 0.018, 0.65 * multiplier.volatility), 40, 200);
    next.goldPrice = clamp(nudge(next.goldPrice, targets.goldPrice, 0.015, 8 * multiplier.volatility), 1000, 5000);
    next.exchangeRateIndex = clamp(
      nudge(next.exchangeRateIndex, 100 + Math.max(0, next.inflation - 0.04) * 250, 0.012, 0.2 * multiplier.volatility),
      50,
      180
    );
    next.volatility = clamp(volatility, 0.002, 0.04);
    next.lastDailyMarketDelta = clamp(next.sentiment * 0.0025 + next.gdpGrowth / 252 + signedNoise(volatility), -0.08, 0.08);
    next.sentimentLabel = getSentimentLabel(next.sentiment);
    next.pressure = getPressure(next);

    return next;
  }

  function tickMacro(macro, days, options) {
    const settings = options || {};
    const totalDays = clamp(Math.floor(Number(days) || 1), 1, 365);
    let next = normalizeMacro(macro, settings.difficulty);
    const eventImpact = settings.eventImpact || null;

    for (let day = 0; day < totalDays; day += 1) {
      next = tickOneDay(next, settings.difficulty);
      if (eventImpact) {
        next.inflation = clamp(next.inflation + (Number(eventImpact.inflationDelta) || 0), 0, 0.15);
        next.interestRate = clamp(next.interestRate + (Number(eventImpact.interestRateDelta) || 0), 0, 0.15);
        next.gdpGrowth = clamp(next.gdpGrowth + (Number(eventImpact.gdpDelta) || 0), -0.08, 0.08);
        next.sentiment = clamp(next.sentiment + (Number(eventImpact.sentimentDelta) || 0), -1, 1);
        next.sentimentLabel = getSentimentLabel(next.sentiment);
        next.pressure = getPressure(next);
      }
    }

    return next;
  }

  window.CashEmpireEconomy = {
    PHASE_LABELS,
    PHASE_ORDER,
    DIFFICULTY_MULTIPLIERS,
    getDifficultySettings,
    createInitialMacro,
    normalizeMacro,
    tickMacro,
    getPressure,
    getSentimentLabel
  };
})();
