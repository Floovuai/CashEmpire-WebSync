(function () {
  "use strict";

  const player = window.CashEmpirePlayer;
  const economy = window.CashEmpireEconomy;
  const strategy = window.CashEmpireStrategy;
  const MAX_DEBTS = 24;
  const MAX_DEPOSITS = 24;

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeDebts(debts) {
    const source = Array.isArray(debts) ? debts : [];

    return source
      .map((debt) => {
        if (!isObject(debt)) return null;
        const balance = roundMoney(Math.max(0, Number(debt.balance) || 0));
        if (balance <= 0) return null;

        return {
          id: typeof debt.id === "string" ? debt.id : createId("debt"),
          type: ["personal", "mortgage", "business_credit"].includes(debt.type) ? debt.type : "personal",
          label: typeof debt.label === "string" ? debt.label : "Prestamo",
          balance,
          principal: roundMoney(Math.max(balance, Number(debt.principal) || balance)),
          annualRate: clamp(Number(debt.annualRate) || 0.08, 0.005, 0.35),
          monthlyPayment: roundMoney(Math.max(1, Number(debt.monthlyPayment) || balance * 0.03)),
          remainingMonths: Math.max(1, Math.floor(Number(debt.remainingMonths) || 24)),
          collateralAssetId: typeof debt.collateralAssetId === "string" ? debt.collateralAssetId : null,
          businessId: typeof debt.businessId === "string" ? debt.businessId : null,
          createdDay: Math.max(1, Math.floor(Number(debt.createdDay) || 1)),
          missedPayments: Math.max(0, Math.floor(Number(debt.missedPayments) || 0))
        };
      })
      .filter(Boolean)
      .slice(-MAX_DEBTS);
  }

  function normalizeDeposits(deposits) {
    const source = Array.isArray(deposits) ? deposits : [];

    return source
      .map((deposit) => {
        if (!isObject(deposit)) return null;
        const principal = roundMoney(Math.max(0, Number(deposit.principal) || 0));
        if (principal <= 0) return null;

        return {
          id: typeof deposit.id === "string" ? deposit.id : createId("dep"),
          principal,
          annualRate: clamp(Number(deposit.annualRate) || 0.035, 0, 0.2),
          remainingDays: Math.max(1, Math.floor(Number(deposit.remainingDays) || 90)),
          createdDay: Math.max(1, Math.floor(Number(deposit.createdDay) || 1)),
          label: typeof deposit.label === "string" ? deposit.label : "Plazo fijo"
        };
      })
      .filter(Boolean)
      .slice(-MAX_DEPOSITS);
  }

  function normalizeBank(bank) {
    const source = isObject(bank) ? bank : {};

    return {
      creditScore: clamp(Math.floor(Number(source.creditScore) || 700), 300, 850),
      deposits: normalizeDeposits(source.deposits),
      lastPaymentDay: Math.max(0, Math.floor(Number(source.lastPaymentDay) || 0))
    };
  }

  function getDebtTotal(state) {
    return normalizeDebts(state.debts).reduce((sum, debt) => sum + debt.balance, 0);
  }

  function getCreditScore(state) {
    const bank = normalizeBank(state.bank);
    const debts = normalizeDebts(state.debts);
    const debtTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const netWorth = Math.max(1, Number(state.player && state.player.netWorth) || 1);
    const debtRatio = debtTotal / netWorth;
    const missed = debts.reduce((sum, debt) => sum + debt.missedPayments, 0);
    const liquidityBonus = Math.min(40, (state.player.cash || 0) / netWorth * 120);
    const score = 720 - debtRatio * 260 - missed * 25 + liquidityBonus;

    bank.creditScore = clamp(Math.round(score), 300, 850);
    state.bank = bank;
    state.debts = debts;
    return bank.creditScore;
  }

  function getBorrowingCapacity(state) {
    const score = getCreditScore(state);
    const netWorth = Math.max(0, Number(state.player && state.player.netWorth) || 0);
    const debtTotal = getDebtTotal(state);
    const multiplier = score >= 760 ? 0.55 : score >= 690 ? 0.38 : score >= 620 ? 0.22 : 0.1;

    return roundMoney(Math.max(0, netWorth * multiplier - debtTotal));
  }

  function getLoanRate(state, type) {
    const score = getCreditScore(state);
    const macroRate = state.macro ? Number(state.macro.interestRate) || 0.04 : 0.04;
    const typeSpread = type === "mortgage" ? 0.025 : type === "business_credit" ? 0.052 : 0.07;
    const scoreSpread = score >= 760 ? -0.008 : score >= 690 ? 0 : score >= 620 ? 0.022 : 0.055;
    const difficulty = state.player && state.player.difficulty ? state.player.difficulty : "normal";
    const settings = economy && typeof economy.getDifficultySettings === "function"
      ? economy.getDifficultySettings(difficulty)
      : { loanRate: 1 };
    const difficultyMultiplier = Math.max(0.25, Number(settings.loanRate) || 1);

    const strategyMultiplier = strategy && typeof strategy.getLoanRateModifier === "function"
      ? strategy.getLoanRateModifier(state, type)
      : 1;

    return clamp((macroRate + typeSpread + scoreSpread) * difficultyMultiplier * strategyMultiplier, 0.018, 0.32);
  }

  function monthlyPayment(principal, annualRate, months) {
    const rate = annualRate / 12;
    if (rate <= 0) return roundMoney(principal / months);
    return roundMoney((principal * rate) / (1 - Math.pow(1 + rate, -months)));
  }

  function requestLoan(state, amount, type, options) {
    state.bank = normalizeBank(state.bank);
    state.debts = normalizeDebts(state.debts);
    const principal = roundMoney(Math.max(0, Number(amount) || 0));
    const settings = isObject(options) ? options : {};

    if (principal < 500) {
      return { ok: false, message: "El prestamo minimo es $500." };
    }

    const capacity = getBorrowingCapacity(state);
    if (principal > capacity) {
      return { ok: false, message: "La capacidad crediticia no alcanza para ese monto." };
    }

    const debtType = type === "business_credit" ? "business_credit" : "personal";
    const months = debtType === "business_credit" ? 36 : 24;
    const annualRate = getLoanRate(state, debtType);
    let targetBusiness = null;

    if (debtType === "business_credit") {
      const businessId = typeof settings.businessId === "string" ? settings.businessId : "";
      const businesses = Array.isArray(state.businesses) ? state.businesses : [];
      targetBusiness = businesses.find((business) => business.id === businessId) || null;

      if (!targetBusiness) {
        return { ok: false, message: "Selecciona una empresa operativa para acreditar el credito." };
      }
    }

    const debt = {
      id: createId("loan"),
      type: debtType,
      label: debtType === "business_credit" ? "Linea de credito empresarial" : "Prestamo personal",
      balance: principal,
      principal,
      annualRate,
      monthlyPayment: monthlyPayment(principal, annualRate, months),
      remainingMonths: months,
      collateralAssetId: null,
      businessId: targetBusiness ? targetBusiness.id : null,
      createdDay: state.time.day,
      missedPayments: 0
    };

    state.debts.push(debt);
    if (debtType === "business_credit") {
      targetBusiness.cash = roundMoney(targetBusiness.cash + principal);
    } else {
      state.player.cash = roundMoney(state.player.cash + principal);
    }
    if (player && player.appendCashflow) {
      player.appendCashflow(state, {
        type: debtType === "business_credit" ? "business_credit_draw" : "loan_disbursement",
        scope: debtType === "business_credit" ? "business" : "player",
        businessId: targetBusiness ? targetBusiness.id : null,
        label: debt.label,
        amount: principal,
        gross: principal
      });
    }
    getCreditScore(state);

    return {
      ok: true,
      message: `${debt.label} aprobado.`,
      debt,
      business: targetBusiness
    };
  }

  function startDeposit(state, amount) {
    state.bank = normalizeBank(state.bank);
    const principal = roundMoney(Math.max(0, Number(amount) || 0));

    if (principal < 500) {
      return { ok: false, message: "El plazo fijo minimo es $500." };
    }

    if (state.player.cash < principal) {
      return { ok: false, message: "Efectivo insuficiente para constituir el deposito." };
    }

    const annualRate = clamp((state.macro ? state.macro.interestRate : 0.04) * 0.72, 0.01, 0.14);
    const deposit = {
      id: createId("dep"),
      principal,
      annualRate,
      remainingDays: 90,
      createdDay: state.time.day,
      label: "Plazo fijo 90 dias"
    };

    state.player.cash = roundMoney(state.player.cash - principal);
    state.bank.deposits.push(deposit);
    if (player && player.appendCashflow) {
      player.appendCashflow(state, {
        type: "deposit_open",
        scope: "player",
        label: deposit.label,
        amount: -principal,
        gross: principal
      });
    }

    return {
      ok: true,
      message: "Plazo fijo constituido.",
      deposit
    };
  }

  function buyPropertyWithMortgage(state, assetId) {
    if (!state.assets || !state.assets[assetId]) {
      return { ok: false, message: "Propiedad no disponible." };
    }

    const asset = state.assets[assetId];
    if (asset.type !== "real_estate") {
      return { ok: false, message: "La hipoteca solo aplica a propiedades." };
    }

    const existing = player && player.findPosition ? player.findPosition(state, assetId) : null;
    if (existing && existing.quantity >= 1) {
      return { ok: false, message: "Ya tienes esta propiedad." };
    }

    const price = roundMoney(asset.simPrice);
    const downPayment = roundMoney(price * 0.25);
    const closingCosts = roundMoney(price * 0.018);
    const cashNeeded = roundMoney(downPayment + closingCosts);

    if (state.player.cash < cashNeeded) {
      return { ok: false, message: "Efectivo insuficiente para anticipo y gastos de cierre." };
    }

    const mortgagePrincipal = roundMoney(price - downPayment);
    const annualRate = getLoanRate(state, "mortgage");
    const debt = {
      id: createId("mort"),
      type: "mortgage",
      label: `Hipoteca ${asset.ticker || asset.name}`,
      balance: mortgagePrincipal,
      principal: mortgagePrincipal,
      annualRate,
      monthlyPayment: monthlyPayment(mortgagePrincipal, annualRate, 240),
      remainingMonths: 240,
      collateralAssetId: assetId,
      businessId: null,
      createdDay: state.time.day,
      missedPayments: 0
    };

    state.player.cash = roundMoney(state.player.cash - cashNeeded);
    state.debts = normalizeDebts(state.debts).concat(debt);

    if (player && player.addAssetPosition) {
      player.addAssetPosition(state, assetId, 1, roundMoney(price + closingCosts), "mortgage_buy");
      player.recalculateState(state);
    }

    getCreditScore(state);

    return {
      ok: true,
      message: `Compraste ${asset.name} con hipoteca.`,
      debt,
      cashNeeded
    };
  }

  function getDebtPaymentSource(state, debt) {
    if (debt.type === "business_credit" && debt.businessId) {
      const business = Array.isArray(state.businesses)
        ? state.businesses.find((item) => item.id === debt.businessId)
        : null;
      if (business) {
        return {
          holder: business,
          scope: "business",
          businessId: business.id,
          cash: Math.max(0, Number(business.cash) || 0),
          debit(amount) {
            business.cash = roundMoney(Math.max(0, (Number(business.cash) || 0) - amount));
          }
        };
      }
    }

    return {
      holder: state.player,
      scope: "player",
      businessId: null,
      cash: Math.max(0, Number(state.player && state.player.cash) || 0),
      debit(amount) {
        state.player.cash = roundMoney(Math.max(0, (Number(state.player.cash) || 0) - amount));
      }
    };
  }

  function processDailyBank(state) {
    state.bank = normalizeBank(state.bank);
    state.debts = normalizeDebts(state.debts);
    state.bank.deposits = normalizeDeposits(state.bank.deposits);
    const day = state.time && state.time.day ? state.time.day : 1;
    const entries = [];

    state.bank.deposits = state.bank.deposits
      .map((deposit) => ({
        ...deposit,
        remainingDays: deposit.remainingDays - 1
      }))
      .filter((deposit) => {
        if (deposit.remainingDays > 0) return true;

        const interest = roundMoney(deposit.principal * deposit.annualRate * 90 / 365);
        const payout = roundMoney(deposit.principal + interest);
        state.player.cash = roundMoney(state.player.cash + payout);
        if (player && player.appendCashflow) {
          player.appendCashflow(state, {
            type: "deposit_maturity",
            scope: "player",
            label: deposit.label,
            amount: payout,
            gross: payout
          });
        }
        entries.push({
          type: "deposit_maturity",
          amount: payout,
          text: `Vencio ${deposit.label}: cobraste ${payout.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`
        });
        return false;
      });

    if (day > 1 && day % 30 === 0 && state.bank.lastPaymentDay !== day) {
      state.debts = state.debts
        .map((debt) => {
          const interest = roundMoney(debt.balance * debt.annualRate / 12);
          const principalPay = roundMoney(Math.max(0, debt.monthlyPayment - interest));
          const payment = roundMoney(Math.min(debt.balance + interest, debt.monthlyPayment));

          const paymentSource = getDebtPaymentSource(state, debt);

          if (paymentSource.cash >= payment) {
            paymentSource.debit(payment);
            const nextBalance = roundMoney(Math.max(0, debt.balance + interest - payment));
            if (player && player.appendCashflow) {
              player.appendCashflow(state, {
                type: "debt_payment",
                scope: paymentSource.scope,
                businessId: paymentSource.businessId,
                assetId: debt.collateralAssetId,
                label: debt.label,
                amount: -payment,
                gross: payment,
                fees: interest
              });
            }
            entries.push({
              type: "debt_payment",
              amount: -payment,
              text: paymentSource.scope === "business"
                ? `Cuota empresarial pagada: ${debt.label} por ${payment.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`
                : `Cuota pagada: ${debt.label} por ${payment.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`
            });

            return {
              ...debt,
              balance: nextBalance,
              remainingMonths: Math.max(0, debt.remainingMonths - 1)
            };
          }

          debt.missedPayments += 1;
          debt.balance = roundMoney(debt.balance + interest + Math.max(25, payment * 0.04));
          if (player && player.appendCashflow) {
            player.appendCashflow(state, {
              type: "missed_payment_penalty",
              scope: paymentSource.scope,
              businessId: paymentSource.businessId,
              assetId: debt.collateralAssetId,
              label: debt.label,
              amount: 0,
              gross: roundMoney(interest + Math.max(25, payment * 0.04)),
              fees: roundMoney(interest + Math.max(25, payment * 0.04))
            });
          }
          entries.push({
            type: "missed_payment",
            amount: 0,
            text: `Cuota impaga: ${debt.label}. El saldo aumento por intereses.`
          });
          return debt;
        })
        .filter((debt) => debt.balance > 0 && debt.remainingMonths > 0);

      state.bank.lastPaymentDay = day;
    }

    getCreditScore(state);
    return entries;
  }

  function getBankSummary(state) {
    state.bank = normalizeBank(state.bank);
    state.debts = normalizeDebts(state.debts);
    state.bank.deposits = normalizeDeposits(state.bank.deposits);
    const debtTotal = getDebtTotal(state);
    const depositTotal = state.bank.deposits.reduce((sum, deposit) => sum + deposit.principal, 0);

    return {
      creditScore: getCreditScore(state),
      borrowingCapacity: getBorrowingCapacity(state),
      debtTotal,
      depositTotal,
      debts: state.debts,
      deposits: state.bank.deposits
    };
  }

  window.CashEmpireBank = {
    normalizeBank,
    normalizeDebts,
    normalizeDeposits,
    getCreditScore,
    getBorrowingCapacity,
    getLoanRate,
    requestLoan,
    startDeposit,
    buyPropertyWithMortgage,
    processDailyBank,
    getBankSummary
  };
})();
