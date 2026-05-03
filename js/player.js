(function () {
  "use strict";

  const market = window.CashEmpireMarket;
  const taxesModule = window.CashEmpireTaxes;
  const economy = window.CashEmpireEconomy;
  const strategy = window.CashEmpireStrategy;

  const COMMISSION_RATES = {
    stock: 0.0015,
    bond: 0.001,
    real_estate: 0.025,
    business: 0.018,
    commodity: 0.002,
    crypto: 0.0025,
    collectible: 0.035
  };

  const TAX_RATE_REALIZED_GAIN = 0.2;
  const MAX_TRANSACTIONS = 180;
  const PROPERTY_TAX_FALLBACK = 0.012;

  const PROPERTY_OPERATION_DEFAULTS = {
    Residencial: { occupancy: 0.92, serviceLevel: 0.62, rentIndex: 1, costLoad: 1 },
    Comercial: { occupancy: 0.86, serviceLevel: 0.68, rentIndex: 1, costLoad: 1.12 },
    Oficina: { occupancy: 0.82, serviceLevel: 0.7, rentIndex: 1, costLoad: 1.16 },
    Hotel: { occupancy: 0.68, serviceLevel: 0.76, rentIndex: 1, costLoad: 1.42 }
  };

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function roundQuantity(value) {
    return Math.round((Number(value) || 0) * 1000000) / 1000000;
  }

  function getCommissionRate(assetType) {
    return COMMISSION_RATES[assetType] || 0.003;
  }

  function getQuantityStep(asset) {
    if (!asset) return 0.01;
    if (["bond", "real_estate", "business", "collectible"].includes(asset.type)) return 1;
    return 0.01;
  }

  function normalizeQuantity(value, asset) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    const step = getQuantityStep(asset);
    if (step >= 1) return Math.floor(number);
    return roundQuantity(number);
  }

  function normalizePortfolio(portfolio) {
    const source = Array.isArray(portfolio) ? portfolio : [];

    return source
      .map((position) => {
        const assetId = isObject(position) && typeof position.assetId === "string" ? position.assetId : "";
        const quantity = roundQuantity(Math.max(0, Number(position && position.quantity) || 0));
        const totalCost = roundMoney(Math.max(0, Number(position && position.totalCost) || 0));
        const realizedGain = roundMoney(Number(position && position.realizedGain) || 0);

        if (!assetId || quantity <= 0) return null;

        return {
          assetId,
          quantity,
          totalCost,
          averageCost: roundMoney(totalCost / quantity),
          acquiredDay: Math.max(1, Math.floor(Number(position && position.acquiredDay) || 1)),
          realizedGain
        };
      })
      .filter(Boolean);
  }

  function normalizeTransactions(transactions) {
    const source = Array.isArray(transactions) ? transactions : [];

    return source
      .map((transaction) => {
        if (!isObject(transaction) || typeof transaction.assetId !== "string") return null;

        return {
          id: typeof transaction.id === "string" ? transaction.id : createTransactionId("tx"),
          day: Math.max(1, Math.floor(Number(transaction.day) || 1)),
          type: transaction.type === "sell" ? "sell" : "buy",
          assetId: transaction.assetId,
          assetName: typeof transaction.assetName === "string" ? transaction.assetName : transaction.assetId,
          quantity: roundQuantity(Math.max(0, Number(transaction.quantity) || 0)),
          price: roundMoney(Math.max(0, Number(transaction.price) || 0)),
          gross: roundMoney(Math.max(0, Number(transaction.gross) || 0)),
          fees: roundMoney(Math.max(0, Number(transaction.fees) || 0)),
          taxes: roundMoney(Math.max(0, Number(transaction.taxes) || 0)),
          total: roundMoney(Math.max(0, Number(transaction.total) || 0)),
          realizedGain: roundMoney(Number(transaction.realizedGain) || 0)
        };
      })
      .filter((transaction) => transaction && transaction.quantity > 0)
      .slice(-MAX_TRANSACTIONS);
  }

  function normalizeTaxes(taxes) {
    if (taxesModule && typeof taxesModule.normalizeTaxes === "function") {
      return taxesModule.normalizeTaxes(taxes);
    }

    const source = isObject(taxes) ? taxes : {};

    return {
      realizedGains: roundMoney(Number(source.realizedGains) || 0),
      transactionFees: roundMoney(Math.max(0, Number(source.transactionFees) || 0)),
      taxesPaid: roundMoney(Math.max(0, Number(source.taxesPaid) || 0))
    };
  }

  function findPosition(state, assetId) {
    return normalizePortfolio(state.portfolio).find((position) => position.assetId === assetId) || null;
  }

  function upsertPosition(state, nextPosition) {
    const positions = normalizePortfolio(state.portfolio);
    const index = positions.findIndex((position) => position.assetId === nextPosition.assetId);

    if (nextPosition.quantity <= 0) {
      state.portfolio = positions.filter((position) => position.assetId !== nextPosition.assetId);
      return;
    }

    const normalized = {
      ...nextPosition,
      quantity: roundQuantity(nextPosition.quantity),
      totalCost: roundMoney(nextPosition.totalCost),
      averageCost: roundMoney(nextPosition.totalCost / nextPosition.quantity),
      acquiredDay: Math.max(1, Math.floor(Number(nextPosition.acquiredDay) || 1)),
      realizedGain: roundMoney(nextPosition.realizedGain)
    };

    if (index >= 0) {
      positions[index] = normalized;
    } else {
      positions.push(normalized);
    }

    state.portfolio = positions;
  }

  function getAsset(state, assetId) {
    return state && state.assets && state.assets[assetId] ? state.assets[assetId] : null;
  }

  function getSlippage(asset, gross) {
    if (!market || typeof market.estimateSlippage !== "function") return 0;
    return market.estimateSlippage(asset, gross);
  }

  function estimateTrade(state, assetId, quantity, side) {
    const asset = getAsset(state, assetId);
    if (!asset) {
      return { ok: false, message: "Activo no disponible." };
    }

    const normalizedQuantity = normalizeQuantity(quantity, asset);
    if (normalizedQuantity <= 0) {
      return { ok: false, message: "Ingresa una cantidad valida." };
    }

    const position = findPosition(state, assetId);
    if (side === "sell" && (!position || position.quantity < normalizedQuantity)) {
      return { ok: false, message: "No tienes suficiente cantidad para vender." };
    }

    const referenceGross = asset.simPrice * normalizedQuantity;
    const slippage = getSlippage(asset, referenceGross);
    const fillPrice = roundMoney(asset.simPrice * (side === "sell" ? 1 - slippage : 1 + slippage));
    const gross = roundMoney(fillPrice * normalizedQuantity);
    const commissionRate = getCommissionRate(asset.type);
    const feeModifier = strategy && typeof strategy.getTradeFeeModifier === "function"
      ? strategy.getTradeFeeModifier(state, asset)
      : 1;
    const takeoverFeeModifier = strategy && typeof strategy.getTakeoverTradeModifier === "function"
      ? strategy.getTakeoverTradeModifier(state, asset.id)
      : 1;
    const fees = roundMoney(gross * commissionRate * feeModifier * takeoverFeeModifier);
    const costBasis = side === "sell" && position ? roundMoney(position.averageCost * normalizedQuantity) : 0;
    const realizedGain = side === "sell" ? roundMoney(gross - fees - costBasis) : 0;
    const taxes = side === "sell" ? roundMoney(Math.max(0, realizedGain) * TAX_RATE_REALIZED_GAIN * getTaxMultiplier(state)) : 0;
    const total = side === "sell" ? roundMoney(gross - fees - taxes) : roundMoney(gross + fees);

    return {
      ok: true,
      side,
      asset,
      position,
      quantity: normalizedQuantity,
      unitPrice: fillPrice,
      gross,
      fees,
      taxes,
      total,
      slippage,
      realizedGain,
      costBasis,
      commissionRate,
      feeModifier: roundMoney(feeModifier * takeoverFeeModifier)
    };
  }

  function canAfford(state, estimate) {
    return state.player.cash >= estimate.total;
  }

  function createTransactionId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function appendTransaction(state, estimate) {
    const transaction = {
      id: createTransactionId(estimate.side),
      day: state.time.day,
      type: estimate.side,
      assetId: estimate.asset.id,
      assetName: estimate.asset.name,
      quantity: estimate.quantity,
      price: estimate.unitPrice,
      gross: estimate.gross,
      fees: estimate.fees,
      taxes: estimate.taxes,
      total: estimate.total,
      realizedGain: estimate.realizedGain
    };

    state.transactions = normalizeTransactions(state.transactions).concat(transaction).slice(-MAX_TRANSACTIONS);
    return transaction;
  }

  function normalizeCashflowEntry(entry) {
    if (!isObject(entry)) return null;

    return {
      id: typeof entry.id === "string" ? entry.id : createTransactionId(entry.type || "flow"),
      day: Math.max(1, Math.floor(Number(entry.day) || 1)),
      type: typeof entry.type === "string" ? entry.type : "cashflow",
      assetId: typeof entry.assetId === "string" ? entry.assetId : null,
      businessId: typeof entry.businessId === "string" ? entry.businessId : null,
      scope: entry.scope === "business" ? "business" : "player",
      label: typeof entry.label === "string" ? entry.label : "Flujo de caja",
      amount: roundMoney(Number(entry.amount) || 0),
      gross: roundMoney(Number(entry.gross) || Number(entry.amount) || 0),
      taxes: roundMoney(Math.max(0, Number(entry.taxes) || 0)),
      fees: roundMoney(Math.max(0, Number(entry.fees) || 0)),
      channel: normalizeCashflowChannel(entry.channel, entry.type, entry.scope)
    };
  }

  function normalizeCashflowChannel(channel, type, scope) {
    if (["operating", "financing", "investing", "internal", "windfall"].includes(channel)) {
      return channel;
    }

    switch (type) {
      case "loan_disbursement":
      case "business_credit_draw":
      case "debt_payment":
      case "missed_payment_penalty":
      case "ipo_proceeds":
        return "financing";
      case "deposit_open":
      case "deposit_maturity":
      case "bond_maturity":
      case "business_sale":
      case "renovation":
        return "investing";
      case "capital_contribution":
      case "business_dividend":
        return "internal";
      case "player_event":
        return "windfall";
      default:
        return scope === "business" && type === "business_profit" ? "operating" : "operating";
    }
  }

  function normalizeCashflows(cashflows) {
    const source = Array.isArray(cashflows) ? cashflows : [];
    return source.map(normalizeCashflowEntry).filter(Boolean).slice(-240);
  }

  function appendCashflow(state, entry) {
    const cashflow = normalizeCashflowEntry({
      ...entry,
      day: state.time && state.time.day ? state.time.day : 1
    });

    state.cashflows = normalizeCashflows(state.cashflows).concat(cashflow).slice(-240);
    return cashflow;
  }

  function summarizeCashflows(cashflows, options) {
    const settings = isObject(options) ? options : {};
    const list = normalizeCashflows(cashflows).filter((flow) => {
      if (!settings.startDay) return true;
      return flow.day >= settings.startDay;
    });
    const summary = {
      count: list.length,
      net: 0,
      operating: 0,
      financing: 0,
      investing: 0,
      internal: 0,
      windfall: 0
    };

    list.forEach((flow) => {
      const amount = Number(flow.amount) || 0;
      const channel = normalizeCashflowChannel(flow.channel, flow.type, flow.scope);
      summary.net = roundMoney(summary.net + amount);
      summary[channel] = roundMoney((summary[channel] || 0) + amount);
    });

    return summary;
  }

  function getDifficultySettings(state) {
    const difficulty = state && state.player ? state.player.difficulty : "normal";
    return economy && typeof economy.getDifficultySettings === "function"
      ? economy.getDifficultySettings(difficulty)
      : { dividend: 1 };
  }

  function getPassiveIncomeMultiplier(state) {
    const settings = getDifficultySettings(state);
    return Math.max(0.1, Number(settings.dividend) || 1);
  }

  function getTaxMultiplier(state) {
    const settings = getDifficultySettings(state);
    return Math.max(0, Number(settings.tax) || 1);
  }

  function addPlayerOverdraft(state, amount, label) {
    const principal = roundMoney(Math.max(0, Number(amount) || 0));
    if (principal <= 0) return;
    state.debts = Array.isArray(state.debts) ? state.debts : [];
    const annualRate = state.macro ? clamp((Number(state.macro.interestRate) || 0.04) + 0.12, 0.08, 0.3) : 0.17;
    state.debts.push({
      id: `overdraft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: "personal",
      label: label || "Sobregiro operativo",
      balance: principal,
      principal,
      annualRate,
      monthlyPayment: roundMoney(Math.max(25, principal * 0.08)),
      remainingMonths: 12,
      collateralAssetId: null,
      businessId: null,
      createdDay: state.time && state.time.day ? state.time.day : 1,
      missedPayments: 0
    });
  }

  function applyPlayerCashChange(state, amount, label) {
    const delta = roundMoney(Number(amount) || 0);
    const currentCash = Math.max(0, Number(state.player && state.player.cash) || 0);
    const nextCash = roundMoney(currentCash + delta);
    if (nextCash >= 0) {
      state.player.cash = nextCash;
      return;
    }

    state.player.cash = 0;
    addPlayerOverdraft(state, Math.abs(nextCash), label);
  }

  function getPropertyDefaults(asset) {
    return PROPERTY_OPERATION_DEFAULTS[asset && asset.propertyKind] || PROPERTY_OPERATION_DEFAULTS.Residencial;
  }

  function normalizePropertyOperation(operation, asset) {
    const source = isObject(operation) ? operation : {};
    const defaults = getPropertyDefaults(asset);

    return {
      assetId: asset.id,
      occupancy: clamp(Number(source.occupancy) || defaults.occupancy, 0.35, 0.99),
      condition: clamp(Number(source.condition) || 0.82, 0.2, 1.15),
      serviceLevel: clamp(Number(source.serviceLevel) || defaults.serviceLevel, 0.25, 1.2),
      rentIndex: clamp(Number(source.rentIndex) || defaults.rentIndex, 0.65, 1.55),
      marketing: roundMoney(Math.max(0, Number(source.marketing) || (asset.monthlyRent || 0) * 0.18)),
      lastGross: roundMoney(Number(source.lastGross) || 0),
      lastCosts: roundMoney(Math.max(0, Number(source.lastCosts) || 0)),
      lastNet: roundMoney(Number(source.lastNet) || 0),
      lastProcessedMonth: Math.max(0, Math.floor(Number(source.lastProcessedMonth) || 0))
    };
  }

  function normalizeAssetOperations(operations, portfolio, assets) {
    const source = isObject(operations) ? operations : {};
    const positions = getDecoratedPositions(portfolio, assets);
    const next = {};

    positions
      .filter((position) => position.asset.type === "real_estate")
      .forEach((position) => {
        next[position.assetId] = normalizePropertyOperation(source[position.assetId], position.asset);
      });

    return next;
  }

  function ensureAssetOperations(state) {
    state.assetOps = normalizeAssetOperations(state.assetOps, state.portfolio, state.assets);
    return state.assetOps;
  }

  function estimatePropertyTax(state, value) {
    const annualRate = taxesModule && taxesModule.PROPERTY_TAX_ANNUAL_RATE
      ? taxesModule.PROPERTY_TAX_ANNUAL_RATE
      : PROPERTY_TAX_FALLBACK;
    const strategy = taxesModule && taxesModule.normalizeTaxes
      ? taxesModule.normalizeTaxes(state.taxes).strategy
      : "normal";
    const multiplier = strategy === "agresiva" ? 0.7 : 1;

    return roundMoney(Math.max(0, value) * annualRate / 12 * multiplier);
  }

  function calculateRealEstateMonth(state, position, options) {
    ensureAssetOperations(state);
    const settings = options || {};
    const asset = position.asset;
    const op = state.assetOps[position.assetId] || normalizePropertyOperation(null, asset);
    const defaults = getPropertyDefaults(asset);
    const macro = state.macro || {};
    const gdpBoost = (Number(macro.gdpGrowth) || 0) * (asset.propertyKind === "Hotel" ? 3.2 : 2.2);
    const sentimentBoost = (Number(macro.sentiment) || 0) * 0.08;
    const ratePressure = Math.max(0, (Number(macro.interestRate) || 0.04) - 0.045) * (asset.propertyKind === "Hotel" ? 1.2 : 0.8);
    const marketingBoost = clamp(Math.log10(1 + op.marketing / Math.max(250, (asset.monthlyRent || 1) * position.quantity)) * 0.09, 0, 0.16);
    const pricePressure = Math.max(0, op.rentIndex - 1) * (asset.propertyKind === "Hotel" ? 0.22 : 0.16);
    const qualityBoost = (op.condition - 0.75) * 0.12 + (op.serviceLevel - defaults.serviceLevel) * 0.1;
    const targetOccupancy = clamp(defaults.occupancy + gdpBoost + sentimentBoost + marketingBoost + qualityBoost - ratePressure - pricePressure, 0.35, 0.99);
    const occupancy = clamp(op.occupancy * 0.62 + targetOccupancy * 0.38, 0.35, 0.99);
    const baseMonthly = roundMoney((asset.monthlyRent || 0) * position.quantity * op.rentIndex);
    const gross = roundMoney(baseMonthly * occupancy);
    const maintenance = roundMoney((asset.monthlyMaintenance || 0) * position.quantity * defaults.costLoad * (1 + Math.max(0, 0.82 - op.condition) * 0.8));
    const serviceCost = roundMoney(baseMonthly * (asset.propertyKind === "Hotel" ? 0.18 : 0.055) * op.serviceLevel);
    const marketingCost = roundMoney(op.marketing * 0.35);
    const insurance = roundMoney(position.value * 0.0025 / 12);
    const propertyTax = settings.applyTax && taxesModule && taxesModule.chargePropertyTax
      ? taxesModule.chargePropertyTax(state, position.value).tax
      : estimatePropertyTax(state, position.value);
    const costs = roundMoney(maintenance + serviceCost + marketingCost + insurance + propertyTax);
    const net = roundMoney(gross - costs);

    return {
      operation: op,
      occupancy,
      gross,
      costs,
      net,
      maintenance,
      serviceCost,
      marketingCost,
      insurance,
      propertyTax
    };
  }

  function getRealEstateSummary(state) {
    ensureAssetOperations(state);
    const positions = getDecoratedPositions(state.portfolio, state.assets).filter((position) => position.asset.type === "real_estate");
    const projections = positions.map((position) => ({
      position,
      metrics: calculateRealEstateMonth(state, position, { applyTax: false })
    }));
    const value = roundMoney(positions.reduce((sum, position) => sum + position.value, 0));
    const gross = roundMoney(projections.reduce((sum, item) => sum + item.metrics.gross, 0));
    const costs = roundMoney(projections.reduce((sum, item) => sum + item.metrics.costs, 0));
    const net = roundMoney(projections.reduce((sum, item) => sum + item.metrics.net, 0));
    const averageOccupancy = projections.length
      ? projections.reduce((sum, item) => sum + item.metrics.occupancy, 0) / projections.length
      : 0;
    const hotels = positions.filter((position) => position.asset.propertyKind === "Hotel").length;

    return {
      positions,
      projections,
      value,
      gross,
      costs,
      net,
      averageOccupancy,
      hotels
    };
  }

  function ensureStateBranches(state) {
    state.portfolio = normalizePortfolio(state.portfolio);
    state.transactions = normalizeTransactions(state.transactions);
    state.taxes = normalizeTaxes(state.taxes);
    state.cashflows = normalizeCashflows(state.cashflows);
    ensureAssetOperations(state);
    return state;
  }

  function addAssetPosition(state, assetId, quantity, totalCost, transactionType) {
    ensureStateBranches(state);
    const asset = getAsset(state, assetId);
    if (!asset) return null;
    const normalizedQuantity = normalizeQuantity(quantity, asset);
    if (normalizedQuantity <= 0) return null;

    const existing = findPosition(state, assetId) || {
      assetId,
      quantity: 0,
      totalCost: 0,
      averageCost: 0,
      acquiredDay: state.time && state.time.day ? state.time.day : 1,
      realizedGain: 0
    };
    const nextQuantity = roundQuantity(existing.quantity + normalizedQuantity);
    const nextTotalCost = roundMoney(existing.totalCost + Math.max(0, Number(totalCost) || 0));

    upsertPosition(state, {
      ...existing,
      quantity: nextQuantity,
      totalCost: nextTotalCost,
      realizedGain: existing.realizedGain
    });

    state.transactions = normalizeTransactions(state.transactions).concat({
      id: createTransactionId(transactionType || "position"),
      day: state.time && state.time.day ? state.time.day : 1,
      type: "buy",
      assetId,
      assetName: asset.name,
      quantity: normalizedQuantity,
      price: roundMoney((Number(totalCost) || asset.simPrice * normalizedQuantity) / normalizedQuantity),
      gross: roundMoney(Number(totalCost) || asset.simPrice * normalizedQuantity),
      fees: 0,
      taxes: 0,
      total: roundMoney(Number(totalCost) || asset.simPrice * normalizedQuantity),
      realizedGain: 0
    }).slice(-MAX_TRANSACTIONS);

    return findPosition(state, assetId);
  }

  function buyAsset(state, assetId, quantity) {
    ensureStateBranches(state);
    const estimate = estimateTrade(state, assetId, quantity, "buy");
    if (!estimate.ok) return estimate;

    if (!canAfford(state, estimate)) {
      return {
        ok: false,
        message: "Efectivo insuficiente para cubrir compra y comision.",
        estimate
      };
    }

    const existing = estimate.position || {
      assetId,
      quantity: 0,
      totalCost: 0,
      averageCost: 0,
      realizedGain: 0
    };

    const nextQuantity = roundQuantity(existing.quantity + estimate.quantity);
    const nextTotalCost = roundMoney(existing.totalCost + estimate.total);
    upsertPosition(state, {
      ...existing,
      quantity: nextQuantity,
      totalCost: nextTotalCost,
      realizedGain: existing.realizedGain
    });

    state.player.cash = roundMoney(state.player.cash - estimate.total);
    state.taxes.transactionFees = roundMoney(state.taxes.transactionFees + estimate.fees);
    const transaction = appendTransaction(state, estimate);
    recalculateState(state);

    return {
      ok: true,
      message: `Compraste ${estimate.quantity} de ${estimate.asset.ticker || estimate.asset.name}.`,
      transaction,
      estimate
    };
  }

  function sellAsset(state, assetId, quantity) {
    ensureStateBranches(state);
    const estimate = estimateTrade(state, assetId, quantity, "sell");
    if (!estimate.ok) return estimate;

    const existing = estimate.position;
    const nextQuantity = roundQuantity(existing.quantity - estimate.quantity);
    const nextTotalCost = nextQuantity > 0 ? roundMoney(existing.totalCost - estimate.costBasis) : 0;
    upsertPosition(state, {
      ...existing,
      quantity: nextQuantity,
      totalCost: nextTotalCost,
      realizedGain: roundMoney(existing.realizedGain + estimate.realizedGain)
    });

    if (estimate.asset.type === "business" && nextQuantity <= 0 && Array.isArray(state.businesses)) {
      state.businesses = state.businesses.filter((business) => business.sourceAssetId !== assetId);
    }

    state.player.cash = roundMoney(state.player.cash + estimate.total);
    state.taxes.realizedGains = roundMoney(state.taxes.realizedGains + estimate.realizedGain);
    state.taxes.transactionFees = roundMoney(state.taxes.transactionFees + estimate.fees);
    state.taxes.taxesPaid = roundMoney(state.taxes.taxesPaid + estimate.taxes);
    const transaction = appendTransaction(state, estimate);
    recalculateState(state);

    return {
      ok: true,
      message: `Vendiste ${estimate.quantity} de ${estimate.asset.ticker || estimate.asset.name}.`,
      transaction,
      estimate
    };
  }

  function processPassiveIncome(state, eventImpact) {
    ensureStateBranches(state);
    const day = state.time && state.time.day ? state.time.day : 1;
    const positions = getDecoratedPositions(state.portfolio, state.assets);
    const entries = [];
    const maturedBonds = [];
    const passiveMultiplier = getPassiveIncomeMultiplier(state);

    positions.forEach((position) => {
      const asset = position.asset;
      let gross = 0;
      let label = "";
      let type = "";

      if (day % 90 === 0 && asset.type === "stock" && asset.dividendYield > 0) {
        const takeoverDividendModifier = strategy && typeof strategy.getTakeoverDividendModifier === "function"
          ? strategy.getTakeoverDividendModifier(state, asset.id)
          : 1;
        gross = roundMoney(position.value * asset.dividendYield / 4 * passiveMultiplier * takeoverDividendModifier);
        label = `Dividendo ${asset.ticker || asset.name}`;
        type = "dividend";
      }

      if (day % 30 === 0 && asset.type === "bond" && asset.couponYield > 0) {
        gross = roundMoney(position.value * asset.couponYield / 12 * passiveMultiplier);
        label = `Cupon ${asset.ticker || asset.name}`;
        type = "coupon";
      }

      if (day % 30 === 0 && asset.type === "crypto" && asset.stakingYield > 0) {
        gross = roundMoney(position.value * asset.stakingYield / 12 * passiveMultiplier);
        label = `Staking ${asset.ticker || asset.name}`;
        type = "staking";
      }

      if (day % 30 === 0 && asset.type === "real_estate") {
        const metrics = calculateRealEstateMonth(state, position, { applyTax: true });
        const op = metrics.operation;
        const occupancyDelta = Number(eventImpact && eventImpact.properties && eventImpact.properties.occupancyDelta) || 0;
        op.occupancy = clamp(metrics.occupancy + occupancyDelta, 0.35, 0.99);
        op.condition = clamp(op.condition - (asset.propertyKind === "Hotel" ? 0.018 : 0.011), 0.2, 1.15);
        op.lastGross = metrics.gross;
        op.lastCosts = metrics.costs;
        op.lastNet = metrics.net;
        op.lastProcessedMonth = Math.floor(day / 30);
        state.assetOps[position.assetId] = op;
        gross = metrics.net;
        label = `Renta ${asset.ticker || asset.name}`;
        type = "rent";
      }

      if (asset.type === "bond" && asset.termDays && day - (position.acquiredDay || 1) >= asset.termDays) {
        const principal = roundMoney((asset.seedPrice || asset.simPrice || 0) * position.quantity);
        if (principal > 0) {
          applyPlayerCashChange(state, principal, `Vencimiento ${asset.ticker || asset.name}`);
          entries.push(appendCashflow(state, {
            type: "bond_maturity",
            assetId: asset.id,
            label: `Vencimiento ${asset.ticker || asset.name}`,
            amount: principal,
            gross: principal
          }));
          maturedBonds.push(asset.id);
        }
      }

      if (gross === 0) return;

      let net = gross;
      let tax = 0;
      if (gross > 0 && (type === "dividend" || type === "coupon" || type === "staking")) {
        const taxResult = taxesModule && taxesModule.applyDividendTax
          ? taxesModule.applyDividendTax(state, gross)
          : { net: gross, tax: 0 };
        net = taxResult.net;
        tax = taxResult.tax;
      }

      applyPlayerCashChange(state, net, `Sobregiro por ${label}`);
      entries.push(appendCashflow(state, {
        type,
        assetId: asset.id,
        label,
        amount: net,
        gross,
        taxes: tax
      }));

    });

    if (maturedBonds.length) {
      const maturedSet = new Set(maturedBonds);
      state.portfolio = normalizePortfolio(state.portfolio).filter((position) => !maturedSet.has(position.assetId));
    }

    recalculateState(state);
    return entries;
  }

  function renovateProperty(state, assetId) {
    ensureStateBranches(state);
    const position = findPosition(state, assetId);
    const asset = getAsset(state, assetId);

    if (!position || !asset || asset.type !== "real_estate") {
      return { ok: false, message: "Propiedad no disponible para renovar." };
    }

    const cost = roundMoney(Math.max(1500, asset.simPrice * 0.025));
    if (state.player.cash < cost) {
      return { ok: false, message: "Efectivo insuficiente para renovar." };
    }

    state.player.cash = roundMoney(state.player.cash - cost);
    asset.simPrice = roundMoney(asset.simPrice * 1.045);
    asset.monthlyRent = roundMoney((asset.monthlyRent || 0) * 1.055);
    state.assetOps[assetId] = normalizePropertyOperation(state.assetOps[assetId], asset);
    state.assetOps[assetId].condition = clamp(state.assetOps[assetId].condition + 0.18, 0.2, 1.15);
    state.assetOps[assetId].serviceLevel = clamp(state.assetOps[assetId].serviceLevel + 0.035, 0.25, 1.2);
    asset.lastMoveReason = "Renovacion mejora valor y renta mensual.";
    appendCashflow(state, {
      type: "renovation",
      assetId,
      label: `Renovacion ${asset.ticker || asset.name}`,
      amount: -cost
    });
    recalculateState(state);

    return {
      ok: true,
      message: `Renovaste ${asset.name}.`,
      cost
    };
  }

  function applyRealEstateAction(state, assetId, action) {
    ensureStateBranches(state);
    const position = findPosition(state, assetId);
    const asset = getAsset(state, assetId);

    if (!position || !asset || asset.type !== "real_estate") {
      return { ok: false, message: "Propiedad no disponible." };
    }

    state.assetOps[assetId] = normalizePropertyOperation(state.assetOps[assetId], asset);
    const op = state.assetOps[assetId];

    if (action === "renovate") {
      return renovateProperty(state, assetId);
    }

    if (action === "maintenance") {
      const cost = roundMoney(Math.max(800, (asset.monthlyMaintenance || 0) * position.quantity * 3 + position.value * 0.002));
      if (state.player.cash < cost) return { ok: false, message: "Efectivo insuficiente para mantenimiento." };

      state.player.cash = roundMoney(state.player.cash - cost);
      op.condition = clamp(op.condition + 0.14, 0.2, 1.15);
      op.serviceLevel = clamp(op.serviceLevel + 0.025, 0.25, 1.2);
      appendCashflow(state, {
        type: "property_maintenance",
        assetId,
        label: `Mantenimiento ${asset.ticker || asset.name}`,
        amount: -cost
      });
      recalculateState(state);
      return { ok: true, message: `Mantenimiento aplicado en ${asset.name}.` };
    }

    if (action === "marketing") {
      const cost = roundMoney(Math.max(600, (asset.monthlyRent || 0) * position.quantity * (asset.propertyKind === "Hotel" ? 0.75 : 0.45)));
      if (state.player.cash < cost) return { ok: false, message: "Efectivo insuficiente para marketing inmobiliario." };

      state.player.cash = roundMoney(state.player.cash - cost);
      op.marketing = roundMoney(op.marketing + cost * 0.6);
      op.occupancy = clamp(op.occupancy + 0.025, 0.35, 0.99);
      appendCashflow(state, {
        type: "property_marketing",
        assetId,
        label: `Marketing ${asset.ticker || asset.name}`,
        amount: -cost
      });
      recalculateState(state);
      return { ok: true, message: `Marketing activo en ${asset.name}.` };
    }

    if (action === "price_up") {
      op.rentIndex = clamp(op.rentIndex + 0.05, 0.65, 1.55);
      op.occupancy = clamp(op.occupancy - 0.012, 0.35, 0.99);
      return { ok: true, message: `${asset.name}: renta/precio objetivo subio.` };
    }

    if (action === "price_down") {
      op.rentIndex = clamp(op.rentIndex - 0.05, 0.65, 1.55);
      op.occupancy = clamp(op.occupancy + 0.016, 0.35, 0.99);
      return { ok: true, message: `${asset.name}: renta/precio objetivo bajo para ganar ocupacion.` };
    }

    if (action === "manager") {
      const cost = roundMoney(Math.max(900, (asset.monthlyRent || 0) * position.quantity * 0.5));
      if (state.player.cash < cost) return { ok: false, message: "Efectivo insuficiente para gestion profesional." };

      state.player.cash = roundMoney(state.player.cash - cost);
      op.serviceLevel = clamp(op.serviceLevel + 0.09, 0.25, 1.2);
      op.condition = clamp(op.condition + 0.025, 0.2, 1.15);
      op.occupancy = clamp(op.occupancy + 0.018, 0.35, 0.99);
      appendCashflow(state, {
        type: "property_manager",
        assetId,
        label: `Gestion ${asset.ticker || asset.name}`,
        amount: -cost
      });
      recalculateState(state);
      return { ok: true, message: `${asset.name} ahora tiene gestion profesional.` };
    }

    return { ok: false, message: "Accion inmobiliaria no reconocida." };
  }

  function getDecoratedPositions(portfolio, assets) {
    return normalizePortfolio(portfolio)
      .map((position) => {
        const asset = assets && assets[position.assetId];
        if (!asset) return null;

        const value = roundMoney(asset.simPrice * position.quantity);
        const unrealizedGain = roundMoney(value - position.totalCost);
        const roi = position.totalCost > 0 ? unrealizedGain / position.totalCost : 0;

        return {
          ...position,
          asset,
          value,
          unrealizedGain,
          roi: clamp(roi, -9.99, 99)
        };
      })
      .filter(Boolean);
  }

  function getPortfolioSummary(portfolio, assets) {
    const positions = getDecoratedPositions(portfolio, assets);
    const totalValue = roundMoney(positions.reduce((sum, position) => sum + position.value, 0));
    const totalCost = roundMoney(positions.reduce((sum, position) => sum + position.totalCost, 0));
    const unrealizedGain = roundMoney(totalValue - totalCost);
    const roi = totalCost > 0 ? unrealizedGain / totalCost : 0;
    const allocation = positions.reduce((groups, position) => {
      const type = position.asset.type;
      groups[type] = groups[type] || {
        type,
        label: position.asset.categoryLabel || type,
        value: 0,
        count: 0
      };
      groups[type].value = roundMoney(groups[type].value + position.value);
      groups[type].count += 1;
      return groups;
    }, {});

    return {
      positions,
      count: positions.length,
      totalValue,
      totalCost,
      unrealizedGain,
      roi,
      allocation
    };
  }

  function recalculateState(state) {
    ensureStateBranches(state);
    const summary = getPortfolioSummary(state.portfolio, state.assets);
    const managedBusinessAssetIds = Array.isArray(state.businesses)
      ? new Set(state.businesses.map((business) => business.sourceAssetId).filter(Boolean))
      : new Set();
    const investablePortfolioValue = summary.positions
      .filter((position) => !(position.asset.type === "business" && managedBusinessAssetIds.has(position.assetId)))
      .reduce((sum, position) => sum + position.value, 0);
    const debtTotal = Array.isArray(state.debts)
      ? state.debts.reduce((sum, debt) => sum + Math.max(0, Number(debt.balance) || 0), 0)
      : 0;
    const businessValue = Array.isArray(state.businesses)
      ? state.businesses.reduce((sum, business) => {
        const ownership = Math.min(1, Math.max(0.1, Number(business.ownershipPercent) || 1));
        const valuation = Math.max(0, Number(business.valuation) || 0);
        const debt = Math.max(0, Number(business.debt) || 0);
        const payables = Math.max(0, Number(business.payables) || 0);
        // Business cash stays inside enterprise value accounting until the player
        // extracts it explicitly via dividends or sale proceeds.
        return sum + Math.max(0, valuation - debt - payables) * ownership;
      }, 0)
      : 0;
    const depositValue = state.bank && Array.isArray(state.bank.deposits)
      ? state.bank.deposits.reduce((sum, deposit) => sum + Math.max(0, Number(deposit.principal) || 0), 0)
      : 0;

    state.player.cash = roundMoney(Math.max(0, Number(state.player.cash) || 0));
    state.player.netWorth = roundMoney(state.player.cash + investablePortfolioValue + businessValue + depositValue - debtTotal);
    return state;
  }

  window.CashEmpirePlayer = {
    COMMISSION_RATES,
    TAX_RATE_REALIZED_GAIN,
    getCommissionRate,
    getQuantityStep,
    normalizeQuantity,
    normalizePortfolio,
    normalizeTransactions,
    normalizeTaxes,
    normalizeCashflows,
    summarizeCashflows,
    normalizeAssetOperations,
    findPosition,
    appendCashflow,
    addAssetPosition,
    estimateTrade,
    buyAsset,
    sellAsset,
    processPassiveIncome,
    getRealEstateSummary,
    calculateRealEstateMonth,
    renovateProperty,
    applyRealEstateAction,
    getDecoratedPositions,
    getPortfolioSummary,
    recalculateState
  };
})();
