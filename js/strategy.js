(function () {
  "use strict";

  const SCENARIOS = {
    free: {
      id: "free",
      label: "Libre",
      body: "Economia base sin sesgo inicial.",
      macro: {},
      effects: []
    },
    crisis: {
      id: "crisis",
      label: "Crisis de liquidez",
      body: "Tasas altas, sentimiento debil y oportunidades defensivas.",
      macro: { sentiment: -0.24, interestRate: 0.018, inflation: 0.012, gdpGrowth: -0.022, consumerConfidence: -12 },
      effects: [
        {
          title: "Liquidez restringida",
          level: "macro",
          severity: "warning",
          duration: 120,
          assetType: "all",
          ongoingTypeDelta: -0.0009,
          ongoingSentiment: -0.005,
          ongoingInterestRate: 0.00038,
          ongoingGdp: -0.00014,
          businessRevenueDelta: -0.012,
          businessCostDelta: 0.01,
          propertyOccupancyDelta: -0.002
        },
        {
          title: "Refugio en bonos",
          level: "macro",
          severity: "info",
          duration: 90,
          assetType: "bond",
          ongoingTypeDelta: 0.0007
        }
      ]
    },
    ai_boom: {
      id: "ai_boom",
      label: "Boom de IA",
      body: "Software, tecnologia y automatizacion arrancan con viento a favor.",
      macro: { sentiment: 0.14, interestRate: 0.004, inflation: 0.003, gdpGrowth: 0.012, consumerConfidence: 6 },
      effects: [
        {
          title: "Capex en automatizacion",
          level: "sector",
          severity: "opportunity",
          duration: 110,
          sector: "technology",
          ongoingSectorDelta: 0.0019,
          ongoingSentiment: 0.003,
          businessRevenueDelta: 0.01,
          businessMoraleDelta: 0.004
        },
        {
          title: "Presion sobre operadores tradicionales",
          level: "sector",
          severity: "warning",
          duration: 85,
          sector: "retail",
          ongoingSectorDelta: -0.001,
          businessCostDelta: 0.004
        }
      ]
    },
    oil_shock: {
      id: "oil_shock",
      label: "Shock energetico",
      body: "Inflacion y commodities suben; logistica y consumo quedan bajo presion.",
      macro: { sentiment: -0.11, interestRate: 0.011, inflation: 0.018, gdpGrowth: -0.01, consumerConfidence: -8 },
      effects: [
        {
          title: "Cadena de costos energeticos",
          level: "macro",
          severity: "warning",
          duration: 105,
          sector: "energy_commodities",
          ongoingSectorDelta: 0.0023,
          ongoingInflation: 0.00024,
          businessCostDelta: 0.013
        },
        {
          title: "Compresion de margenes logisticos",
          level: "sector",
          severity: "warning",
          duration: 90,
          sector: "logistics",
          ongoingSectorDelta: -0.0017,
          businessRevenueDelta: -0.006,
          businessCostDelta: 0.008
        }
      ]
    }
  };

  const HEDGE_DEFS = {
    portfolio_guard: {
      id: "portfolio_guard",
      label: "Cobertura de cartera",
      type: "portfolio",
      days: 45,
      ratio: 0.004,
      minCost: 350,
      body: "Reduce el golpe de eventos negativos sobre activos liquidos durante 45 dias."
    },
    property_insurance: {
      id: "property_insurance",
      label: "Seguro inmobiliario",
      type: "property",
      days: 90,
      ratio: 0.0025,
      minCost: 500,
      body: "Amortigua shocks en bienes raices, ocupacion y costos de propiedades."
    },
    rate_lock: {
      id: "rate_lock",
      label: "Blindaje de tasas",
      type: "rates",
      days: 60,
      ratio: 0.0018,
      minCost: 300,
      body: "Baja el costo de nuevos creditos y suaviza subidas de tasas."
    },
    cyber_security: {
      id: "cyber_security",
      label: "Seguro operativo",
      type: "operations",
      days: 75,
      ratio: 0.0022,
      minCost: 450,
      body: "Reduce eventos que drenan caja del jugador o elevan costos operativos."
    }
  };

  const CONTRACT_ROTATION = [
    "first_buy",
    "watchlist",
    "diversify",
    "cash_guard",
    "risk_guard",
    "read_news",
    "business_health",
    "hedge"
  ];

  const CONTRACT_REWARD_MULTIPLIERS = {
    first_buy: 1.2,
    watchlist: 0.42,
    diversify: 1.08,
    cash_guard: 0.36,
    risk_guard: 0.44,
    read_news: 0.22,
    business_health: 1.04,
    hedge: 0.9
  };

  const PASSIVE_CONTRACTS = new Set(["cash_guard", "risk_guard", "read_news"]);
  const SUPPORT_CONTRACTS = new Set(["watchlist"]);

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function toDay(value) {
    const day = Math.floor(Number(value) || 1);
    return Math.max(1, day);
  }

  function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatShortMoney(value) {
    const number = Math.round(Number(value) || 0);
    const abs = Math.abs(number);
    if (abs >= 1000000) return `$${(number / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}M`;
    if (abs >= 1000) return `$${(number / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return `$${number}`;
  }

  function normalizeScenario(value) {
    return Object.prototype.hasOwnProperty.call(SCENARIOS, value) ? value : "free";
  }

  function normalizeWatchlist(value) {
    return Array.isArray(value)
      ? Array.from(new Set(value.filter((item) => typeof item === "string" && item))).slice(0, 24)
      : [];
  }

  function normalizeHedges(value) {
    return Array.isArray(value)
      ? value.map((item) => {
        if (!isObject(item)) return null;
        const id = typeof item.id === "string" ? item.id : "";
        const def = HEDGE_DEFS[id];
        if (!def) return null;
        return {
          id,
          label: def.label,
          type: def.type,
          cost: roundMoney(Math.max(0, Number(item.cost) || 0)),
          createdDay: toDay(item.createdDay),
          endDay: toDay(item.endDay),
          source: typeof item.source === "string" ? item.source : "player"
        };
      }).filter(Boolean).slice(-12)
      : [];
  }

  function normalizeContracts(value) {
    const source = isObject(value) ? value : {};
    const items = Array.isArray(source.items)
      ? source.items.map((item) => {
        if (!isObject(item) || typeof item.id !== "string") return null;
        return {
          id: item.id,
          kind: typeof item.kind === "string" ? item.kind : "task",
          title: typeof item.title === "string" ? item.title : "Contrato",
          body: typeof item.body === "string" ? item.body : "",
          target: Math.max(1, Number(item.target) || 1),
          progress: Math.max(0, Number(item.progress) || 0),
          rewardCash: roundMoney(Math.max(0, Number(item.rewardCash) || 0)),
          rewardPower: Math.max(0, Math.floor(Number(item.rewardPower) || 0)),
          done: Boolean(item.done)
        };
      }).filter(Boolean).slice(0, 5)
      : [];

    return {
      week: Math.max(0, Math.floor(Number(source.week) || 0)),
      items,
      completedIds: Array.isArray(source.completedIds) ? source.completedIds.filter((id) => typeof id === "string") : [],
      rewardedIds: Array.isArray(source.rewardedIds) ? source.rewardedIds.filter((id) => typeof id === "string") : []
    };
  }

  function normalizePrestige(value) {
    const source = isObject(value) ? value : {};
    return {
      points: Math.max(0, Math.floor(Number(source.points) || 0)),
      runs: Array.isArray(source.runs) ? source.runs.filter(isObject).slice(-8) : [],
      bestNetWorth: roundMoney(Math.max(0, Number(source.bestNetWorth) || 0)),
      lastClaimDay: Math.max(0, Math.floor(Number(source.lastClaimDay) || 0))
    };
  }

  function normalizeStrategy(value) {
    const source = isObject(value) ? value : {};
    return {
      scenario: normalizeScenario(source.scenario),
      scenarioApplied: Boolean(source.scenarioApplied),
      watchlist: normalizeWatchlist(source.watchlist),
      activeHedges: normalizeHedges(source.activeHedges),
      contracts: normalizeContracts(source.contracts),
      advisors: isObject(source.advisors) ? {
        lastTipDay: Math.max(0, Math.floor(Number(source.advisors.lastTipDay) || 0))
      } : { lastTipDay: 0 },
      prestige: normalizePrestige(source.prestige),
      cityPower: Math.max(0, Math.floor(Number(source.cityPower) || 0)),
      takeoverClaims: Array.isArray(source.takeoverClaims)
        ? source.takeoverClaims.filter(isObject).map((item) => ({
          assetId: typeof item.assetId === "string" ? item.assetId : "",
          label: typeof item.label === "string" ? item.label : "Participacion estrategica",
          ticker: typeof item.ticker === "string" ? item.ticker : "",
          assetType: typeof item.assetType === "string" ? item.assetType : "stock",
          day: Math.max(1, Math.floor(Number(item.day) || 1)),
          influence: Math.max(0, Math.floor(Number(item.influence) || 0)),
          stage: typeof item.stage === "string" ? item.stage : getTakeoverStage(Math.max(0, Math.floor(Number(item.influence) || 0))).id,
          power: Math.max(1, Math.floor(Number(item.power) || getTakeoverStage(Math.max(0, Math.floor(Number(item.influence) || 0))).power))
        })).filter((item) => item.assetId).slice(-20)
        : []
    };
  }

  function buildScenarioEffect(day, scenario, effect, index, difficulty) {
    const difficultySettings = window.CashEmpireEconomy && typeof window.CashEmpireEconomy.getDifficultySettings === "function"
      ? window.CashEmpireEconomy.getDifficultySettings(difficulty)
      : { scenarioImpact: 1 };
    const impact = clamp(Number(difficultySettings.scenarioImpact) || 1, 0.75, 1.35);
    return {
      id: `scenario_${scenario.id}_${day}_${index}`,
      sourceId: `scenario_${scenario.id}`,
      title: effect.title || scenario.label,
      level: effect.level || "macro",
      severity: effect.severity || "info",
      startDay: day,
      endDay: day + Math.max(1, Math.floor(Number(effect.duration) || 0)) - 1,
      assetType: typeof effect.assetType === "string" ? effect.assetType : null,
      sector: typeof effect.sector === "string" ? effect.sector : null,
      ongoingTypeDelta: (Number(effect.ongoingTypeDelta) || 0) * impact,
      ongoingSectorDelta: (Number(effect.ongoingSectorDelta) || 0) * impact,
      ongoingSentiment: (Number(effect.ongoingSentiment) || 0) * impact,
      ongoingInflation: (Number(effect.ongoingInflation) || 0) * impact,
      ongoingInterestRate: (Number(effect.ongoingInterestRate) || 0) * impact,
      ongoingGdp: (Number(effect.ongoingGdp) || 0) * impact,
      businessRevenueDelta: (Number(effect.businessRevenueDelta) || 0) * impact,
      businessCostDelta: (Number(effect.businessCostDelta) || 0) * impact,
      businessSupplierDelta: (Number(effect.businessSupplierDelta) || 0) * impact,
      businessReputationDelta: (Number(effect.businessReputationDelta) || 0) * impact,
      businessMoraleDelta: (Number(effect.businessMoraleDelta) || 0) * impact,
      propertyOccupancyDelta: (Number(effect.propertyOccupancyDelta) || 0) * impact
    };
  }

  function getTakeoverStage(influence) {
    const score = Math.max(0, Math.floor(Number(influence) || 0));
    if (score >= 62) {
      return {
        id: "control",
        label: "Control",
        power: 8,
        tradeFeeModifier: 0.8,
        dividendMultiplier: 1.2,
        businessDemand: 1.055,
        businessCost: 0.965,
        businessValuation: 1.08
      };
    }
    if (score >= 36) {
      return {
        id: "board",
        label: "Consejo",
        power: 5,
        tradeFeeModifier: 0.88,
        dividendMultiplier: 1.11,
        businessDemand: 1.03,
        businessCost: 0.98,
        businessValuation: 1.05
      };
    }
    return {
      id: "observer",
      label: "Observador",
      power: 3,
      tradeFeeModifier: 0.94,
      dividendMultiplier: 1.05,
      businessDemand: 1.015,
      businessCost: 0.992,
      businessValuation: 1.025
    };
  }

  function getTakeoverClaim(state, assetId) {
    const strategy = ensureStrategy(state);
    return strategy.takeoverClaims.find((item) => item.assetId === assetId) || null;
  }

  function getTakeoverClaims(state) {
    const strategy = ensureStrategy(state);
    return strategy.takeoverClaims
      .map((claim) => {
        const stage = getTakeoverStage(claim.influence);
        return {
          ...claim,
          stage: stage.id,
          stageLabel: stage.label,
          power: claim.power || stage.power,
          tradeFeeModifier: stage.tradeFeeModifier,
          dividendMultiplier: stage.dividendMultiplier,
          businessDemand: stage.businessDemand,
          businessCost: stage.businessCost,
          businessValuation: stage.businessValuation
        };
      })
      .sort((a, b) => b.influence - a.influence);
  }

  function getTakeoverTradeModifier(state, assetId) {
    const claim = getTakeoverClaims(state).find((item) => item.assetId === assetId);
    return claim ? claim.tradeFeeModifier : 1;
  }

  function getTakeoverDividendModifier(state, assetId) {
    const claim = getTakeoverClaims(state).find((item) => item.assetId === assetId);
    return claim ? claim.dividendMultiplier : 1;
  }

  function getTakeoverBusinessModifiers(state, business) {
    if (!business) {
      return {
        label: "Sin influencia",
        stage: "none",
        influence: 0,
        demand: 1,
        cost: 1,
        valuation: 1
      };
    }
    const claim = getTakeoverClaims(state).find((item) => item.assetId === business.sourceAssetId || item.assetId === business.id);
    if (!claim) {
      return {
        label: "Sin influencia",
        stage: "none",
        influence: 0,
        demand: 1,
        cost: 1,
        valuation: 1
      };
    }
    return {
      label: claim.stageLabel,
      stage: claim.stage,
      influence: Number(claim.influence) || 0,
      assetId: claim.assetId,
      ticker: claim.ticker || "",
      demand: claim.businessDemand,
      cost: claim.businessCost,
      valuation: claim.businessValuation
    };
  }

  function createInitialStrategy(options) {
    const settings = isObject(options) ? options : {};
    return normalizeStrategy({ scenario: normalizeScenario(settings.scenario) });
  }

  function ensureStrategy(state) {
    if (!state) return normalizeStrategy(null);
    if (
      isObject(state.strategy) &&
      Array.isArray(state.strategy.watchlist) &&
      Array.isArray(state.strategy.activeHedges) &&
      isObject(state.strategy.contracts) &&
      Array.isArray(state.strategy.contracts.items) &&
      Array.isArray(state.strategy.contracts.completedIds) &&
      Array.isArray(state.strategy.contracts.rewardedIds) &&
      isObject(state.strategy.prestige) &&
      Array.isArray(state.strategy.prestige.runs) &&
      Array.isArray(state.strategy.takeoverClaims)
    ) {
      return state.strategy;
    }
    state.strategy = normalizeStrategy(state.strategy);
    return state.strategy;
  }

  function getPlayerModule() {
    return window.CashEmpirePlayer || null;
  }

  function getBankModule() {
    return window.CashEmpireBank || null;
  }

  function getPortfolioPositions(state) {
    const player = getPlayerModule();
    if (!state || !player || typeof player.getDecoratedPositions !== "function") return [];
    return player.getDecoratedPositions(state.portfolio, state.assets);
  }

  function getCashflowSummary(state, daysBack) {
    const player = getPlayerModule();
    const startDay = Math.max(1, (state.time && state.time.day ? state.time.day : 1) - daysBack + 1);
    if (player && typeof player.summarizeCashflows === "function") {
      return player.summarizeCashflows(state.cashflows, { startDay });
    }

    const flows = Array.isArray(state.cashflows) ? state.cashflows : [];
    return flows
      .filter((item) => (Number(item.day) || 0) >= startDay)
      .reduce((summary, item) => {
        const amount = Number(item.amount) || 0;
        const channel = typeof item.channel === "string" ? item.channel : "operating";
        summary.count += 1;
        summary.net += amount;
        summary[channel] = (summary[channel] || 0) + amount;
        return summary;
      }, { count: 0, net: 0, operating: 0, financing: 0, investing: 0, internal: 0, windfall: 0 });
  }

  function getContractMetrics(state) {
    const positions = getPortfolioPositions(state);
    const strategyState = ensureStrategy(state);
    const categories = new Set(positions.map((position) => position.asset && position.asset.type).filter(Boolean));
    const businesses = Array.isArray(state.businesses) ? state.businesses : [];
    const netWorth = Math.max(1, Number(state.player && state.player.netWorth) || Number(state.player && state.player.cash) || 1);
    const cash = Math.max(0, Number(state.player && state.player.cash) || 0);
    const unread = Array.isArray(state.events) ? state.events.filter((item) => !item.read).length : 0;
    const riskScore = getRiskProfile(state).score;
    const debtCount = Array.isArray(state.debts)
      ? state.debts.filter((debt) => debt && (Number(debt.balance) || 0) > 0).length
      : 0;
    const investedValue = Math.max(0, netWorth - cash);
    const cashRatio = cash / netWorth;
    const investedRatio = investedValue / netWorth;
    const businessStress = businesses.some((business) => {
      const pnl = Number(business.monthlyPnl && business.monthlyPnl.cashFlow) || 0;
      const morale = Number(business.morale) || 0;
      const coverage = Number(business.monthlyPnl && business.monthlyPnl.supplyCoverageMonths);
      return pnl < -1000 || morale < 0.42 || (Number.isFinite(coverage) && coverage < 0.75);
    });

    return {
      positions,
      businesses,
      categories,
      netWorth,
      cash,
      unread,
      riskScore,
      debtCount,
      cashRatio,
      investedRatio,
      watchlistCount: strategyState.watchlist.length,
      hasBusiness: businesses.length > 0,
      hasHedge: strategyState.activeHedges.length > 0,
      businessStress
    };
  }

  function getRecentDecisionSummary(state, daysBack) {
    const currentDay = state && state.time && state.time.day ? state.time.day : 1;
    const startDay = Math.max(1, currentDay - Math.max(1, Math.floor(Number(daysBack) || 7)) + 1);
    const strategyState = ensureStrategy(state);
    const transactionCount = Array.isArray(state.transactions)
      ? state.transactions.filter((item) => item && (Number(item.day) || 0) >= startDay).length
      : 0;
    const hedgeCount = strategyState.activeHedges.filter((hedge) => (Number(hedge.createdDay) || 0) >= startDay).length;
    const newBusinessCount = Array.isArray(state.businesses)
      ? state.businesses.filter((business) => (Number(business.createdDay) || 0) >= startDay).length
      : 0;
    return {
      transactionCount,
      hedgeCount,
      newBusinessCount,
      activeDecisions: transactionCount + hedgeCount + newBusinessCount
    };
  }

  function getRiskProfile(state) {
    if (!state || !state.player) {
      return { score: 0, label: "Sin datos", severity: "info", drivers: [], alerts: [] };
    }

    const bank = getBankModule();
    const positions = getPortfolioPositions(state);
    const netWorth = Math.max(1, Number(state.player.netWorth) || Number(state.player.cash) || 1);
    const cash = Math.max(0, Number(state.player.cash) || 0);
    const cashRatio = cash / netWorth;
    const debtTotal = bank && typeof bank.getBankSummary === "function"
      ? Number(bank.getBankSummary(state).debtTotal) || 0
      : (Array.isArray(state.debts) ? state.debts.reduce((sum, debt) => sum + (Number(debt.balance) || 0), 0) : 0);
    const debtRatio = debtTotal / netWorth;
    const allocationMap = positions.reduce((map, position) => {
      const key = position.asset && position.asset.type ? position.asset.type : "other";
      map[key] = (map[key] || 0) + (Number(position.value) || 0);
      return map;
    }, {});
    const maxAllocation = Object.values(allocationMap).reduce((max, value) => Math.max(max, value / netWorth), 0);
    const weightedVolatility = positions.reduce((sum, position) => {
      const weight = (Number(position.value) || 0) / netWorth;
      return sum + weight * (Number(position.asset && position.asset.volatility) || 0);
    }, 0);
    const cashflow30 = getCashflowSummary(state, 30).operating || 0;
    const unreadCritical = Array.isArray(state.events) && state.events.some((item) => !item.read && item.severity === "critical");
    const drivers = [];
    const alerts = [];
    let score = 12;

    if (cashRatio < 0.05) {
      score += 30;
      drivers.push("Liquidez critica");
      alerts.push({ severity: "critical", text: "Liquidez critica: cubre caja antes de avanzar tiempo.", view: "bank", actionLabel: "Ver banco" });
    } else if (cashRatio < 0.1) {
      score += 16;
      drivers.push("Liquidez ajustada");
      alerts.push({ severity: "warning", text: "Liquidez ajustada: deja mas efectivo para shocks.", view: "dashboard", actionLabel: "Ver radar" });
    }

    if (debtRatio > 0.42) {
      score += 26;
      drivers.push("Apalancamiento alto");
      alerts.push({ severity: "warning", text: "Deuda elevada: reduce cuotas o refinancia.", view: "bank", actionLabel: "Gestionar deuda" });
    } else if (debtRatio > 0.25) {
      score += 12;
      drivers.push("Deuda moderada");
    }

    if (maxAllocation > 0.58) {
      score += 18;
      drivers.push("Concentracion");
      alerts.push({ severity: "warning", text: "Concentracion alta: vigila o diversifica ese rubro.", view: "market", actionLabel: "Abrir mercado" });
    }

    if (weightedVolatility > 0.58) {
      score += 12;
      drivers.push("Volatilidad");
    }

    if (cashflow30 < 0) {
      score += Math.min(20, Math.abs(cashflow30) / Math.max(1000, netWorth) * 280);
      drivers.push("Cashflow negativo");
      alerts.push({ severity: "warning", text: "Cashflow operativo negativo: revisa empresas, deuda e ingresos.", view: "business", actionLabel: "Ver empresas" });
    }

    if (state.macro && state.macro.phase === "recession") {
      score += 10;
      drivers.push("Recesion");
    }

    if (unreadCritical) {
      score += 10;
      drivers.push("Noticias criticas");
      alerts.push({ severity: "critical", text: "Hay una noticia critica sin leer antes del siguiente turno.", view: "news", actionLabel: "Leer noticia" });
    }

    const finalScore = Math.round(clamp(score, 0, 100));
    const label = finalScore >= 72 ? "Critico" : finalScore >= 50 ? "Tenso" : finalScore >= 28 ? "Moderado" : "Controlado";
    const severity = finalScore >= 72 ? "critical" : finalScore >= 50 ? "warning" : "info";

    return {
      score: finalScore,
      label,
      severity,
      cashRatio,
      debtRatio,
      maxAllocation,
      weightedVolatility,
      drivers: drivers.length ? drivers.slice(0, 5) : ["Sin presion relevante"],
      alerts
    };
  }

  function getCashflowDiagnosis(state) {
    const summary = getCashflowSummary(state, 30);
    const businesses = Array.isArray(state.businesses) ? state.businesses : [];
    const weakBusinesses = businesses
      .filter((business) => Number(business.monthlyPnl && business.monthlyPnl.cashFlow) < 0)
      .sort((a, b) => (Number(a.monthlyPnl.cashFlow) || 0) - (Number(b.monthlyPnl.cashFlow) || 0));
    const drivers = [];

    if ((summary.operating || 0) < 0) {
      drivers.push(`Operacion ${formatShortMoney(summary.operating)}`);
    }
    if ((summary.financing || 0) < 0) {
      drivers.push(`Deuda ${formatShortMoney(summary.financing)}`);
    }
    if ((summary.investing || 0) < 0) {
      drivers.push(`Inversion ${formatShortMoney(summary.investing)}`);
    }
    if (weakBusinesses[0]) {
      drivers.push(`${weakBusinesses[0].name} quema caja`);
    }

    const headline = (summary.operating || 0) >= 0
      ? `Operacion positiva 30d: ${formatShortMoney(summary.operating)}.`
      : `Operacion negativa 30d: ${formatShortMoney(summary.operating)}.`;
    const action = (summary.operating || 0) < 0
      ? "Prioriza deuda, inventario y empresas con margen negativo antes de acelerar."
      : "Puedes reinvertir, pero manteniendo una reserva de caja.";

    return {
      summary,
      headline,
      action,
      drivers: drivers.slice(0, 4)
    };
  }

  function getAdvisorTips(state) {
    const risk = getRiskProfile(state);
    const cashflow = getCashflowDiagnosis(state);
    const positions = getPortfolioPositions(state);
    const businesses = Array.isArray(state.businesses) ? state.businesses : [];
    const unreadNews = Array.isArray(state.events) ? state.events.filter((item) => !item.read).length : 0;
    const tips = [];

    tips.push({
      role: "CFO",
      title: risk.score >= 50 ? "Turno defensivo" : "Caja lista para asignar",
      body: risk.score >= 50
        ? `Riesgo ${risk.label.toLowerCase()}: ${risk.drivers.slice(0, 2).join(", ")}.`
        : "El balance permite tomar riesgo medido o reforzar ingresos.",
      actionLabel: risk.score >= 50 ? "Reducir riesgo" : "Buscar activos",
      view: risk.score >= 50 ? "bank" : "market",
      severity: risk.severity
    });

    tips.push({
      role: "Analista macro",
      title: state.macro ? state.macro.phaseLabel || "Ciclo macro" : "Ciclo macro",
      body: unreadNews > 0
        ? `${unreadNews} noticias pendientes pueden cambiar precios y demanda.`
        : "Sin titulares pendientes: puedes avanzar tiempo con mayor lectura del riesgo.",
      actionLabel: unreadNews > 0 ? "Leer noticias" : "Avanzar 7d",
      view: unreadNews > 0 ? "news" : "dashboard",
      severity: unreadNews > 0 ? "warning" : "info"
    });

    tips.push({
      role: "Operaciones",
      title: businesses.length ? "Sinergias operativas" : "Primer motor operativo",
      body: businesses.length
        ? getSynergySummary(state)
        : "Una empresa abre P&L, inventario, empleados y contratos de mayor valor.",
      actionLabel: businesses.length ? "Ver empresas" : "Fundar empresa",
      view: "business",
      severity: "info"
    });

    tips.push({
      role: "Riesgo",
      title: "Coberturas y vigilancia",
      body: positions.length
        ? "Usa vigilancia para comparar activos y coberturas para soportar shocks grandes."
        : "Marca activos en vigilancia para construir una lista de compras antes de gastar caja.",
      actionLabel: positions.length ? "Ver coberturas" : "Vigilar activos",
      view: positions.length ? "bank" : "market",
      severity: risk.score >= 72 ? "critical" : "info"
    });

    if (cashflow.drivers.length) {
      tips[0].body = `${tips[0].body} ${cashflow.drivers[0]}.`;
    }

    return tips;
  }

  function getWeek(state) {
    const day = state && state.time ? toDay(state.time.day) : 1;
    return Math.floor((day - 1) / 7) + 1;
  }

  function makeContract(state, kind, week, index) {
    const metrics = getContractMetrics(state);
    const netWorth = metrics.netWorth;
    const difficulty = state && state.player && state.player.difficulty ? state.player.difficulty : "normal";
    const difficultyRewardMultiplier = {
      facil: 0.92,
      normal: 1,
      dificil: 1.08,
      pesadilla: 1.16
    }[difficulty] || 1;
    const recent = getRecentDecisionSummary(state, 7);
    const scaledReward = 90 + Math.sqrt(netWorth) * 0.08 + week * 2.5 + index * 55;
    const rewardCap = Math.max(320, netWorth * 0.0008);
    const baseReward = Math.round(Math.min(rewardCap, scaledReward) * difficultyRewardMultiplier);
    const basePower = index === 0 ? 2 : 1;
    const map = {
      first_buy: {
        title: "Ejecuta una compra",
        body: "Compra cualquier activo para mantener el ciclo de decisiones vivo.",
        target: 1
      },
      watchlist: {
        title: "Arma vigilancia",
        body: "Marca 3 activos en vigilancia para comparar oportunidades.",
        target: Math.min(6, Math.max(3, metrics.watchlistCount + 2))
      },
      diversify: {
        title: "Diversifica rubros",
        body: "Mantiene exposicion en 3 categorias de activos.",
        target: Math.min(4, Math.max(3, metrics.categories.size + 1))
      },
      cash_guard: {
        title: "Reserva de caja",
        body: "Conserva al menos 8% del patrimonio en efectivo.",
        target: Math.min(16, Math.max(8, Math.ceil(metrics.cashRatio * 100) + 4))
      },
      risk_guard: {
        title: "Riesgo bajo control",
        body: "Cierra el turno con radar de riesgo en 55 o menos.",
        target: Math.max(26, Math.min(55, Math.floor(metrics.riskScore - 8)))
      },
      read_news: {
        title: "Mesa informada",
        body: "No dejes noticias sin leer antes de avanzar.",
        target: 1
      },
      business_health: {
        title: "Operacion sana",
        body: "Mantiene empresas sin alerta de caja critica o falta de insumos.",
        target: 1
      },
      hedge: {
        title: "Compra una cobertura",
        body: "Activa cualquier seguro o cobertura defensiva.",
        target: 1
      }
    };
    const template = map[kind] || map.cash_guard;
    let rewardMultiplier = CONTRACT_REWARD_MULTIPLIERS[kind] || 0.5;
    let rewardPower = basePower;

    if (PASSIVE_CONTRACTS.has(kind) && recent.activeDecisions === 0) {
      const hasEconomicExposure = metrics.positions.length > 0 || metrics.hasBusiness || metrics.debtCount > 0;
      rewardMultiplier = hasEconomicExposure ? rewardMultiplier * 0.7 : 0;
      rewardPower = Math.max(1, rewardPower - 1);
    } else if (SUPPORT_CONTRACTS.has(kind) && recent.activeDecisions === 0) {
      rewardMultiplier *= metrics.positions.length > 0 || metrics.hasBusiness ? 1 : 0.45;
    }

    const rewardCash = Math.max(0, Math.round(baseReward * rewardMultiplier));

    return {
      id: `w${week}_${kind}`,
      kind,
      title: template.title,
      body: template.body,
      target: template.target,
      progress: 0,
      rewardCash,
      rewardPower,
      done: false
    };
  }

  function isContractAllowed(state, kind, metrics) {
    switch (kind) {
      case "first_buy":
        return metrics.positions.length === 0;
      case "watchlist":
        return metrics.watchlistCount < 6;
      case "diversify":
        return metrics.positions.length > 0 && metrics.categories.size < 4;
      case "cash_guard":
        return metrics.positions.length > 0 && metrics.investedRatio > 0.18 && metrics.cashRatio < 0.16;
      case "risk_guard":
        return (metrics.positions.length > 0 || metrics.debtCount > 0 || metrics.hasBusiness) && metrics.riskScore > 38;
      case "read_news":
        return metrics.unread > 0 && (metrics.positions.length > 0 || metrics.hasBusiness);
      case "business_health":
        return metrics.hasBusiness && metrics.businessStress;
      case "hedge":
        return (metrics.positions.length > 0 || metrics.hasBusiness) && !metrics.hasHedge && metrics.cash >= 350;
      default:
        return false;
    }
  }

  function pushUniqueContractKind(selected, kind, state, metrics) {
    if (!kind || selected.includes(kind) || !isContractAllowed(state, kind, metrics)) return;
    selected.push(kind);
  }

  function generateWeeklyContracts(state) {
    const week = getWeek(state);
    const metrics = getContractMetrics(state);
    const selected = [];

    pushUniqueContractKind(selected, metrics.positions.length ? "diversify" : "first_buy", state, metrics);
    pushUniqueContractKind(selected, metrics.watchlistCount < 3 ? "watchlist" : metrics.unread > 0 ? "read_news" : "risk_guard", state, metrics);
    pushUniqueContractKind(selected, metrics.hasBusiness ? "business_health" : metrics.hasHedge ? "risk_guard" : "hedge", state, metrics);

    const extraKind = CONTRACT_ROTATION[week % CONTRACT_ROTATION.length];
    pushUniqueContractKind(selected, extraKind, state, metrics);

    [
      "first_buy",
      "diversify",
      "watchlist",
      "hedge",
      "business_health",
      "risk_guard",
      "cash_guard",
      "read_news"
    ].forEach((kind) => {
      if (selected.length >= 3) return;
      pushUniqueContractKind(selected, kind, state, metrics);
    });

    return selected.map((kind, index) => makeContract(state, kind, week, index));
  }

  function getContractProgress(state, contract) {
    const metrics = getContractMetrics(state);
    const strategy = ensureStrategy(state);

    switch (contract.kind) {
      case "first_buy":
        return metrics.positions.length > 0 ? 1 : 0;
      case "watchlist":
        return Math.min(contract.target, strategy.watchlist.length);
      case "diversify":
        return Math.min(contract.target, metrics.categories.size);
      case "cash_guard":
        return Math.min(contract.target, Math.round(metrics.cashRatio * 100));
      case "risk_guard":
        return Math.max(0, contract.target - Math.max(0, getRiskProfile(state).score - contract.target));
      case "read_news":
        return metrics.unread === 0 ? 1 : 0;
      case "business_health":
        return metrics.hasBusiness && !metrics.businessStress ? 1 : 0;
      case "hedge":
        return strategy.activeHedges.length > 0 ? 1 : 0;
      default:
        return 0;
    }
  }

  function refreshContracts(state) {
    const strategy = ensureStrategy(state);
    const week = getWeek(state);
    if (strategy.contracts.week !== week || strategy.contracts.items.length === 0) {
      strategy.contracts.week = week;
      strategy.contracts.items = generateWeeklyContracts(state);
    }

    strategy.contracts.items = strategy.contracts.items.map((contract) => {
      const progress = getContractProgress(state, contract);
      return {
        ...contract,
        progress,
        done: progress >= contract.target
      };
    });

    strategy.contracts.completedIds = Array.from(new Set(strategy.contracts.completedIds.concat(
      strategy.contracts.items.filter((item) => item.done).map((item) => item.id)
    ))).slice(-60);

    return strategy.contracts;
  }

  function evaluateContracts(state) {
    const strategy = ensureStrategy(state);
    const contracts = refreshContracts(state);
    const rewarded = new Set(strategy.contracts.rewardedIds);
    const rewards = [];
    const player = getPlayerModule();

    contracts.items.forEach((contract) => {
      if (!contract.done || rewarded.has(contract.id)) return;
      rewarded.add(contract.id);
      state.player.cash = roundMoney((Number(state.player.cash) || 0) + contract.rewardCash);
      strategy.cityPower = Math.max(0, Math.floor((strategy.cityPower || 0) + contract.rewardPower));
      if (player && typeof player.appendCashflow === "function") {
        player.appendCashflow(state, {
          type: "strategy_contract",
          scope: "player",
          label: contract.title,
          amount: contract.rewardCash,
          channel: "windfall"
        });
      }
      rewards.push(contract);
    });

    strategy.contracts.rewardedIds = Array.from(rewarded).slice(-60);
    return rewards;
  }

  function expireHedges(state) {
    const strategy = ensureStrategy(state);
    const day = state.time && state.time.day ? state.time.day : 1;
    const before = strategy.activeHedges.length;
    strategy.activeHedges = strategy.activeHedges.filter((hedge) => hedge.endDay >= day);
    return before - strategy.activeHedges.length;
  }

  function processDay(state) {
    expireHedges(state);
    return evaluateContracts(state);
  }

  function getCityPerks(state) {
    const strategy = ensureStrategy(state);
    const prestigePoints = Number(strategy.prestige && strategy.prestige.points) || 0;
    const netWorth = Math.max(0, Number(state.player && state.player.netWorth) || 0);
    const milestonePower = Math.min(18, Math.floor(Math.log10(Math.max(1, netWorth / 10000)) * 4));
    const takeoverPower = getTakeoverClaims(state).reduce((sum, claim) => sum + (Number(claim.power) || 0), 0);
    const power = Math.max(0, strategy.cityPower + prestigePoints * 8 + takeoverPower + milestonePower);
    const tradeFeeModifier = clamp(1 - Math.min(0.22, power * 0.003), 0.78, 1);
    const loanRateModifier = clamp(1 - Math.min(0.16, power * 0.0025), 0.84, 1);
    const hedgeCostModifier = clamp(1 - Math.min(0.18, power * 0.002), 0.82, 1);

    return {
      power,
      tradeFeeModifier,
      loanRateModifier,
      hedgeCostModifier,
      labels: [
        power >= 10 ? "Mesa de brokers" : "Distrito base",
        power >= 24 ? "Banca preferente" : "Banca retail",
        power >= 40 ? "Red corporativa" : "Red local"
      ]
    };
  }

  function getTradeFeeModifier(state) {
    return getCityPerks(state).tradeFeeModifier;
  }

  function getLoanRateModifier(state) {
    let modifier = getCityPerks(state).loanRateModifier;
    if (hasActiveHedge(state, "rate_lock")) modifier *= 0.88;
    return clamp(modifier, 0.72, 1);
  }

  function getHedgeCatalog(state) {
    const strategy = ensureStrategy(state);
    const perks = getCityPerks(state);
    const netWorth = Math.max(1000, Number(state.player && state.player.netWorth) || Number(state.player && state.player.cash) || 1000);
    const active = new Set(strategy.activeHedges.map((hedge) => hedge.id));

    return Object.values(HEDGE_DEFS).map((def) => ({
      ...def,
      active: active.has(def.id),
      cost: roundMoney(Math.max(def.minCost, netWorth * def.ratio) * perks.hedgeCostModifier)
    }));
  }

  function hasActiveHedge(state, hedgeId) {
    const strategy = ensureStrategy(state);
    const day = state.time && state.time.day ? state.time.day : 1;
    return strategy.activeHedges.some((hedge) => hedge.id === hedgeId && hedge.endDay >= day);
  }

  function buyHedge(state, hedgeId) {
    const strategy = ensureStrategy(state);
    const def = HEDGE_DEFS[hedgeId];
    if (!def) return { ok: false, message: "Cobertura no disponible." };
    const catalogItem = getHedgeCatalog(state).find((item) => item.id === hedgeId);
    const cost = catalogItem ? catalogItem.cost : def.minCost;

    if (hasActiveHedge(state, hedgeId)) {
      return { ok: false, message: "Esa cobertura ya esta activa." };
    }
    if ((Number(state.player.cash) || 0) < cost) {
      return { ok: false, message: "Efectivo insuficiente para contratar la cobertura." };
    }

    state.player.cash = roundMoney((Number(state.player.cash) || 0) - cost);
    const day = state.time && state.time.day ? state.time.day : 1;
    strategy.activeHedges.push({
      id: hedgeId,
      label: def.label,
      type: def.type,
      cost,
      createdDay: day,
      endDay: day + def.days,
      source: "player"
    });

    const player = getPlayerModule();
    if (player && typeof player.appendCashflow === "function") {
      player.appendCashflow(state, {
        type: "hedge_cost",
        scope: "player",
        label: def.label,
        amount: -cost,
        channel: "operating"
      });
    }

    return { ok: true, message: `${def.label} activa hasta el dia ${day + def.days}.`, hedge: def, cost };
  }

  function adjustNegative(value, multiplier) {
    const number = Number(value) || 0;
    return number < 0 ? number * multiplier : number;
  }

  function adjustEventEffect(state, eventDefinition, rawEffect) {
    const effect = { ...(rawEffect || {}) };
    const type = effect.type || (eventDefinition && eventDefinition.type) || "all";

    if (hasActiveHedge(state, "portfolio_guard")) {
      effect.delta = adjustNegative(effect.delta, 0.65);
      effect.ongoingTypeDelta = adjustNegative(effect.ongoingTypeDelta, 0.72);
      effect.ongoingSectorDelta = adjustNegative(effect.ongoingSectorDelta, 0.72);
    }

    if (hasActiveHedge(state, "property_insurance") && (type === "real_estate" || effect.propertyOccupancyDelta)) {
      effect.delta = adjustNegative(effect.delta, 0.58);
      effect.propertyOccupancyDelta = adjustNegative(effect.propertyOccupancyDelta, 0.55);
      effect.playerCashRatio = adjustNegative(effect.playerCashRatio, 0.8);
    }

    if (hasActiveHedge(state, "rate_lock")) {
      if ((Number(effect.ongoingInterestRate) || 0) > 0) effect.ongoingInterestRate *= 0.55;
      if ((Number(effect.interestRate) || 0) > 0) effect.interestRate *= 0.55;
    }

    if (hasActiveHedge(state, "cyber_security")) {
      effect.playerCashRatio = adjustNegative(effect.playerCashRatio, 0.5);
      if ((Number(effect.businessCostDelta) || 0) > 0) effect.businessCostDelta *= 0.72;
      if ((Number(effect.businessSupplierDelta) || 0) > 0) effect.businessSupplierDelta *= 0.78;
    }

    return effect;
  }

  function adjustEventImpact(state, summary) {
    if (!summary) return summary;

    if (hasActiveHedge(state, "portfolio_guard")) {
      summary.globalAssetDelta = adjustNegative(summary.globalAssetDelta, 0.72);
      Object.keys(summary.typeDeltas || {}).forEach((key) => {
        summary.typeDeltas[key] = adjustNegative(summary.typeDeltas[key], 0.72);
      });
      Object.keys(summary.sectorDeltas || {}).forEach((key) => {
        summary.sectorDeltas[key] = adjustNegative(summary.sectorDeltas[key], 0.76);
      });
    }

    if (hasActiveHedge(state, "property_insurance")) {
      if (summary.typeDeltas && summary.typeDeltas.real_estate < 0) {
        summary.typeDeltas.real_estate *= 0.55;
      }
      if (summary.properties && summary.properties.occupancyDelta < 0) {
        summary.properties.occupancyDelta *= 0.58;
      }
    }

    if (hasActiveHedge(state, "rate_lock") && summary.interestRateDelta > 0) {
      summary.interestRateDelta *= 0.55;
    }

    if (hasActiveHedge(state, "cyber_security") && summary.business) {
      if (summary.business.costDelta > 0) summary.business.costDelta *= 0.76;
      if (summary.business.supplierDelta > 0) summary.business.supplierDelta *= 0.8;
    }

    return summary;
  }

  function toggleWatchlist(state, assetId) {
    const strategy = ensureStrategy(state);
    if (!state.assets || !state.assets[assetId]) return { ok: false, message: "Activo no disponible." };
    const index = strategy.watchlist.indexOf(assetId);
    if (index >= 0) {
      strategy.watchlist.splice(index, 1);
      return { ok: true, watched: false, message: "Activo retirado de vigilancia." };
    }
    strategy.watchlist.unshift(assetId);
    strategy.watchlist = normalizeWatchlist(strategy.watchlist);
    return { ok: true, watched: true, message: "Activo agregado a vigilancia." };
  }

  function isWatched(state, assetId) {
    return ensureStrategy(state).watchlist.includes(assetId);
  }

  function getWatchlistAssets(state) {
    const strategy = ensureStrategy(state);
    return strategy.watchlist
      .map((assetId) => state.assets && state.assets[assetId])
      .filter(Boolean);
  }

  function getSynergySummary(state) {
    const businesses = Array.isArray(state.businesses) ? state.businesses : [];
    const sectors = new Set(businesses.map((business) => business.sector));
    const labels = [];
    if (sectors.has("logistics")) labels.push("logistica baja costos");
    if (sectors.has("software")) labels.push("software eleva productividad");
    if (sectors.has("services")) labels.push("servicios mejora demanda");
    if (sectors.has("hospitality")) labels.push("hoteleria conecta bienes");
    return labels.length ? labels.slice(0, 2).join(" + ") : "Aun no hay red de sectores complementarios.";
  }

  function getBusinessSynergy(state, business) {
    const businesses = Array.isArray(state.businesses) ? state.businesses : [];
    const sectors = new Set(businesses.filter((item) => item.id !== business.id).map((item) => item.sector));
    const result = { demand: 1, cost: 1, valuation: 1, label: "" };
    const labels = [];

    if (sectors.has("logistics") && !["logistics", "software"].includes(business.sector)) {
      result.cost *= 0.96;
      labels.push("logistica");
    }
    if (sectors.has("software") && business.sector !== "software") {
      result.demand *= 1.035;
      result.valuation *= 1.025;
      labels.push("software");
    }
    if (sectors.has("services") && ["retail", "food", "hospitality"].includes(business.sector)) {
      result.demand *= 1.025;
      labels.push("servicios");
    }
    if (sectors.has("hospitality") && business.sector === "food") {
      result.demand *= 1.025;
      labels.push("hoteleria");
    }

    result.label = labels.join(" + ");
    return result;
  }

  function applyScenarioStart(state) {
    const strategy = ensureStrategy(state);
    if (strategy.scenarioApplied) return null;
    const scenario = SCENARIOS[strategy.scenario] || SCENARIOS.free;
    const day = state.time && state.time.day ? state.time.day : 1;
    strategy.scenarioApplied = true;

    if (state.macro && scenario.macro) {
      Object.keys(scenario.macro).forEach((key) => {
        state.macro[key] = (Number(state.macro[key]) || 0) + scenario.macro[key];
      });
      if (typeof state.macro.sentiment === "number") state.macro.sentiment = clamp(state.macro.sentiment, -1, 1);
      if (typeof state.macro.consumerConfidence === "number") state.macro.consumerConfidence = clamp(state.macro.consumerConfidence, 0, 100);
    }

    if (state.assets && scenario.id !== "free") {
      Object.values(state.assets).forEach((asset) => {
        if (!asset) return;
        let delta = 0;
        if (scenario.id === "ai_boom" && ["software", "technology", "tech"].includes(asset.sector)) delta = 0.075;
        if (scenario.id === "ai_boom" && asset.type === "business" && ["software", "services"].includes(asset.sector)) delta = 0.045;
        if (scenario.id === "oil_shock" && asset.type === "commodity") delta = 0.06;
        if (scenario.id === "oil_shock" && ["retail", "food", "logistics"].includes(asset.sector)) delta = -0.035;
        if (scenario.id === "crisis" && ["crypto", "collectible", "business"].includes(asset.type)) delta = -0.065;
        if (scenario.id === "crisis" && asset.type === "bond") delta = 0.024;
        if (!delta) return;
        const previous = Math.max(0.01, Number(asset.simPrice) || Number(asset.seedPrice) || 1);
        asset.previousSimPrice = previous;
        asset.simPrice = roundMoney(Math.max(0.01, previous * (1 + delta)));
        asset.dailyChangePercent = delta;
        asset.lastDelta = delta;
        asset.lastMoveReason = `Escenario: ${scenario.label}`;
        asset.history = Array.isArray(asset.history)
          ? asset.history.concat({ day, price: asset.simPrice }).slice(-90)
          : [{ day: 1, price: asset.simPrice }];
      });
    }

    if (Array.isArray(scenario.effects) && scenario.effects.length) {
      state.eventEffects = Array.isArray(state.eventEffects) ? state.eventEffects : [];
      scenario.effects.forEach((effect, index) => {
        state.eventEffects.push(buildScenarioEffect(day, scenario, effect, index, state.player && state.player.difficulty));
      });
    }

    state.events = Array.isArray(state.events) ? state.events : [];
    state.events.push({
      id: `scenario_${scenario.id}_${day}`,
      day,
      level: "macro",
      title: `Escenario inicial: ${scenario.label}`,
      summary: scenario.body,
      severity: scenario.id === "free" ? "info" : "opportunity",
      sourceId: `scenario_${scenario.id}`,
      affected: [],
      businessImpacts: [],
      businessImpactDetails: [],
      delta: 0,
      duration: Array.isArray(scenario.effects) ? scenario.effects.reduce((max, item) => Math.max(max, Number(item.duration) || 0), 0) : 0,
      read: false
    });

    return scenario;
  }

  function getScenarioMeta(id) {
    return SCENARIOS[normalizeScenario(id)];
  }

  function getPrestigeStatus(state) {
    const strategy = ensureStrategy(state);
    const netWorth = Math.max(0, Number(state.player && state.player.netWorth) || 0);
    const threshold = 1000000;
    const day = state.time && state.time.day ? state.time.day : 1;
    const cooldownReady = day - (strategy.prestige.lastClaimDay || 0) >= 120 || strategy.prestige.lastClaimDay === 0;
    const available = netWorth >= threshold && cooldownReady;
    const projectedPoints = available ? Math.max(1, Math.floor(Math.log10(netWorth / threshold + 1) * 4)) : 0;

    return {
      threshold,
      available,
      cooldownReady,
      projectedPoints,
      points: strategy.prestige.points,
      bestNetWorth: Math.max(strategy.prestige.bestNetWorth, netWorth),
      nextText: available
        ? `${projectedPoints} puntos de legado listos`
        : cooldownReady
          ? `Meta de legado: ${formatShortMoney(threshold)}`
          : `Disponible en ${120 - (day - strategy.prestige.lastClaimDay)} dias`
    };
  }

  function claimPrestige(state) {
    const strategy = ensureStrategy(state);
    const status = getPrestigeStatus(state);
    if (!status.available) return { ok: false, message: "Aun no hay un ciclo de legado disponible." };
    const netWorth = Math.max(0, Number(state.player && state.player.netWorth) || 0);
    const day = state.time && state.time.day ? state.time.day : 1;
    strategy.prestige.points += status.projectedPoints;
    strategy.prestige.bestNetWorth = Math.max(strategy.prestige.bestNetWorth, netWorth);
    strategy.prestige.lastClaimDay = day;
    strategy.prestige.runs.push({
      day,
      netWorth: roundMoney(netWorth),
      points: status.projectedPoints,
      scenario: strategy.scenario
    });
    strategy.prestige.runs = strategy.prestige.runs.slice(-8);
    strategy.cityPower += status.projectedPoints * 2;
    return { ok: true, message: `Legado reclamado: +${status.projectedPoints} puntos permanentes.`, points: status.projectedPoints };
  }

  function getTakeoverOpportunities(state) {
    const strategy = ensureStrategy(state);
    const claimed = new Set(strategy.takeoverClaims.map((item) => item.assetId));
    const netWorth = Math.max(1, Number(state.player && state.player.netWorth) || 1);
    return getPortfolioPositions(state)
      .filter((position) => position.asset && ["stock", "business"].includes(position.asset.type) && !claimed.has(position.assetId))
      .map((position) => {
        const value = Number(position.value) || 0;
        const influence = Math.round(clamp(value / netWorth * 320 + strategy.cityPower * 0.35, 0, 100));
        const cost = roundMoney(Math.max(500, value * 0.015));
        const stage = getTakeoverStage(influence);
        return {
          assetId: position.assetId,
          label: position.asset.name,
          ticker: position.asset.ticker || "",
          assetType: position.asset.type,
          value,
          influence,
          cost,
          stageLabel: stage.label,
          ready: value >= Math.max(25000, netWorth * 0.05) && influence >= 18
        };
      })
      .filter((item) => item.influence >= 8)
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 5);
  }

  function claimTakeover(state, assetId) {
    const strategy = ensureStrategy(state);
    const opportunity = getTakeoverOpportunities(state).find((item) => item.assetId === assetId);
    if (!opportunity) return { ok: false, message: "No hay oportunidad corporativa para ese activo." };
    if (!opportunity.ready) return { ok: false, message: "Aumenta posicion o poder de ciudad antes de intentar la OPA." };
    if ((Number(state.player.cash) || 0) < opportunity.cost) return { ok: false, message: "Efectivo insuficiente para asesoria y due diligence." };

    const stage = getTakeoverStage(opportunity.influence);
    state.player.cash = roundMoney((Number(state.player.cash) || 0) - opportunity.cost);
    strategy.cityPower += Math.max(1, Math.floor(stage.power / 2));
    strategy.takeoverClaims.push({
      assetId,
      label: opportunity.label,
      ticker: opportunity.ticker,
      assetType: opportunity.assetType,
      day: state.time && state.time.day ? state.time.day : 1,
      influence: opportunity.influence,
      stage: stage.id,
      power: stage.power
    });

    const player = getPlayerModule();
    if (player && typeof player.appendCashflow === "function") {
      player.appendCashflow(state, {
        type: "takeover_cost",
        scope: "player",
        label: `OPA blanda ${opportunity.label}`,
        amount: -opportunity.cost,
        channel: "investing"
      });
    }

    return { ok: true, message: `OPA blanda completada en ${opportunity.label}: acceso de ${stage.label.toLowerCase()} y beneficios permanentes.`, opportunity, stage };
  }

  function getAdvanceWarning(state, days) {
    const totalDays = Math.max(1, Math.floor(Number(days) || 1));
    if (totalDays < 30) return "";
    const risk = getRiskProfile(state);
    const unreadCritical = Array.isArray(state.events) && state.events.some((item) => !item.read && item.severity === "critical");
    const hedgeExpiring = ensureStrategy(state).activeHedges.some((hedge) => hedge.endDay <= ((state.time && state.time.day) || 1) + totalDays);
    if (risk.score >= 55 || unreadCritical || hedgeExpiring) {
      return `Vas a avanzar ${totalDays} dias con riesgo ${risk.label.toLowerCase()}. Revisa ${risk.drivers.slice(0, 2).join(", ")} antes de confirmar.`;
    }
    return "";
  }

  window.CashEmpireStrategy = {
    SCENARIOS,
    HEDGE_DEFS,
    normalizeStrategy,
    createInitialStrategy,
    ensureStrategy,
    getRiskProfile,
    getCashflowDiagnosis,
    getAdvisorTips,
    refreshContracts,
    evaluateContracts,
    processDay,
    getCityPerks,
    getTradeFeeModifier,
    getLoanRateModifier,
    getHedgeCatalog,
    buyHedge,
    hasActiveHedge,
    adjustEventEffect,
    adjustEventImpact,
    toggleWatchlist,
    isWatched,
    getWatchlistAssets,
    getBusinessSynergy,
    getSynergySummary,
    applyScenarioStart,
    getScenarioMeta,
    getPrestigeStatus,
    claimPrestige,
    getTakeoverClaims,
    getTakeoverOpportunities,
    getTakeoverTradeModifier,
    getTakeoverDividendModifier,
    getTakeoverBusinessModifiers,
    claimTakeover,
    getAdvanceWarning
  };
})();
