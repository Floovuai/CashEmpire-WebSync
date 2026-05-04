(function () {
  "use strict";

  const data = window.CashEmpireData;
  const economy = window.CashEmpireEconomy;
  const taxes = window.CashEmpireTaxes;
  const player = window.CashEmpirePlayer;
  const strategy = window.CashEmpireStrategy;
  const MAX_BUSINESSES = 36;
  const PRODUCTIVITY_TARGET = 1;
  const RND_PRODUCTIVITY_GAIN = 0.18;
  const MONTHLY_INJECTION_ACTIONS = {
    contribute: { label: "Aporte de capital", min: 1000 },
    inventory: { label: "Insumos", min: 500 },
    marketing: { label: "Marketing", min: 100 },
    rnd: { label: "I+D", min: 250 },
    supplier_credit: { label: "Credito proveedor", min: 500 }
  };

  const SECTOR_DEFAULTS = {
    food: { label: "Gastronomia", grossMargin: 0.62, baseTicket: 16, demand: 1080, unitType: "local", staffPerUnit: 3 },
    retail: { label: "Retail", grossMargin: 0.48, baseTicket: 32, demand: 820, unitType: "tienda", staffPerUnit: 4 },
    services: { label: "Servicios", grossMargin: 0.72, baseTicket: 55, demand: 480, unitType: "oficina", staffPerUnit: 3 },
    logistics: { label: "Logistica", grossMargin: 0.42, baseTicket: 120, demand: 360, unitType: "deposito", staffPerUnit: 6 },
    construction: { label: "Construccion", grossMargin: 0.36, baseTicket: 1800, demand: 18, unitType: "obra", staffPerUnit: 8 },
    software: { label: "Software", grossMargin: 0.68, baseTicket: 72, demand: 340, unitType: "equipo", staffPerUnit: 3 },
    hospitality: { label: "Hoteleria", grossMargin: 0.58, baseTicket: 140, demand: 710, unitType: "hotel", staffPerUnit: 9 },
    banking: { label: "Banca", grossMargin: 0.62, baseTicket: 90, demand: 860, unitType: "sucursal", staffPerUnit: 6 },
    real_estate: { label: "Real estate", grossMargin: 0.68, baseTicket: 220, demand: 180, unitType: "oficina", staffPerUnit: 3 },
    energy: { label: "Energia", grossMargin: 0.4, baseTicket: 500, demand: 120, unitType: "planta", staffPerUnit: 10 },
    media: { label: "Media", grossMargin: 0.68, baseTicket: 25, demand: 940, unitType: "estudio", staffPerUnit: 4 }
  };

  const SUPPLIER_PRESETS = {
    food: ["Proveedor alimentos", "Distribuidor bebidas"],
    retail: ["Mayorista regional", "Importador directo"],
    services: ["Servicios profesionales", "Backoffice externo"],
    logistics: ["Operador flota", "Proveedor combustible"],
    construction: ["Materiales obra", "Subcontratista"],
    software: ["Cloud proveedor", "Talento freelance"],
    hospitality: ["Lavanderia hotelera", "Amenities premium"],
    banking: ["Core bancario", "Procesador pagos"],
    real_estate: ["Broker local", "Mantenimiento edificios"],
    energy: ["Insumos energia", "Mantenimiento planta"],
    media: ["Productora externa", "Red anuncios"]
  };

  const SUPPLY_PRESETS = {
    food: { label: "Ingredientes", unitLabel: "lotes", wasteRate: 0.035, minCoverageMonths: 1.15 },
    retail: { label: "Mercancia", unitLabel: "cajas", wasteRate: 0.012, minCoverageMonths: 1.1 },
    services: { label: "Horas facturables", unitLabel: "bloques", wasteRate: 0.006, minCoverageMonths: 0.8 },
    logistics: { label: "Combustible y repuestos", unitLabel: "rutas", wasteRate: 0.018, minCoverageMonths: 0.9 },
    construction: { label: "Materiales de obra", unitLabel: "paquetes", wasteRate: 0.015, minCoverageMonths: 1 },
    software: { label: "Capacidad cloud", unitLabel: "bloques", wasteRate: 0.004, minCoverageMonths: 0.7 },
    hospitality: { label: "Amenidades", unitLabel: "kits", wasteRate: 0.025, minCoverageMonths: 1 },
    banking: { label: "Procesamiento", unitLabel: "bloques", wasteRate: 0.003, minCoverageMonths: 0.65 },
    real_estate: { label: "Leads y mantenimiento", unitLabel: "servicios", wasteRate: 0.008, minCoverageMonths: 0.85 },
    energy: { label: "Insumos energia", unitLabel: "MWh eq.", wasteRate: 0.01, minCoverageMonths: 1.05 },
    media: { label: "Produccion y pauta", unitLabel: "paquetes", wasteRate: 0.012, minCoverageMonths: 0.9 }
  };

  const UNIT_LOCATION_OPTIONS = {
    food: ["Zona gastronomica", "Distrito central", "Corredor turistico", "Barrio residencial"],
    retail: ["Corredor comercial", "Centro urbano", "Mall premium", "Barrio emergente"],
    services: ["Distrito corporativo", "Centro urbano", "Corredor universitario", "Barrio premium"],
    logistics: ["Parque logistico", "Anillo periferico", "Zona industrial", "Puerto seco"],
    construction: ["Frente urbano", "Zona de expansion", "Corredor industrial", "Distrito central"],
    software: ["Distrito tecnologico", "Corredor universitario", "Centro creativo", "Hub remoto"],
    hospitality: ["Corredor turistico", "Zona historica", "Distrito premium", "Centro urbano"],
    banking: ["Centro financiero", "Distrito corporativo", "Zona premium", "Barrio comercial"],
    real_estate: ["Distrito premium", "Centro urbano", "Barrio residencial", "Corredor comercial"],
    energy: ["Nodo industrial", "Puerto energetico", "Zona minera", "Corredor logistico"],
    media: ["Distrito creativo", "Centro cultural", "Zona premium", "Centro urbano"]
  };

  const LOCATION_PROFILES = [
    { pattern: /premium|financier|corporativ|tecnolog|turistic|mall/i, demand: 1.16, collection: 0.92, rent: 1.12 },
    { pattern: /central|urban|historic|creativ|cultural/i, demand: 1.08, collection: 0.88, rent: 1.05 },
    { pattern: /comercial|residencial|universitari/i, demand: 1.02, collection: 0.84, rent: 1 },
    { pattern: /logistic|industrial|puerto|miner/i, demand: 0.97, collection: 0.9, rent: 0.96 },
    { pattern: /perifer|emergente|expansion|remoto/i, demand: 0.92, collection: 0.78, rent: 0.9 }
  ];

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function finiteOrFallback(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getMonthlyInjectionMeta(action) {
    return MONTHLY_INJECTION_ACTIONS[action] || null;
  }

  function getRndProductivityGapAmount(business, target = PRODUCTIVITY_TARGET) {
    const productivity = clamp(Number(business && business.productivity) || 0, 0.1, 1.4);
    const targetProductivity = clamp(Number(target) || PRODUCTIVITY_TARGET, 0.1, 1.4);
    if (productivity >= targetProductivity) return 0;

    const valuation = Math.max(1, Number(business && business.valuation) || 0);
    return roundMoney(Math.ceil(((targetProductivity - productivity) * valuation) / RND_PRODUCTIVITY_GAIN));
  }

  function getRndProductivityTargetAmount(business) {
    const gapAmount = getRndProductivityGapAmount(business, PRODUCTIVITY_TARGET);
    if (gapAmount <= 0) return 0;
    return roundMoney(Math.max(MONTHLY_INJECTION_ACTIONS.rnd.min, gapAmount));
  }

  function applyRndInvestment(business, amount) {
    const valuation = Math.max(1, Number(business && business.valuation) || 0);
    const targetAmount = getRndProductivityGapAmount(business, PRODUCTIVITY_TARGET);
    const suggestedTargetAmount = getRndProductivityTargetAmount(business);

    business.rnd = roundMoney(business.rnd + amount * 0.38);
    business.productivity = targetAmount > 0 && amount >= targetAmount && amount <= suggestedTargetAmount
      ? PRODUCTIVITY_TARGET
      : clamp(business.productivity + amount / valuation * RND_PRODUCTIVITY_GAIN, 0.1, 1.4);
    business.reputation = clamp(business.reputation + amount / valuation * 0.04, 0.05, 1.2);
  }

  function normalizeMonthlyInjectionPlan(rawPlan, action) {
    const meta = getMonthlyInjectionMeta(action);
    const source = isObject(rawPlan) ? rawPlan : {};
    const amount = roundMoney(Math.max(0, Number(source.amount) || 0));

    return {
      active: Boolean(source.active) && amount >= (meta ? meta.min : 1),
      amount,
      lastProcessedMonth: Math.max(0, Math.floor(Number(source.lastProcessedMonth) || 0)),
      lastOk: Object.prototype.hasOwnProperty.call(source, "lastOk") ? Boolean(source.lastOk) : true,
      lastMessage: typeof source.lastMessage === "string" ? source.lastMessage.slice(0, 160) : ""
    };
  }

  function normalizeMonthlyInjections(rawPlans) {
    const source = isObject(rawPlans) ? rawPlans : {};
    return Object.keys(MONTHLY_INJECTION_ACTIONS).reduce((plans, action) => {
      plans[action] = normalizeMonthlyInjectionPlan(source[action], action);
      return plans;
    }, {});
  }

  function getSectorDefaults(sector) {
    return SECTOR_DEFAULTS[sector] || SECTOR_DEFAULTS.services;
  }

  function getStartupSalaryPerEmployee(sector) {
    const salaries = {
      food: 1200,
      retail: 1350,
      services: 1650,
      logistics: 1750,
      software: 2050,
      hospitality: 1300
    };
    return salaries[sector] || 1600;
  }

  function getStartupMarketingBudget(sector, capital) {
    const ratio = {
      food: 0.02,
      retail: 0.024,
      services: 0.025,
      logistics: 0.02,
      software: 0.014,
      hospitality: 0.022
    }[sector] || 0.022;
    const floor = sector === "software" ? 320 : 280;
    return Math.max(floor, capital * ratio);
  }

  function getStartupRndBudget(sector, capital) {
    if (sector === "software") return Math.max(180, capital * 0.007);
    if (sector === "services") return Math.max(120, capital * 0.006);
    return Math.max(60, capital * 0.003);
  }

  function getSupplyDefaults(sector) {
    const defaults = getSectorDefaults(sector);
    const preset = SUPPLY_PRESETS[sector] || SUPPLY_PRESETS.services;
    const baseUnitCost = roundMoney(Math.max(1, defaults.baseTicket * (1 - defaults.grossMargin)));

    return {
      ...preset,
      baseUnitCost
    };
  }

  function roundUnits(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function getSupplierAverages(business) {
    const suppliers = Array.isArray(business && business.suppliers) && business.suppliers.length
      ? business.suppliers
      : createDefaultSuppliers(business && business.sector);
    const totals = suppliers.reduce((sum, supplier) => {
      return {
        cost: sum.cost + (Number(supplier.costModifier) || 1),
        reliability: sum.reliability + (Number(supplier.reliability) || 0.75),
        quality: sum.quality + (Number(supplier.quality) || 0.75),
        discount: sum.discount + (Number(supplier.discountRate) || 0)
      };
    }, { cost: 0, reliability: 0, quality: 0, discount: 0 });
    const divisor = Math.max(1, suppliers.length);

    return {
      cost: clamp(totals.cost / divisor, 0.78, 1.22),
      reliability: clamp(totals.reliability / divisor, 0.25, 1),
      quality: clamp(totals.quality / divisor, 0.25, 1.2),
      discount: clamp(totals.discount / divisor, 0, 0.08)
    };
  }

  function normalizeSupplyState(rawSupply, sector, inventoryValue) {
    const defaults = getSupplyDefaults(sector);
    const source = isObject(rawSupply) ? rawSupply : {};
    const rawUnitCost = Number(source.unitCost);
    const unitCost = roundMoney(Math.max(0.01, Number.isFinite(rawUnitCost) && rawUnitCost > 0 ? rawUnitCost : defaults.baseUnitCost));
    const fallbackStockUnits = unitCost > 0 ? (Number(inventoryValue) || 0) / unitCost : 0;
    const rawStockUnits = Number(source.stockUnits);
    const stockUnits = roundUnits(Math.max(0, Number.isFinite(rawStockUnits) ? rawStockUnits : fallbackStockUnits));
    const rawWasteRate = Number(source.wasteRate);
    const rawMinCoverage = Number(source.minCoverageMonths);
    const rawDeliveryRate = Number(source.lastDeliveryRate);

    return {
      label: typeof source.label === "string" && source.label.trim() ? source.label.trim().slice(0, 40) : defaults.label,
      unitLabel: typeof source.unitLabel === "string" && source.unitLabel.trim() ? source.unitLabel.trim().slice(0, 24) : defaults.unitLabel,
      stockUnits,
      unitCost,
      wasteRate: clamp(Number.isFinite(rawWasteRate) ? rawWasteRate : defaults.wasteRate, 0, 0.12),
      minCoverageMonths: clamp(Number.isFinite(rawMinCoverage) ? rawMinCoverage : defaults.minCoverageMonths, 0.25, 3),
      lastConsumedUnits: roundUnits(Math.max(0, Number(source.lastConsumedUnits) || 0)),
      lastWastedUnits: roundUnits(Math.max(0, Number(source.lastWastedUnits) || 0)),
      lastPurchasedUnits: roundUnits(Math.max(0, Number(source.lastPurchasedUnits) || 0)),
      lastPurchaseCost: roundMoney(Math.max(0, Number(source.lastPurchaseCost) || 0)),
      lastShortageUnits: roundUnits(Math.max(0, Number(source.lastShortageUnits) || 0)),
      lastDeliveryRate: clamp(Number.isFinite(rawDeliveryRate) ? rawDeliveryRate : 1, 0, 1.25)
    };
  }

  function syncBusinessInventory(business) {
    if (!business) return 0;
    business.supplies = normalizeSupplyState(business.supplies, business.sector, business.inventory);
    business.inventory = roundMoney(Math.max(0, business.supplies.stockUnits * business.supplies.unitCost));
    return business.inventory;
  }

  function getMonthlySupplyNeed(business, monthlyPnl) {
    const pnl = isObject(monthlyPnl) ? monthlyPnl : {};
    const units = Math.max(0, Number(pnl.supplyNeededUnits) || Number(pnl.unitsDemanded) || Number(pnl.unitsSold) || 0);
    if (units > 0) return roundUnits(units);

    const defaults = getSectorDefaults(business && business.sector);
    const unitsCount = Array.isArray(business && business.units) && business.units.length
      ? business.units.reduce((sum, unit) => sum + clamp(Number(unit.level) || 1, 1, 8), 0)
      : 1;
    const staffCapacity = business ? clamp((Number(business.employees) || 0) / Math.max(1, getRequiredEmployees(business)), 0, 1.2) : 1;
    return roundUnits(Math.max(1, defaults.demand * unitsCount * Math.max(0.35, staffCapacity)));
  }

  function getSupplySnapshot(business) {
    const source = isObject(business) ? business : {};
    const supplies = normalizeSupplyState(source.supplies, source.sector, source.inventory);
    const monthlyNeedUnits = getMonthlySupplyNeed(source, source.monthlyPnl);
    const monthlyNeedValue = roundMoney(monthlyNeedUnits * supplies.unitCost);
    const coverageMonths = monthlyNeedUnits > 0 ? supplies.stockUnits / monthlyNeedUnits : 99;
    const minStockUnits = roundUnits(monthlyNeedUnits * supplies.minCoverageMonths);

    return {
      ...supplies,
      inventoryValue: roundMoney(supplies.stockUnits * supplies.unitCost),
      monthlyNeedUnits,
      monthlyNeedValue,
      coverageMonths,
      minStockUnits,
      reorderGapUnits: roundUnits(Math.max(0, minStockUnits - supplies.stockUnits)),
      reorderGapValue: roundMoney(Math.max(0, minStockUnits - supplies.stockUnits) * supplies.unitCost)
    };
  }

  function getProcurementQuote(business, amount, supplierOverride) {
    const supply = normalizeSupplyState(business.supplies, business.sector, business.inventory);
    const averages = supplierOverride ? {
      cost: clamp(Number(supplierOverride.costModifier) || 1, 0.78, 1.22),
      reliability: clamp(Number(supplierOverride.reliability) || 0.75, 0.25, 1),
      quality: clamp(Number(supplierOverride.quality) || 0.75, 0.25, 1.2),
      discount: clamp(Number(supplierOverride.discountRate) || 0, 0, 0.08)
    } : getSupplierAverages(business);
    const requested = roundMoney(Math.max(0, Number(amount) || 0));
    const effectiveUnitCost = roundMoney(Math.max(0.01, supply.unitCost * averages.cost * (1 - averages.discount)));
    const deliveryRate = clamp(0.62 + averages.reliability * 0.28 + averages.quality * 0.08, 0.45, 1.08);
    const purchasedUnits = roundUnits((requested / effectiveUnitCost) * deliveryRate);

    return {
      amount: requested,
      unitCost: effectiveUnitCost,
      deliveryRate,
      purchasedUnits
    };
  }

  function purchaseSupplies(business, amount, supplierOverride) {
    const quote = getProcurementQuote(business, amount, supplierOverride);
    if (quote.amount <= 0 || quote.purchasedUnits <= 0) return quote;

    const supply = normalizeSupplyState(business.supplies, business.sector, business.inventory);
    const currentValue = supply.stockUnits * supply.unitCost;
    const purchasedValue = quote.purchasedUnits * quote.unitCost;
    const nextUnits = roundUnits(supply.stockUnits + quote.purchasedUnits);
    const nextUnitCost = nextUnits > 0
      ? roundMoney((currentValue + purchasedValue) / nextUnits)
      : supply.unitCost;

    business.supplies = {
      ...supply,
      stockUnits: nextUnits,
      unitCost: nextUnitCost,
      lastPurchasedUnits: quote.purchasedUnits,
      lastPurchaseCost: quote.amount,
      lastDeliveryRate: quote.deliveryRate
    };
    syncBusinessInventory(business);
    return quote;
  }

  function getDefaultUnitLocation(sector, unitIndex) {
    const options = UNIT_LOCATION_OPTIONS[sector] || UNIT_LOCATION_OPTIONS.services;
    return options[Math.max(0, unitIndex || 0) % options.length];
  }

  function getLocationProfile(location) {
    const label = String(location || "");
    const matched = LOCATION_PROFILES.find((profile) => profile.pattern.test(label));
    return matched || { demand: 1, collection: 0.82, rent: 1 };
  }

  function getWeightedLocationFactors(units) {
    const source = Array.isArray(units) && units.length ? units : [normalizeUnit(null, "services")];
    const totals = source.reduce((sum, unit) => {
      const profile = getLocationProfile(unit.location);
      const levelWeight = clamp(Math.floor(Number(unit.level) || 1), 1, 8);
      return {
        demand: sum.demand + profile.demand * levelWeight,
        collection: sum.collection + profile.collection * levelWeight,
        rent: sum.rent + profile.rent * levelWeight,
        weight: sum.weight + levelWeight
      };
    }, { demand: 0, collection: 0, rent: 0, weight: 0 });
    const divisor = Math.max(1, totals.weight);
    return {
      demand: clamp(totals.demand / divisor, 0.82, 1.2),
      collection: clamp(totals.collection / divisor, 0.68, 0.96),
      rent: clamp(totals.rent / divisor, 0.88, 1.18)
    };
  }

  function getReceivableRatio(business, locationFactors) {
    const base = {
      food: 0.03,
      retail: 0.06,
      services: 0.1,
      logistics: 0.2,
      construction: 0.24,
      software: 0.055,
      hospitality: 0.07,
      banking: 0.22,
      real_estate: 0.18,
      energy: 0.2,
      media: 0.14
    }[business.sector] || 0.1;
    return clamp(base + (1 - locationFactors.collection) * 0.08, 0.015, 0.24);
  }

  function collectReceivables(business, locationFactors, collectionModifier) {
    const outstanding = roundMoney(Math.max(0, Number(business.receivables) || 0));
    if (outstanding <= 0) return 0;

    const modifier = clamp(Number(collectionModifier) || 1, 0.78, 1.12);
    const collectionRate = clamp((locationFactors.collection + business.reputation * 0.1 + business.suppliersReliability * 0.05) * modifier, 0.72, 0.992);
    const collected = roundMoney(outstanding * collectionRate);
    business.receivables = roundMoney(Math.max(0, outstanding - collected));
    return collected;
  }

  function normalizeBusinessNewsItem(item) {
    const source = isObject(item) ? item : {};
    const title = typeof source.title === "string" ? source.title.trim() : "";
    const body = typeof source.body === "string" ? source.body.trim() : "";

    if (!title && !body) return null;

    return {
      id: typeof source.id === "string" && source.id ? source.id : createId("biznews"),
      day: Math.max(1, Math.floor(Number(source.day) || 1)),
      severity: ["info", "opportunity", "warning", "critical"].includes(source.severity) ? source.severity : "info",
      source: typeof source.source === "string" && source.source ? source.source : "monthly",
      title: title || "Radar empresarial",
      body,
      actionHint: typeof source.actionHint === "string" ? source.actionHint.trim().slice(0, 160) : "",
      createdAt: typeof source.createdAt === "string" && source.createdAt ? source.createdAt : new Date().toISOString()
    };
  }

  function appendBusinessNewsItem(business, item, day) {
    if (!business) return null;
    const normalized = normalizeBusinessNewsItem({
      ...item,
      day: day || (item && item.day) || 1
    });
    if (!normalized) return null;

    const nextFeed = Array.isArray(business.newsFeed) ? business.newsFeed.slice() : [];
    const duplicate = nextFeed.find((entry) => entry.title === normalized.title && entry.day === normalized.day && entry.source === normalized.source);
    if (duplicate) return duplicate;

    business.newsFeed = nextFeed.concat(normalized).slice(-8);
    business.latestHeadline = normalized;
    return normalized;
  }

  function getBusinessMomentumNarrative(business, revenueDeltaRatio, locationFactors) {
    if (business.rnd >= business.valuation * 0.0035 && ["software", "media", "services"].includes(business.sector)) {
      return {
        title: `${business.name}: un producto se volvio viral`,
        body: "La inversion reciente en I+D disparo el interes comercial y mejoro la conversion operativa del mes.",
        actionHint: "Sosten I+D y marketing, pero refuerza caja e insumos para no perder el impulso."
      };
    }

    if (business.marketing >= business.valuation * 0.0075 || revenueDeltaRatio >= 0.18) {
      return {
        title: `${business.name}: cada vez mas personas estan comprando en la tienda`,
        body: "La demanda repunto con fuerza y el trafico comercial se tradujo en mejores ventas y mayor traccion mensual.",
        actionHint: "Aprovecha la racha con inventario sano y equipo suficiente antes de volver a subir precios."
      };
    }

    if (locationFactors.demand >= 1.08) {
      return {
        title: `${business.name}: la ubicacion esta atrayendo mas trafico`,
        body: "Las unidades mejor ubicadas empujaron la demanda del mes y dieron una ventaja competitiva visible.",
        actionHint: "Mantén stock y servicio en esas ubicaciones; expandir sin operacion sana puede diluir la ventaja."
      };
    }

    if (business.reputation >= 0.74) {
      return {
        title: `${business.name}: la reputacion comercial esta empujando ventas`,
        body: "La marca viene ganando confianza y eso se tradujo en mejor volumen y mayor estabilidad operativa.",
        actionHint: "Conserva calidad y tiempos de entrega para que la reputacion siga siendo una palanca real."
      };
    }

    return {
      title: `${business.name}: hito comercial positivo`,
      body: "El negocio cerro un mes mas fuerte de lo habitual, con mejores ventas y capacidad de generar caja.",
      actionHint: "Usa el excedente para reforzar operacion antes de retirar dividendos."
    };
  }

  function buildBusinessMonthlyMessages(business, snapshot, metrics) {
    const previousRevenue = Number(snapshot.revenue) || 0;
    const previousNetIncome = Number(snapshot.netIncome) || 0;
    const revenue = Number(metrics.revenue) || 0;
    const netIncome = Number(metrics.netIncome) || 0;
    const revenueDeltaRatio = previousRevenue > 0 ? (revenue - previousRevenue) / previousRevenue : (revenue > 0 ? 1 : 0);
    const demandFill = (Number(metrics.supplyNeededUnits) || 0) > 0
      ? (Number(metrics.supplyConsumedUnits) || 0) / Math.max(1, Number(metrics.supplyNeededUnits) || 0)
      : 1;
    const messages = [];

    const pushPulse = (payload) => {
      if (!payload || messages.length >= 3) return;
      messages.push({
        key: `${payload.source || "monthly"}:${metrics.day}:${business.id}:${messages.length}`,
        businessId: business.id,
        businessName: business.name,
        ...payload
      });
    };

    if (Number(metrics.shortfall) > 0) {
      pushPulse({
        source: "monthly",
        severity: "critical",
        title: `${business.name}: la caja operativa no alcanzo este mes`,
        body: `La empresa cerro con faltante de caja por ${Math.round(metrics.shortfall).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} y se apoyo en deuda para no frenar la operacion.`,
        actionHint: "Aporta capital, recorta gasto o mejora ventas antes del siguiente cierre mensual."
      });
    } else if (netIncome < 0 || revenueDeltaRatio <= -0.12) {
      if (Number(metrics.supplyShortageUnits) > Math.max(20, (Number(metrics.supplyNeededUnits) || 0) * 0.08)) {
        pushPulse({
          source: "monthly",
          severity: "warning",
          title: `${business.name}: la caida vino por falta de insumos`,
          body: `Se perdieron ventas porque faltaron ${Math.round(metrics.supplyShortageUnits).toLocaleString("en-US")} ${business.supplies.unitLabel} para cubrir la demanda del mes.`,
          actionHint: "Compra insumos o usa credito de proveedor antes del proximo cierre."
        });
      } else if ((Number(metrics.staffCapacity) || 0) < 0.96) {
        pushPulse({
          source: "monthly",
          severity: "warning",
          title: `${business.name}: la plantilla quedo corta para la demanda`,
          body: "La operacion no tuvo suficientes empleados para sostener el ritmo comercial y eso enfrio ingresos y calidad de servicio.",
          actionHint: "Contrata personal o baja la presion operativa antes de expandir."
        });
      } else if (Number(metrics.receivables) > revenue * 0.35) {
        pushPulse({
          source: "monthly",
          severity: "warning",
          title: `${business.name}: se vende, pero el cobro viene lento`,
          body: "Parte de las ventas quedo en cuentas por cobrar y la caja no acompano el nivel comercial del mes.",
          actionHint: "Revisa ubicaciones, politicas de cobro y liquidez antes de retirar dividendos."
        });
      } else if ((Number(snapshot.payables) || 0) > 0 || Number(metrics.payables) > revenue * 0.2) {
        pushPulse({
          source: "monthly",
          severity: "warning",
          title: `${business.name}: los proveedores estan tensionando la operacion`,
          body: "La presion sobre cuentas por pagar y abastecimiento pego en la estabilidad del negocio y comprimio el margen mensual.",
          actionHint: "Negocia proveedores o paga atrasos para recuperar confiabilidad."
        });
      } else if (business.priceIndex > 1.15) {
        pushPulse({
          source: "monthly",
          severity: "warning",
          title: `${business.name}: el precio freno la demanda`,
          body: "La demanda reacciono peor de lo esperado al nivel de precios actual y eso redujo el volumen vendido.",
          actionHint: "Prueba bajar precio o acompanar con marketing antes de perder mas traccion."
        });
      } else {
        pushPulse({
          source: "monthly",
          severity: netIncome < 0 ? "warning" : "info",
          title: `${business.name}: el mes cerro por debajo de lo esperado`,
          body: "Las ventas y el margen quedaron flojos frente al mes previo, sin una sola causa dominante pero con senales claras de enfriamiento.",
          actionHint: "Revisa equipo, precio, inventario y caja para detectar el cuello de botella principal."
        });
      }
    } else if (revenueDeltaRatio >= 0.12 || netIncome > Math.max(0, previousNetIncome) * 1.15) {
      pushPulse({
        source: "monthly",
        severity: "opportunity",
        ...getBusinessMomentumNarrative(business, revenueDeltaRatio, metrics.locationFactors)
      });
    }

    if (messages.length < 3 && Number(metrics.receivables) > revenue * 0.45) {
      pushPulse({
        source: "monthly",
        severity: "warning",
        title: `${business.name}: la caja se esta quedando atras del crecimiento`,
        body: "La demanda empuja, pero una porcion demasiado alta de las ventas sigue pendiente de cobro y eso aprieta la liquidez.",
        actionHint: "No aceleres dividendos; fortalece cobranza y capital de trabajo."
      });
    }

    if (messages.length < 3 && demandFill < 0.88) {
      pushPulse({
        source: "monthly",
        severity: "warning",
        title: `${business.name}: hay demanda, pero no se esta capturando completa`,
        body: "La empresa no logro transformar toda la demanda en ventas realizadas y esta dejando dinero sobre la mesa.",
        actionHint: "Refuerza stock, personal o procesos en la unidad con mas trafico."
      });
    }

    if (messages.length < 3 && Number(metrics.pendingDividends) > 0 && netIncome > 0) {
      pushPulse({
        source: "monthly",
        severity: "info",
        title: `${business.name}: hay utilidades listas para decidir`,
        body: "El negocio termino el mes con utilidad distribuible, pero conviene medir caja y riesgo antes de retirarla.",
        actionHint: "Puedes pagar dividendos si la operacion ya quedo suficientemente fondeada."
      });
    }

    return messages;
  }

  function hasMeaningfulMonthlyPnl(monthlyPnl) {
    if (!isObject(monthlyPnl)) return false;
    return [
      monthlyPnl.revenue,
      monthlyPnl.cogs,
      monthlyPnl.payroll,
      monthlyPnl.opex,
      monthlyPnl.ebitda,
      monthlyPnl.tax,
      monthlyPnl.netIncome,
      monthlyPnl.cashFlow,
      monthlyPnl.supplierPayments,
      monthlyPnl.shortfall,
      monthlyPnl.royaltyIncome,
      monthlyPnl.unitsSold
    ].some((value) => Math.abs(Number(value) || 0) > 0.01);
  }

  function buildEstimatedMonthlyPnl(business, monthlyProfitHint) {
    const defaults = getSectorDefaults(business && business.sector);
    const grossMargin = clamp(Number(defaults.grossMargin) || 0.62, 0.2, 0.9);
    const priceIndex = clamp(Number(business && business.priceIndex) || 1, 0.65, 1.55);
    const employees = Math.max(0, Math.floor(Number(business && business.employees) || 0));
    const payroll = roundMoney(employees * Math.max(500, Number(business && business.salaryPerEmployee) || 2200));
    const rent = roundMoney((Array.isArray(business && business.units) ? business.units : []).reduce((sum, unit) => sum + (Number(unit && unit.rent) || 0), 0));
    const marketing = roundMoney(Math.max(0, Number(business && business.marketing) || 0));
    const rnd = roundMoney(Math.max(0, Number(business && business.rnd) || 0));
    const interest = roundMoney(Math.max(0, Number(business && business.debt) || 0) * 0.01);
    const maintenance = roundMoney(Math.max(0, Number(business && business.valuation) || 0) * 0.0018 + Math.max(1, (business && business.units && business.units.length) || 1) * 160);
    const opex = roundMoney(payroll + rent + marketing + rnd + maintenance + interest);
    const netIncome = roundMoney(Number(monthlyProfitHint) || 0);
    const tax = netIncome > 0 ? roundMoney(netIncome * (0.21 / 0.79)) : 0;
    const ebitda = roundMoney(netIncome + tax + interest);
    const royaltyIncome = roundMoney(Math.max(0, Number(business && business.franchiseUnits) || 0) * (Number(defaults.baseTicket) || 0) * (Number(defaults.demand) || 0) * (Number(business && business.royaltyRate) || 0.045) * 0.42);
    const revenueBase = grossMargin > 0 ? (ebitda - royaltyIncome + opex - interest) / grossMargin : 0;
    const revenue = roundMoney(Math.max(0, revenueBase));
    const cogs = roundMoney(Math.max(0, revenue - (ebitda - royaltyIncome + opex - interest)));
    const unitsSold = priceIndex > 0 && defaults.baseTicket > 0
      ? Math.max(0, Math.round(revenue / (defaults.baseTicket * priceIndex)))
      : 0;
    const supply = normalizeSupplyState(business && business.supplies, business && business.sector, business && business.inventory);
    const supplyNeededUnits = Math.max(0, unitsSold);
    const supplyCoverageMonths = supplyNeededUnits > 0 ? supply.stockUnits / supplyNeededUnits : 99;

    return {
      revenue,
      cogs,
      payroll,
      opex,
      ebitda,
      tax,
      netIncome,
      cashFlow: netIncome,
      supplierPayments: roundMoney(Math.max(0, Number(business && business.payables) || 0)),
      shortfall: 0,
      royaltyIncome,
      unitsSold,
      unitsDemanded: unitsSold,
      supplyNeededUnits,
      supplyConsumedUnits: unitsSold,
      supplyWastedUnits: 0,
      supplyPurchasedUnits: 0,
      supplyPurchaseCost: 0,
      supplyShortageUnits: 0,
      supplyCoverageMonths,
      estimated: true
    };
  }

  function getRequiredEmployees(business) {
    const source = isObject(business) ? business : {};
    const defaults = getSectorDefaults(source.sector);
    const units = Array.isArray(source.units) && source.units.length ? source.units : [{}];
    const unitLoad = units.reduce((sum, unit) => {
      const level = isObject(unit) ? Math.floor(Number(unit.level) || 1) : 1;
      return sum + clamp(level, 1, 8);
    }, 0);

    return Math.max(1, Math.round(unitLoad * (defaults.staffPerUnit || 5)));
  }

  function normalizeUnit(unit, sector) {
    const defaults = getSectorDefaults(sector);
    const source = isObject(unit) ? unit : {};
    const fallbackLocation = getDefaultUnitLocation(sector, 0);

    return {
      id: typeof source.id === "string" ? source.id : createId("unit"),
      name: typeof source.name === "string" ? source.name : `${defaults.unitType} 1`,
      location: typeof source.location === "string" && source.location.trim() ? source.location.trim() : fallbackLocation,
      level: clamp(Math.floor(Number(source.level) || 1), 1, 8),
      rent: roundMoney(Math.max(0, finiteOrFallback(source.rent, defaults.baseTicket * defaults.demand * 0.09))),
      condition: clamp(Number(source.condition) || 0.82, 0.2, 1.2)
    };
  }

  function normalizeSupplier(supplier, sector, index) {
    const names = SUPPLIER_PRESETS[sector] || SUPPLIER_PRESETS.services;
    const source = isObject(supplier) ? supplier : {};
    const quality = clamp(Number(source.quality) || (index === 0 ? 0.72 : 0.82), 0.25, 1.2);
    const reliability = clamp(Number(source.reliability) || (index === 0 ? 0.76 : 0.86), 0.25, 1);
    const contractType = ["spot", "volume", "premium", "credit"].includes(source.contractType) ? source.contractType : (index === 0 ? "spot" : "volume");
    const baseCost = contractType === "premium" ? 1.04 : contractType === "volume" ? 0.96 : contractType === "credit" ? 1.02 : 1;

    return {
      id: typeof source.id === "string" ? source.id : createId("sup"),
      name: typeof source.name === "string" ? source.name : names[index % names.length],
      contractType,
      quality,
      reliability,
      costModifier: clamp(Number(source.costModifier) || baseCost, 0.78, 1.22),
      creditLimit: roundMoney(Math.max(0, Number(source.creditLimit) || (contractType === "credit" ? 18000 : 5000))),
      payableBalance: roundMoney(Math.max(0, Number(source.payableBalance) || 0)),
      paymentTermsDays: clamp(Math.floor(Number(source.paymentTermsDays) || (contractType === "credit" ? 60 : 30)), 15, 90),
      daysUntilDue: clamp(Math.floor(Number(source.daysUntilDue) || 30), 0, 90),
      discountRate: clamp(Number(source.discountRate) || (contractType === "volume" ? 0.03 : 0), 0, 0.08),
      latePayments: Math.max(0, Math.floor(Number(source.latePayments) || 0))
    };
  }

  function createDefaultSuppliers(sector) {
    return [normalizeSupplier(null, sector, 0), normalizeSupplier({ contractType: "volume" }, sector, 1)];
  }

  function getBusinessEquityValue(business) {
    const valuation = Math.max(0, Number(business.valuation) || 0);
    const debt = Math.max(0, Number(business.debt) || 0);
    const payables = Math.max(0, Number(business.payables) || 0);
    const ownership = clamp(Number(business.ownershipPercent) || 1, 0.1, 1);
    return roundMoney(Math.max(0, valuation - debt - payables) * ownership);
  }

  function reduceValuationForCashOut(business, amount) {
    const cashOut = roundMoney(Math.max(0, Number(amount) || 0));
    const floor = 1000;
    business.valuation = roundMoney(Math.max(floor, (Number(business.valuation) || 0) - cashOut));
  }

  function normalizeBusiness(rawBusiness) {
    if (!isObject(rawBusiness)) return null;
    const sector = typeof rawBusiness.sector === "string" ? rawBusiness.sector : "services";
    const defaults = getSectorDefaults(sector);
    const units = Array.isArray(rawBusiness.units) && rawBusiness.units.length
      ? rawBusiness.units.map((unit) => normalizeUnit(unit, sector))
      : [normalizeUnit(null, sector)];
    const type = rawBusiness.type === "franchise" || rawBusiness.type === "acquisition" || rawBusiness.type === "startup" || rawBusiness.type === "public"
      ? rawBusiness.type
      : "startup";
    const requiredEmployees = getRequiredEmployees({ sector, units });
    const rawEmployees = Number(rawBusiness.employees);
    const employees = Number.isFinite(rawEmployees)
      ? Math.max(0, Math.floor(rawEmployees))
      : (type === "startup" && !rawBusiness.sourceAssetId ? 0 : requiredEmployees);
    const valuation = roundMoney(Math.max(1000, Number(rawBusiness.valuation) || Number(rawBusiness.seedValuation) || 50000));
    const cash = roundMoney(Math.max(0, Number(rawBusiness.cash) || 0));
    const initialInventory = roundMoney(Math.max(0, Number(rawBusiness.inventory) || defaults.baseTicket * defaults.demand * 0.55));
    const supplies = normalizeSupplyState(rawBusiness.supplies, sector, initialInventory);
    const inventory = roundMoney(Math.max(0, supplies.stockUnits * supplies.unitCost));
    const debt = roundMoney(Math.max(0, Number(rawBusiness.debt) || 0));
    const suppliers = Array.isArray(rawBusiness.suppliers) && rawBusiness.suppliers.length
      ? rawBusiness.suppliers.map((supplier, index) => normalizeSupplier(supplier, sector, index))
      : createDefaultSuppliers(sector);
    const totalPayables = suppliers.reduce((sum, supplier) => sum + supplier.payableBalance, 0);

    return {
      id: typeof rawBusiness.id === "string" ? rawBusiness.id : createId("biz"),
      sourceAssetId: typeof rawBusiness.sourceAssetId === "string" ? rawBusiness.sourceAssetId : null,
      name: typeof rawBusiness.name === "string" ? rawBusiness.name : "Empresa propia",
      type,
      sector,
      sectorLabel: defaults.label,
      cash,
      valuation,
      seedValuation: roundMoney(Math.max(valuation, Number(rawBusiness.seedValuation) || valuation)),
      employees,
      requiredEmployees,
      salaryPerEmployee: roundMoney(Math.max(500, Number(rawBusiness.salaryPerEmployee) || 2200)),
      morale: clamp(Number(rawBusiness.morale) || 0.74, 0.1, 1.1),
      productivity: clamp(Number(rawBusiness.productivity) || 0.78, 0.1, 1.4),
      reputation: clamp(Number(rawBusiness.reputation) || 0.58, 0.05, 1.2),
      marketing: roundMoney(Math.max(0, Number(rawBusiness.marketing) || valuation * 0.006)),
      rnd: roundMoney(Math.max(0, Number(rawBusiness.rnd) || valuation * 0.002)),
      priceIndex: clamp(Number(rawBusiness.priceIndex) || 1, 0.65, 1.55),
      inventory,
      supplies,
      suppliersReliability: clamp(Number(rawBusiness.suppliersReliability) || 0.82, 0.25, 1),
      suppliers,
      payables: roundMoney(totalPayables),
      receivables: roundMoney(Math.max(0, Number(rawBusiness.receivables) || 0)),
      pendingDividends: roundMoney(Math.max(0, Number(rawBusiness.pendingDividends) || 0)),
      monthlyInjections: normalizeMonthlyInjections(rawBusiness.monthlyInjections),
      newsFeed: Array.isArray(rawBusiness.newsFeed)
        ? rawBusiness.newsFeed.map(normalizeBusinessNewsItem).filter(Boolean).slice(-8)
        : [],
      latestHeadline: normalizeBusinessNewsItem(rawBusiness.latestHeadline),
      financialHistory: Array.isArray(rawBusiness.financialHistory)
        ? rawBusiness.financialHistory.map((item) => {
          if (!isObject(item)) return null;
          return {
            day: Math.max(1, Math.floor(Number(item.day) || 1)),
            revenue: roundMoney(Number(item.revenue) || 0),
            netIncome: roundMoney(Number(item.netIncome) || 0),
            cashFlow: roundMoney(Number(item.cashFlow) || 0),
            valuation: roundMoney(Math.max(0, Number(item.valuation) || 0)),
            cash: roundMoney(Math.max(0, Number(item.cash) || 0))
          };
        }).filter(Boolean).slice(-18)
        : [],
      units,
      debt,
      ownershipPercent: clamp(Number(rawBusiness.ownershipPercent) || 1, 0.1, 1),
      franchiseUnits: Math.max(0, Math.floor(Number(rawBusiness.franchiseUnits) || 0)),
      lastFranchiseDay: Math.max(0, Math.floor(Number(rawBusiness.lastFranchiseDay) || 0)),
      royaltyRate: clamp(Number(rawBusiness.royaltyRate) || 0.045, 0, 0.12),
      ipo: isObject(rawBusiness.ipo) ? {
        listed: Boolean(rawBusiness.ipo.listed),
        day: Math.max(0, Math.floor(Number(rawBusiness.ipo.day) || 0)),
        sharesSoldPercent: clamp(Number(rawBusiness.ipo.sharesSoldPercent) || 0, 0, 0.9),
        proceeds: roundMoney(Math.max(0, Number(rawBusiness.ipo.proceeds) || 0))
      } : {
        listed: false,
        day: 0,
        sharesSoldPercent: 0,
        proceeds: 0
      },
      lastProcessedMonth: Math.max(0, Math.floor(Number(rawBusiness.lastProcessedMonth) || 0)),
      monthlyPnl: isObject(rawBusiness.monthlyPnl) ? {
        revenue: roundMoney(Number(rawBusiness.monthlyPnl.revenue) || 0),
        cogs: roundMoney(Number(rawBusiness.monthlyPnl.cogs) || 0),
        payroll: roundMoney(Number(rawBusiness.monthlyPnl.payroll) || 0),
        opex: roundMoney(Number(rawBusiness.monthlyPnl.opex) || 0),
        ebitda: roundMoney(Number(rawBusiness.monthlyPnl.ebitda) || 0),
        tax: roundMoney(Number(rawBusiness.monthlyPnl.tax) || 0),
        netIncome: roundMoney(Number(rawBusiness.monthlyPnl.netIncome) || 0),
        cashFlow: roundMoney(Number(rawBusiness.monthlyPnl.cashFlow) || 0),
        supplierPayments: roundMoney(Number(rawBusiness.monthlyPnl.supplierPayments) || 0),
        shortfall: roundMoney(Math.max(0, Number(rawBusiness.monthlyPnl.shortfall) || 0)),
        royaltyIncome: roundMoney(Number(rawBusiness.monthlyPnl.royaltyIncome) || 0),
        unitsSold: Math.max(0, Math.round(Number(rawBusiness.monthlyPnl.unitsSold) || 0)),
        unitsDemanded: Math.max(0, Math.round(Number(rawBusiness.monthlyPnl.unitsDemanded) || Number(rawBusiness.monthlyPnl.unitsSold) || 0)),
        supplyNeededUnits: roundUnits(Math.max(0, Number(rawBusiness.monthlyPnl.supplyNeededUnits) || 0)),
        supplyConsumedUnits: roundUnits(Math.max(0, Number(rawBusiness.monthlyPnl.supplyConsumedUnits) || 0)),
        supplyWastedUnits: roundUnits(Math.max(0, Number(rawBusiness.monthlyPnl.supplyWastedUnits) || 0)),
        supplyPurchasedUnits: roundUnits(Math.max(0, Number(rawBusiness.monthlyPnl.supplyPurchasedUnits) || 0)),
        supplyPurchaseCost: roundMoney(Math.max(0, Number(rawBusiness.monthlyPnl.supplyPurchaseCost) || 0)),
        supplyShortageUnits: roundUnits(Math.max(0, Number(rawBusiness.monthlyPnl.supplyShortageUnits) || 0)),
        supplyCoverageMonths: Number.isFinite(Number(rawBusiness.monthlyPnl.supplyCoverageMonths)) ? Number(rawBusiness.monthlyPnl.supplyCoverageMonths) : 0,
        estimated: Boolean(rawBusiness.monthlyPnl.estimated)
      } : {
        revenue: 0,
        cogs: 0,
        payroll: 0,
        opex: 0,
        ebitda: 0,
        tax: 0,
        netIncome: 0,
        cashFlow: 0,
        supplierPayments: 0,
        shortfall: 0,
        royaltyIncome: 0,
        unitsSold: 0,
        unitsDemanded: 0,
        supplyNeededUnits: 0,
        supplyConsumedUnits: 0,
        supplyWastedUnits: 0,
        supplyPurchasedUnits: 0,
        supplyPurchaseCost: 0,
        supplyShortageUnits: 0,
        supplyCoverageMonths: 0,
        estimated: false
      }
    };
  }

  function normalizeBusinesses(businesses) {
    const source = Array.isArray(businesses) ? businesses : [];
    return source.map(normalizeBusiness).filter(Boolean).slice(-MAX_BUSINESSES);
  }

  function getBusinessTemplateFromAsset(asset) {
    const defaults = getSectorDefaults(asset.sector);
    const monthlyProfit = Math.max(1000, Number(asset.monthlyProfit) || asset.seedPrice * 0.012);
    const valuation = roundMoney(asset.simPrice || asset.seedPrice);
    const units = [normalizeUnit({ name: defaults.unitType, rent: Math.max(900, monthlyProfit * 0.18) }, asset.sector)];
    const requiredEmployees = getRequiredEmployees({ sector: asset.sector, units });
    const employees = Math.max(requiredEmployees, Math.round(monthlyProfit / 2200));

    return {
      id: `biz_${asset.id}`,
      sourceAssetId: asset.id,
      name: asset.name,
      type: asset.acquisitionType || "acquisition",
      sector: asset.sector,
      sectorLabel: defaults.label,
      cash: roundMoney(Math.min(valuation * 0.08, monthlyProfit * 4)),
      valuation,
      seedValuation: valuation,
      employees,
      requiredEmployees,
      salaryPerEmployee: 2200,
      morale: 0.74,
      productivity: 0.78,
      reputation: asset.acquisitionType === "franchise" ? 0.68 : 0.58,
      marketing: roundMoney(Math.max(600, monthlyProfit * 0.26)),
      rnd: roundMoney(asset.sector === "software" ? monthlyProfit * 0.16 : monthlyProfit * 0.06),
      priceIndex: 1,
      inventory: roundMoney(Math.max(1000, monthlyProfit * 1.7)),
      suppliersReliability: 0.82,
      suppliers: createDefaultSuppliers(asset.sector),
      units,
      debt: 0,
      ownershipPercent: 1,
      franchiseUnits: 0,
      monthlyPnl: buildEstimatedMonthlyPnl({
        sector: asset.sector,
        employees,
        salaryPerEmployee: 2200,
        valuation,
        marketing: Math.max(600, monthlyProfit * 0.26),
        rnd: asset.sector === "software" ? monthlyProfit * 0.16 : monthlyProfit * 0.06,
        priceIndex: 1,
        debt: 0,
        units,
        franchiseUnits: 0,
        royaltyRate: 0.045,
        payables: 0
      }, monthlyProfit)
    };
  }

  function createFromAsset(state, assetId) {
    if (!state.assets || !state.assets[assetId]) return null;
    const asset = state.assets[assetId];
    if (asset.type !== "business") return null;

    state.businesses = normalizeBusinesses(state.businesses);
    const existing = state.businesses.find((business) => business.sourceAssetId === assetId);
    if (existing) return existing;

    const business = normalizeBusiness(getBusinessTemplateFromAsset(asset));
    state.businesses.push(business);
    return business;
  }

  function foundBusiness(state, options) {
    const settings = isObject(options) ? options : {};
    const name = String(settings.name || "").trim().slice(0, 32);
    const sector = settings.sector && SECTOR_DEFAULTS[settings.sector] ? settings.sector : "services";
    const capital = roundMoney(Math.max(0, Number(settings.capital) || 0));
    const defaults = getSectorDefaults(sector);

    if (!name) {
      return { ok: false, message: "El nombre de la empresa es obligatorio." };
    }

    if (capital < 5000) {
      return { ok: false, message: "El capital minimo para fundar es $5,000." };
    }

    if (state.player.cash < capital) {
      return { ok: false, message: "Efectivo insuficiente para aportar capital." };
    }

    state.player.cash = roundMoney(state.player.cash - capital);
    state.businesses = normalizeBusinesses(state.businesses);

    const startupUnits = [normalizeUnit({ name: defaults.unitType, rent: Math.max(650, capital * 0.012) }, sector)];
    const business = normalizeBusiness({
      id: createId("biz"),
      sourceAssetId: null,
      name,
      type: "startup",
      sector,
      sectorLabel: defaults.label,
      cash: capital,
      valuation: capital,
      seedValuation: capital,
      employees: 0,
      requiredEmployees: getRequiredEmployees({ sector, units: startupUnits }),
      salaryPerEmployee: getStartupSalaryPerEmployee(sector),
      morale: 0.78,
      productivity: 0.72,
      reputation: 0.42,
      marketing: getStartupMarketingBudget(sector, capital),
      rnd: getStartupRndBudget(sector, capital),
      priceIndex: 1,
      inventory: roundMoney(capital * (sector === "software" ? 0.12 : sector === "food" ? 0.2 : 0.18)),
      suppliersReliability: 0.74,
      suppliers: createDefaultSuppliers(sector),
      units: startupUnits
    });

    state.businesses.push(business);

    return {
      ok: true,
      message: `${business.name} fundada con caja separada.`,
      business
    };
  }

  function getMacroDemandFactor(state) {
    const macro = state.macro || {};
    let factor = 1 + (Number(macro.gdpGrowth) || 0) * 3 + (Number(macro.sentiment) || 0) * 0.12;

    if (macro.phase === "recession") factor -= 0.12;
    if (macro.phase === "expansion") factor += 0.08;
    if ((Number(macro.interestRate) || 0) > 0.075) factor -= 0.05;

    return clamp(factor, 0.55, 1.35);
  }

  function getDifficultyBusinessSettings(state) {
    const difficulty = state && state.player && state.player.difficulty ? state.player.difficulty : "normal";
    const settings = economy && typeof economy.getDifficultySettings === "function"
      ? economy.getDifficultySettings(difficulty)
      : {};
    return {
      demand: clamp(Number(settings.businessDemand) || 1, 0.7, 1.2),
      cost: clamp(Number(settings.businessCost) || 1, 0.82, 1.28),
      collection: clamp(Number(settings.collectionRate) || 1, 0.8, 1.15),
      valuation: clamp(Number(settings.valuationDrift) || 1, 0.75, 1.2)
    };
  }

  function getCapitalizationDemandFactor(business) {
    if (!business) return 1;
    const seedValuation = Math.max(1000, Number(business.seedValuation) || Number(business.valuation) || 1000);
    if (business.sector === "software") {
      return clamp(0.68 + Math.log10(1 + seedValuation / 10000) * 0.58, 0.78, 1.42);
    }
    return 1;
  }

  function processBusinessMonth(state, business, eventImpact) {
    const snapshot = {
      revenue: roundMoney(Number(business.monthlyPnl && business.monthlyPnl.revenue) || 0),
      netIncome: roundMoney(Number(business.monthlyPnl && business.monthlyPnl.netIncome) || 0),
      payables: roundMoney(Number(business.payables) || 0)
    };
    const defaults = getSectorDefaults(business.sector);
    const impact = eventImpact || {};
    syncBusinessInventory(business);
    const supplierScores = getSupplierAverages(business);
    const supplierQuality = supplierScores.quality;
    const locationFactors = getWeightedLocationFactors(business.units);
    const difficultySettings = getDifficultyBusinessSettings(state);
    const unitsFactor = business.units.reduce((sum, unit) => {
      const conditionLift = 0.85 + unit.condition * 0.25;
      return sum + unit.level * clamp(conditionLift, 0.9, 1.16);
    }, 0);
    const macroFactor = getMacroDemandFactor(state);
    const marketingFactor = clamp(0.72 + Math.log10(1 + business.marketing / 900) * 0.16, 0.72, 1.35);
    const requiredEmployees = getRequiredEmployees(business);
    business.requiredEmployees = requiredEmployees;
    const staffCapacity = clamp(business.employees / requiredEmployees, 0, 1.35);
    const operatingReadiness = clamp(0.35 + staffCapacity * 0.65, 0.35, 1.2);
    const reputationFactor = clamp(0.72 + business.reputation * 0.52, 0.72, 1.34);
    const pricePenalty = business.priceIndex > 1.12 ? 1 - (business.priceIndex - 1.12) * 0.9 : 1 + (1 - business.priceIndex) * 0.14;
    const supplyFactor = clamp(0.62 + supplierScores.reliability * 0.36 + supplierQuality * 0.06, 0.65, 1.08);
    const randomFactor = 0.94 + Math.random() * 0.14;
    const matureOperatorBoost = business.type === "startup" && business.employees <= 0 ? 0.82 : 1.06;
    const eventRevenueFactor = clamp(
      1 +
      (Number(impact.business && impact.business.revenueDelta) || 0) +
      (Number(impact.sectorDeltas && impact.sectorDeltas[business.sector]) || 0) * 2,
      0.72,
      1.35
    );
    const eventCostFactor = clamp(1 + (Number(impact.business && impact.business.costDelta) || 0), 0.82, 1.35);
    const eventSupplierFactor = clamp(1 + (Number(impact.business && impact.business.supplierDelta) || 0), 0.78, 1.15);
    const capitalizationDemandFactor = getCapitalizationDemandFactor(business);
    const synergy = strategy && typeof strategy.getBusinessSynergy === "function"
      ? strategy.getBusinessSynergy(state, business)
      : { demand: 1, cost: 1, valuation: 1, label: "" };
    const takeover = strategy && typeof strategy.getTakeoverBusinessModifiers === "function"
      ? strategy.getTakeoverBusinessModifiers(state, business)
      : { demand: 1, cost: 1, valuation: 1, label: "Sin influencia", stage: "none" };
    const demand = defaults.demand * unitsFactor * macroFactor * marketingFactor * staffCapacity * reputationFactor * pricePenalty * supplyFactor * locationFactors.demand * difficultySettings.demand * randomFactor * matureOperatorBoost * eventRevenueFactor * capitalizationDemandFactor * (Number(synergy.demand) || 1) * (Number(takeover.demand) || 1);
    const unitsSold = staffCapacity <= 0 ? 0 : Math.max(0, Math.round(demand));
    const revenue = roundMoney(unitsSold * defaults.baseTicket * business.priceIndex * locationFactors.rent);
    const royaltyIncome = roundMoney(business.franchiseUnits * defaults.baseTicket * defaults.demand * business.royaltyRate * 0.42);
    const supplyState = normalizeSupplyState(business.supplies, business.sector, business.inventory);
    const supplyUnitCost = roundMoney(Math.max(0.01, supplyState.unitCost * eventCostFactor * difficultySettings.cost * (Number(synergy.cost) || 1) * (Number(takeover.cost) || 1)));
    const supplyNeededUnits = roundUnits(unitsSold);
    const availableSupplyUnits = supplyState.stockUnits;
    const stockoutPenalty = supplyNeededUnits > 0
      ? clamp(availableSupplyUnits / supplyNeededUnits, 0, 1)
      : 1;
    const fulfilledUnits = supplyNeededUnits > 0 ? Math.max(0, Math.floor(supplyNeededUnits * stockoutPenalty)) : 0;
    const consumedUnits = roundUnits(Math.min(availableSupplyUnits, fulfilledUnits));
    const shortageUnits = roundUnits(Math.max(0, supplyNeededUnits - consumedUnits));
    const adjustedRevenue = roundMoney(revenue * (supplyNeededUnits > 0 ? consumedUnits / supplyNeededUnits : 1) + royaltyIncome);
    const adjustedCogs = roundMoney(consumedUnits * supplyUnitCost);
    const supplyAfterSales = roundUnits(Math.max(0, availableSupplyUnits - consumedUnits));
    const wasteMultiplier = clamp(1.08 - supplierQuality * 0.08 + (business.morale < 0.55 ? 0.035 : 0), 0.72, 1.2);
    const wastedUnits = roundUnits(supplyAfterSales * supplyState.wasteRate * wasteMultiplier);
    const stockAfterUse = roundUnits(Math.max(0, supplyAfterSales - wastedUnits));
    const targetStockUnits = roundUnits(Math.max(supplyNeededUnits, supplyNeededUnits * supplyState.minCoverageMonths));
    const restockGapUnits = roundUnits(Math.max(0, targetStockUnits - stockAfterUse));
    const restockTargetCost = roundMoney(restockGapUnits * supplyState.unitCost * 0.45);
    const restockQuote = restockTargetCost > 0
      ? getProcurementQuote(business, restockTargetCost)
      : { amount: 0, unitCost: supplyState.unitCost, deliveryRate: 1, purchasedUnits: 0 };
    const restock = restockQuote.amount;
    const nextSupplyUnits = roundUnits(stockAfterUse + restockQuote.purchasedUnits);
    const nextSupplyUnitCost = nextSupplyUnits > 0
      ? roundMoney(((stockAfterUse * supplyState.unitCost) + (restockQuote.purchasedUnits * restockQuote.unitCost)) / nextSupplyUnits)
      : supplyState.unitCost;
    const payroll = roundMoney(business.employees * business.salaryPerEmployee * difficultySettings.cost);
    const rent = roundMoney(business.units.reduce((sum, unit) => sum + unit.rent, 0) * difficultySettings.cost);
    const maintenance = roundMoney((business.valuation * 0.0018 + business.units.length * 160) * operatingReadiness * difficultySettings.cost);
    const interest = roundMoney(business.debt * 0.01);
    const supplierPayments = processSupplierPayables(business);
    const activeMarketing = roundMoney(business.marketing * operatingReadiness * 0.42);
    const activeRnd = roundMoney(business.rnd * operatingReadiness * 0.3);
    const opex = roundMoney(payroll + rent + activeMarketing + activeRnd + maintenance + interest);
    const ebitda = roundMoney(adjustedRevenue - adjustedCogs - opex + interest);
    const taxResult = taxes && taxes.applyBusinessTax ? taxes.applyBusinessTax(state, ebitda) : { tax: Math.max(0, ebitda * 0.21) };
    const netIncome = roundMoney(ebitda - taxResult.tax - interest);
    const collectedReceivables = collectReceivables(business, locationFactors, difficultySettings.collection);
    const newReceivables = roundMoney((adjustedRevenue - royaltyIncome) * clamp(getReceivableRatio(business, locationFactors) / difficultySettings.collection, 0.02, 0.38));
    const cashFlow = roundMoney(netIncome - restock - newReceivables + collectedReceivables);
    const projectedCash = roundMoney(business.cash + cashFlow);
    const shortfall = projectedCash < 0 ? roundMoney(Math.abs(projectedCash)) : 0;
    const reportedCashFlow = roundMoney(cashFlow - supplierPayments - shortfall);

    business.supplies = {
      ...supplyState,
      stockUnits: nextSupplyUnits,
      unitCost: nextSupplyUnitCost,
      lastConsumedUnits: consumedUnits,
      lastWastedUnits: wastedUnits,
      lastPurchasedUnits: restockQuote.purchasedUnits,
      lastPurchaseCost: restock,
      lastShortageUnits: shortageUnits,
      lastDeliveryRate: restockQuote.deliveryRate
    };
    syncBusinessInventory(business);
    business.cash = roundMoney(Math.max(0, projectedCash));
    business.receivables = roundMoney(Math.max(0, business.receivables + newReceivables));
    if (shortfall > 0) {
      business.debt = roundMoney(business.debt + shortfall);
      business.morale = clamp(business.morale - 0.035, 0.1, 1.1);
      business.suppliersReliability = clamp(business.suppliersReliability - 0.04, 0.25, 1);
    }
    business.suppliersReliability = clamp(business.suppliersReliability + (eventSupplierFactor - 1) * 0.18, 0.25, 1);
    business.reputation = clamp(business.reputation + (netIncome >= 0 ? 0.012 : -0.018) + (stockoutPenalty < 1 ? -0.035 : 0) + (Number(impact.business && impact.business.reputationDelta) || 0), 0.05, 1.2);
    business.morale = clamp(business.morale + (netIncome >= 0 ? 0.008 : -0.014) + (Number(impact.business && impact.business.moraleDelta) || 0), 0.1, 1.1);
    business.productivity = clamp(business.productivity + business.rnd / Math.max(1, business.valuation) * 0.06 - 0.004, 0.1, 1.4);
    const synergyValuationLift = 1 + ((Number(synergy.valuation) || 1) - 1) * 0.35;
    const takeoverValuationLift = 1 + ((Number(takeover.valuation) || 1) - 1) * 0.55;
    business.valuation = roundMoney(Math.max(
      business.seedValuation * 0.35,
      (business.valuation * 0.9 + Math.max(0, netIncome) * 10 + business.cash * 0.12) * synergyValuationLift * difficultySettings.valuation * takeoverValuationLift
    ));
    const reserve = Math.max(1000, opex * 0.55 + supplierPayments * 0.35);
    const distributableByCash = roundMoney(Math.max(0, business.cash - reserve));
    const pendingBase = Math.max(0, Number(business.pendingDividends) || 0) + Math.max(0, netIncome) * 0.24;
    business.pendingDividends = roundMoney(Math.min(distributableByCash, Math.max(0, pendingBase)));
    business.monthlyPnl = {
      revenue: adjustedRevenue,
      cogs: adjustedCogs,
      payroll,
      opex,
      ebitda,
      tax: taxResult.tax,
      netIncome,
      cashFlow: reportedCashFlow,
      supplierPayments,
      shortfall,
      royaltyIncome,
      unitsSold: Math.round(consumedUnits),
      unitsDemanded: Math.round(supplyNeededUnits),
      supplyNeededUnits,
      supplyConsumedUnits: consumedUnits,
      supplyWastedUnits: wastedUnits,
      supplyPurchasedUnits: restockQuote.purchasedUnits,
      supplyPurchaseCost: restock,
      supplyShortageUnits: shortageUnits,
      supplyCoverageMonths: supplyNeededUnits > 0 ? nextSupplyUnits / supplyNeededUnits : 99,
      receivablesCollected: collectedReceivables,
      receivablesCreated: newReceivables,
      synergyLabel: synergy.label || "",
      governanceLabel: takeover.label || "Sin influencia",
      estimated: false
    };
    business.financialHistory = (Array.isArray(business.financialHistory) ? business.financialHistory : []).concat({
      day: state.time && state.time.day ? state.time.day : 1,
      revenue: adjustedRevenue,
      netIncome,
      cashFlow: reportedCashFlow,
      valuation: business.valuation,
      cash: business.cash
    }).slice(-18);
    const monthlyMessages = buildBusinessMonthlyMessages(business, snapshot, {
      day: state.time && state.time.day ? state.time.day : 1,
      revenue: adjustedRevenue,
      netIncome,
      shortfall,
      payables: business.payables,
      receivables: business.receivables,
      pendingDividends: business.pendingDividends,
      supplyNeededUnits,
      supplyConsumedUnits: consumedUnits,
      supplyShortageUnits: shortageUnits,
      staffCapacity,
      locationFactors
    });
    monthlyMessages.forEach((item) => appendBusinessNewsItem(business, item, state.time && state.time.day ? state.time.day : 1));

    if (player && player.appendCashflow) {
      player.appendCashflow(state, {
        type: "business_profit",
        businessId: business.id,
        assetId: business.sourceAssetId,
        scope: "business",
        label: `Resultado mensual ${business.name}`,
        amount: reportedCashFlow,
        gross: adjustedRevenue,
        taxes: taxResult.tax
      });
    }

    return {
      business,
      messages: monthlyMessages,
      text: `${business.name}: utilidad neta ${netIncome.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}, caja ${business.cash.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}, insumos ${Math.round(nextSupplyUnits).toLocaleString("en-US")} ${business.supplies.unitLabel}.`
    };
  }

  function processSupplierPayables(business) {
    let paid = 0;

    business.suppliers = business.suppliers.map((supplier) => {
      if (supplier.payableBalance <= 0) return supplier;

      const next = {
        ...supplier,
        daysUntilDue: Math.max(0, supplier.daysUntilDue - 30)
      };

      if (next.daysUntilDue > 0) return next;

      const due = next.payableBalance;
      if (business.cash >= due) {
        business.cash = roundMoney(business.cash - due);
        paid = roundMoney(paid + due);
        next.payableBalance = 0;
        next.daysUntilDue = next.paymentTermsDays;
        next.reliability = clamp(next.reliability + 0.015, 0.25, 1);
        return next;
      }

      next.latePayments += 1;
      next.payableBalance = roundMoney(due * 1.04);
      next.daysUntilDue = 30;
      next.reliability = clamp(next.reliability - 0.04, 0.25, 1);
      business.suppliersReliability = clamp(business.suppliersReliability - 0.035, 0.25, 1);
      return next;
    });

    business.payables = roundMoney(business.suppliers.reduce((sum, supplier) => sum + supplier.payableBalance, 0));
    return paid;
  }

  function businessMatchesEvent(business, effect) {
    if (!business || !effect) return false;
    if (effect.type === "all") return true;
    if (effect.type === "business") return true;
    if (effect.sector && business.sector === effect.sector) return true;
    if (effect.random) return Math.random() < 0.18;
    return false;
  }

  function applyEventImpact(state, eventDefinition, news) {
    const effect = eventDefinition && eventDefinition.effect ? eventDefinition.effect : {};
    const delta = Number(effect.delta) || 0;
    if (delta === 0 && !effect.sector && effect.type !== "business" && !effect.random) return [];

    state.businesses = normalizeBusinesses(state.businesses);
    const impacted = [];

    state.businesses.forEach((business) => {
      if (!businessMatchesEvent(business, effect)) return;

      const magnitude = Math.min(0.22, Math.abs(delta));
      const direction = delta >= 0 ? 1 : -1;
      business.reputation = clamp(business.reputation + direction * magnitude * 0.55, 0.05, 1.2);
      business.suppliersReliability = clamp(business.suppliersReliability + direction * magnitude * 0.35, 0.25, 1);
      business.valuation = roundMoney(Math.max(business.seedValuation * 0.35, business.valuation * (1 + delta * 0.7)));

      if (delta < 0) {
        const cashHit = roundMoney(Math.min(business.cash, Math.max(250, business.valuation * magnitude * 0.018)));
        business.cash = roundMoney(Math.max(0, business.cash - cashHit));
        business.supplies = normalizeSupplyState(business.supplies, business.sector, business.inventory);
        business.supplies.stockUnits = roundUnits(Math.max(0, business.supplies.stockUnits * (1 - magnitude * 0.35)));
        syncBusinessInventory(business);
        business.morale = clamp(business.morale - magnitude * 0.24, 0.1, 1.1);
      } else {
        business.cash = roundMoney(business.cash + Math.max(150, business.valuation * magnitude * 0.01));
        business.marketing = roundMoney(business.marketing * (1 + magnitude * 0.4));
        business.morale = clamp(business.morale + magnitude * 0.16, 0.1, 1.1);
      }

      const pulse = appendBusinessNewsItem(business, {
        source: "event",
        severity: delta < 0 ? "warning" : "opportunity",
        title: delta < 0
          ? `${business.name}: impacto por ${eventDefinition.title}`
          : `${business.name}: impulso por ${eventDefinition.title}`,
        body: delta < 0
          ? `${eventDefinition.summary} El golpe se sintio en caja, reputacion o abastecimiento de la empresa.`
          : `${eventDefinition.summary} La empresa recibio un empuje extra en caja, reputacion o demanda.`,
        actionHint: delta < 0
          ? "Revisa caja, proveedores y reputacion antes del siguiente avance."
          : "Aprovecha el momentum con stock, marketing o expansion disciplinada."
      }, state.time && state.time.day ? state.time.day : 1);

      impacted.push({
        id: business.id,
        name: business.name,
        severity: pulse ? pulse.severity : (delta < 0 ? "warning" : "opportunity"),
        title: pulse ? pulse.title : business.name,
        body: pulse ? pulse.body : eventDefinition.summary,
        actionHint: pulse ? pulse.actionHint : ""
      });
    });

    if (news && impacted.length) {
      news.affected = Array.from(new Set((news.affected || []).concat(impacted.map((item) => item.name)))).slice(0, 12);
      news.businessImpacts = impacted.map((item) => item.name).slice(0, 8);
      news.businessImpactDetails = impacted.slice(0, 8);
    }

    return impacted;
  }

  function formatMoneyBrief(amount) {
    return `$${Math.round(Number(amount) || 0).toLocaleString("en-US")}`;
  }

  function applyMonthlyInjectionAction(state, business, action, value) {
    const meta = getMonthlyInjectionMeta(action);
    if (!meta) return { ok: false, message: "Plan mensual no reconocido." };

    const amount = roundMoney(Math.max(meta.min, Number(value) || 0));
    if (amount < meta.min) {
      return { ok: false, message: `El minimo para ${meta.label.toLowerCase()} mensual es ${formatMoneyBrief(meta.min)}.` };
    }

    if (action === "contribute") {
      const availableCash = roundMoney(Math.max(0, Number(state.player && state.player.cash) || 0));
      if (availableCash < amount) {
        return { ok: false, amount, message: `${business.name}: aporte mensual de ${formatMoneyBrief(amount)} no ejecutado por efectivo personal insuficiente.` };
      }

      state.player.cash = roundMoney(state.player.cash - amount);
      business.cash = roundMoney(business.cash + amount);
      business.seedValuation = roundMoney(Math.max(business.seedValuation, business.valuation + amount * 0.35));
      business.valuation = roundMoney(business.valuation + amount * 0.45);
      if (player && player.appendCashflow) {
        player.appendCashflow(state, {
          type: "monthly_capital_contribution",
          businessId: business.id,
          scope: "business",
          label: `Aporte mensual ${business.name}`,
          amount,
          gross: amount
        });
      }
      return { ok: true, amount, message: `${business.name}: aporte mensual de ${formatMoneyBrief(amount)} aplicado.` };
    }

    if (action === "marketing") {
      if (business.cash < amount) {
        return { ok: false, amount, message: `${business.name}: marketing mensual de ${formatMoneyBrief(amount)} no ejecutado por caja empresarial insuficiente.` };
      }
      business.cash = roundMoney(business.cash - amount);
      business.marketing = roundMoney(business.marketing + amount * 0.28);
      business.reputation = clamp(business.reputation + amount / Math.max(1, business.valuation) * 0.14, 0.05, 1.2);
      return { ok: true, amount, message: `${business.name}: marketing mensual de ${formatMoneyBrief(amount)} aplicado.` };
    }

    if (action === "rnd") {
      if (business.cash < amount) {
        return { ok: false, amount, message: `${business.name}: I+D mensual de ${formatMoneyBrief(amount)} no ejecutado por caja empresarial insuficiente.` };
      }
      business.cash = roundMoney(business.cash - amount);
      applyRndInvestment(business, amount);
      return { ok: true, amount, message: `${business.name}: I+D mensual de ${formatMoneyBrief(amount)} aplicado.` };
    }

    if (action === "inventory") {
      syncBusinessInventory(business);
      if (business.cash < amount) {
        return { ok: false, amount, message: `${business.name}: compra mensual de insumos por ${formatMoneyBrief(amount)} no ejecutada por caja empresarial insuficiente.` };
      }
      business.cash = roundMoney(business.cash - amount);
      const quote = purchaseSupplies(business, amount);
      return {
        ok: true,
        amount,
        message: `${business.name}: compra mensual de ${Math.round(quote.purchasedUnits).toLocaleString("en-US")} ${business.supplies.unitLabel} aplicada.`
      };
    }

    if (action === "supplier_credit") {
      const supplier = business.suppliers.slice().sort((a, b) => b.creditLimit - b.payableBalance - (a.creditLimit - a.payableBalance))[0];
      const capacity = supplier ? roundMoney(Math.max(0, supplier.creditLimit - supplier.payableBalance)) : 0;
      const creditAmount = roundMoney(Math.min(capacity, amount));

      if (!supplier || creditAmount <= 0) {
        return { ok: false, amount, message: `${business.name}: credito proveedor mensual no ejecutado porque no hay cupo disponible.` };
      }

      supplier.payableBalance = roundMoney(supplier.payableBalance + creditAmount);
      supplier.daysUntilDue = supplier.paymentTermsDays + 30;
      supplier.contractType = "credit";
      purchaseSupplies(business, creditAmount, supplier);
      business.payables = roundMoney(business.payables + creditAmount);
      business.suppliersReliability = clamp(business.suppliersReliability + 0.01, 0.25, 1);
      return { ok: true, amount: creditAmount, message: `${business.name}: credito proveedor mensual de ${formatMoneyBrief(creditAmount)} aplicado a insumos.` };
    }

    return { ok: false, message: "Plan mensual no reconocido." };
  }

  function processMonthlyInjectionPlans(state, business, monthKey) {
    const day = state.time && state.time.day ? state.time.day : 1;
    const entries = [];
    business.monthlyInjections = normalizeMonthlyInjections(business.monthlyInjections);

    Object.keys(MONTHLY_INJECTION_ACTIONS).forEach((action) => {
      const plan = business.monthlyInjections[action];
      if (!plan || !plan.active || plan.amount <= 0 || plan.lastProcessedMonth === monthKey) return;

      const meta = getMonthlyInjectionMeta(action);
      const result = applyMonthlyInjectionAction(state, business, action, plan.amount);
      plan.lastProcessedMonth = monthKey;
      plan.lastOk = Boolean(result.ok);
      plan.lastMessage = result.message || "";

      const message = {
        key: `monthly:${business.id}:${action}:${monthKey}`,
        businessId: business.id,
        businessName: business.name,
        source: "monthly_plan",
        severity: result.ok ? "opportunity" : "warning",
        title: result.ok
          ? `${business.name}: ${meta.label} mensual activo`
          : `${business.name}: ${meta.label} mensual pendiente`,
        body: result.message,
        actionHint: result.ok
          ? "El plan seguira ejecutandose cada cierre mensual mientras este activo."
          : "Revisa caja disponible o pausa el plan mensual antes del proximo cierre."
      };

      appendBusinessNewsItem(business, message, day);
      entries.push({
        type: "business_monthly_plan",
        businessId: business.id,
        action,
        amount: result.amount || plan.amount,
        messages: [message],
        text: result.message
      });
    });

    return entries;
  }

  function processDailyBusinesses(state, eventImpact) {
    state.businesses = normalizeBusinesses(state.businesses);
    const day = state.time && state.time.day ? state.time.day : 1;
    const monthKey = Math.floor(day / 30);
    const entries = [];

    if (day <= 1 || day % 30 !== 0) {
      return entries;
    }

    state.businesses.forEach((business) => {
      if (business.lastProcessedMonth === monthKey) return;
      entries.push(...processMonthlyInjectionPlans(state, business, monthKey));
      const result = processBusinessMonth(state, business, eventImpact);
      business.lastProcessedMonth = monthKey;
      entries.push({
        type: "business_month",
        businessId: business.id,
        amount: business.monthlyPnl.cashFlow,
        messages: result.messages || [],
        text: result.text
      });
    });

    return entries;
  }

  function applyBusinessAction(state, businessId, action, value) {
    state.businesses = normalizeBusinesses(state.businesses);
    const business = state.businesses.find((item) => item.id === businessId);

    if (!business) {
      return { ok: false, message: "Empresa no encontrada." };
    }

    if (action === "schedule_monthly") {
      const settings = isObject(value) ? value : {};
      const targetAction = String(settings.action || settings.targetAction || "");
      const meta = getMonthlyInjectionMeta(targetAction);

      if (!meta) return { ok: false, message: "Plan mensual no reconocido." };

      business.monthlyInjections = normalizeMonthlyInjections(business.monthlyInjections);
      const plan = business.monthlyInjections[targetAction];
      const shouldActivate = settings.active !== false;

      if (!shouldActivate) {
        plan.active = false;
        plan.lastMessage = `${meta.label} mensual pausado.`;
        return { ok: true, message: `${business.name}: ${meta.label.toLowerCase()} mensual pausado.` };
      }

      const amount = roundMoney(Math.max(0, Number(settings.amount) || 0));
      if (amount < meta.min) {
        return { ok: false, message: `El monto mensual minimo para ${meta.label.toLowerCase()} es ${formatMoneyBrief(meta.min)}.` };
      }

      plan.amount = amount;
      plan.active = true;
      plan.lastOk = true;
      plan.lastMessage = `${meta.label} mensual programado por ${formatMoneyBrief(amount)}.`;
      return { ok: true, message: `${business.name}: ${meta.label.toLowerCase()} mensual programado por ${formatMoneyBrief(amount)}.` };
    }

    if (action === "contribute") {
      const explicitValue = Number(value);
      const hasExplicitValue = Number.isFinite(explicitValue) && explicitValue > 0;
      const requested = roundMoney(hasExplicitValue
        ? explicitValue
        : Math.max(2500, business.valuation * 0.025));
      const availableCash = roundMoney(Math.max(0, Number(state.player && state.player.cash) || 0));
      if (requested < 1000) return { ok: false, message: "El aporte minimo es $1,000." };
      if (availableCash < requested) return { ok: false, message: "Efectivo personal insuficiente para ese aporte de capital." };
      const amount = requested;

      state.player.cash = roundMoney(state.player.cash - amount);
      business.cash = roundMoney(business.cash + amount);
      business.seedValuation = roundMoney(Math.max(business.seedValuation, business.valuation + amount * 0.35));
      business.valuation = roundMoney(business.valuation + amount * 0.45);
      if (player && player.appendCashflow) {
        player.appendCashflow(state, {
          type: "capital_contribution",
          businessId: business.id,
          scope: "business",
          label: `Aporte de capital ${business.name}`,
          amount,
          gross: amount
        });
      }
      return { ok: true, message: `Aportaste $${Math.round(amount).toLocaleString("en-US")} a ${business.name}.` };
    }

    if (action === "hire") {
      const hireCost = roundMoney(business.salaryPerEmployee * 0.35);
      if (business.cash < hireCost) {
        return { ok: false, message: "Caja empresarial insuficiente para contratar." };
      }

      business.employees += 1;
      business.cash = roundMoney(business.cash - hireCost);
      return { ok: true, message: `Contrataste personal en ${business.name}.` };
    }

    if (action === "fire") {
      business.employees = Math.max(0, business.employees - 1);
      business.morale = clamp(business.morale - 0.04, 0.1, 1.1);
      return { ok: true, message: `Reduciste plantilla en ${business.name}.` };
    }

    if (action === "marketing") {
      const amount = roundMoney(Math.max(100, Number(value) || business.marketing * 0.2));
      if (business.cash < amount) return { ok: false, message: "Caja empresarial insuficiente." };
      business.cash = roundMoney(business.cash - amount);
      business.marketing = roundMoney(business.marketing + amount * 0.28);
      business.reputation = clamp(business.reputation + amount / Math.max(1, business.valuation) * 0.14, 0.05, 1.2);
      return { ok: true, message: `Campana de marketing aplicada en ${business.name}.` };
    }

    if (action === "rnd") {
      const amount = roundMoney(Math.max(250, Number(value) || getRndProductivityTargetAmount(business) || business.rnd * 0.25 || business.valuation * 0.004));
      if (business.cash < amount) return { ok: false, message: "Caja empresarial insuficiente para I+D." };
      business.cash = roundMoney(business.cash - amount);
      applyRndInvestment(business, amount);
      return { ok: true, message: `I+D reforzado en ${business.name}.` };
    }

    if (action === "inventory") {
      syncBusinessInventory(business);
      const snapshot = getSupplySnapshot(business);
      const amount = roundMoney(Math.max(500, Number(value) || snapshot.reorderGapValue || business.inventory * 0.4));
      if (business.cash < amount) return { ok: false, message: "Caja empresarial insuficiente." };
      business.cash = roundMoney(business.cash - amount);
      const quote = purchaseSupplies(business, amount);
      return { ok: true, message: `${business.name} compro ${Math.round(quote.purchasedUnits).toLocaleString("en-US")} ${business.supplies.unitLabel} de ${business.supplies.label}.` };
    }

    if (action === "supplier_credit") {
      const supplier = business.suppliers.slice().sort((a, b) => b.creditLimit - b.payableBalance - (a.creditLimit - a.payableBalance))[0];
      const capacity = supplier ? roundMoney(Math.max(0, supplier.creditLimit - supplier.payableBalance)) : 0;
      const amount = roundMoney(Math.min(capacity, Math.max(500, Number(value) || business.valuation * 0.012)));

      if (!supplier || amount <= 0) return { ok: false, message: "No hay credito comercial disponible." };

      supplier.payableBalance = roundMoney(supplier.payableBalance + amount);
      supplier.daysUntilDue = supplier.paymentTermsDays;
      supplier.contractType = "credit";
      purchaseSupplies(business, amount, supplier);
      business.payables = roundMoney(business.payables + amount);
      business.suppliersReliability = clamp(business.suppliersReliability + 0.01, 0.25, 1);
      return { ok: true, message: `${business.name} compro insumos con credito comercial.` };
    }

    if (action === "supplier_negotiate") {
      const cost = roundMoney(Math.max(800, business.valuation * 0.006));
      if (business.cash < cost) {
        return { ok: false, message: "Caja empresarial insuficiente. Aporta capital o consigue credito antes de negociar proveedores." };
      }

      business.cash = roundMoney(business.cash - cost);
      business.suppliers = business.suppliers.map((supplier, index) => {
        if (index > 0) return supplier;
        return {
          ...supplier,
          contractType: "volume",
          reliability: clamp(supplier.reliability + 0.08, 0.25, 1),
          quality: clamp(supplier.quality + 0.06, 0.25, 1.2),
          costModifier: clamp(supplier.costModifier - 0.045, 0.78, 1.22),
          creditLimit: roundMoney(supplier.creditLimit + business.valuation * 0.025),
          discountRate: clamp(supplier.discountRate + 0.015, 0, 0.08)
        };
      });
      business.suppliersReliability = clamp(business.suppliersReliability + 0.06, 0.25, 1);
      return { ok: true, message: `${business.name} negocio mejores condiciones de proveedor.` };
    }

    if (action === "pay_supplier") {
      const due = roundMoney(business.suppliers.reduce((sum, supplier) => sum + supplier.payableBalance, 0));
      if (due <= 0) return { ok: false, message: "No hay cuentas por pagar con proveedores." };
      if (business.cash < due) return { ok: false, message: "Caja empresarial insuficiente para pagar proveedores." };

      business.cash = roundMoney(business.cash - due);
      business.suppliers = business.suppliers.map((supplier) => ({
        ...supplier,
        payableBalance: 0,
        daysUntilDue: supplier.paymentTermsDays,
        reliability: clamp(supplier.reliability + 0.025, 0.25, 1)
      }));
      business.payables = 0;
      business.suppliersReliability = clamp(business.suppliersReliability + 0.04, 0.25, 1);
      return { ok: true, message: `${business.name} pago proveedores y redujo riesgo operativo.` };
    }

    if (action === "price_up") {
      business.priceIndex = clamp(business.priceIndex + 0.05, 0.65, 1.55);
      return { ok: true, message: `Precio medio subio en ${business.name}.` };
    }

    if (action === "price_down") {
      business.priceIndex = clamp(business.priceIndex - 0.05, 0.65, 1.55);
      return { ok: true, message: `Precio medio bajo en ${business.name}.` };
    }

    if (action === "expand") {
      const cost = roundMoney(Math.max(5000, business.valuation * 0.08));
      if (business.cash < cost) return { ok: false, message: "Caja empresarial insuficiente para expandir." };
      business.cash = roundMoney(business.cash - cost);
      business.units.push(normalizeUnit({
        name: `${getSectorDefaults(business.sector).unitType} ${business.units.length + 1}`,
        location: getDefaultUnitLocation(business.sector, business.units.length)
      }, business.sector));
      business.requiredEmployees = getRequiredEmployees(business);
      business.valuation = roundMoney(business.valuation + cost * 0.9);
      return { ok: true, message: `Nueva unidad abierta en ${business.name}.` };
    }

    if (action === "franchise") {
      const day = state.time && state.time.day ? state.time.day : 1;
      const hasOperatingHistory = business.monthlyPnl.revenue > 0 || business.franchiseUnits > 0;
      const franchiseCooldown = business.lastFranchiseDay > 0 ? day - business.lastFranchiseDay : 999;
      const setupCost = roundMoney(Math.max(5000, business.valuation * 0.025));

      if (business.valuation < 50000 || !hasOperatingHistory) {
        return { ok: false, message: "La empresa necesita mas escala e historial para franquiciar." };
      }

      if (franchiseCooldown < 30) {
        return { ok: false, message: "La red de franquicias necesita 30 dias entre aperturas." };
      }

      if (business.cash < setupCost) {
        return { ok: false, message: "Caja empresarial insuficiente para franquiciar." };
      }

      const fee = roundMoney(Math.max(2500, business.valuation * 0.018));
      business.cash = roundMoney(business.cash - setupCost + fee);
      business.reputation = clamp(business.reputation + 0.025, 0.05, 1.2);
      business.franchiseUnits += 1;
      business.lastFranchiseDay = day;
      business.units.push(normalizeUnit({
        name: `franquicia ${business.units.length + 1}`,
        location: getDefaultUnitLocation(business.sector, business.units.length),
        rent: 0
      }, business.sector));
      business.requiredEmployees = getRequiredEmployees(business);
      business.valuation = roundMoney(business.valuation + fee * 1.2);
      return { ok: true, message: `${business.name} abrio una franquicia con fee inicial.` };
    }

    if (action === "dividend") {
      const reserve = Math.max(1000, business.monthlyPnl.opex || 0);
      const distributableCash = roundMoney(Math.max(0, business.cash - reserve));
      const available = roundMoney(Math.min(
        distributableCash,
        Math.max(0, Number(business.pendingDividends) || distributableCash)
      ));
      const dividend = roundMoney(Math.min(available, Math.max(0, Number(value) || available * 0.35)));
      if (dividend <= 0) return { ok: false, message: "No hay caja distribuible." };
      business.cash = roundMoney(business.cash - dividend);
      business.pendingDividends = roundMoney(Math.max(0, (Number(business.pendingDividends) || 0) - dividend));
      reduceValuationForCashOut(business, dividend);
      const taxResult = taxes && taxes.applyDividendTax ? taxes.applyDividendTax(state, dividend) : { net: dividend, tax: 0 };
      state.player.cash = roundMoney(state.player.cash + taxResult.net);
      if (player && player.appendCashflow) {
        player.appendCashflow(state, {
          type: "business_dividend",
          assetId: business.sourceAssetId || business.id,
          businessId: business.id,
          scope: "player",
          label: `Dividendo empresa ${business.name}`,
          amount: taxResult.net,
          gross: dividend,
          taxes: taxResult.tax
        });
      }
      return { ok: true, message: `${business.name} distribuyo dividendos.` };
    }

    if (action === "sell") {
      const ownedValue = getBusinessEquityValue(business);
      const proceeds = roundMoney(Math.max(0, ownedValue) * 0.92);
      state.player.cash = roundMoney(state.player.cash + proceeds);
      if (player && player.appendCashflow) {
        player.appendCashflow(state, {
          type: "business_sale",
          assetId: business.sourceAssetId || business.id,
          businessId: business.id,
          scope: "player",
          label: `Venta empresa ${business.name}`,
          amount: proceeds,
          gross: ownedValue,
          fees: roundMoney(Math.max(0, ownedValue - proceeds))
        });
      }
      state.businesses = state.businesses.filter((item) => item.id !== businessId);
      if (business.sourceAssetId) {
        state.portfolio = player.normalizePortfolio(state.portfolio)
          .filter((position) => position.assetId !== business.sourceAssetId);
      }
      if (player && player.recalculateState) player.recalculateState(state);
      return { ok: true, message: `Vendiste ${business.name} por ${proceeds.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.` };
    }

    if (action === "ipo") {
      if (business.ipo.listed) return { ok: false, message: "La empresa ya cotiza publicamente." };
      if (business.valuation < 120000 || business.monthlyPnl.revenue <= 0) {
        return { ok: false, message: "La empresa necesita mas escala e historial para IPO." };
      }

      const soldPercent = 0.25;
      const proceeds = roundMoney(business.valuation * soldPercent * 0.88);
      business.cash = roundMoney(business.cash + proceeds);
      if (player && player.appendCashflow) {
        player.appendCashflow(state, {
          type: "ipo_proceeds",
          assetId: business.sourceAssetId || business.id,
          businessId: business.id,
          scope: "business",
          label: `IPO ${business.name}`,
          amount: proceeds,
          gross: roundMoney(business.valuation * soldPercent),
          fees: roundMoney(Math.max(0, business.valuation * soldPercent - proceeds))
        });
      }
      business.ownershipPercent = clamp(business.ownershipPercent - soldPercent, 0.1, 1);
      business.type = "public";
      business.ipo = {
        listed: true,
        day: state.time && state.time.day ? state.time.day : 1,
        sharesSoldPercent: soldPercent,
        proceeds
      };
      business.valuation = roundMoney(business.valuation * 1.18);
      business.reputation = clamp(business.reputation + 0.08, 0.05, 1.2);
      if (player && player.recalculateState) player.recalculateState(state);
      return { ok: true, message: `${business.name} hizo IPO y vendio 25% al mercado.` };
    }

    return { ok: false, message: "Accion empresarial no reconocida." };
  }

  function getBusinessSummary(businesses) {
    const list = normalizeBusinesses(businesses);
    const valuation = roundMoney(list.reduce((sum, business) => sum + business.valuation * business.ownershipPercent, 0));
    const cash = roundMoney(list.reduce((sum, business) => sum + business.cash * business.ownershipPercent, 0));
    const equityValue = roundMoney(list.reduce((sum, business) => sum + getBusinessEquityValue(business), 0));
    const netIncome = roundMoney(list.reduce((sum, business) => sum + (business.monthlyPnl.netIncome || 0), 0));
    const debt = roundMoney(list.reduce((sum, business) => sum + business.debt, 0));
    const payables = roundMoney(list.reduce((sum, business) => sum + business.payables, 0));
    const receivables = roundMoney(list.reduce((sum, business) => sum + (business.receivables || 0), 0));
    const pendingDividends = roundMoney(list.reduce((sum, business) => sum + (business.pendingDividends || 0), 0));
    const alerts = list
      .filter((business) => {
        const supply = getSupplySnapshot(business);
        return business.employees < getRequiredEmployees(business) ||
          business.cash < Math.max(1000, (business.monthlyPnl.opex || 0) * 0.5) ||
          supply.coverageMonths < 0.75;
      })
      .map((business) => ({
        businessId: business.id,
        severity: business.cash <= 0 || business.employees <= 0 ? "critical" : "warning",
        text: business.employees < getRequiredEmployees(business)
          ? `${business.name}: contratar personal para operar normal.`
          : `${business.name}: revisar caja o inventario.`
      }));

    return {
      count: list.length,
      valuation,
      cash,
      equityValue,
      netIncome,
      debt,
      payables,
      receivables,
      pendingDividends,
      alerts,
      businesses: list
    };
  }

  function hydrateBusinessSnapshots(state) {
    if (!state) return [];
    state.businesses = normalizeBusinesses(state.businesses);
    const hydrated = [];

    state.businesses.forEach((business) => {
      if (hasMeaningfulMonthlyPnl(business.monthlyPnl)) return;

      const asset = business.sourceAssetId && state.assets ? state.assets[business.sourceAssetId] : null;
      const monthlyProfitHint = Number(asset && asset.monthlyProfit)
        || (business.type !== "startup" ? Math.max(1000, Number(business.valuation) * 0.008) : 0);

      if (monthlyProfitHint <= 0) return;

      business.monthlyPnl = buildEstimatedMonthlyPnl(business, monthlyProfitHint);
      hydrated.push(business.id);
    });

    return hydrated;
  }

  function syncOwnedBusinessAssets(state) {
    if (!player || !player.getDecoratedPositions) return [];
    const positions = player.getDecoratedPositions(state.portfolio, state.assets);
    const created = [];

    positions
      .filter((position) => position.asset.type === "business")
      .forEach((position) => {
        const business = createFromAsset(state, position.assetId);
        if (business) created.push(business);
      });

    return created;
  }

  window.CashEmpireBusinesses = {
    SECTOR_DEFAULTS,
    normalizeBusinesses,
    normalizeMonthlyInjections,
    createFromAsset,
    foundBusiness,
    getRequiredEmployees,
    getRndProductivityTargetAmount,
    getSupplySnapshot,
    applyEventImpact,
    processDailyBusinesses,
    applyBusinessAction,
    getBusinessSummary,
    syncOwnedBusinessAssets,
    hydrateBusinessSnapshots,
    appendBusinessNewsItem
  };
})();
