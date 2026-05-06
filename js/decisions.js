(function () {
  "use strict";

  const strategy = window.CashEmpireStrategy;

  const SECTOR_FLAVORS = {
    food: { label: "Gastronomia", asset: "restaurant", channel: "delivery", team: "chef senior", ops: "horarios extendidos", efficiency: "menu corto" },
    retail: { label: "Retail", asset: "tienda", channel: "canal online", team: "gerente de piso", ops: "horario extendido", efficiency: "mix mas rentable" },
    services: { label: "Servicios", asset: "firma", channel: "suscripcion premium", team: "consultor senior", ops: "cobertura ampliada", efficiency: "paquetes estandarizados" },
    logistics: { label: "Logistica", asset: "operador", channel: "rutas express", team: "jefe de trafico", ops: "turno nocturno", efficiency: "consolidacion de cargas" },
    construction: { label: "Construccion", asset: "constructora", channel: "subcontratos rapidos", team: "capataz senior", ops: "doble frente de obra", efficiency: "faseo estricto" },
    software: { label: "Software", asset: "startup", channel: "plan enterprise", team: "tech lead", ops: "release acelerado", efficiency: "hoja de ruta enfocada" },
    hospitality: { label: "Hoteleria", asset: "hotel", channel: "alianzas OTA", team: "host premium", ops: "servicio 24/7", efficiency: "tarifa dinamica" },
    banking: { label: "Banca", asset: "sucursal", channel: "cross-sell digital", team: "ejecutivo senior", ops: "mesa extendida", efficiency: "score de originacion" },
    real_estate: { label: "Real estate", asset: "inmobiliaria", channel: "red de brokers", team: "captador senior", ops: "jornadas abiertas", efficiency: "filtro de leads" },
    energy: { label: "Energia", asset: "operador energetico", channel: "contratos indexados", team: "ingeniero senior", ops: "mantenimiento preventivo", efficiency: "dispatch optimizado" },
    media: { label: "Media", asset: "estudio", channel: "nuevo formato comercial", team: "productor senior", ops: "programacion ampliada", efficiency: "parrilla enfocada" }
  };

  const MACRO_PORTFOLIO_PHASES = new Set(["recession", "peak"]);
  const DECISION_COOLDOWN_MIN = 5;
  const DECISION_COOLDOWN_MAX = 9;

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
    return Math.max(1, Math.floor(Number(value) || 1));
  }

  function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getCurrentDay(state) {
    return state && state.time ? toDay(state.time.day) : 1;
  }

  function getDecisionState(state) {
    if (!state) return createInitialDecisionState();
    if (isObject(state.decisions) && Array.isArray(state.decisions.history) && Array.isArray(state.decisions.effects)) {
      return state.decisions;
    }
    state.decisions = normalizeDecisionState(state.decisions);
    return state.decisions;
  }

  function normalizeHistory(value) {
    return Array.isArray(value)
      ? value.map((item) => {
        if (!isObject(item)) return null;
        return {
          id: typeof item.id === "string" ? item.id : createId("decision_history"),
          day: toDay(item.day),
          type: typeof item.type === "string" ? item.type : "business",
          businessId: typeof item.businessId === "string" ? item.businessId : "",
          businessName: typeof item.businessName === "string" ? item.businessName : "",
          sector: typeof item.sector === "string" ? item.sector : "services",
          title: typeof item.title === "string" ? item.title : "Decision ejecutiva",
          choiceLabel: typeof item.choiceLabel === "string" ? item.choiceLabel : "Decision tomada",
          summary: typeof item.summary === "string" ? item.summary : "",
          impactText: typeof item.impactText === "string" ? item.impactText : "",
          tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string").slice(0, 8) : []
        };
      }).filter(Boolean).slice(-60)
      : [];
  }

  function normalizeProfiles(value) {
    const source = isObject(value) ? value : {};
    return Object.keys(source).reduce((acc, key) => {
      const entry = source[key];
      if (!isObject(entry)) return acc;
      acc[key] = {
        tags: Array.isArray(entry.tags) ? Array.from(new Set(entry.tags.filter((tag) => typeof tag === "string"))).slice(-12) : [],
        lastDecisionId: typeof entry.lastDecisionId === "string" ? entry.lastDecisionId : "",
        lastDay: Math.max(0, Math.floor(Number(entry.lastDay) || 0))
      };
      return acc;
    }, {});
  }

  function normalizeEffects(value) {
    return Array.isArray(value)
      ? value.map((item) => {
        if (!isObject(item)) return null;
        return {
          id: typeof item.id === "string" ? item.id : createId("decision_effect"),
          businessId: typeof item.businessId === "string" ? item.businessId : "",
          assetId: typeof item.assetId === "string" ? item.assetId : "",
          sourceDecisionId: typeof item.sourceDecisionId === "string" ? item.sourceDecisionId : "",
          label: typeof item.label === "string" ? item.label : "Efecto ejecutivo",
          startDay: toDay(item.startDay),
          endDay: toDay(item.endDay),
          demandMultiplier: clamp(item.demandMultiplier || 1, 0.7, 1.35),
          costMultiplier: clamp(item.costMultiplier || 1, 0.75, 1.35),
          valuationMultiplier: clamp(item.valuationMultiplier || 1, 0.75, 1.35),
          reputationDelta: clamp(item.reputationDelta || 0, -0.3, 0.3),
          dividendMultiplier: clamp(item.dividendMultiplier || 1, 0.8, 1.3)
        };
      }).filter(Boolean).slice(-36)
      : [];
  }

  function normalizePending(value) {
    if (!isObject(value) || !Array.isArray(value.options) || !value.id) return null;
    return {
      id: String(value.id),
      type: typeof value.type === "string" ? value.type : "business",
      businessId: typeof value.businessId === "string" ? value.businessId : "",
      businessName: typeof value.businessName === "string" ? value.businessName : "",
      sector: typeof value.sector === "string" ? value.sector : "services",
      title: typeof value.title === "string" ? value.title : "Decision ejecutiva",
      body: typeof value.body === "string" ? value.body : "",
      createdDay: toDay(value.createdDay),
      options: value.options.map((option) => ({
        id: typeof option.id === "string" ? option.id : createId("decision_option"),
        label: typeof option.label === "string" ? option.label : "Opcion",
        body: typeof option.body === "string" ? option.body : "",
        impactText: typeof option.impactText === "string" ? option.impactText : "",
        effects: isObject(option.effects) ? option.effects : {}
      })).slice(0, 2)
    };
  }

  function normalizeDecisionState(value) {
    const source = isObject(value) ? value : {};
    return {
      pending: normalizePending(source.pending),
      history: normalizeHistory(source.history),
      effects: normalizeEffects(source.effects),
      profiles: normalizeProfiles(source.profiles),
      lastDecisionDay: Math.max(0, Math.floor(Number(source.lastDecisionDay) || 0)),
      nextTriggerDay: Math.max(1, Math.floor(Number(source.nextTriggerDay) || 7)),
      lastPortfolioPromptDay: Math.max(0, Math.floor(Number(source.lastPortfolioPromptDay) || 0))
    };
  }

  function createInitialDecisionState() {
    return normalizeDecisionState({
      pending: null,
      history: [],
      effects: [],
      profiles: {},
      lastDecisionDay: 0,
      nextTriggerDay: 7,
      lastPortfolioPromptDay: 0
    });
  }

  function pushProfileTag(decisionState, businessId, tag, decisionId, day) {
    if (!businessId || !tag) return;
    const profile = decisionState.profiles[businessId] || { tags: [], lastDecisionId: "", lastDay: 0 };
    profile.tags = Array.from(new Set(profile.tags.concat(tag))).slice(-12);
    profile.lastDecisionId = decisionId || profile.lastDecisionId;
    profile.lastDay = Math.max(profile.lastDay || 0, day || 0);
    decisionState.profiles[businessId] = profile;
  }

  function getBusinessTags(decisionState, businessId) {
    const profile = decisionState.profiles[businessId];
    return profile && Array.isArray(profile.tags) ? profile.tags : [];
  }

  function buildSectorDecisionTemplates() {
    return [
      {
        suffix: "ops",
        title: (f) => `${f.label}: acelerar ${f.ops} o cerrar fugas`,
        body: (f, business) => `${business.name} puede abrir ${f.ops} para capturar demanda extra o mantener el foco en ${f.efficiency} y margen.`,
        options: [
          {
            id: "expand",
            label: "Acelerar operacion",
            body: "Busca mas ventas ahora, aceptando friccion operativa.",
            impactText: "+14% demanda 45d, +11% costos, +1 empleado, +caja inicial.",
            effects: { duration: 45, demandMultiplier: 1.14, costMultiplier: 1.11, employeeDelta: 1, cashDeltaRatio: 0.03, tag: "growth" }
          },
          {
            id: "discipline",
            label: "Proteger margen",
            body: "Menos velocidad, mas orden y reputacion.",
            impactText: "-4% demanda 35d, -9% costos, +reputacion, mejor caja.",
            effects: { duration: 35, demandMultiplier: 0.96, costMultiplier: 0.91, reputationDelta: 0.04, cashDeltaRatio: 0.015, tag: "discipline" }
          }
        ]
      },
      {
        suffix: "channel",
        title: (f) => `${f.label}: empujar ${f.channel} o premiumizar`,
        body: (f, business) => `${business.name} puede abrir ${f.channel} para crecer volumen o usar esa energia en una propuesta premium de mejor ticket.`,
        options: [
          {
            id: "channel",
            labelBuilder: (f) => `Lanzar ${f.channel}`,
            body: "Crecimiento rapido con algo mas de complejidad.",
            impactText: "+11% demanda 50d, +marketing, +valor futuro.",
            effects: { duration: 50, demandMultiplier: 1.11, costMultiplier: 1.05, marketingDeltaRatio: 0.018, valuationMultiplier: 1.04, tag: "channel" }
          },
          {
            id: "premium",
            label: "Subir ticket medio",
            body: "Mas selectivo, menos volumen pero mejor percepcion.",
            impactText: "+6% valoracion 50d, -5% demanda, +reputacion.",
            effects: { duration: 50, demandMultiplier: 0.95, costMultiplier: 0.98, valuationMultiplier: 1.06, reputationDelta: 0.05, tag: "premium" }
          }
        ]
      },
      {
        suffix: "team",
        title: (f) => `${f.label}: contratar ${f.team} o automatizar`,
        body: (f, business) => `${business.name} necesita decidir entre reforzar al equipo con un ${f.team} o simplificar procesos con ${f.efficiency}.`,
        options: [
          {
            id: "hire",
            labelBuilder: (f) => `Contratar ${f.team}`,
            body: "Mas capacidad y resiliencia, mayor costo mensual.",
            impactText: "+2 empleados, +10% demanda 40d, +9% costos, +reputacion.",
            effects: { duration: 40, demandMultiplier: 1.1, costMultiplier: 1.09, employeeDelta: 2, reputationDelta: 0.03, tag: "people" }
          },
          {
            id: "automate",
            label: "Automatizar y estandarizar",
            body: "Baja costos y gana disciplina, pero enfria el equipo.",
            impactText: "-1 empleado, -10% costos 55d, -moral indirecta, +valor.",
            effects: { duration: 55, demandMultiplier: 0.98, costMultiplier: 0.9, employeeDelta: -1, valuationMultiplier: 1.04, reputationDelta: -0.02, tag: "automation" }
          }
        ]
      },
      {
        suffix: "cash",
        title: (f) => `${f.label}: caja ofensiva o reserva`,
        body: (f, business) => `${business.name} puede comprometer mas caja para crecer o reservar municion hasta que el macro se aclare.`,
        options: [
          {
            id: "spend",
            label: "Invertir ahora",
            body: "Empuja crecimiento aunque deja la caja mas fina.",
            impactText: "-caja inmediata, +12% demanda 35d, +marketing y valor.",
            effects: { duration: 35, demandMultiplier: 1.12, costMultiplier: 1.06, cashDeltaRatio: -0.04, marketingDeltaRatio: 0.024, valuationMultiplier: 1.05, tag: "offense" }
          },
          {
            id: "reserve",
            label: "Guardar caja",
            body: "Menos agresivo hoy, mas resistencia si llegan shocks.",
            impactText: "+caja inmediata, -3% demanda 25d, -6% costos.",
            effects: { duration: 25, demandMultiplier: 0.97, costMultiplier: 0.94, cashDeltaRatio: 0.025, tag: "reserve" }
          }
        ]
      }
    ];
  }

  const SECTOR_DECISION_CATALOG = Object.keys(SECTOR_FLAVORS).flatMap((sector) => {
    const flavor = SECTOR_FLAVORS[sector];
    return buildSectorDecisionTemplates().map((template) => ({
      id: `decision_${sector}_${template.suffix}`,
      type: "business",
      sector,
      title: template.title(flavor),
      bodyBuilder: template.body,
      options: template.options
    }));
  });

  function getBusinesses(state) {
    return Array.isArray(state && state.businesses) ? state.businesses : [];
  }

  function getPlayerModule() {
    return window.CashEmpirePlayer || null;
  }

  function getCandidateBusinesses(state) {
    return getBusinesses(state).filter((business) => business && business.id && business.name);
  }

  function getPortfolioPositions(state) {
    const player = getPlayerModule();
    return player && typeof player.getDecoratedPositions === "function"
      ? player.getDecoratedPositions(state.portfolio, state.assets)
      : [];
  }

  function shouldPromptPortfolio(state, decisionState) {
    const day = getCurrentDay(state);
    if (decisionState.pending || day - decisionState.lastPortfolioPromptDay < 14) return false;
    const positions = getPortfolioPositions(state);
    if (!positions.length) return false;
    const unreadCritical = Array.isArray(state.events) && state.events.some((item) => !item.read && (item.severity === "critical" || item.severity === "warning"));
    const riskyMacro = state.macro && MACRO_PORTFOLIO_PHASES.has(state.macro.phase);
    return unreadCritical || riskyMacro;
  }

  function buildPortfolioPrompt(state) {
    return {
      id: createId("decision_portfolio"),
      type: "portfolio",
      businessId: "",
      businessName: "",
      sector: "portfolio",
      title: "Rebalanceo ejecutivo de cartera",
      body: "El contexto se tensó. Puedes rebalancear una parte de la cartera hacia caja/bonos ahora o sostener convicción para buscar más retorno.",
      createdDay: getCurrentDay(state),
      options: [
        {
          id: "defensive",
          label: "Rebalanceo defensivo",
          body: "Reduce exposición en posiciones volátiles y refuerza activos defensivos.",
          impactText: "Vende hasta 20% de las 2 posiciones más agresivas y mueve parte a bonos/caja.",
          effects: { action: "portfolio_defensive" }
        },
        {
          id: "hold",
          label: "Mantener convicción",
          body: "No tocas la cartera; ganas upside si el shock se revierte, pero aceptas más volatilidad.",
          impactText: "+6% dividendo en cartera 30d, sin venta defensiva.",
          effects: { action: "portfolio_hold", duration: 30, portfolioDividendBoost: 1.06 }
        }
      ]
    };
  }

  function chooseBusinessDecision(state, decisionState) {
    const businesses = getCandidateBusinesses(state);
    if (!businesses.length) return null;
    const day = getCurrentDay(state);
    const ranked = businesses.slice().sort((a, b) => {
      const aStress = Number(a.monthlyPnl && a.monthlyPnl.shortfall) || 0;
      const bStress = Number(b.monthlyPnl && b.monthlyPnl.shortfall) || 0;
      return bStress - aStress || (Number(b.valuation) || 0) - (Number(a.valuation) || 0);
    });
    const business = ranked[day % ranked.length];
    const tags = new Set(getBusinessTags(decisionState, business.id));
    const recentIds = new Set(decisionState.history.slice(-8).map((item) => item.id));
    const templates = SECTOR_DECISION_CATALOG.filter((item) => item.sector === business.sector && !recentIds.has(item.id));
    const template = templates.length ? templates[day % templates.length] : null;
    if (!template) return null;

    return {
      id: template.id,
      type: "business",
      businessId: business.id,
      businessName: business.name,
      sector: business.sector,
      title: template.title,
      body: template.bodyBuilder(SECTOR_FLAVORS[business.sector] || SECTOR_FLAVORS.services, business, tags),
      createdDay: day,
      options: template.options.map((option) => ({
        id: option.id,
        label: typeof option.labelBuilder === "function" ? option.labelBuilder(SECTOR_FLAVORS[business.sector] || SECTOR_FLAVORS.services, business) : option.label,
        body: option.body,
        impactText: option.impactText,
        effects: { ...option.effects }
      }))
    };
  }

  function scheduleNextDecision(decisionState, day) {
    const nextOffset = DECISION_COOLDOWN_MIN + (day % (DECISION_COOLDOWN_MAX - DECISION_COOLDOWN_MIN + 1));
    decisionState.lastDecisionDay = day;
    decisionState.nextTriggerDay = day + nextOffset;
  }

  function processDay(state) {
    const decisionState = getDecisionState(state);
    const day = getCurrentDay(state);
    decisionState.effects = decisionState.effects.filter((effect) => effect.endDay >= day);

    if (decisionState.pending) return null;

    if (shouldPromptPortfolio(state, decisionState)) {
      decisionState.pending = buildPortfolioPrompt(state);
      decisionState.lastPortfolioPromptDay = day;
      return {
        type: "portfolio",
        message: "Contexto tenso: se abre una decision rapida de rebalanceo.",
        decision: decisionState.pending
      };
    }

    if (day < decisionState.nextTriggerDay) return null;
    const nextDecision = chooseBusinessDecision(state, decisionState);
    if (!nextDecision) {
      decisionState.nextTriggerDay = day + 3;
      return null;
    }
    decisionState.pending = nextDecision;
    return {
      type: "business",
      message: `Nueva decision ejecutiva en ${nextDecision.businessName}.`,
      decision: nextDecision
    };
  }

  function getBusinessDecisionModifiers(state, business) {
    const decisionState = getDecisionState(state);
    if (!business || !business.id) {
      return { demand: 1, cost: 1, valuation: 1, reputation: 0, labels: [] };
    }
    return decisionState.effects
      .filter((effect) => effect.businessId === business.id && effect.endDay >= getCurrentDay(state))
      .reduce((summary, effect) => {
        summary.demand *= clamp(effect.demandMultiplier || 1, 0.7, 1.35);
        summary.cost *= clamp(effect.costMultiplier || 1, 0.75, 1.35);
        summary.valuation *= clamp(effect.valuationMultiplier || 1, 0.75, 1.35);
        summary.reputation += clamp(effect.reputationDelta || 0, -0.3, 0.3);
        summary.labels.push(effect.label);
        return summary;
      }, { demand: 1, cost: 1, valuation: 1, reputation: 0, labels: [] });
  }

  function getPortfolioDecisionModifiers(state) {
    const decisionState = getDecisionState(state);
    return decisionState.effects
      .filter((effect) => effect.assetId === "__portfolio__" && effect.endDay >= getCurrentDay(state))
      .reduce((summary, effect) => {
        summary.dividendMultiplier *= clamp(effect.dividendMultiplier || 1, 0.8, 1.3);
        summary.labels.push(effect.label);
        return summary;
      }, { dividendMultiplier: 1, labels: [] });
  }

  function buildBusinessImpactSummary(business, option) {
    const effects = option.effects || {};
    const demandDelta = Math.round(((Number(effects.demandMultiplier) || 1) - 1) * 100);
    const costDelta = Math.round(((Number(effects.costMultiplier) || 1) - 1) * 100);
    const reputationDelta = Math.round((Number(effects.reputationDelta) || 0) * 100);
    return `${business.name}: demanda ${demandDelta >= 0 ? "+" : ""}${demandDelta}% / costos ${costDelta >= 0 ? "+" : ""}${costDelta}%${reputationDelta ? ` / reputacion ${reputationDelta >= 0 ? "+" : ""}${reputationDelta} pts` : ""}.`;
  }

  function appendCashflow(state, payload) {
    const player = getPlayerModule();
    if (player && typeof player.appendCashflow === "function") player.appendCashflow(state, payload);
  }

  function applyPortfolioAction(state, option) {
    const player = getPlayerModule();
    const positions = getPortfolioPositions(state)
      .filter((position) => position.asset && ["stock", "crypto", "business", "collectible"].includes(position.asset.type))
      .sort((a, b) => {
        const aRisk = (Number(a.asset.volatility) || 0.4) + (Number(a.asset.beta) || 0.4);
        const bRisk = (Number(b.asset.volatility) || 0.4) + (Number(b.asset.beta) || 0.4);
        return bRisk - aRisk || (Number(b.value) || 0) - (Number(a.value) || 0);
      })
      .slice(0, 2);

    if (option.effects && option.effects.action === "portfolio_defensive") {
      let freedCash = 0;
      positions.forEach((position) => {
        const sellQty = Math.max(0, Number(position.quantity) || 0) * 0.2;
        if (sellQty <= 0 || !player || typeof player.sellAsset !== "function") return;
        const result = player.sellAsset(state, position.assetId, sellQty);
        if (result && result.ok) freedCash += Number(result.net) || 0;
      });
      const bond = Object.values(state.assets || {}).find((asset) => asset && asset.type === "bond");
      if (bond && freedCash > 2500 && player && typeof player.buyAsset === "function") {
        const spend = freedCash * 0.35;
        const quantity = spend / Math.max(1, Number(bond.simPrice) || 1);
        if (quantity > 0) player.buyAsset(state, bond.id, quantity);
      }
      return {
        message: "Rebalanceo defensivo ejecutado sobre la cartera mas volatil.",
        impactText: `Se liberaron ${roundMoney(freedCash)} en ventas tacticas.`
      };
    }

    const day = getCurrentDay(state);
    getDecisionState(state).effects.push({
      id: createId("portfolio_effect"),
      assetId: "__portfolio__",
      businessId: "",
      sourceDecisionId: "portfolio_hold",
      label: "Conviccion de cartera",
      startDay: day,
      endDay: day + Math.max(1, Math.floor(Number(option.effects.duration) || 30)),
      demandMultiplier: 1,
      costMultiplier: 1,
      valuationMultiplier: 1,
      reputationDelta: 0,
      dividendMultiplier: Number(option.effects.portfolioDividendBoost) || 1.06
    });
    return {
      message: "Se mantiene la conviccion de cartera con sesgo a dividendos.",
      impactText: "Dividendos reforzados 30 dias."
    };
  }

  function applyBusinessAction(state, pending, option) {
    const business = getBusinesses(state).find((item) => item.id === pending.businessId);
    if (!business) return { ok: false, message: "La empresa de esta decision ya no existe." };
    const day = getCurrentDay(state);
    const effects = option.effects || {};
    const valuation = Math.max(1, Number(business.valuation) || 1);
    const cashDelta = roundMoney(valuation * (Number(effects.cashDeltaRatio) || 0));
    const marketingDelta = roundMoney(valuation * (Number(effects.marketingDeltaRatio) || 0));
    const employeeDelta = Math.floor(Number(effects.employeeDelta) || 0);

    business.cash = roundMoney(Math.max(0, business.cash + cashDelta));
    business.marketing = roundMoney(Math.max(0, Number(business.marketing) || 0) + Math.max(0, marketingDelta));
    business.reputation = clamp((Number(business.reputation) || 0.5) + (Number(effects.reputationDelta) || 0), 0.05, 1.2);
    business.employees = Math.max(0, Math.floor((Number(business.employees) || 0) + employeeDelta));
    business.valuation = roundMoney(Math.max(1000, business.valuation * clamp(Number(effects.valuationMultiplier) || 1, 0.75, 1.35)));

    const duration = Math.max(20, Math.floor(Number(effects.duration) || 35));
    getDecisionState(state).effects.push({
      id: createId("business_effect"),
      businessId: business.id,
      assetId: business.sourceAssetId || "",
      sourceDecisionId: pending.id,
      label: option.label,
      startDay: day,
      endDay: day + duration,
      demandMultiplier: clamp(Number(effects.demandMultiplier) || 1, 0.7, 1.35),
      costMultiplier: clamp(Number(effects.costMultiplier) || 1, 0.75, 1.35),
      valuationMultiplier: clamp(Number(effects.valuationMultiplier) || 1, 0.75, 1.35),
      reputationDelta: clamp(Number(effects.reputationDelta) || 0, -0.3, 0.3)
    });

    if (cashDelta !== 0) {
      appendCashflow(state, {
        type: "executive_decision",
        businessId: business.id,
        scope: "business",
        label: `${business.name}: ${option.label}`,
        amount: cashDelta,
        channel: cashDelta >= 0 ? "operating" : "investing"
      });
    }

    if (strategy && typeof strategy.recordActivity === "function") {
      strategy.recordActivity(state, "business_health", {
        day,
        scope: "business",
        businessId: business.id,
        weight: 1.15
      });
      strategy.recordActivity(state, "executive_decision", {
        day,
        scope: "business",
        businessId: business.id,
        weight: 1.2
      });
    }

    pushProfileTag(getDecisionState(state), business.id, effects.tag, pending.id, day);

    return {
      ok: true,
      message: `${business.name}: ${option.label.toLowerCase()} aplicada.`,
      impactText: buildBusinessImpactSummary(business, option),
      business
    };
  }

  function resolvePendingDecision(state, optionId) {
    const decisionState = getDecisionState(state);
    const pending = decisionState.pending;
    if (!pending) return { ok: false, message: "No hay decision pendiente." };
    const option = pending.options.find((item) => item.id === optionId);
    if (!option) return { ok: false, message: "La opcion elegida ya no es valida." };
    const day = getCurrentDay(state);

    let outcome;
    if (pending.type === "portfolio") outcome = applyPortfolioAction(state, option);
    else outcome = applyBusinessAction(state, pending, option);
    if (!outcome || outcome.ok === false) return outcome;

    decisionState.history.push({
      id: pending.id,
      day,
      type: pending.type,
      businessId: pending.businessId,
      businessName: pending.businessName,
      sector: pending.sector,
      title: pending.title,
      choiceLabel: option.label,
      summary: pending.body,
      impactText: outcome.impactText || option.impactText || "",
      tags: option.effects && option.effects.tag ? [option.effects.tag] : []
    });
    decisionState.history = decisionState.history.slice(-60);
    decisionState.pending = null;
    scheduleNextDecision(decisionState, day);

    return {
      ok: true,
      message: outcome.message,
      historyEntry: decisionState.history[decisionState.history.length - 1]
    };
  }

  window.CashEmpireDecisions = {
    normalizeDecisionState,
    createInitialDecisionState,
    getDecisionState,
    processDay,
    resolvePendingDecision,
    getBusinessDecisionModifiers,
    getPortfolioDecisionModifiers,
    getCatalogSize() {
      return SECTOR_DECISION_CATALOG.length;
    }
  };
})();
