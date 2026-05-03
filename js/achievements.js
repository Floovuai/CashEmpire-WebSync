(function () {
  "use strict";

  const ACHIEVEMENTS = [
    achievement("first_buy", "Primera posicion", "Compra cualquier activo.", 1, (state) => (state.portfolio || []).length, { cash: 250 }),
    achievement("first_sale", "Primer cierre", "Vende un activo.", 1, (state) => (state.transactions || []).filter((tx) => tx.type === "sell").length, { cash: 350 }),
    achievement("five_positions", "Diversificador", "Ten 5 posiciones distintas.", 5, (state) => (state.portfolio || []).length, { cash: 1500 }),
    achievement("all_categories", "Mapa completo", "Invierte en 5 categorias.", 5, categoryProgress, { cash: 2000 }),
    achievement("networth_250k", "Cuarto de millon", "Alcanza $250k de patrimonio.", 250000, (state) => state.player.netWorth || 0, { cash: 2500 }),
    achievement("networth_1m", "Millonario", "Alcanza $1M de patrimonio.", 1000000, (state) => state.player.netWorth || 0, { cash: 10000 }),
    achievement("networth_10m", "Imperio serio", "Alcanza $10M de patrimonio.", 10000000, (state) => state.player.netWorth || 0, { cash: 50000 }),
    achievement("day_30", "Primer mes", "Sobrevive 30 dias.", 30, (state) => state.time.day || 1),
    achievement("day_365", "Un ano fiscal", "Sobrevive 365 dias.", 365, (state) => state.time.day || 1),
    achievement("first_dividend", "Caja pasiva", "Cobra ingreso pasivo.", 1, passiveIncomeCount, { cash: 600 }),
    achievement("first_property", "Terrateniente", "Compra una propiedad.", 1, (state) => ownedTypeCount(state, "real_estate")),
    achievement("first_business", "Operador", "Opera una empresa.", 1, (state) => (state.businesses || []).length, { cash: 2500 }),
    achievement("founder", "Fundador", "Funda una startup.", 1, (state) => (state.businesses || []).filter((biz) => biz.type === "startup").length, { cash: 3200 }),
    achievement("three_units", "Expansion local", "Opera 3 unidades.", 3, (state) => (state.businesses || []).reduce((sum, biz) => sum + (biz.units || []).length, 0), { cash: 5000 }),
    achievement("positive_business", "P&L verde", "Logra utilidad empresarial mensual positiva.", 1, (state) => (state.businesses || []).filter((biz) => biz.monthlyPnl && biz.monthlyPnl.netIncome > 0).length, { cash: 1800 }),
    achievement("loan_taken", "Capital prestado", "Toma un prestamo.", 1, (state) => (state.debts || []).length, { cash: 900 }),
    achievement("deposit_opened", "Tesoreria", "Abre un plazo fijo.", 1, (state) => (state.bank && state.bank.deposits ? state.bank.deposits.length : 0), { cash: 900 }),
    achievement("news_reader", "Lector de mercado", "Acumula 10 noticias.", 10, (state) => (state.events || []).length),
    achievement("taxpayer", "Dia de impuestos", "Paga impuestos acumulados.", 1000, (state) => state.taxes ? state.taxes.taxesPaid || 0 : 0),
    achievement("crisis_survivor", "Manos firmes", "Llega a una recesion sin quebrar.", 1, (state) => state.macro && state.macro.phase === "recession" && state.player.netWorth > state.player.initialBudget * 0.35 ? 1 : 0),
    achievement("ten_trades", "Mesa activa", "Completa 10 operaciones.", 10, (state) => (state.transactions || []).length),
    achievement("cash_buffer", "Colchon de liquidez", "Mantiene $100k en efectivo.", 100000, (state) => state.player.cash || 0)
  ];

  function achievement(id, name, description, target, progress, bonus) {
    return { id, name, description, target, progress, bonus: bonus || null };
  }

  function normalizeAchievements(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      unlocked: Array.isArray(source.unlocked) ? source.unlocked.filter((id) => typeof id === "string") : [],
      bonusesApplied: Array.isArray(source.bonusesApplied) ? source.bonusesApplied.filter((id) => typeof id === "string") : [],
      progress: source.progress && typeof source.progress === "object" && !Array.isArray(source.progress) ? source.progress : {},
      notifications: Array.isArray(source.notifications) ? source.notifications.slice(-8) : []
    };
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function ownedTypeCount(state, type) {
    const assets = state.assets || {};
    return (state.portfolio || []).filter((position) => assets[position.assetId] && assets[position.assetId].type === type).length;
  }

  function categoryProgress(state) {
    const assets = state.assets || {};
    const categories = new Set();
    (state.portfolio || []).forEach((position) => {
      if (assets[position.assetId]) categories.add(assets[position.assetId].type);
    });
    return categories.size;
  }

  function passiveIncomeCount(state) {
    const passiveTypes = new Set(["dividend", "coupon", "staking", "rent", "business_dividend"]);
    return (state.cashflows || []).filter((flow) => flow.amount > 0 && passiveTypes.has(flow.type)).length;
  }

  function checkAchievements(state) {
    state.achievements = normalizeAchievements(state.achievements);
    const unlockedSet = new Set(state.achievements.unlocked);
    const newlyUnlocked = [];
    const progress = {};

    ACHIEVEMENTS.forEach((item) => {
      const value = Math.max(0, Number(item.progress(state)) || 0);
      const ratio = Math.min(1, value / item.target);
      progress[item.id] = {
        value,
        target: item.target,
        ratio
      };

      if (ratio >= 1 && !unlockedSet.has(item.id)) {
        unlockedSet.add(item.id);
        const bonus = applyBonus(state, item);
        newlyUnlocked.push({
          id: item.id,
          name: item.name,
          day: state.time && state.time.day ? state.time.day : 1,
          bonus
        });
      }
    });

    state.achievements.unlocked = Array.from(unlockedSet);
    state.achievements.progress = progress;
    state.achievements.notifications = state.achievements.notifications.concat(newlyUnlocked).slice(-8);

    return newlyUnlocked;
  }

  function applyBonus(state, item) {
    state.achievements = normalizeAchievements(state.achievements);
    if (!item.bonus || state.achievements.bonusesApplied.includes(item.id)) {
      return null;
    }

    const bonus = item.bonus;
    const applied = {};

    if (bonus.cash) {
      state.player.cash = roundMoney((state.player.cash || 0) + bonus.cash);
      applied.cash = bonus.cash;
    }

    state.achievements.bonusesApplied = state.achievements.bonusesApplied.concat(item.id);
    return applied;
  }

  function getAchievementList(achievements) {
    const normalized = normalizeAchievements(achievements);
    const unlocked = new Set(normalized.unlocked);

    return ACHIEVEMENTS.map((item) => {
      const progress = normalized.progress[item.id] || { value: 0, target: item.target, ratio: 0 };
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        bonus: item.bonus,
        unlocked: unlocked.has(item.id),
        progress
      };
    });
  }

  function clearNotifications(state) {
    state.achievements = normalizeAchievements(state.achievements);
    state.achievements.notifications = [];
  }

  window.CashEmpireAchievements = {
    ACHIEVEMENTS,
    normalizeAchievements,
    checkAchievements,
    getAchievementList,
    clearNotifications
  };
})();
