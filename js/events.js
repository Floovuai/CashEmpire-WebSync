(function () {
  "use strict";

  const data = window.CashEmpireData;
  const economy = window.CashEmpireEconomy;
  const MAX_EVENTS = 80;
  const COOLDOWN_DAYS = 5;

  const EVENT_POOL = [
    event("macro", "La Fed enfria expectativas", "Tasas esperadas suben y presionan activos de riesgo.", {
      type: "all",
      delta: -0.012,
      sentiment: -0.08,
      severity: "warning",
      duration: 12,
      ongoingTypeDelta: -0.0012,
      ongoingInterestRate: 0.00035,
      ongoingSentiment: -0.004
    }),
    event("macro", "Dato de inflacion benigno", "La inflacion desacelera y mejora el apetito por riesgo.", {
      type: "all",
      delta: 0.011,
      sentiment: 0.08,
      severity: "opportunity",
      duration: 10,
      ongoingTypeDelta: 0.001,
      ongoingInflation: -0.00025,
      ongoingSentiment: 0.003
    }),
    event("macro", "Rebote de confianza del consumidor", "El consumo muestra fuerza y favorece negocios ciclicos.", {
      sector: "discretionary",
      delta: 0.024,
      sentiment: 0.06,
      severity: "opportunity",
      duration: 14,
      ongoingSectorDelta: 0.0018,
      businessRevenueDelta: 0.012
    }),
    event("macro", "Tension geopolitica en energia", "El crudo salta y arrastra costos globales.", {
      sector: "energy_commodities",
      delta: 0.035,
      sentiment: -0.04,
      severity: "warning",
      duration: 16,
      ongoingSectorDelta: 0.0025,
      businessCostDelta: 0.01,
      ongoingInflation: 0.0003
    }),
    event("macro", "Subasta de bonos con demanda fuerte", "Los bonos largos reciben flujos defensivos.", {
      type: "bond",
      delta: 0.014,
      sentiment: 0.02,
      severity: "info",
      duration: 10,
      ongoingTypeDelta: 0.0008
    }),
    event("sector", "Rotacion hacia tecnologia", "Fondos aumentan exposicion a software e IA.", {
      sector: "technology",
      delta: 0.028,
      sentiment: 0.05,
      severity: "opportunity",
      duration: 18,
      ongoingSectorDelta: 0.0018,
      businessRevenueDelta: 0.008
    }),
    event("sector", "Regulacion antimonopolio tech", "Grandes plataformas descuentan riesgo regulatorio.", {
      sector: "technology",
      delta: -0.026,
      sentiment: -0.04,
      severity: "warning",
      duration: 18,
      ongoingSectorDelta: -0.0017,
      businessCostDelta: 0.006
    }),
    event("sector", "Defensivas atraen capital", "Salud y consumo basico ganan flujo por menor riesgo.", {
      sector: "healthcare",
      delta: 0.018,
      sentiment: 0.01,
      severity: "info",
      duration: 12,
      ongoingSectorDelta: 0.001
    }),
    event("sector", "Margenes minoristas bajo presion", "Costos de inventario suben para retailers.", {
      sector: "retail",
      delta: -0.024,
      sentiment: -0.03,
      severity: "warning",
      duration: 14,
      ongoingSectorDelta: -0.0014,
      businessCostDelta: 0.012
    }),
    event("sector", "Reservas de hoteles mejoran", "Turismo muestra demanda superior a lo esperado.", {
      sector: "hospitality",
      delta: 0.032,
      sentiment: 0.04,
      severity: "opportunity",
      duration: 20,
      ongoingSectorDelta: 0.0018,
      businessRevenueDelta: 0.015
    }),
    event("sector", "Huelga portuaria parcial", "Logistica sufre atrasos y sobrecostos.", {
      sector: "logistics",
      delta: -0.03,
      sentiment: -0.04,
      severity: "warning",
      duration: 12,
      ongoingSectorDelta: -0.0019,
      businessCostDelta: 0.014,
      businessSupplierDelta: -0.01
    }),
    event("sector", "Credito hipotecario mas caro", "Propiedades de alto valor pierden liquidez.", {
      type: "real_estate",
      delta: -0.018,
      sentiment: -0.03,
      severity: "warning",
      duration: 20,
      ongoingTypeDelta: -0.0012,
      ongoingInterestRate: 0.00025
    }),
    event("sector", "Rentas urbanas suben", "La ocupacion mejora en ciudades premium.", {
      type: "real_estate",
      delta: 0.018,
      sentiment: 0.03,
      severity: "opportunity",
      duration: 20,
      ongoingTypeDelta: 0.001,
      propertyOccupancyDelta: 0.005
    }),
    event("sector", "Oro recibe cobertura", "Inversores buscan refugio ante incertidumbre.", {
      sector: "precious_metals",
      delta: 0.028,
      sentiment: -0.02,
      severity: "info",
      duration: 16,
      ongoingSectorDelta: 0.0017
    }),
    event("sector", "Cripto respira tras ETF", "Flujos especulativos impulsan tokens liquidos.", {
      sector: "crypto",
      delta: 0.055,
      sentiment: 0.05,
      severity: "opportunity",
      duration: 14,
      ongoingSectorDelta: 0.0035
    }),
    event("sector", "Hackeo en exchange", "El mercado cripto castiga riesgo operativo.", {
      sector: "crypto",
      delta: -0.07,
      sentiment: -0.05,
      severity: "critical",
      duration: 12,
      ongoingSectorDelta: -0.004,
      ongoingSentiment: -0.003
    }),
    event("sector", "Autos ajustan inventarios", "Fabricantes reducen descuentos y protegen margen.", {
      sector: "automotive",
      delta: 0.022,
      sentiment: 0.02,
      severity: "info",
      duration: 10,
      ongoingSectorDelta: 0.0012
    }),
    event("sector", "Aerolineas enfrentan combustible caro", "Costos de jet fuel pesan sobre turismo.", {
      sector: "travel",
      delta: -0.026,
      sentiment: -0.03,
      severity: "warning",
      duration: 12,
      ongoingSectorDelta: -0.0018,
      businessCostDelta: 0.008
    }),
    event("sector", "Construccion recibe licitaciones", "Obras publicas mejoran cartera de pedidos.", {
      sector: "construction",
      delta: 0.026,
      sentiment: 0.02,
      severity: "opportunity",
      duration: 16,
      ongoingSectorDelta: 0.0016,
      businessRevenueDelta: 0.01
    }),
    event("individual", "Resultado trimestral sorprende", "Un activo supera expectativas y sube en la rueda.", { random: true, delta: 0.045, sentiment: 0.01, severity: "opportunity" }),
    event("individual", "Guidance decepcionante", "Un activo reduce expectativas y cae.", { random: true, delta: -0.045, sentiment: -0.01, severity: "warning" }),
    event("individual", "Demanda institucional", "Orden grande mejora precio y liquidez de un activo.", { random: true, delta: 0.032, sentiment: 0.01, severity: "opportunity" }),
    event("individual", "Venta forzada", "Un fondo liquida posicion y golpea la cotizacion.", { random: true, delta: -0.035, sentiment: -0.01, severity: "warning" }),
    event("business", "Campana viral de franquicias", "Locales de comida reciben mas demanda esta semana.", {
      sector: "food",
      delta: 0.022,
      sentiment: 0.02,
      severity: "opportunity",
      duration: 14,
      businessRevenueDelta: 0.018,
      businessReputationDelta: 0.002
    }),
    event("business", "Inspecciones laborales", "Empresas intensivas en personal enfrentan costos.", {
      type: "business",
      delta: -0.02,
      sentiment: -0.02,
      severity: "warning",
      duration: 14,
      businessCostDelta: 0.014,
      businessMoraleDelta: -0.006
    }),
    event("cyclic", "Temporada de dividendos", "Blue chips anuncian pagos y sostienen demanda.", { type: "stock", delta: 0.012, sentiment: 0.02, severity: "info" }),
    event("cyclic", "Fin de mes inmobiliario", "Operadores ajustan rentas y mantenimiento.", { type: "real_estate", delta: 0.006, sentiment: 0, severity: "info" }),
    event("macro", "PMI manufacturero debil", "Industriales y metales descuentan menor actividad.", {
      sector: "industrial",
      delta: -0.022,
      sentiment: -0.04,
      severity: "warning",
      duration: 12,
      ongoingSectorDelta: -0.0016,
      ongoingGdp: -0.00015
    }),
    event("macro", "Paquete de infraestructura", "Industriales y construccion reciben impulso fiscal.", {
      sector: "industrial",
      delta: 0.028,
      sentiment: 0.04,
      severity: "opportunity",
      duration: 18,
      ongoingSectorDelta: 0.0018,
      ongoingGdp: 0.00012
    }),
    event("sector", "Coleccionables ganan subastas", "Ventas premium validan precios de activos escasos.", {
      type: "collectible",
      delta: 0.024,
      sentiment: 0.01,
      severity: "opportunity",
      duration: 12,
      ongoingTypeDelta: 0.0012
    }),
    event("sector", "Liquidez baja en coleccionables", "Casas de subasta reportan menor demanda.", {
      type: "collectible",
      delta: -0.02,
      sentiment: -0.01,
      severity: "warning",
      duration: 12,
      ongoingTypeDelta: -0.0011
    })
  ];

  const PLAYER_EVENT_POOL = [
    event("player", "Coinversion privada inesperada", "Un socio privado quiere exponerse a tu track record y aporta liquidez fresca.", {
      severity: "opportunity",
      sentiment: 0.01,
      playerCashRatio: 0.018,
      playerCashMin: 3000
    }),
    event("player", "Contrato de consultoria premium", "Tu red personal consigue un trabajo express con pago alto y sin inmovilizar capital.", {
      severity: "info",
      sentiment: 0.005,
      playerCashRatio: 0.012,
      playerCashMin: 2000
    }),
    event("player", "Demanda contractual inesperada", "Una disputa legal menor te obliga a inmovilizar caja personal y pagar abogados.", {
      severity: "warning",
      sentiment: -0.015,
      playerCashRatio: -0.016,
      playerCashMin: -2500
    }),
    event("player", "Robo operativo en oficina personal", "Un incidente fuera de tus negocios te obliga a cubrir gastos no previstos.", {
      severity: "warning",
      sentiment: -0.01,
      playerCashRatio: -0.011,
      playerCashMin: -1500
    })
  ];

  const CYCLIC_EVENTS = [
    { every: 60, definition: event("cyclic", "Decision de tasas del banco central", "El comite revisa tasas y recalibra expectativas de credito.", { type: "bond", delta: -0.004, sentiment: -0.01, severity: "info", duration: 8, ongoingInterestRate: 0.00015 }) },
    { every: 90, definition: event("cyclic", "Temporada de resultados", "Empresas reportan resultados y el mercado actualiza expectativas.", { type: "stock", delta: 0.008, sentiment: 0.01, severity: "info", duration: 10, ongoingTypeDelta: 0.0008 }) },
    { every: 90, definition: event("cyclic", "Presupuesto publico anunciado", "Gasto en infraestructura y servicios mueve sectores ciclicos.", { sector: "industrial", delta: 0.012, sentiment: 0.01, severity: "info", duration: 12, ongoingSectorDelta: 0.001 }) },
    { every: 120, definition: event("cyclic", "Reunion OPEC", "Productores revisan cuotas y el crudo mueve costos globales.", { sector: "energy_commodities", delta: 0.015, sentiment: -0.005, severity: "info", duration: 12, ongoingSectorDelta: 0.0012, ongoingInflation: 0.0002 }) },
    { every: 365, definition: event("cyclic", "Cierre fiscal anual", "El mercado descuenta impuestos, balances y ajustes de portafolio.", { type: "all", delta: -0.003, sentiment: -0.005, severity: "info", duration: 5, ongoingTypeDelta: -0.0005 }) }
  ];

  const INFO_EVENTS = [
    event("info", "Boletin macro diario", "Sin shock nuevo: el mercado opera segun ciclo, tasas y sentimiento.", { delta: 0, sentiment: 0, severity: "info" }),
    event("info", "Lectura de mercado estable", "Los activos se mueven por drift, liquidez y ruido sectorial.", { delta: 0, sentiment: 0, severity: "info" }),
    event("info", "Mesa de analisis sin alerta", "No hay evento disruptivo; revisa valoraciones y concentracion.", { delta: 0, sentiment: 0, severity: "info" })
  ];

  function event(level, title, summary, effect) {
    return {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
      level,
      title,
      summary,
      effect
    };
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function roundPrice(value) {
    if (value >= 1000) return Math.round(value * 100) / 100;
    if (value >= 1) return Math.round(value * 1000) / 1000;
    return Math.round(value * 100000) / 100000;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getPlayerEventScale(state) {
    const playerState = isObject(state) && isObject(state.player) ? state.player : {};
    const initialBudget = Math.max(25000, Number(playerState.initialBudget) || 0);
    const netWorth = Math.max(initialBudget, Number(playerState.netWorth) || initialBudget);
    const cash = Math.max(0, Number(playerState.cash) || 0);
    const reference = Math.max(
      25000,
      Math.min(initialBudget, Math.max(cash, netWorth * 0.32))
    );

    return {
      reference,
      maxPositive: Math.max(2500, netWorth * 0.009),
      maxNegative: Math.max(2500, Math.min(netWorth * 0.014, cash + netWorth * 0.04))
    };
  }

  function normalizeEvents(events) {
    const source = Array.isArray(events) ? events : [];

    return source
      .map((item) => {
        if (!isObject(item)) return null;
        return {
          id: typeof item.id === "string" ? item.id : `news_${Date.now().toString(36)}`,
          day: Math.max(1, Math.floor(Number(item.day) || 1)),
          level: ["macro", "sector", "individual", "business", "cyclic", "info", "player"].includes(item.level) ? item.level : "macro",
          title: typeof item.title === "string" ? item.title : "Noticia",
          summary: typeof item.summary === "string" ? item.summary : "",
          severity: ["info", "opportunity", "warning", "critical"].includes(item.severity) ? item.severity : "info",
          sourceId: typeof item.sourceId === "string" ? item.sourceId : null,
          affected: Array.isArray(item.affected) ? item.affected.slice(0, 12) : [],
          businessImpacts: Array.isArray(item.businessImpacts) ? item.businessImpacts.slice(0, 8) : [],
          businessImpactDetails: Array.isArray(item.businessImpactDetails)
            ? item.businessImpactDetails
              .filter((entry) => entry && typeof entry === "object")
              .map((entry) => ({
                id: typeof entry.id === "string" ? entry.id : null,
                name: typeof entry.name === "string" ? entry.name : "Empresa",
                severity: ["info", "opportunity", "warning", "critical"].includes(entry.severity) ? entry.severity : "info",
                title: typeof entry.title === "string" ? entry.title : "Pulso empresarial",
                body: typeof entry.body === "string" ? entry.body : "",
                actionHint: typeof entry.actionHint === "string" ? entry.actionHint : ""
              }))
              .slice(0, 8)
            : [],
          delta: clamp(Number(item.delta) || 0, -0.5, 0.5),
          duration: Math.max(0, Math.floor(Number(item.duration) || 0)),
          read: Boolean(item.read)
        };
      })
      .filter(Boolean)
      .slice(-MAX_EVENTS);
  }

  function normalizeEventEffects(effectList) {
    const source = Array.isArray(effectList) ? effectList : [];

    return source
      .map((item) => {
        if (!isObject(item)) return null;
        return {
          id: typeof item.id === "string" ? item.id : `effect_${Date.now().toString(36)}`,
          sourceId: typeof item.sourceId === "string" ? item.sourceId : null,
          title: typeof item.title === "string" ? item.title : "Efecto activo",
          level: ["macro", "sector", "individual", "business", "cyclic", "info", "player"].includes(item.level) ? item.level : "macro",
          severity: ["info", "opportunity", "warning", "critical"].includes(item.severity) ? item.severity : "info",
          startDay: Math.max(1, Math.floor(Number(item.startDay) || 1)),
          endDay: Math.max(1, Math.floor(Number(item.endDay) || Number(item.startDay) || 1)),
          assetType: typeof item.assetType === "string" ? item.assetType : null,
          sector: typeof item.sector === "string" ? item.sector : null,
          assetIds: Array.isArray(item.assetIds) ? item.assetIds.filter((id) => typeof id === "string").slice(0, 32) : [],
          ongoingTypeDelta: clamp(Number(item.ongoingTypeDelta) || 0, -0.02, 0.02),
          ongoingSectorDelta: clamp(Number(item.ongoingSectorDelta) || 0, -0.02, 0.02),
          ongoingSentiment: clamp(Number(item.ongoingSentiment) || 0, -0.05, 0.05),
          ongoingInflation: clamp(Number(item.ongoingInflation) || 0, -0.01, 0.01),
          ongoingInterestRate: clamp(Number(item.ongoingInterestRate) || 0, -0.01, 0.01),
          ongoingGdp: clamp(Number(item.ongoingGdp) || 0, -0.01, 0.01),
          businessRevenueDelta: clamp(Number(item.businessRevenueDelta) || 0, -0.08, 0.08),
          businessCostDelta: clamp(Number(item.businessCostDelta) || 0, -0.08, 0.08),
          businessSupplierDelta: clamp(Number(item.businessSupplierDelta) || 0, -0.04, 0.04),
          businessReputationDelta: clamp(Number(item.businessReputationDelta) || 0, -0.02, 0.02),
          businessMoraleDelta: clamp(Number(item.businessMoraleDelta) || 0, -0.02, 0.02),
          propertyOccupancyDelta: clamp(Number(item.propertyOccupancyDelta) || 0, -0.03, 0.03)
        };
      })
      .filter((item) => item && item.endDay >= item.startDay)
      .slice(-40);
  }

  function getDifficultyChance(difficulty) {
    return {
      facil: 0.018,
      normal: 0.026,
      dificil: 0.033,
      pesadilla: 0.043
    }[difficulty] || 0.026;
  }

  function getPlayerEventChance(difficulty) {
    return {
      facil: 0.0006,
      normal: 0.001,
      dificil: 0.0014,
      pesadilla: 0.0018
    }[difficulty] || 0.001;
  }

  function chooseEvent(state) {
    const day = state.time && state.time.day ? state.time.day : 1;
    const difficulty = state.player && state.player.difficulty ? state.player.difficulty : "normal";
    const earlyGame = day < 30;
    const pool = EVENT_POOL.filter((item) => {
      if (!earlyGame) return true;
      if (item.level === "macro" && Number(item.effect.delta) < 0) return false;
      return item.effect.severity !== "critical" && item.effect.delta > -0.035;
    });

    const weighted = pool.map((item) => ({
      item,
      weight: getEventWeight(item, difficulty)
    }));
    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * Math.max(0.0001, totalWeight);

    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }

    return weighted[weighted.length - 1] ? weighted[weighted.length - 1].item : EVENT_POOL[0];
  }

  function getDifficultySettings(difficulty) {
    return economy && typeof economy.getDifficultySettings === "function"
      ? economy.getDifficultySettings(difficulty)
      : { negativeEvents: 1 };
  }

  function isNegativeEvent(eventDefinition) {
    const effect = eventDefinition && eventDefinition.effect ? eventDefinition.effect : {};
    return Number(effect.delta) < 0 || effect.severity === "warning" || effect.severity === "critical";
  }

  function getEventWeight(eventDefinition, difficulty) {
    const settings = getDifficultySettings(difficulty);
    const negativeMultiplier = Number(settings.negativeEvents) || 1;
    if (isNegativeEvent(eventDefinition)) return Math.max(0.2, negativeMultiplier);
    return 1;
  }

  function selectAffectedAssets(state, eventDefinition) {
    const assets = Object.values(state.assets || {});
    const effect = eventDefinition.effect || {};

    if (eventDefinition.level === "player") return [];

    if (effect.random) {
      const tradable = assets.filter((asset) => asset.liquidity > 0.1);
      const picked = tradable[Math.floor(Math.random() * tradable.length)];
      return picked ? [picked] : [];
    }

    return assets
      .filter((asset) => {
        if (effect.type === "all") return true;
        if (effect.type && asset.type === effect.type) return true;
        if (effect.sector && asset.sector === effect.sector) return true;
        return false;
      })
      .slice(0, 28);
  }

  function buildEventEffect(day, eventDefinition, affectedAssets) {
    const effect = eventDefinition.effect || {};
    const duration = Math.max(0, Math.floor(Number(effect.duration) || 0));
    if (duration <= 1) return null;

    return {
      id: `effect_${day}_${eventDefinition.id}_${Math.random().toString(36).slice(2, 6)}`,
      sourceId: eventDefinition.id,
      title: eventDefinition.title,
      level: eventDefinition.level,
      severity: effect.severity || "info",
      startDay: day + 1,
      endDay: day + duration - 1,
      assetType: effect.type && effect.type !== "all" ? effect.type : null,
      sector: effect.sector || null,
      assetIds: affectedAssets.map((asset) => asset.id).slice(0, 28),
      ongoingTypeDelta: Number(effect.ongoingTypeDelta) || 0,
      ongoingSectorDelta: Number(effect.ongoingSectorDelta) || 0,
      ongoingSentiment: Number(effect.ongoingSentiment) || 0,
      ongoingInflation: Number(effect.ongoingInflation) || 0,
      ongoingInterestRate: Number(effect.ongoingInterestRate) || 0,
      ongoingGdp: Number(effect.ongoingGdp) || 0,
      businessRevenueDelta: Number(effect.businessRevenueDelta) || 0,
      businessCostDelta: Number(effect.businessCostDelta) || 0,
      businessSupplierDelta: Number(effect.businessSupplierDelta) || 0,
      businessReputationDelta: Number(effect.businessReputationDelta) || 0,
      businessMoraleDelta: Number(effect.businessMoraleDelta) || 0,
      propertyOccupancyDelta: Number(effect.propertyOccupancyDelta) || 0
    };
  }

  function applyEvent(state, eventDefinition) {
    state.eventEffects = normalizeEventEffects(state.eventEffects);
    const day = state.time && state.time.day ? state.time.day : 1;
    const affectedAssets = selectAffectedAssets(state, eventDefinition);
    const rawEffect = eventDefinition.effect || {};
    const strategy = window.CashEmpireStrategy;
    const effect = strategy && typeof strategy.adjustEventEffect === "function"
      ? strategy.adjustEventEffect(state, eventDefinition, rawEffect)
      : rawEffect;
    const adjustedEventDefinition = effect === rawEffect ? eventDefinition : { ...eventDefinition, effect };
    const delta = Number(effect.delta) || 0;

    affectedAssets.forEach((asset) => {
      const previous = Math.max(0.01, Number(asset.simPrice) || Number(asset.seedPrice) || 1);
      asset.previousSimPrice = previous;
      asset.simPrice = roundPrice(Math.max(0.01, previous * (1 + delta)));
      asset.dailyChangePercent = clamp((asset.simPrice - previous) / previous, -0.5, 0.5);
      asset.lastDelta = asset.dailyChangePercent;
      asset.lastMoveReason = eventDefinition.summary;
      asset.history = Array.isArray(asset.history) ? asset.history.concat({ day, price: asset.simPrice }).slice(-90) : [{ day, price: asset.simPrice }];
      asset.liquidity = clamp((Number(asset.liquidity) || 0.5) - Math.abs(delta) * 0.08, 0.02, 1);
    });

    if (state.macro) {
      state.macro.sentiment = clamp((Number(state.macro.sentiment) || 0) + (Number(effect.sentiment) || 0), -1, 1);
    }

    const playerModule = window.CashEmpirePlayer;
    const playerCashRatio = Number(effect.playerCashRatio) || 0;
    const playerCashMin = Number(effect.playerCashMin) || 0;
    const playerEventScale = getPlayerEventScale(state);
    const scaledPlayerCash = playerCashRatio !== 0
      ? playerEventScale.reference * playerCashRatio
      : 0;
    let playerCashDelta = scaledPlayerCash + playerCashMin;
    if (playerCashDelta > 0) {
      playerCashDelta = Math.min(playerCashDelta, playerEventScale.maxPositive);
    } else if (playerCashDelta < 0) {
      playerCashDelta = Math.max(playerCashDelta, -playerEventScale.maxNegative);
    }
    playerCashDelta = roundPrice(playerCashDelta);
    if (playerCashDelta !== 0 && state.player) {
      state.player.cash = roundPrice(Math.max(0, (Number(state.player.cash) || 0) + playerCashDelta));
      if (playerModule && typeof playerModule.appendCashflow === "function") {
        playerModule.appendCashflow(state, {
          type: "player_event",
          scope: "player",
          label: eventDefinition.title,
          amount: playerCashDelta,
          channel: "windfall"
        });
      }
    }

    const news = {
      id: `news_${day}_${eventDefinition.id}_${Math.random().toString(36).slice(2, 7)}`,
      day,
      level: eventDefinition.level,
      title: eventDefinition.title,
      summary: eventDefinition.summary,
      severity: effect.severity || "info",
      sourceId: eventDefinition.id,
      affected: eventDefinition.level === "player"
        ? ["Jugador"]
        : affectedAssets.slice(0, 10).map((asset) => asset.ticker || asset.name),
      businessImpacts: [],
      businessImpactDetails: [],
      delta,
      duration: Math.max(0, Math.floor(Number(effect.duration) || 0)),
      read: false
    };

    const businesses = window.CashEmpireBusinesses;
    if (businesses && typeof businesses.applyEventImpact === "function") {
      businesses.applyEventImpact(state, adjustedEventDefinition, news);
    }

    const persistedEffect = buildEventEffect(day, adjustedEventDefinition, affectedAssets);
    if (persistedEffect) {
      state.eventEffects = normalizeEventEffects(state.eventEffects.concat(persistedEffect));
    }

    state.events = normalizeEvents(state.events).concat(news).slice(-MAX_EVENTS);
    return news;
  }

  function hasSourceEventToday(state, sourceId, day) {
    return normalizeEvents(state.events).some((item) => item.day === day && item.sourceId === sourceId);
  }

  function getScheduledEvents(state, day) {
    return CYCLIC_EVENTS
      .filter((item) => day > 1 && day % item.every === 0 && !hasSourceEventToday(state, item.definition.id, day))
      .map((item) => item.definition);
  }

  function createInformationalEvent(state, day) {
    if (state.events.length > 0 && day % 14 !== 0) return null;
    const index = day % INFO_EVENTS.length;
    const candidate = INFO_EVENTS[index];
    if (hasSourceEventToday(state, candidate.id, day)) return null;
    return candidate;
  }

  function getActiveEffects(state) {
    const day = state.time && state.time.day ? state.time.day : 1;
    state.eventEffects = normalizeEventEffects(state.eventEffects)
      .filter((item) => item.endDay >= day);
    return state.eventEffects.filter((item) => item.startDay <= day && item.endDay >= day);
  }

  function prepareDay(state) {
    state.events = normalizeEvents(state.events);
    const activeEffects = getActiveEffects(state);
    const summary = {
      activeEffects,
      globalAssetDelta: 0,
      sentimentDelta: 0,
      inflationDelta: 0,
      interestRateDelta: 0,
      gdpDelta: 0,
      typeDeltas: {},
      sectorDeltas: {},
      business: {
        revenueDelta: 0,
        costDelta: 0,
        supplierDelta: 0,
        reputationDelta: 0,
        moraleDelta: 0
      },
      properties: {
        occupancyDelta: 0
      }
    };

    activeEffects.forEach((item) => {
      summary.sentimentDelta += item.ongoingSentiment;
      summary.inflationDelta += item.ongoingInflation;
      summary.interestRateDelta += item.ongoingInterestRate;
      summary.gdpDelta += item.ongoingGdp;
      summary.business.revenueDelta += item.businessRevenueDelta;
      summary.business.costDelta += item.businessCostDelta;
      summary.business.supplierDelta += item.businessSupplierDelta;
      summary.business.reputationDelta += item.businessReputationDelta;
      summary.business.moraleDelta += item.businessMoraleDelta;
      summary.properties.occupancyDelta += item.propertyOccupancyDelta;

      if (item.assetType === "all") {
        summary.globalAssetDelta += item.ongoingTypeDelta;
      } else if (item.assetType) {
        summary.typeDeltas[item.assetType] = (summary.typeDeltas[item.assetType] || 0) + item.ongoingTypeDelta;
      }

      if (item.sector) {
        summary.sectorDeltas[item.sector] = (summary.sectorDeltas[item.sector] || 0) + item.ongoingSectorDelta;
      }
    });

    if (state.macro) {
      state.macro.activeEvents = activeEffects
        .slice()
        .sort((a, b) => a.endDay - b.endDay)
        .slice(0, 4)
        .map((item) => item.title);
    }

    const strategy = window.CashEmpireStrategy;
    return strategy && typeof strategy.adjustEventImpact === "function"
      ? strategy.adjustEventImpact(state, summary)
      : summary;
  }

  function tickEvents(state) {
    state.events = normalizeEvents(state.events);
    state.eventEffects = normalizeEventEffects(state.eventEffects);
    const day = state.time && state.time.day ? state.time.day : 1;
    const lastEvent = state.events[state.events.length - 1];
    const difficulty = state.player && state.player.difficulty ? state.player.difficulty : "normal";
    let chance = getDifficultyChance(difficulty);
    const emitted = [];
    const scheduled = getScheduledEvents(state, day);
    const hasPlayerEventToday = normalizeEvents(state.events).some((item) => item.day === day && item.level === "player");

    scheduled.forEach((definition) => emitted.push(applyEvent(state, definition)));
    if (state.macro && state.macro.phase === "recession") chance += 0.01;
    if (lastEvent && day - lastEvent.day < COOLDOWN_DAYS) chance *= 0.35;
    if (day % 30 === 0) chance += 0.12;
    if (day % 90 === 0) chance += 0.18;

    if (Math.random() <= chance) {
      emitted.push(applyEvent(state, chooseEvent(state)));
    } else {
      const info = createInformationalEvent(state, day);
      if (info) emitted.push(applyEvent(state, info));
    }

    if (!hasPlayerEventToday) {
      const playerChance = getPlayerEventChance(difficulty);
      const playerPool = day < 21
        ? PLAYER_EVENT_POOL.filter((item) => item.effect.severity !== "warning")
        : PLAYER_EVENT_POOL;
      if (playerPool.length && Math.random() <= playerChance) {
        const weightedPool = playerPool.map((item) => ({
          item,
          weight: getEventWeight(item, difficulty)
        }));
        const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * Math.max(0.0001, totalWeight);
        for (const entry of weightedPool) {
          roll -= entry.weight;
          if (roll <= 0) {
            emitted.push(applyEvent(state, entry.item));
            break;
          }
        }
      }
    }

    return emitted.filter(Boolean);
  }

  function markRead(state, eventId) {
    state.events = normalizeEvents(state.events).map((item) => {
      if (item.id !== eventId) return item;
      return { ...item, read: true };
    });
    return state.events;
  }

  function getNewsSummary(events) {
    const list = normalizeEvents(events);
    return {
      count: list.length,
      unread: list.filter((item) => !item.read).length,
      latest: list.slice(-8).reverse(),
      ticker: list.slice(-6).map((item) => `Dia ${item.day}: ${item.title}`)
    };
  }

  window.CashEmpireEvents = {
    EVENT_POOL,
    normalizeEvents,
    normalizeEventEffects,
    applyEvent,
    prepareDay,
    tickEvents,
    markRead,
    getNewsSummary
  };
})();
