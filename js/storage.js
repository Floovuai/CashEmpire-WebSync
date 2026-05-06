(function () {
  "use strict";

  const SAVE_KEY = "cashEmpire.save.v1";
  const SCHEMA_VERSION = 1;
  const SLOT_KEYS = [
    SAVE_KEY,
    "cashEmpire.save.v1.slot2",
    "cashEmpire.save.v1.slot3"
  ];
  const VALID_DIFFICULTIES = ["facil", "normal", "dificil", "pesadilla"];
  const VALID_AVATARS = ["man-suit", "woman-suit"];
  const economy = window.CashEmpireEconomy;
  const market = window.CashEmpireMarket;
  const player = window.CashEmpirePlayer;
  const events = window.CashEmpireEvents;
  const businesses = window.CashEmpireBusinesses;
  const taxesModule = window.CashEmpireTaxes;
  const bank = window.CashEmpireBank;
  const achievements = window.CashEmpireAchievements;
  const strategy = window.CashEmpireStrategy;
  const decisions = window.CashEmpireDecisions;

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeIsoDate(value, fallback) {
    const candidates = [value, fallback, nowIso()];

    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      const date = new Date(candidate);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }

    return nowIso();
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function toMoneyNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function toDayNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 1 ? Math.floor(number) : 1;
  }

  function normalizeSchemaVersion(value) {
    const version = Number(value);
    return version === SCHEMA_VERSION ? SCHEMA_VERSION : null;
  }

  function normalizeAvatarId(value) {
    return VALID_AVATARS.includes(value) ? value : VALID_AVATARS[0];
  }

  function normalizeMessages(value, fallbackDate) {
    const source = isObject(value) ? value : {};
    const rawItems = Array.isArray(source.items) ? source.items : Array.isArray(value) ? value : [];
    const items = rawItems
      .map((item, index) => {
        if (!isObject(item)) return null;
        const title = typeof item.title === "string" ? item.title.trim() : "";
        const body = typeof item.body === "string" ? item.body.trim() : "";
        if (!title && !body) return null;
        return {
          id: typeof item.id === "string" && item.id ? item.id : `msg_legacy_${index}`,
          day: toDayNumber(item.day),
          category: typeof item.category === "string" && item.category ? item.category : "system",
          scope: typeof item.scope === "string" && item.scope ? item.scope : "game",
          businessId: typeof item.businessId === "string" && item.businessId ? item.businessId : null,
          businessName: typeof item.businessName === "string" && item.businessName ? item.businessName : "",
          severity: typeof item.severity === "string" && item.severity ? item.severity : "info",
          actionHint: typeof item.actionHint === "string" ? item.actionHint.trim().slice(0, 160) : "",
          title: title || "Mensaje del juego",
          body,
          sourceNewsId: typeof item.sourceNewsId === "string" && item.sourceNewsId ? item.sourceNewsId : null,
          newsLevel: typeof item.newsLevel === "string" && item.newsLevel ? item.newsLevel : "",
          newsTitle: typeof item.newsTitle === "string" ? item.newsTitle.trim().slice(0, 120) : "",
          newsSummary: typeof item.newsSummary === "string" ? item.newsSummary.trim().slice(0, 420) : "",
          newsAffected: Array.isArray(item.newsAffected)
            ? item.newsAffected
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
              .slice(0, 8)
            : [],
          newsDelta: Number.isFinite(Number(item.newsDelta)) ? Number(item.newsDelta) : null,
          newsDuration: Math.max(0, Math.floor(Number(item.newsDuration) || 0)),
          newsImpact: typeof item.newsImpact === "string" ? item.newsImpact.trim().slice(0, 240) : "",
          bannerKey: typeof item.bannerKey === "string" && item.bannerKey ? item.bannerKey : "",
          createdAt: normalizeIsoDate(item.createdAt, fallbackDate),
          read: Boolean(item.read)
        };
      })
      .filter(Boolean)
      .slice(-80);
    const emittedKeys = Array.isArray(source.emittedKeys)
      ? source.emittedKeys.filter((key) => typeof key === "string" && key).slice(-180)
      : [];

    return { items, emittedKeys };
  }

  function getSaveKey(slot) {
    const index = Math.max(0, Math.min(2, Math.floor(Number(slot || 1)) - 1));
    return SLOT_KEYS[index];
  }

  function normalizeState(value) {
    const version = isObject(value) ? normalizeSchemaVersion(value.version) : null;

    if (!version || !isObject(value.player) || !isObject(value.time)) {
      return null;
    }

    const playerName = typeof value.player.name === "string" ? value.player.name.trim() : "";
    const cashFallback = toMoneyNumber(value.player.cash, 0);
    const initialBudget = toMoneyNumber(value.player.initialBudget, cashFallback);
    const difficulty = VALID_DIFFICULTIES.includes(value.player.difficulty) ? value.player.difficulty : "normal";

    if (!playerName || initialBudget < 1000) {
      return null;
    }

    const cash = toMoneyNumber(value.player.cash, initialBudget);
    const netWorth = toMoneyNumber(value.player.netWorth, cash);
    const createdAt = normalizeIsoDate(value.createdAt, nowIso());
    const updatedAt = normalizeIsoDate(value.updatedAt, createdAt);
    const startDateIso = normalizeIsoDate(value.time.startDateIso, createdAt);
    const macro = economy && typeof economy.normalizeMacro === "function"
      ? economy.normalizeMacro(value.macro, difficulty)
      : value.macro || null;
    const day = toDayNumber(value.time.day);
    const assets = market && typeof market.normalizeAssets === "function"
      ? market.normalizeAssets(value.assets, { day, difficulty })
      : isObject(value.assets) ? value.assets : {};
    const portfolio = player && typeof player.normalizePortfolio === "function"
      ? player.normalizePortfolio(value.portfolio)
      : Array.isArray(value.portfolio) ? value.portfolio : [];
    const transactions = player && typeof player.normalizeTransactions === "function"
      ? player.normalizeTransactions(value.transactions)
      : Array.isArray(value.transactions) ? value.transactions : [];
    const assetOps = player && typeof player.normalizeAssetOperations === "function"
      ? player.normalizeAssetOperations(value.assetOps, portfolio, assets)
      : isObject(value.assetOps) ? value.assetOps : {};
    const cashflows = player && typeof player.normalizeCashflows === "function"
      ? player.normalizeCashflows(value.cashflows)
      : Array.isArray(value.cashflows) ? value.cashflows.slice(-240) : [];
    const taxes = taxesModule && typeof taxesModule.normalizeTaxes === "function"
      ? taxesModule.normalizeTaxes(value.taxes)
      : player && typeof player.normalizeTaxes === "function"
        ? player.normalizeTaxes(value.taxes)
        : isObject(value.taxes) ? value.taxes : {};
    const normalizedBusinesses = businesses && typeof businesses.normalizeBusinesses === "function"
      ? businesses.normalizeBusinesses(value.businesses)
      : Array.isArray(value.businesses) ? value.businesses : [];
    const normalizedEvents = events && typeof events.normalizeEvents === "function"
      ? events.normalizeEvents(value.events)
      : Array.isArray(value.events) ? value.events : [];
    const normalizedEventEffects = events && typeof events.normalizeEventEffects === "function"
      ? events.normalizeEventEffects(value.eventEffects)
      : Array.isArray(value.eventEffects) ? value.eventEffects : [];
    const normalizedBank = bank && typeof bank.normalizeBank === "function"
      ? bank.normalizeBank(value.bank)
      : { creditScore: 700, deposits: [], lastPaymentDay: 0 };
    const normalizedDebts = bank && typeof bank.normalizeDebts === "function"
      ? bank.normalizeDebts(value.debts)
      : Array.isArray(value.debts) ? value.debts : [];
    const normalizedAchievements = achievements && typeof achievements.normalizeAchievements === "function"
      ? achievements.normalizeAchievements(value.achievements)
      : { unlocked: [], progress: {}, notifications: [] };
    const normalizedStrategy = strategy && typeof strategy.normalizeStrategy === "function"
      ? strategy.normalizeStrategy(value.strategy)
      : isObject(value.strategy) ? value.strategy : {};
    const normalizedDecisions = decisions && typeof decisions.normalizeDecisionState === "function"
      ? decisions.normalizeDecisionState(value.decisions)
      : isObject(value.decisions) ? value.decisions : {};
    const onboarding = isObject(value.onboarding)
      ? {
        skipped: Boolean(value.onboarding.skipped),
        guideSeen: Object.prototype.hasOwnProperty.call(value.onboarding, "guideSeen") ? Boolean(value.onboarding.guideSeen) : true,
        completed: Array.isArray(value.onboarding.completed) ? value.onboarding.completed.filter((id) => typeof id === "string") : [],
        rewardsClaimed: Array.isArray(value.onboarding.rewardsClaimed) ? value.onboarding.rewardsClaimed.filter((id) => typeof id === "string") : []
      }
      : { skipped: false, guideSeen: true, completed: [], rewardsClaimed: [] };
    const messages = normalizeMessages(value.messages, updatedAt);

    const normalized = {
      version: SCHEMA_VERSION,
      createdAt,
      updatedAt,
      player: {
        name: playerName,
        avatarId: normalizeAvatarId(value.player.avatarId),
        difficulty,
        initialBudget,
        cash,
        netWorth
      },
      time: {
        day,
        startDateIso
      },
      macro,
      assets,
      portfolio,
      assetOps,
      businesses: normalizedBusinesses,
      debts: normalizedDebts,
      bank: normalizedBank,
      taxes,
      transactions,
      cashflows,
      events: normalizedEvents,
      eventEffects: normalizedEventEffects,
      achievements: normalizedAchievements,
      strategy: normalizedStrategy,
      decisions: normalizedDecisions,
      onboarding,
      messages,
      activity: Array.isArray(value.activity) ? value.activity : [],
      history: Array.isArray(value.history) ? value.history : []
    };

    return player && typeof player.recalculateState === "function"
      ? player.recalculateState(normalized)
      : normalized;
  }

  function createInitialState({ playerName, initialBudget, difficulty, avatarId, scenario }) {
    const cash = Number(initialBudget);
    const normalizedDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "normal";
    const createdAt = nowIso();
    const macro = economy && typeof economy.createInitialMacro === "function"
      ? economy.createInitialMacro(normalizedDifficulty)
      : null;
    const assets = market && typeof market.createInitialAssets === "function"
      ? market.createInitialAssets({ day: 1, difficulty: normalizedDifficulty })
      : {};

    const state = {
      version: SCHEMA_VERSION,
      createdAt,
      updatedAt: createdAt,
      player: {
        name: playerName.trim(),
        avatarId: normalizeAvatarId(avatarId),
        difficulty: normalizedDifficulty,
        initialBudget: cash,
        cash,
        netWorth: cash
      },
      time: {
        day: 1,
        startDateIso: createdAt
      },
      macro,
      assets,
      portfolio: [],
      assetOps: {},
      businesses: [],
      debts: [],
      bank: bank && typeof bank.normalizeBank === "function" ? bank.normalizeBank({}) : { creditScore: 700, deposits: [], lastPaymentDay: 0 },
      taxes: taxesModule && typeof taxesModule.normalizeTaxes === "function"
        ? taxesModule.normalizeTaxes({})
        : player && typeof player.normalizeTaxes === "function" ? player.normalizeTaxes({}) : {},
      transactions: [],
      cashflows: [],
      events: [],
      eventEffects: [],
      achievements: achievements && typeof achievements.normalizeAchievements === "function"
        ? achievements.normalizeAchievements({})
        : { unlocked: [], progress: {}, notifications: [] },
      strategy: strategy && typeof strategy.createInitialStrategy === "function"
        ? strategy.createInitialStrategy({ scenario })
        : { scenario: typeof scenario === "string" ? scenario : "free" },
      decisions: decisions && typeof decisions.createInitialDecisionState === "function"
        ? decisions.createInitialDecisionState()
        : {},
      onboarding: {
        skipped: false,
        guideSeen: false,
        completed: [],
        rewardsClaimed: []
      },
      messages: {
        items: [],
        emittedKeys: []
      },
      activity: [
        {
          day: 1,
          text: "Partida creada. El imperio comienza con efectivo disponible."
        }
      ],
      history: [
        {
          day: 1,
          netWorth: cash,
          marketIndex: market && typeof market.getMarketIndex === "function" ? market.getMarketIndex(assets) : null
        }
      ]
    };

    if (strategy && typeof strategy.applyScenarioStart === "function") {
      strategy.applyScenarioStart(state);
      const meta = strategy.getScenarioMeta && strategy.getScenarioMeta(state.strategy.scenario);
      if (meta && meta.id !== "free") {
        state.activity.push({
          day: 1,
          text: `Escenario inicial: ${meta.label}. ${meta.body}`
        });
      }
    }

    return player && typeof player.recalculateState === "function" ? player.recalculateState(state) : state;
  }

  function hasSave(slot) {
    return load(slot) !== null;
  }

  function listSlots() {
    return SLOT_KEYS.map((key, index) => {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return {
          slot: index + 1,
          key,
          hasSave: false,
          state: null
        };
      }

      const state = load(index + 1);
      return {
        slot: index + 1,
        key,
        hasSave: Boolean(state),
        state
      };
    });
  }

  function load(slot) {
    const raw = localStorage.getItem(getSaveKey(slot));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeState(parsed);

      if (!normalized) {
        console.warn("Save incompatible o incompleto");
        return null;
      }

      return normalized;
    } catch (error) {
      console.error("Save corrupto", error);
      return null;
    }
  }

  function save(state, slot) {
    const normalized = normalizeState(state);

    if (!normalized) {
      throw new Error("No se puede guardar un estado invalido.");
    }

    const nextState = {
      ...normalized,
      updatedAt: nowIso()
    };

    localStorage.setItem(getSaveKey(slot), JSON.stringify(nextState));
    return nextState;
  }

  function clear(slot) {
    if (slot) {
      localStorage.removeItem(getSaveKey(slot));
      return;
    }

    SLOT_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  window.CashEmpireStorage = {
    SAVE_KEY,
    SCHEMA_VERSION,
    VALID_AVATARS,
    SLOT_KEYS,
    getSaveKey,
    createInitialState,
    normalizeState,
    hasSave,
    listSlots,
    load,
    save,
    clear
  };
})();
