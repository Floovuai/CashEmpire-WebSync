(function () {
  "use strict";

  const economy = window.CashEmpireEconomy;
  const DIVIDEND_TAX_RATE = 0.15;
  const PROPERTY_TAX_ANNUAL_RATE = 0.012;
  const WEALTH_TAX_RATE = 0.004;
  const WEALTH_TAX_EXEMPTION = 1000000;
  const BUSINESS_TAX_RATE = 0.21;
  const AGGRESSIVE_TAX_DISCOUNT = 0.3;
  const AUDIT_PENALTY_RATE = 0.45;

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeTaxes(taxes) {
    const source = isObject(taxes) ? taxes : {};

    return {
      realizedGains: roundMoney(Number(source.realizedGains) || 0),
      transactionFees: roundMoney(Math.max(0, Number(source.transactionFees) || 0)),
      taxesPaid: roundMoney(Math.max(0, Number(source.taxesPaid) || 0)),
      dividendTaxesPaid: roundMoney(Math.max(0, Number(source.dividendTaxesPaid) || 0)),
      propertyTaxesPaid: roundMoney(Math.max(0, Number(source.propertyTaxesPaid) || 0)),
      wealthTaxesPaid: roundMoney(Math.max(0, Number(source.wealthTaxesPaid) || 0)),
      businessTaxesPaid: roundMoney(Math.max(0, Number(source.businessTaxesPaid) || 0)),
      auditPenaltiesPaid: roundMoney(Math.max(0, Number(source.auditPenaltiesPaid) || 0)),
      evasionSavings: roundMoney(Math.max(0, Number(source.evasionSavings) || 0)),
      lastAnnualTaxDay: Math.max(0, Math.floor(Number(source.lastAnnualTaxDay) || 0)),
      strategy: source.strategy === "agresiva" ? "agresiva" : "normal",
      audits: Array.isArray(source.audits) ? source.audits.slice(-12) : []
    };
  }

  function getStrategyMultiplier(taxes) {
    return normalizeTaxes(taxes).strategy === "agresiva" ? 1 - AGGRESSIVE_TAX_DISCOUNT : 1;
  }

  function getDifficultyTaxMultiplier(state) {
    const difficulty = state && state.player ? state.player.difficulty : "normal";
    const settings = economy && typeof economy.getDifficultySettings === "function"
      ? economy.getDifficultySettings(difficulty)
      : { tax: 1 };
    return Math.max(0, Number(settings.tax) || 1);
  }

  function getEffectiveTaxMultiplier(state) {
    return getStrategyMultiplier(state.taxes) * getDifficultyTaxMultiplier(state);
  }

  function addTaxDebt(state, amount, label) {
    const principal = roundMoney(Math.max(0, Number(amount) || 0));
    if (principal <= 0) return;
    state.debts = Array.isArray(state.debts) ? state.debts : [];
    const annualRate = state.macro ? clamp((Number(state.macro.interestRate) || 0.04) + 0.11, 0.08, 0.28) : 0.16;
    state.debts.push({
      id: `tax_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: "personal",
      label,
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

  function debitPlayerCash(state, amount, label) {
    const payment = roundMoney(Math.max(0, Number(amount) || 0));
    const available = Math.max(0, Number(state.player && state.player.cash) || 0);
    if (available >= payment) {
      state.player.cash = roundMoney(available - payment);
      return { paid: payment, financed: 0 };
    }

    state.player.cash = 0;
    addTaxDebt(state, payment - available, label);
    return { paid: available, financed: roundMoney(payment - available) };
  }

  function applyDividendTax(state, grossAmount) {
    state.taxes = normalizeTaxes(state.taxes);
    const gross = Math.max(0, Number(grossAmount) || 0);
    const standardTax = roundMoney(gross * DIVIDEND_TAX_RATE);
    const tax = roundMoney(standardTax * getEffectiveTaxMultiplier(state));
    const saved = roundMoney(standardTax - tax);

    state.taxes.dividendTaxesPaid = roundMoney(state.taxes.dividendTaxesPaid + tax);
    state.taxes.taxesPaid = roundMoney(state.taxes.taxesPaid + tax);
    state.taxes.evasionSavings = roundMoney(state.taxes.evasionSavings + saved);

    return {
      tax,
      net: roundMoney(gross - tax),
      saved
    };
  }

  function applyBusinessTax(state, profit) {
    state.taxes = normalizeTaxes(state.taxes);
    const taxableProfit = Math.max(0, Number(profit) || 0);
    const standardTax = roundMoney(taxableProfit * BUSINESS_TAX_RATE);
    const tax = roundMoney(standardTax * getEffectiveTaxMultiplier(state));
    const saved = roundMoney(standardTax - tax);

    state.taxes.businessTaxesPaid = roundMoney(state.taxes.businessTaxesPaid + tax);
    state.taxes.taxesPaid = roundMoney(state.taxes.taxesPaid + tax);
    state.taxes.evasionSavings = roundMoney(state.taxes.evasionSavings + saved);

    return {
      tax,
      saved
    };
  }

  function chargePropertyTax(state, taxableValue) {
    state.taxes = normalizeTaxes(state.taxes);
    const value = Math.max(0, Number(taxableValue) || 0);
    const standardTax = roundMoney((value * PROPERTY_TAX_ANNUAL_RATE) / 12);
    const tax = roundMoney(standardTax * getEffectiveTaxMultiplier(state));
    const saved = roundMoney(standardTax - tax);

    state.taxes.propertyTaxesPaid = roundMoney(state.taxes.propertyTaxesPaid + tax);
    state.taxes.taxesPaid = roundMoney(state.taxes.taxesPaid + tax);
    state.taxes.evasionSavings = roundMoney(state.taxes.evasionSavings + saved);

    return {
      tax,
      saved
    };
  }

  function maybeAudit(state) {
    state.taxes = normalizeTaxes(state.taxes);

    if (state.taxes.strategy !== "agresiva" || state.taxes.evasionSavings <= 0) {
      return null;
    }

    const macroRisk = state.macro && state.macro.phase === "recession" ? 0.006 : 0.003;
    const day = state.time && state.time.day ? state.time.day : 1;

    if (day < 120 || Math.random() > macroRisk) {
      return null;
    }

    const penalty = roundMoney((state.taxes.evasionSavings * AUDIT_PENALTY_RATE + Math.max(500, state.player.netWorth * 0.001)) * getDifficultyTaxMultiplier(state));
    debitPlayerCash(state, penalty, "Deuda por auditoria fiscal");
    state.taxes.auditPenaltiesPaid = roundMoney(state.taxes.auditPenaltiesPaid + penalty);
    state.taxes.taxesPaid = roundMoney(state.taxes.taxesPaid + penalty);
    state.taxes.evasionSavings = 0;

    const audit = {
      day,
      penalty,
      text: `Auditoria fiscal: multa de ${penalty.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`
    };

    state.taxes.audits = state.taxes.audits.concat(audit).slice(-12);
    return audit;
  }

  function processDailyTaxes(state) {
    state.taxes = normalizeTaxes(state.taxes);
    const day = state.time && state.time.day ? state.time.day : 1;
    const entries = [];

    if (day > 1 && day % 365 === 0 && state.taxes.lastAnnualTaxDay !== day) {
      const taxableWealth = Math.max(0, (state.player.netWorth || 0) - WEALTH_TAX_EXEMPTION);
      const standardTax = roundMoney(taxableWealth * WEALTH_TAX_RATE);
      const tax = roundMoney(standardTax * getEffectiveTaxMultiplier(state));
      const saved = roundMoney(standardTax - tax);

      if (tax > 0) {
        const debit = debitPlayerCash(state, tax, "Deuda por impuesto a la riqueza");
        state.taxes.wealthTaxesPaid = roundMoney(state.taxes.wealthTaxesPaid + tax);
        state.taxes.taxesPaid = roundMoney(state.taxes.taxesPaid + tax);
        state.taxes.evasionSavings = roundMoney(state.taxes.evasionSavings + saved);
        entries.push({
          type: "wealth_tax",
          amount: -tax,
          text: debit.financed > 0
            ? `Impuesto anual a la riqueza financiado: ${tax.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`
            : `Impuesto anual a la riqueza pagado: ${tax.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`
        });
      }

      state.taxes.lastAnnualTaxDay = day;
    }

    const audit = maybeAudit(state);
    if (audit) {
      entries.push({
        type: "audit",
        amount: -audit.penalty,
        text: audit.text
      });
    }

    return entries;
  }

  function setStrategy(state, strategy) {
    state.taxes = normalizeTaxes(state.taxes);
    state.taxes.strategy = strategy === "agresiva" ? "agresiva" : "normal";
    return state.taxes;
  }

  function getTaxSummary(taxes) {
    const normalized = normalizeTaxes(taxes);
    const auditRisk = normalized.strategy === "agresiva"
      ? clamp(0.08 + normalized.evasionSavings / 1000000, 0.08, 0.42)
      : 0.01;

    return {
      ...normalized,
      auditRisk
    };
  }

  window.CashEmpireTaxes = {
    DIVIDEND_TAX_RATE,
    PROPERTY_TAX_ANNUAL_RATE,
    WEALTH_TAX_RATE,
    BUSINESS_TAX_RATE,
    normalizeTaxes,
    applyDividendTax,
    applyBusinessTax,
    chargePropertyTax,
    processDailyTaxes,
    setStrategy,
    getTaxSummary
  };
})();
