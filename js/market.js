(function () {
  "use strict";

  const data = window.CashEmpireData;
  const economy = window.CashEmpireEconomy;
  const HISTORY_LIMIT = 90;
  const MIN_PRICE = 0.000001;

  const DIFFICULTY_VOLATILITY = {
    facil: 0.72,
    normal: 1,
    dificil: 1.28,
    pesadilla: 1.6
  };

  const CATEGORY_DAILY_LIMIT = {
    stock: 0.09,
    bond: 0.028,
    real_estate: 0.018,
    business: 0.035,
    commodity: 0.08,
    crypto: 0.18,
    collectible: 0.04
  };

  const CATEGORY_RETURN_PREMIUM = {
    stock: 0.035,
    bond: 0.006,
    real_estate: 0.022,
    business: 0.038,
    commodity: 0.01,
    crypto: 0.08,
    collectible: 0.02
  };

  const CATEGORY_MEAN_REVERSION = {
    stock: 0.035,
    bond: 0.09,
    real_estate: 0.05,
    business: 0.055,
    commodity: 0.06,
    crypto: 0.24,
    collectible: 0.05
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function roundPrice(value) {
    if (value >= 1000) return Math.round(value * 100) / 100;
    if (value >= 1) return Math.round(value * 1000) / 1000;
    return Math.round(value * 100000) / 100000;
  }

  function signedNoise(scale) {
    return (Math.random() * 2 - 1) * scale;
  }

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function toDayNumber(value, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number >= 1 ? number : fallback;
  }

  function getCatalog() {
    return data && typeof data.getCatalog === "function" ? data.getCatalog() : [];
  }

  function getSectorConfig(sector) {
    return data && typeof data.getSectorConfig === "function"
      ? data.getSectorConfig(sector)
      : {
        label: "Sector",
        beta: 1,
        volatility: 1,
        phaseBias: {
          expansion: 0,
          peak: 0,
          recession: 0,
          recovery: 0
        }
      };
  }

  function getCategoryLabel(type) {
    return data && typeof data.getCategoryLabel === "function" ? data.getCategoryLabel(type) : "Activo";
  }

  function normalizeHistory(history, day, price) {
    const safeDay = toDayNumber(day, 1);
    const safePrice = roundPrice(toPositiveNumber(price, MIN_PRICE));
    const source = Array.isArray(history) ? history : [];
    const normalized = source
      .map((point) => ({
        day: toDayNumber(point && point.day, safeDay),
        price: roundPrice(toPositiveNumber(point && point.price, safePrice))
      }))
      .filter((point) => point.day >= 1 && point.price >= MIN_PRICE)
      .slice(-HISTORY_LIMIT);

    if (normalized.length === 0) {
      return [{ day: safeDay, price: safePrice }];
    }

    return normalized;
  }

  function normalizeAsset(rawAsset, catalogAsset, options) {
    const settings = options || {};
    const day = toDayNumber(settings.day, 1);
    const source = isObject(rawAsset) ? rawAsset : {};
    const seedPrice = roundPrice(toPositiveNumber(catalogAsset.seedPrice, 1));
    const simPrice = roundPrice(toPositiveNumber(source.simPrice, seedPrice));
    const previousSimPrice = roundPrice(toPositiveNumber(source.previousSimPrice, simPrice));
    const history = normalizeHistory(source.history, day, simPrice);
    return {
      ...catalogAsset,
      categoryLabel: getCategoryLabel(catalogAsset.type),
      sectorLabel: getSectorConfig(catalogAsset.sector).label,
      seedPrice,
      simPrice,
      previousSimPrice,
      lastDelta: clamp(toFiniteNumber(source.lastDelta, 0), -0.5, 0.5),
      dailyChangePercent: clamp(toFiniteNumber(source.dailyChangePercent, 0), -0.5, 0.5),
      volume: Math.max(0, Math.round(toFiniteNumber(source.volume, catalogAsset.baseDailyVolume || 0))),
      liquidity: clamp(toFiniteNumber(source.liquidity, catalogAsset.liquidity || 0.5), 0.02, 1),
      slippageEstimate: clamp(toFiniteNumber(source.slippageEstimate, 0), 0, 0.25),
      lastMoveReason: typeof source.lastMoveReason === "string" ? source.lastMoveReason : "Semilla inicial del catalogo.",
      history: history.slice(-HISTORY_LIMIT)
    };
  }

  function normalizeAssets(value, options) {
    const source = isObject(value) ? value : {};
    const catalog = getCatalog();

    return catalog.reduce((assets, catalogAsset) => {
      assets[catalogAsset.id] = normalizeAsset(source[catalogAsset.id], catalogAsset, options);
      return assets;
    }, {});
  }

  function createInitialAssets(options) {
    return normalizeAssets({}, options || { day: 1 });
  }

  function getDifficultyVolatility(difficulty) {
    const settings = getDifficultySettings(difficulty);
    return settings && settings.volatility ? settings.volatility : DIFFICULTY_VOLATILITY[difficulty] || DIFFICULTY_VOLATILITY.normal;
  }

  function getDifficultySettings(difficulty) {
    return economy && typeof economy.getDifficultySettings === "function"
      ? economy.getDifficultySettings(difficulty)
      : { volatility: DIFFICULTY_VOLATILITY[difficulty] || DIFFICULTY_VOLATILITY.normal, marketDrift: 1 };
  }

  function getLongTermReturnPremium(asset) {
    return CATEGORY_RETURN_PREMIUM[asset.type] || 0.02;
  }

  function getMeanReversionStrength(asset) {
    return CATEGORY_MEAN_REVERSION[asset.type] || 0.04;
  }

  function getValuationBounds(asset) {
    if (asset.type === "crypto" && asset.isStablecoin) {
      return { min: 0.97, max: 1.03 };
    }

    if (asset.type === "crypto" && asset.isSpeculative) {
      const cap = clamp(toFiniteNumber(asset.momentumCap, asset.seedPrice < 0.01 ? 8 : 14), 2, 18);
      return { min: 0.25, max: cap };
    }

    return { min: 0.2, max: 12 };
  }

  function getDailyLimitForAsset(asset) {
    if (asset.type === "crypto" && asset.isStablecoin) return 0.012;
    if (asset.type === "crypto" && asset.isSpeculative) {
      const ratio = (asset.simPrice || asset.seedPrice || MIN_PRICE) / Math.max(MIN_PRICE, asset.priceAnchor || asset.seedPrice || MIN_PRICE);
      if (ratio > 4) return 0.04;
      if (ratio > 2) return 0.065;
      return 0.11;
    }
    return getDailyLimit(asset.type);
  }

  function getDailyLimit(type) {
    return CATEGORY_DAILY_LIMIT[type] || 0.08;
  }

  function getPhaseBias(asset, macro) {
    const sector = getSectorConfig(asset.sector);
    const phase = macro && macro.phase ? macro.phase : "expansion";
    return toFiniteNumber(sector.phaseBias && sector.phaseBias[phase], 0) / 252;
  }

  function getRateSensitivity(asset) {
    if (asset.type === "bond") return -Math.max(1, asset.durationYears || 4) * 0.12;
    if (asset.type === "real_estate") return -0.85;
    if (asset.type === "business") return -0.38;
    if (asset.type === "stock" && asset.sector === "technology") return -0.45;
    if (asset.type === "crypto") return -0.35;
    return -0.18;
  }

  function getInflationSensitivity(asset) {
    if (asset.type === "commodity") return 0.55;
    if (asset.type === "real_estate") return 0.32;
    if (asset.type === "business") return 0.18;
    if (asset.sector === "consumer") return 0.16;
    if (asset.type === "bond") return -0.3;
    return 0.04;
  }

  function getMoveReason(asset, macro, delta) {
    if (!macro) return "Movimiento por ruido y drift del activo.";
    if (asset.type === "bond" && macro.interestRate > 0.07) return "Tasas altas presionan el precio del bono.";
    if (asset.type === "real_estate" && macro.interestRate > 0.07) return "Credito caro reduce demanda inmobiliaria.";
    if (asset.type === "commodity" && macro.inflation > 0.06) return "Inflacion alta favorece activos fisicos.";
    if (asset.type === "business" && macro.gdpGrowth < 0) return "Menor crecimiento presiona valuaciones privadas.";
    if (asset.sector === "technology" && macro.sentiment < -0.2) return "Menor apetito por riesgo golpea growth.";
    if (asset.type === "crypto" && Math.abs(delta) > 0.04) return "Alta volatilidad crypto amplifica el movimiento.";
    if (delta >= 0) return "Macro y sector aportan impulso positivo.";
    return "Macro y sector dejan presion vendedora.";
  }

  function estimateSlippage(asset, orderValue) {
    const value = Math.max(0, Number(orderValue) || 0);
    const dailyDollarVolume = Math.max(1, (asset.volume || 0) * (asset.simPrice || asset.seedPrice || 1));
    const liquidityPenalty = 1 / clamp(asset.liquidity || 0.5, 0.02, 1);
    const speculativePenalty = asset.type === "crypto" && asset.isSpeculative ? 1.6 : 1;
    const impact = Math.pow(value / dailyDollarVolume, 0.72) * 0.035 * liquidityPenalty * speculativePenalty;

    return clamp(impact, 0, 0.18);
  }

  function tickAsset(asset, macro, options) {
    const settings = options || {};
    const difficulty = settings.difficulty || "normal";
    const day = toDayNumber(settings.day, 1);
    const eventImpact = settings.eventImpact || null;
    const sector = getSectorConfig(asset.sector);
    const difficultySettings = getDifficultySettings(difficulty);
    const difficultyVolatility = getDifficultyVolatility(difficulty);
    const marketDrift = Number(difficultySettings.marketDrift) || 1;
    const macroDelta = macro ? toFiniteNumber(macro.lastDailyMarketDelta, 0) : 0;
    const sentiment = macro ? toFiniteNumber(macro.sentiment, 0) : 0;
    const gdpGrowth = macro ? toFiniteNumber(macro.gdpGrowth, 0) : 0;
    const inflation = macro ? toFiniteNumber(macro.inflation, 0.03) : 0.03;
    const interestRate = macro ? toFiniteNumber(macro.interestRate, 0.04) : 0.04;
    const anchorPrice = Math.max(MIN_PRICE, asset.priceAnchor || asset.seedPrice || MIN_PRICE);
    const macroExposure = asset.type === "crypto" && asset.isStablecoin ? 0.08 : asset.type === "crypto" && asset.isSpeculative ? 0.72 : 1;
    const driftPremium = asset.type === "crypto" && asset.isStablecoin ? 0 : getLongTermReturnPremium(asset);
    const rawValuationRatio = (asset.simPrice || asset.seedPrice || MIN_PRICE) / anchorPrice;
    const valuationBounds = getValuationBounds(asset);
    const valuationRatio = clamp(rawValuationRatio, valuationBounds.min, Math.max(valuationBounds.min, rawValuationRatio));
    let driftAnnual = (toFiniteNumber(asset.driftAnnual, 0.03) + driftPremium) * marketDrift;
    if (asset.type === "crypto" && asset.isStablecoin) driftAnnual = 0;
    if (asset.type === "crypto" && asset.isSpeculative) {
      if (rawValuationRatio > 4) driftAnnual -= 0.2;
      else if (rawValuationRatio > 2) driftAnnual -= 0.08;
      else driftAnnual *= 0.55;
    }
    const driftDaily = driftAnnual / 252;
    const rateDelta = getRateSensitivity(asset) * (interestRate - 0.04) / 365;
    const inflationDelta = getInflationSensitivity(asset) * (inflation - 0.03) / 365;
    const growthDelta = (gdpGrowth / 252) * clamp(asset.beta || 1, -2, 2) * 0.35 * macroExposure;
    const sectorDelta = ((sector.beta || 1) * macroDelta * 0.55 + getPhaseBias(asset, macro)) * macroExposure;
    const randomScale = 0.0075 * (asset.volatility || 1) * (sector.volatility || 1) * difficultyVolatility;
    const randomDelta = signedNoise(randomScale);
    const volatilityDrag = randomScale * randomScale * 0.18;
    let meanReversion = -Math.log(valuationRatio) * getMeanReversionStrength(asset) / 252;
    if (asset.type === "crypto" && asset.isStablecoin) {
      meanReversion = -Math.log(valuationRatio) * 18 / 252;
    } else if (asset.type === "crypto" && asset.isSpeculative) {
      const ratioPressure = rawValuationRatio > 4 ? 8.5 : rawValuationRatio > 2 ? 5.5 : 3.2;
      meanReversion = -Math.log(valuationRatio) * ratioPressure / 252;
    }
    const sentimentDelta = sentiment * 0.00045 * clamp(asset.beta || 1, -2, 2) * macroExposure;
    const activeTypeDelta = (eventImpact
      ? (Number(eventImpact.globalAssetDelta) || 0) +
        (Number(eventImpact.typeDeltas && eventImpact.typeDeltas[asset.type]) || 0) +
        (Number(eventImpact.sectorDeltas && eventImpact.sectorDeltas[asset.sector]) || 0)
      : 0) * macroExposure;
    const dailyLimit = getDailyLimitForAsset(asset);
    const rawDelta = driftDaily + sectorDelta + growthDelta + rateDelta + inflationDelta + sentimentDelta + randomDelta + activeTypeDelta + meanReversion - volatilityDrag;
    const delta = clamp(rawDelta, -dailyLimit, dailyLimit);
    const previousSimPrice = asset.simPrice;
    const boundedPrice = previousSimPrice * (1 + delta);
    const capFloorPrice = anchorPrice * valuationBounds.min;
    const capCeilingPrice = anchorPrice * valuationBounds.max;
    const simPrice = roundPrice(clamp(Math.max(MIN_PRICE, boundedPrice), capFloorPrice, capCeilingPrice));
    const volumeShock = 1 + Math.abs(delta) * 34 + Math.random() * 0.25;
    const volume = Math.max(0, Math.round((asset.baseDailyVolume || asset.volume || 1) * volumeShock));
    const liquidityDrift = asset.liquidity + signedNoise(0.006) - Math.abs(delta) * 0.015;
    const liquidity = clamp(liquidityDrift, 0.02, 1);
    const history = asset.history.concat({ day, price: simPrice }).slice(-HISTORY_LIMIT);
    const nextAsset = {
      ...asset,
      previousSimPrice,
      simPrice,
      lastDelta: delta,
      dailyChangePercent: delta,
      volume,
      liquidity,
      history,
      lastMoveReason: getMoveReason(asset, macro, delta)
    };

    nextAsset.slippageEstimate = estimateSlippage(nextAsset, getReferenceOrderValue(nextAsset));
    return nextAsset;
  }

  function tickMarketDay(assets, macro, options) {
    const settings = options || {};
    const normalized = normalizeAssets(assets, settings);

    return Object.keys(normalized).reduce((nextAssets, assetId) => {
      nextAssets[assetId] = tickAsset(normalized[assetId], macro, settings);
      return nextAssets;
    }, {});
  }

  function getReferenceOrderValue(asset) {
    if (asset.type === "real_estate" || asset.type === "business" || asset.type === "collectible") {
      return Math.min(asset.simPrice * 0.25, 250000);
    }

    return Math.min(Math.max(asset.simPrice * 25, 10000), 250000);
  }

  function getAssetList(assets) {
    return Object.values(normalizeAssets(assets)).sort((a, b) => {
      const typeCompare = String(a.type).localeCompare(String(b.type));
      if (typeCompare !== 0) return typeCompare;
      return String(a.ticker || a.name).localeCompare(String(b.ticker || b.name));
    });
  }

  function getMarketIndex(assets) {
    const list = getAssetList(assets);
    if (list.length === 0) return 100;

    const total = list.reduce((sum, asset) => {
      return sum + (asset.simPrice / Math.max(asset.seedPrice, MIN_PRICE)) * 100;
    }, 0);

    return Math.round((total / list.length) * 100) / 100;
  }

  function getIndexHistory(assets) {
    const list = getAssetList(assets);
    const pointsByDay = new Map();

    list.forEach((asset) => {
      asset.history.forEach((point) => {
        const seedPrice = Math.max(asset.seedPrice, MIN_PRICE);
        const value = (point.price / seedPrice) * 100;
        const current = pointsByDay.get(point.day) || { day: point.day, total: 0, count: 0 };
        current.total += value;
        current.count += 1;
        pointsByDay.set(point.day, current);
      });
    });

    return Array.from(pointsByDay.values())
      .sort((a, b) => a.day - b.day)
      .map((point) => ({
        day: point.day,
        value: Math.round((point.total / Math.max(1, point.count)) * 100) / 100
      }))
      .slice(-HISTORY_LIMIT);
  }

  function getMarketSummary(assets) {
    const list = getAssetList(assets);
    const totalVolume = list.reduce((sum, asset) => sum + (asset.volume || 0), 0);
    const averageChange = list.length
      ? list.reduce((sum, asset) => sum + (asset.dailyChangePercent || 0), 0) / list.length
      : 0;
    const sortedByChange = list.slice().sort((a, b) => (b.dailyChangePercent || 0) - (a.dailyChangePercent || 0));
    const sortedByAbsChange = list.slice().sort((a, b) => Math.abs(b.dailyChangePercent || 0) - Math.abs(a.dailyChangePercent || 0));

    return {
      count: list.length,
      averageChange,
      marketIndex: getMarketIndex(assets),
      indexHistory: getIndexHistory(assets),
      totalVolume,
      topMover: sortedByChange[0] || null,
      worstMover: sortedByChange[sortedByChange.length - 1] || null,
      notableMovers: sortedByAbsChange.slice(0, 6),
      categories: list.reduce((groups, asset) => {
        groups[asset.type] = groups[asset.type] || {
          type: asset.type,
          label: asset.categoryLabel,
          count: 0,
          averageChange: 0
        };
        groups[asset.type].count += 1;
        groups[asset.type].averageChange += asset.dailyChangePercent || 0;
        return groups;
      }, {})
    };
  }

  window.CashEmpireMarket = {
    HISTORY_LIMIT,
    createInitialAssets,
    normalizeAssets,
    tickMarketDay,
    estimateSlippage,
    getAssetList,
    getMarketIndex,
    getIndexHistory,
    getMarketSummary
  };
})();
