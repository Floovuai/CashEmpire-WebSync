(function () {
  "use strict";

  const storage = window.CashEmpireStorage;
  const economy = window.CashEmpireEconomy;
  const market = window.CashEmpireMarket;
  const player = window.CashEmpirePlayer;
  const events = window.CashEmpireEvents;
  const businesses = window.CashEmpireBusinesses;
  const taxes = window.CashEmpireTaxes;
  const strategy = window.CashEmpireStrategy;
  const bank = window.CashEmpireBank;
  const achievements = window.CashEmpireAchievements;
  const cloudSync = window.CashEmpireCloudSync;

  const EXIT_TRANSITION_MS = 240;
  const ENTER_TRANSITION_MS = 340;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CHRONO_ANIMATION_MS = 920;
  let state = null;
  let selectedDifficulty = "facil";
  let selectedAvatarId = "man-suit";
  let selectedScenario = "free";
  let currentSlot = 1;
  let isTransitioning = false;
  let tradeDraft = null;
  let currentView = "dashboard";
  let resizeRenderId = 0;
  let chronoAnimationFrame = 0;
  let chronoLiveFrame = 0;
  let chronoSpeed = 0;
  let chronoVisualOffsetMs = 0;
  let chronoLiveLastMs = 0;
  let dashboardPortfolioFilter = "all";
  const expandedDashboardAssetIds = new Set();
  const expandedBusinessIds = new Set();
  const openBusinessContributionIds = new Set();
  const openBusinessAmountActions = new Map();
  let messageFilter = "all";
  let expandedAlertKey = null;
  let empireMap3d = null;
  let activeEmpireLocationKey = "";
  const empireLocationPinElements = new Map();
  const empireLocationProjectionMap = new Map();
  const empireLocationDataMap = new Map();
  const ONBOARDING_REWARDS = {
    firstBuy: { cash: 500, tier: "Basica", label: "+$500 jugador" },
    news: { cash: 750, tier: "Basica", label: "+$750 jugador" },
    time: { cash: 1500, tier: "Media", label: "+$1.5k jugador" },
    business: { cash: 2500, tier: "Alta", label: "+$2.5k jugador" },
    diversify: { cash: 4000, tier: "Alta", label: "+$4k jugador" }
  };

  const MESSAGE_CATEGORY_LABELS = {
    system: "Sistema",
    business: "Empresa",
    guide: "Guia",
    bonus: "Bonificacion",
    milestone: "Hito",
    warning: "Riesgo",
    critical: "Critico"
  };

  const VIEW_LABELS = {
    dashboard: "Ciudad",
    market: "Mercado",
    realestate: "Bienes raices",
    business: "Empresas",
    bank: "Banco",
    news: "Noticias",
    progress: "Progreso"
  };

  const MONTHLY_BUSINESS_ACTION_LABELS = {
    contribute: "Aporte mensual",
    inventory: "Insumos mensuales",
    marketing: "Marketing mensual",
    rnd: "I+D mensual",
    supplier_credit: "Credito proveedor mensual"
  };

  const ASSET_CATEGORY_LABELS = {
    stock: "Acciones",
    bond: "Bonos",
    real_estate: "Bienes raices",
    business: "Empresas",
    commodity: "Commodities",
    crypto: "Crypto",
    collectible: "Coleccionables"
  };

  const ASSET_CATEGORY_ORDER = [
    "stock",
    "bond",
    "real_estate",
    "business",
    "commodity",
    "crypto",
    "collectible"
  ];

  const EMPIRE_LOCATION_COORDS = {
    "HQ del imperio": { x: 0, z: 0 },
    "Distrito Bolsa": { x: -3.2, z: -2.4 },
    "Centro financiero": { x: -1.3, z: -2.9 },
    "Mercado global": { x: 3.1, z: -2.3 },
    "Nodo crypto": { x: 2.4, z: 2.5 },
    "Puerto de commodities": { x: -3.4, z: 2.2 },
    "Galeria patrimonial": { x: 0.2, z: 3.2 },
    "Bogota": { x: -1.9, z: 0.9 },
    "Medellin": { x: -2.8, z: 0.2 },
    "Cartagena": { x: -3.4, z: -0.4 },
    "Cali": { x: -1.2, z: 2.4 },
    "Buenos Aires": { x: -3.6, z: 3.1 },
    "Ciudad de Mexico": { x: -2.9, z: -1.6 },
    "Sao Paulo": { x: -2.3, z: 3.4 },
    "Santiago": { x: -3.8, z: 2.4 },
    "Lima": { x: -3.5, z: 1.4 },
    "Panama": { x: -2.2, z: -0.8 },
    "Nueva York": { x: -0.4, z: -3.5 },
    "Miami": { x: -1.4, z: -2.5 },
    "Madrid": { x: 1.6, z: -2.8 },
    "Londres": { x: 0.8, z: -3.4 },
    "Tokio": { x: 3.6, z: -0.6 },
    "Dubai": { x: 2.7, z: 0.8 },
    "Singapur": { x: 3.5, z: 1.8 },
    "Distrito tecnologico": { x: 1.35, z: 2.65 },
    "Distrito corporativo": { x: 0.55, z: -2.45 }
  };

  const EMPIRE_LOCATION_TYPE_COLORS = {
    hq: "#f4c44e",
    stock: "#2fffd1",
    bond: "#68a7ff",
    real_estate: "#f09b4f",
    business: "#b18cff",
    commodity: "#f4c44e",
    crypto: "#79d7ff",
    collectible: "#f7f7ef",
    mixed: "#2fffd1"
  };

  const AVATAR_OPTIONS = {
    "man-suit": {
      label: "Hombre con traje",
      src: "assets/avatars/avatar-man-suit.svg"
    },
    "woman-suit": {
      label: "Mujer con traje",
      src: "assets/avatars/avatar-woman-suit.svg"
    }
  };

  function q(selector) {
    return document.querySelector(selector);
  }

  const els = {
    setupScreen: q("#screen-setup"),
    gameScreen: q("#screen-game"),
    setupForm: q("#setup-form"),
    setupControls: document.querySelectorAll("#setup-form input, #setup-form button, #setup-form select"),
    playerName: q("#player-name"),
    initialBudget: q("#initial-budget"),
    nameError: q("#name-error"),
    budgetError: q("#budget-error"),
    loadButton: q("#btn-load"),
    loadSlotWrap: q("#load-slot-wrap"),
    loadSlot: q("#load-slot"),
    avatarButtons: document.querySelectorAll("[data-avatar-id]"),
    difficultyButtons: document.querySelectorAll(".difficulty"),
    scenarioButtons: document.querySelectorAll("[data-scenario]"),
    budgetButtons: document.querySelectorAll("[data-budget]"),
    userMenuButton: q("#btn-user-menu"),
    userMenu: q("#user-menu"),
    saveNowButton: q("#btn-save-now"),
    otaCheckButton: q("#btn-ota-check"),
    cloudConnectButton: q("#btn-cloud-connect"),
    cloudPushButton: q("#btn-cloud-push"),
    cloudPullButton: q("#btn-cloud-pull"),
    cloudDisconnectButton: q("#btn-cloud-disconnect"),
    saveSlotButtons: document.querySelectorAll("[data-save-slot]"),
    resetButton: q("#btn-reset-game"),
    viewTabs: document.querySelectorAll("[data-view]"),
    viewPanels: document.querySelectorAll("[data-view-panel]"),
    currentViewLabel: q("#current-view-label"),
    advanceButtons: document.querySelectorAll("[data-advance]"),
    hudUserAvatar: q("#hud-user-avatar"),
    menuUserAvatar: q("#menu-user-avatar"),
    hudPlayerName: q("#hud-player-name"),
    hudDay: q("#hud-day"),
    hudLevel: q("#hud-level"),
    hudRank: q("#hud-rank"),
    hudXpFill: q("#hud-xp-fill"),
    hudXpLabel: q("#hud-xp-label"),
    chronoPanel: q("#chrono-panel"),
    chronoTime: q("#chrono-time"),
    chronoDate: q("#chrono-date"),
    chronoCycle: q("#chrono-cycle"),
    chronoStatus: q("#chrono-status"),
    chronoProgress: q("#chrono-progress"),
    chronoSpeedButtons: document.querySelectorAll("[data-chrono-speed]"),
    messageButton: q("#btn-message-center"),
    messageUnreadCount: q("#message-unread-count"),
    messageCenter: q("#message-center"),
    messageMarkRead: q("#btn-message-mark-read"),
    messageDeleteRead: q("#btn-message-delete-read"),
    messageFilters: document.querySelectorAll("[data-message-filter]"),
    messageList: q("#message-list"),
    messageEmpty: q("#message-empty"),
    hudCash: q("#hud-cash"),
    hudNetWorth: q("#hud-net-worth"),
    hudCashflow: q("#hud-cashflow"),
    menuPlayerName: q("#menu-player-name"),
    saveStatus: q("#save-status"),
    cloudStatus: q("#cloud-status"),
    cloudPassphraseStatus: q("#cloud-passphrase-status"),
    otaStatus: q("#ota-status"),
    summaryDifficulty: q("#summary-difficulty"),
    summaryStartingCash: q("#summary-starting-cash"),
    summaryLastSave: q("#summary-last-save"),
    summaryCashflow: q("#summary-cashflow"),
    summaryAlerts: q("#summary-alerts"),
    summaryNews: q("#summary-news"),
    macroPhase: q("#macro-phase"),
    macroInflation: q("#macro-inflation"),
    macroInterest: q("#macro-interest"),
    macroGdp: q("#macro-gdp"),
    macroSentiment: q("#macro-sentiment"),
    macroPressure: q("#macro-pressure"),
    commandNetChange: q("#command-net-change"),
    commandLiquidity: q("#command-liquidity"),
    commandBusinesses: q("#command-businesses"),
    commandDebt: q("#command-debt"),
    commandPassive: q("#command-passive"),
    allocationList: q("#allocation-list"),
    allocationChart: q("#allocation-chart"),
    alertList: q("#alert-list"),
    strategyRiskScore: q("#strategy-risk-score"),
    riskMeterFill: q("#risk-meter-fill"),
    strategyRiskLabel: q("#strategy-risk-label"),
    cashflowDiagnosis: q("#cashflow-diagnosis"),
    advisorList: q("#advisor-list"),
    contractList: q("#contract-list"),
    netWorthChart: q("#net-worth-chart"),
    empirePanel: q("#empire-panel"),
    empireStage: q("#empire-stage"),
    empireScore: q("#empire-score"),
    empireDistrictCount: q("#empire-district-count"),
    empireNextGoal: q("#empire-next-goal"),
    empireCaption: q("#empire-caption"),
    empireVisual: q("#empire-visual"),
    empireMapStage: q("#empire-map-stage"),
    empireMapCanvas: q("#empire-map-canvas"),
    empireLocationLayer: q("#empire-location-layer"),
    empireLocationPopover: q("#empire-location-popover"),
    empireSkyline: q("#empire-skyline"),
    empireDistricts: q("#empire-districts"),
    onboardingPanel: q("#onboarding-panel"),
    missionList: q("#mission-list"),
    skipOnboarding: q("#btn-skip-onboarding"),
    marketIndex: q("#market-index"),
    marketCount: q("#market-count"),
    marketAverage: q("#market-average"),
    marketTop: q("#market-top"),
    marketVolume: q("#market-volume"),
    marketSearch: q("#market-search"),
    marketCategoryFilter: q("#market-category-filter"),
    marketStatus: q("#market-status"),
    marketList: q("#market-list"),
    marketChart: q("#market-chart"),
    watchlistPanel: q("#watchlist-panel"),
    watchlistList: q("#watchlist-list"),
    portfolioValue: q("#portfolio-value"),
    portfolioRoi: q("#portfolio-roi"),
    portfolioCount: q("#portfolio-count"),
    portfolioList: q("#portfolio-list"),
    portfolioEmpty: q("#portfolio-empty"),
    performanceList: q("#performance-list"),
    dashboardPortfolioTotal: q("#dashboard-portfolio-total"),
    dashboardPortfolioValue: q("#dashboard-portfolio-value"),
    dashboardPortfolioRoi: q("#dashboard-portfolio-roi"),
    dashboardPortfolioDay: q("#dashboard-portfolio-day"),
    dashboardPortfolioCount: q("#dashboard-portfolio-count"),
    dashboardAssetTabs: q("#dashboard-asset-tabs"),
    dashboardAssetList: q("#dashboard-asset-list"),
    dashboardPortfolioEmpty: q("#dashboard-portfolio-empty"),
    businessForm: q("#business-form"),
    businessName: q("#business-name"),
    businessSector: q("#business-sector"),
    businessCapital: q("#business-capital"),
    businessCapitalAvailable: q("#business-capital-available"),
    businessError: q("#business-error"),
    businessTotal: q("#business-total"),
    businessSummary: q("#business-summary"),
    businessExpandAll: q("#business-expand-all"),
    businessCollapseAll: q("#business-collapse-all"),
    businessList: q("#business-list"),
    businessEmpty: q("#business-empty"),
    goodsCount: q("#goods-count"),
    goodsSearch: q("#goods-search"),
    goodsCategoryFilter: q("#goods-category-filter"),
    goodsSortFilter: q("#goods-sort-filter"),
    goodsSummary: q("#goods-summary"),
    goodsList: q("#goods-list"),
    goodsEmpty: q("#goods-empty"),
    realestateManagement: q("#realestate-management"),
    realestateSummary: q("#realestate-summary"),
    realestateList: q("#realestate-list"),
    realestateEmpty: q("#realestate-empty"),
    bankForm: q("#bank-form"),
    bankAmount: q("#bank-amount"),
    bankBusinessTarget: q("#bank-business-target"),
    bankAvailability: q("#bank-availability"),
    bankButtons: document.querySelectorAll("[data-bank-action]"),
    bankSummary: q("#bank-summary"),
    debtList: q("#debt-list"),
    taxStrategy: q("#tax-strategy"),
    hedgeList: q("#hedge-list"),
    newsUnread: q("#news-unread"),
    newsList: q("#news-list"),
    newsEmpty: q("#news-empty"),
    newsTickerText: q("#news-ticker-text"),
    achievementCount: q("#achievement-count"),
    achievementList: q("#achievement-list"),
    legacyClaim: q("#legacy-claim"),
    legacyStatus: q("#legacy-status"),
    takeoverList: q("#takeover-list"),
    assetDetailModal: q("#asset-detail-modal"),
    assetDetailKicker: q("#asset-detail-kicker"),
    assetDetailTitle: q("#asset-detail-title"),
    assetDetailSubtitle: q("#asset-detail-subtitle"),
    assetDetailClose: q("#asset-detail-close"),
    assetDetailMetrics: q("#asset-detail-metrics"),
    assetDetailChart: q("#asset-detail-chart"),
    assetDetailPosition: q("#asset-detail-position"),
    assetDetailBuy: q("#asset-detail-buy"),
    assetDetailSell: q("#asset-detail-sell"),
    tradeModal: q("#trade-modal"),
    tradeForm: q("#trade-form"),
    tradeMode: q("#trade-mode"),
    tradeTitle: q("#trade-title"),
    tradeSubtitle: q("#trade-subtitle"),
    tradeClose: q("#trade-close"),
    tradeCancel: q("#trade-cancel"),
    tradeQuantity: q("#trade-quantity"),
    tradeError: q("#trade-error"),
    tradePrice: q("#trade-price"),
    tradeOwnedLabel: q("#trade-owned-label"),
    tradeOwned: q("#trade-owned"),
    tradeAvailable: q("#trade-available"),
    tradeGross: q("#trade-gross"),
    tradeFees: q("#trade-fees"),
    tradeTaxes: q("#trade-taxes"),
    tradeTotal: q("#trade-total"),
    tradeImpact: q("#trade-impact"),
    tradeConfirm: q("#trade-confirm"),
    dashboardTitle: q("#dashboard-title"),
    nextDecision: q("#next-decision"),
    activityList: q("#activity-list"),
    toastRoot: q("#toast-root"),
    welcomeGuide: q("#welcome-guide"),
    welcomeGuideClose: q("#welcome-guide-close"),
    welcomeGuideCloseX: q("#welcome-guide-close-x"),
    turnSummary: q("#turn-summary"),
    turnClose: q("#turn-close"),
    turnContinue: q("#turn-continue"),
    turnRange: q("#turn-range"),
    turnTitle: q("#turn-title"),
    turnNet: q("#turn-net"),
    turnCash: q("#turn-cash"),
    turnIncome: q("#turn-income"),
    turnEvents: q("#turn-events"),
    turnHighlights: q("#turn-highlights")
  };

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function formatHudMoney(value) {
    const number = Number(value) || 0;
    const absolute = Math.abs(number);
    if (absolute < 1000000) return formatMoney(number);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(number);
  }

  function formatDateTime(isoValue) {
    if (!isoValue) return "Ahora";
    return new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(new Date(isoValue));
  }

  function formatCompactDateTime(isoValue) {
    if (!isoValue) return "Ahora";
    const date = new Date(isoValue);
    if (!isValidDate(date)) return "Ahora";
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function isValidDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  function getChronoStartDate() {
    const fallback = new Date();
    if (!state || !state.time) return fallback;

    const rawDate = state.time.startDateIso || state.createdAt || state.updatedAt;
    const startDate = new Date(rawDate);
    return isValidDate(startDate) ? startDate : fallback;
  }

  function getChronoDateTime(dayValue) {
    const dayNumber = Math.max(1, Math.floor(Number(dayValue || (state && state.time && state.time.day) || 1)));
    return new Date(getChronoStartDate().getTime() + (dayNumber - 1) * DAY_MS);
  }

  function getChronoCycle(dayValue) {
    const dayNumber = Math.max(1, Math.floor(Number(dayValue) || 1));
    const elapsed = dayNumber - 1;
    const dayOfYear = (elapsed % 365) + 1;
    return {
      dayNumber,
      monthNumber: Math.min(12, Math.floor((dayOfYear - 1) / 30) + 1),
      yearNumber: Math.floor(elapsed / 365) + 1
    };
  }

  function getChronoDayFromDate(date) {
    const startMs = getChronoStartDate().getTime();
    const currentMs = isValidDate(date) ? date.getTime() : startMs;
    return Math.max(1, Math.floor((currentMs - startMs) / DAY_MS) + 1);
  }

  function formatChronoTime(date) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function getDateTimeOfDayMs(date) {
    return date.getHours() * 60 * 60 * 1000 +
      date.getMinutes() * 60 * 1000 +
      date.getSeconds() * 1000 +
      date.getMilliseconds();
  }

  function getChronoDisplayDate(baseDate) {
    const base = isValidDate(baseDate) ? baseDate : getChronoDateTime();
    const display = new Date(base);
    display.setHours(0, 0, 0, 0);
    const timeOfDay = (getDateTimeOfDayMs(base) + chronoVisualOffsetMs) % DAY_MS;
    display.setTime(display.getTime() + timeOfDay);
    return display;
  }

  function formatChronoDate(date) {
    return new Intl.DateTimeFormat("es", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date).replace(/\./g, "");
  }

  function renderChrono(dateOverride, options) {
    if (!state || !els.chronoPanel) return;
    const chronoDate = isValidDate(dateOverride) ? dateOverride : getChronoDisplayDate();
    const dayNumber = options && options.day ? options.day : Math.max(1, Number(state.time && state.time.day) || getChronoDayFromDate(chronoDate));
    const cycle = getChronoCycle(dayNumber);
    const seconds = chronoDate.getHours() * 3600 + chronoDate.getMinutes() * 60 + chronoDate.getSeconds();
    const progress = Math.max(0, Math.min(100, seconds / 86400 * 100));

    els.chronoTime.textContent = formatChronoTime(chronoDate);
    els.chronoDate.textContent = formatChronoDate(chronoDate);
    els.chronoCycle.textContent = `Dia ${cycle.dayNumber} / Mes ${cycle.monthNumber} / Ano ${cycle.yearNumber}`;
    els.chronoStatus.textContent = options && options.status
      ? options.status
      : chronoSpeed > 0 ? `Crono visual x${chronoSpeed}` : cycle.dayNumber === 1 ? "Sincronizado al reloj real inicial" : "Tiempo simulado";
    els.chronoProgress.style.width = `${progress.toFixed(1)}%`;
  }

  function stopChronoLiveLoop() {
    if (chronoLiveFrame) {
      window.cancelAnimationFrame(chronoLiveFrame);
      chronoLiveFrame = 0;
    }
    chronoLiveLastMs = 0;
  }

  function startChronoLiveLoop() {
    stopChronoLiveLoop();
    if (!state || chronoSpeed <= 0 || prefersReducedMotion()) {
      renderChrono();
      return;
    }

    const step = (now) => {
      if (!state || chronoSpeed <= 0) {
        stopChronoLiveLoop();
        renderChrono();
        return;
      }

      if (!chronoLiveLastMs) chronoLiveLastMs = now;
      const elapsedMs = Math.max(0, now - chronoLiveLastMs);
      chronoLiveLastMs = now;
      chronoVisualOffsetMs = (chronoVisualOffsetMs + elapsedMs * chronoSpeed) % DAY_MS;
      renderChrono(getChronoDisplayDate(), {
        day: Math.max(1, Number(state.time && state.time.day) || 1),
        status: `Crono visual x${chronoSpeed}`
      });
      chronoLiveFrame = window.requestAnimationFrame(step);
    };

    chronoLiveFrame = window.requestAnimationFrame(step);
  }

  function updateChronoSpeedButtons() {
    els.chronoSpeedButtons.forEach((button) => {
      const isActive = Number(button.dataset.chronoSpeed) === chronoSpeed;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (els.chronoPanel) {
      els.chronoPanel.dataset.speed = String(chronoSpeed);
    }
  }

  function setChronoSpeed(speed) {
    chronoSpeed = Math.max(0, Number(speed) || 0);
    stopChronoLiveLoop();
    if (chronoSpeed === 0) chronoVisualOffsetMs = 0;
    updateChronoSpeedButtons();
    renderChrono();
    if (chronoSpeed > 0) startChronoLiveLoop();
  }

  function cancelChronoAnimation() {
    if (chronoAnimationFrame) {
      window.cancelAnimationFrame(chronoAnimationFrame);
      chronoAnimationFrame = 0;
    }
    if (els.chronoPanel) els.chronoPanel.classList.remove("is-advancing");
  }

  function animateChrono(fromDate, toDate, label) {
    if (!state || !els.chronoPanel || !isValidDate(fromDate) || !isValidDate(toDate)) {
      renderChrono();
      return;
    }

    cancelChronoAnimation();
    stopChronoLiveLoop();
    chronoVisualOffsetMs = 0;

    if (prefersReducedMotion() || fromDate.getTime() === toDate.getTime()) {
      renderChrono(toDate);
      if (chronoSpeed > 0) startChronoLiveLoop();
      return;
    }

    const fromMs = fromDate.getTime();
    const deltaMs = toDate.getTime() - fromMs;
    const startedAt = window.performance.now();
    const targetDay = Math.max(1, Number(state.time.day) || 1);
    const status = label || "Avanzando tiempo";

    els.chronoPanel.classList.add("is-advancing");

    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / CHRONO_ANIMATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentDate = new Date(fromMs + deltaMs * eased);
      const dayNumber = Math.min(targetDay, getChronoDayFromDate(currentDate));

      renderChrono(currentDate, { day: dayNumber, status });

      if (progress < 1) {
        chronoAnimationFrame = window.requestAnimationFrame(step);
        return;
      }

      chronoAnimationFrame = 0;
      els.chronoPanel.classList.remove("is-advancing");
      renderChrono(toDate);
      if (chronoSpeed > 0) startChronoLiveLoop();
    };

    chronoAnimationFrame = window.requestAnimationFrame(step);
  }

  function formatPercent(value) {
    return new Intl.NumberFormat("es", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(Number(value) || 0);
  }

  function formatSignedPercent(value) {
    const number = Number(value) || 0;
    return `${number > 0 ? "+" : ""}${formatPercent(number)}`;
  }

  function formatSignedMoney(value) {
    const number = Number(value) || 0;
    return `${number > 0 ? "+" : number < 0 ? "-" : ""}${formatMoney(Math.abs(number))}`;
  }

  function formatCompactNumber(value) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(Number(value) || 0);
  }

  function formatQuantity(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(value) || 0);
  }

  function formatSupplyUnits(value) {
    const number = Number(value) || 0;
    const digits = Math.abs(number) >= 100 ? 0 : Math.abs(number) >= 10 ? 1 : 2;
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(number);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function getPublicNewsSummary(value) {
    return String(value || "")
      .replace(/\s*Efecto activo\s+\d+\s*(?:-|\u2013|\u2014)\s*\d+\.?/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function titleCase(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function getAvatarId(value) {
    return Object.prototype.hasOwnProperty.call(AVATAR_OPTIONS, value) ? value : "man-suit";
  }

  function getAvatarProfile(value) {
    return AVATAR_OPTIONS[getAvatarId(value)] || AVATAR_OPTIONS["man-suit"];
  }

  function renderAvatarSelection() {
    els.avatarButtons.forEach((button) => {
      const isActive = button.dataset.avatarId === selectedAvatarId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-checked", String(isActive));
    });
  }

  function setSelectedAvatarId(avatarId) {
    selectedAvatarId = getAvatarId(avatarId);
    renderAvatarSelection();
  }

  function renderScenarioSelection() {
    if (!els.scenarioButtons) return;
    els.scenarioButtons.forEach((button) => {
      const isActive = button.dataset.scenario === selectedScenario;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-checked", String(isActive));
    });
  }

  function setSelectedScenario(scenarioId) {
    selectedScenario = strategy && strategy.getScenarioMeta
      ? strategy.getScenarioMeta(scenarioId).id
      : (typeof scenarioId === "string" ? scenarioId : "free");
    renderScenarioSelection();
  }

  function renderPlayerAvatar() {
    if (!state || !state.player) return;
    const avatar = getAvatarProfile(state.player.avatarId);
    state.player.avatarId = getAvatarId(state.player.avatarId);

    [els.hudUserAvatar, els.menuUserAvatar].forEach((image) => {
      if (!image) return;
      image.src = avatar.src;
      image.title = avatar.label;
    });
  }

  function getAssetSymbol(asset) {
    const ticker = asset && asset.ticker ? String(asset.ticker) : "";
    return ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "CE";
  }

  function getPlayerProgressProfile() {
    const netWorth = Math.max(0, state && state.player ? state.player.netWorth || state.player.cash || 0 : 0);
    const levelGoals = [
      0, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000,
      10000000, 25000000, 50000000, 100000000, 250000000, 500000000, 1000000000,
      2500000000, 5000000000, 10000000000, 25000000000, 50000000000
    ];
    let levelIndex = 0;
    for (let index = 0; index < levelGoals.length; index += 1) {
      if (netWorth >= levelGoals[index]) levelIndex = index;
    }

    const currentGoal = levelGoals[levelIndex] || 0;
    const nextGoal = levelGoals[levelIndex + 1] || Math.max(currentGoal * 2, currentGoal + 1000000);
    const xpRatio = nextGoal > currentGoal ? (netWorth - currentGoal) / (nextGoal - currentGoal) : 1;
    const rankTable = [
      { min: 1000000000, label: "Imperio global" },
      { min: 100000000, label: "Holding titan" },
      { min: 10000000, label: "Magnate" },
      { min: 1000000, label: "Mogul" },
      { min: 250000, label: "Operador" },
      { min: 100000, label: "Inversionista" },
      { min: 0, label: "Aspirante" }
    ];
    const rank = (rankTable.find((item) => netWorth >= item.min) || rankTable[rankTable.length - 1]).label;

    return {
      level: levelIndex + 1,
      rank,
      xpPercent: Math.round(clampNumber(xpRatio, 0, 1) * 100),
      currentGoal,
      nextGoal
    };
  }

  function getNextDecisionText() {
    if (!state || !player) return "Activa tu primer contrato y empieza a construir el imperio.";
    if (strategy && typeof strategy.getRiskProfile === "function") {
      const risk = strategy.getRiskProfile(state);
      if (risk.score >= 72) return `Radar critico: ${risk.drivers.slice(0, 2).join(", ")}. Corrige antes de acelerar.`;
      if (risk.score >= 55) return `Radar tenso: ${risk.drivers[0]}. Toma una accion defensiva este turno.`;
    }
    const portfolioSummary = player.getPortfolioSummary(state.portfolio, state.assets);
    const positions = player.getDecoratedPositions(state.portfolio, state.assets);
    const propertyCount = positions.filter((position) => position.asset.type === "real_estate").length;
    const businessCount = (state.businesses || []).length;
    const debtTotal = bank ? (bank.getBankSummary(state).debtTotal || 0) : 0;
    const unreadNews = events ? events.getNewsSummary(state.events).unread : 0;
    const cashflow30 = getCashflowSince(30);
    const cashRatio = (state.player.cash || 0) / Math.max(1, state.player.netWorth || 1);

    if (portfolioSummary.count === 0) return "Contrato activo: compra tu primer activo para encender el distrito de Mercado.";
    if (unreadNews > 0) return "Contrato activo: lee noticias nuevas antes de avanzar el siguiente turno.";
    if (cashRatio < 0.05) return "Riesgo de liquidez: libera efectivo o reduce deuda antes de acelerar el tiempo.";
    if (debtTotal > Math.max(1, state.player.netWorth) * 0.45) return "Riesgo de apalancamiento: paga deuda o refinancia antes de expandirte.";
    if (propertyCount === 0) return "Expansion sugerida: compra un bien productivo para levantar el distrito inmobiliario.";
    if (businessCount === 0) return "Expansion sugerida: funda o adquiere una empresa para abrir el distrito operativo.";
    if (cashflow30 < 0) return "Turno defensivo: revisa gastos, deuda y empresas con cashflow negativo.";
    if (strategy && typeof strategy.refreshContracts === "function") {
      const contract = strategy.refreshContracts(state).items.find((item) => !item.done);
      if (contract) return `Contrato semanal: ${contract.title}. ${contract.body}`;
    }
    if (state.time.day < 30) return "Avanza 7 dias, cobra feedback del mercado y ajusta tu allocation.";
    return "Busca la proxima meta de patrimonio y convierte ganancias en nuevos distritos.";
  }

  function showToast(message, type) {
    if (!els.toastRoot || !message) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type || ""}`.trim();
    toast.textContent = message;
    els.toastRoot.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function setOtaStatus(message, tone) {
    if (!els.otaStatus) return;
    els.otaStatus.textContent = `OTA: ${message || "sin revisar"}`;
    if (tone) {
      els.otaStatus.dataset.tone = tone;
    } else {
      delete els.otaStatus.dataset.tone;
    }
  }

  function handleOtaEvent(event) {
    const detail = event && event.detail ? event.detail : {};
    if (detail.status === "ready" && detail.version) {
      setOtaStatus(`${detail.version} lista; reinicia la app`, "ready");
      showToast(`Actualizacion ${detail.version} lista para el proximo reinicio.`);
    } else if (detail.status === "download-started") {
      setOtaStatus(detail.version ? `descargando ${detail.version}` : "descargando");
    } else if (detail.status === "native-too-old") {
      setOtaStatus("requiere instalar APK nuevo", "error");
      showToast("Hay una actualizacion que requiere instalar un APK nuevo.", "error");
    } else if (detail.status === "up-to-date") {
      setOtaStatus(detail.currentVersion ? `al dia (${detail.currentVersion})` : "al dia", "ready");
    } else if (detail.status === "skipped") {
      setOtaStatus(detail.reason || "no disponible");
    } else if (detail.status === "manifest-ignored") {
      setOtaStatus(detail.reason || "manifest ignorado", "error");
    } else if (detail.status === "failed") {
      setOtaStatus(detail.message || "fallo al revisar", "error");
      console.warn("OTA fallida", detail.message || detail);
    }
  }

  async function checkOtaNow() {
    const ota = window.CashEmpireOta;
    if (!ota || typeof ota.checkForUpdate !== "function") {
      setOtaStatus("solo disponible en APK", "error");
      showToast("OTA solo esta disponible en la APK instalada.", "error");
      return;
    }

    if (els.otaCheckButton) els.otaCheckButton.disabled = true;
    setOtaStatus("buscando actualizacion");
    try {
      const result = await ota.checkForUpdate({ force: true });
      if (result && result.updated && result.version) {
        setOtaStatus(`${result.version} lista; reinicia la app`, "ready");
      } else if (result && result.skipped) {
        setOtaStatus("no disponible en este runtime");
      } else if (result && result.error) {
        setOtaStatus("fallo al revisar", "error");
      } else {
        setOtaStatus("al dia", "ready");
      }
    } finally {
      if (els.otaCheckButton) els.otaCheckButton.disabled = false;
    }
  }

  function pushActivity(text, day) {
    if (!state || !text) return;
    state.activity = Array.isArray(state.activity) ? state.activity : [];
    state.activity.push({
      day: day || state.time.day,
      text
    });
    state.activity = state.activity.slice(-80);
  }

  function ensureOnboardingState() {
    if (!state) return null;
    state.onboarding = state.onboarding && typeof state.onboarding === "object" && !Array.isArray(state.onboarding)
      ? state.onboarding
      : {};
    state.onboarding.skipped = Boolean(state.onboarding.skipped);
    state.onboarding.guideSeen = Boolean(state.onboarding.guideSeen);
    state.onboarding.completed = Array.isArray(state.onboarding.completed) ? state.onboarding.completed : [];
    state.onboarding.rewardsClaimed = Array.isArray(state.onboarding.rewardsClaimed) ? state.onboarding.rewardsClaimed : [];
    return state.onboarding;
  }

  function ensureMessageState() {
    if (!state) return null;
    state.messages = state.messages && typeof state.messages === "object" && !Array.isArray(state.messages)
      ? state.messages
      : {};
    state.messages.items = Array.isArray(state.messages.items) ? state.messages.items : [];
    state.messages.emittedKeys = Array.isArray(state.messages.emittedKeys) ? state.messages.emittedKeys : [];
    return state.messages;
  }

  function pushMessage(message) {
    if (!state || !message) return null;
    const messages = ensureMessageState();
    const key = typeof message.key === "string" ? message.key : "";
    if (key && messages.emittedKeys.includes(key)) return null;

    const item = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      day: state.time && state.time.day ? state.time.day : 1,
      category: MESSAGE_CATEGORY_LABELS[message.category] ? message.category : "system",
      scope: typeof message.scope === "string" && message.scope ? message.scope : "game",
      businessId: typeof message.businessId === "string" && message.businessId ? message.businessId : null,
      businessName: typeof message.businessName === "string" ? message.businessName : "",
      severity: ["info", "opportunity", "warning", "critical"].includes(message.severity) ? message.severity : "info",
      actionHint: typeof message.actionHint === "string" ? message.actionHint.trim().slice(0, 160) : "",
      title: String(message.title || "Mensaje del juego"),
      body: String(message.body || ""),
      createdAt: new Date().toISOString(),
      read: Boolean(message.read)
    };

    messages.items = messages.items.concat(item).slice(-80);
    if (key) messages.emittedKeys = messages.emittedKeys.concat(key).slice(-180);
    return item;
  }

  function getUnreadMessageCount() {
    const messages = ensureMessageState();
    return messages ? messages.items.filter((item) => !item.read).length : 0;
  }

  function matchesMessageFilter(message) {
    if (!message || messageFilter === "all") return true;
    if (messageFilter === "business") return message.scope === "business" || message.category === "business" || Boolean(message.businessId);
    if (messageFilter === "risk") return message.severity === "warning" || message.severity === "critical" || message.category === "warning" || message.category === "critical";
    if (messageFilter === "opportunity") return message.severity === "opportunity" || message.category === "bonus" || message.category === "milestone";
    return true;
  }

  function updateMessageFilterButtons() {
    if (!els.messageFilters) return;
    els.messageFilters.forEach((button) => {
      const isActive = button.dataset.messageFilter === messageFilter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setMessageFilter(filter) {
    const allowed = ["all", "business", "risk", "opportunity"];
    messageFilter = allowed.includes(filter) ? filter : "all";
    updateMessageFilterButtons();
    renderMessages();
  }

  function pushBusinessPulseMessage(message) {
    const item = pushMessage({
      key: message.key,
      category: "business",
      scope: "business",
      businessId: message.businessId,
      businessName: message.businessName,
      severity: message.severity || "info",
      title: message.title,
      body: message.body,
      actionHint: message.actionHint
    });
    return item;
  }

  function renderMessages() {
    if (!els.messageButton || !els.messageList) return;
    const messages = ensureMessageState();
    const items = messages ? messages.items.slice().sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime() || 0;
      const bDate = new Date(b.createdAt).getTime() || 0;
      return bDate - aDate;
    }) : [];
    const filteredItems = items.filter(matchesMessageFilter);
    const unread = getUnreadMessageCount();
    const read = items.filter((item) => item.read).length;

    els.messageUnreadCount.textContent = String(unread);
    els.messageUnreadCount.hidden = unread === 0;
    els.messageButton.classList.toggle("has-unread", unread > 0);
    els.messageButton.setAttribute("aria-expanded", String(!els.messageCenter.hidden));
    els.messageEmpty.hidden = filteredItems.length > 0;
    els.messageMarkRead.disabled = unread === 0;
    if (els.messageDeleteRead) els.messageDeleteRead.disabled = read === 0;
    els.messageList.innerHTML = "";
    updateMessageFilterButtons();

    filteredItems.slice(0, 14).forEach((message) => {
      const item = document.createElement("article");
      item.className = `message-item ${message.category || "system"} ${message.severity || "info"} ${message.read ? "read" : "unread"}`.trim();

      const meta = document.createElement("span");
      meta.textContent = `Dia ${message.day || 1} / ${MESSAGE_CATEGORY_LABELS[message.category] || MESSAGE_CATEGORY_LABELS.system}${message.businessName ? ` / ${message.businessName}` : ""}`;
      const title = document.createElement("strong");
      title.textContent = message.title;
      const body = document.createElement("small");
      body.textContent = message.body;
      item.append(meta, title, body);

      if (message.actionHint) {
        const action = document.createElement("small");
        action.className = "message-action-hint";
        action.textContent = `Gestion sugerida: ${message.actionHint}`;
        item.appendChild(action);
      }

      els.messageList.appendChild(item);
    });
  }

  function toggleMessageCenter() {
    if (!els.messageCenter) return;
    const nextOpen = els.messageCenter.hidden;
    els.messageCenter.hidden = !nextOpen;
    if (nextOpen) closeUserMenu();
    renderMessages();
  }

  function closeMessageCenter() {
    if (!els.messageCenter) return;
    els.messageCenter.hidden = true;
    if (els.messageButton) els.messageButton.setAttribute("aria-expanded", "false");
  }

  function markMessagesRead() {
    if (!state) return;
    const messages = ensureMessageState();
    messages.items = messages.items.map((item) => ({ ...item, read: true }));
    try {
      state = storage.save(state, currentSlot);
      render();
      updateLoadButton();
      showToast("Mensajes marcados como leidos.");
    } catch (error) {
      console.error(error);
      showToast("No se pudieron guardar los mensajes.", "error");
    }
  }

  function deleteReadMessages() {
    if (!state) return;
    const messages = ensureMessageState();
    const before = messages.items.length;
    messages.items = messages.items.filter((item) => !item.read);
    const removed = before - messages.items.length;

    if (removed <= 0) {
      renderMessages();
      showToast("No hay mensajes leidos para borrar.");
      return;
    }

    try {
      state = storage.save(state, currentSlot);
      render();
      updateLoadButton();
      showToast(`${removed} mensaje${removed === 1 ? "" : "s"} leido${removed === 1 ? "" : "s"} eliminado${removed === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      showToast("No se pudieron borrar los mensajes.", "error");
    }
  }

  function rememberWelcomeMessage() {
    pushMessage({
      key: "guide:welcome",
      category: "guide",
      title: "Guia inicial disponible",
      body: "Empieza comprando activos, leyendo noticias y completando contratos. Las bonificaciones siempre entran a tu cuenta personal."
    });
  }

  function showWelcomeGuideIfNeeded() {
    if (!state || !els.welcomeGuide) return;
    const onboarding = ensureOnboardingState();
    if (onboarding.guideSeen) return;
    rememberWelcomeMessage();
    renderMessages();
    els.welcomeGuide.hidden = false;
  }

  function scheduleWelcomeGuide() {
    window.setTimeout(showWelcomeGuideIfNeeded, prefersReducedMotion() ? 40 : 80);
  }

  function closeWelcomeGuide() {
    if (!state || !els.welcomeGuide) return;
    const onboarding = ensureOnboardingState();
    onboarding.guideSeen = true;
    els.welcomeGuide.hidden = true;
    try {
      state = storage.save(state, currentSlot);
      render();
    } catch (error) {
      console.error(error);
      showToast("No se pudo guardar el cierre de la guia.", "error");
    }
  }

  function syncAlertMessages() {
    if (!state) return;
    getAlerts().forEach((alert) => {
      const severity = alert.severity === "critical" ? "critical" : "warning";
      pushMessage({
        key: `alert:${state.time.day}:${severity}:${alert.text}`,
        category: severity,
        title: severity === "critical" ? "Riesgo critico" : "Alerta del juego",
        body: alert.text
      });
    });
  }

  function setSetupBusy(isBusy) {
    els.setupForm.setAttribute("aria-busy", String(isBusy));
    els.setupControls.forEach((control) => {
      control.disabled = isBusy;
    });
    if (els.loadSlotWrap && storage.hasSave()) {
      els.loadSlotWrap.hidden = false;
      els.loadButton.disabled = isBusy;
      els.loadSlot.disabled = isBusy;
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function focusDashboard() {
    els.dashboardTitle.setAttribute("tabindex", "-1");
    els.dashboardTitle.focus({ preventScroll: true });
  }

  function focusSetup() {
    els.playerName.focus({ preventScroll: true });
  }

  function applyViewVisibility() {
    const label = VIEW_LABELS[currentView] || VIEW_LABELS.dashboard;
    if (els.currentViewLabel) els.currentViewLabel.textContent = label;
    els.gameScreen.classList.toggle("dashboard-active", currentView === "dashboard");

    els.viewTabs.forEach((tab) => {
      const isActive = tab.dataset.view === currentView;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    els.viewPanels.forEach((panel) => {
      panel.hidden = panel.dataset.forceHidden === "true" || panel.dataset.viewPanel !== currentView;
    });
  }

  function setActiveView(view) {
    if (!VIEW_LABELS[view]) return;
    if (view !== "dashboard") closeEmpireLocationPopover();
    currentView = view;
    applyViewVisibility();
    if (state) {
      window.requestAnimationFrame(render);
    }
  }

  function renderVisibleGame() {
    window.requestAnimationFrame(() => {
      if (state && els.gameScreen.classList.contains("active")) {
        render();
      }
    });
  }

  function activateScreen(showGame) {
    els.setupScreen.classList.remove("screen-enter", "screen-exit");
    els.gameScreen.classList.remove("screen-enter", "screen-exit");
    els.setupScreen.classList.toggle("active", !showGame);
    els.gameScreen.classList.toggle("active", showGame);
  }

  function setScreen(screenName, options) {
    const showGame = screenName === "game";
    const currentIsGame = els.gameScreen.classList.contains("active");
    const animate = options && options.animate && showGame && !prefersReducedMotion();

    if (showGame === currentIsGame) return;

    if (!animate) {
      activateScreen(showGame);
      isTransitioning = false;
      if (showGame) {
        focusDashboard();
        renderVisibleGame();
      } else {
        setSetupBusy(false);
        focusSetup();
      }
      return;
    }

    isTransitioning = true;
    els.setupScreen.classList.add("screen-exit");
    window.setTimeout(() => {
      els.setupScreen.classList.remove("active", "screen-exit");
      els.gameScreen.classList.add("active", "screen-enter");
      focusDashboard();
      renderVisibleGame();
      window.setTimeout(() => {
        els.gameScreen.classList.remove("screen-enter");
        isTransitioning = false;
      }, ENTER_TRANSITION_MS);
    }, EXIT_TRANSITION_MS);
  }

  function validateSetup() {
    const name = els.playerName.value.trim();
    const budget = parseMoneyInput(els.initialBudget.value);
    let valid = true;
    let firstInvalid = null;

    els.nameError.textContent = "";
    els.budgetError.textContent = "";
    els.playerName.setAttribute("aria-invalid", "false");
    els.initialBudget.setAttribute("aria-invalid", "false");

    if (!name) {
      els.nameError.textContent = "Ingresa un nombre para la partida.";
      els.playerName.setAttribute("aria-invalid", "true");
      firstInvalid = els.playerName;
      valid = false;
    }

    if (!Number.isFinite(budget) || budget < 1000) {
      els.budgetError.textContent = "El presupuesto minimo es $1,000.";
      els.initialBudget.setAttribute("aria-invalid", "true");
      firstInvalid = firstInvalid || els.initialBudget;
      valid = false;
    }

    if (firstInvalid) firstInvalid.focus({ preventScroll: true });
    return valid;
  }

  function ensureMacro() {
    if (!state || !economy) return null;
    state.macro = economy.normalizeMacro(state.macro, state.player.difficulty);
    return state.macro;
  }

  function ensureAssets() {
    if (!state || !market) return {};
    state.assets = market.normalizeAssets(state.assets, {
      day: state.time.day,
      difficulty: state.player.difficulty
    });
    return state.assets;
  }

  function ensureExtendedState() {
    if (!state) return;
    if (businesses) {
      state.businesses = businesses.normalizeBusinesses(state.businesses);
      businesses.syncOwnedBusinessAssets(state);
      if (typeof businesses.hydrateBusinessSnapshots === "function") {
        businesses.hydrateBusinessSnapshots(state);
      }
    }
    if (bank) {
      state.bank = bank.normalizeBank(state.bank);
      state.debts = bank.normalizeDebts(state.debts);
    }
    if (taxes) state.taxes = taxes.normalizeTaxes(state.taxes);
    if (events) state.events = events.normalizeEvents(state.events);
    if (achievements) state.achievements = achievements.normalizeAchievements(state.achievements);
    if (strategy) {
      state.strategy = strategy.normalizeStrategy(state.strategy);
      if (typeof strategy.refreshContracts === "function") strategy.refreshContracts(state);
    }
    ensureOnboardingState();
    ensureMessageState();
    if (player && player.normalizeAssetOperations) {
      state.assetOps = player.normalizeAssetOperations(state.assetOps, state.portfolio, state.assets);
    }
    if (player && player.normalizeCashflows) {
      state.cashflows = player.normalizeCashflows(state.cashflows);
    } else {
      state.cashflows = Array.isArray(state.cashflows) ? state.cashflows.slice(-240) : [];
    }
    if (player) state = player.recalculateState(state);
  }

  function getPosition(assetId) {
    if (!state || !player) return null;
    return player.findPosition ? player.findPosition(state, assetId) : player.normalizePortfolio(state.portfolio).find((position) => position.assetId === assetId) || null;
  }

  function getOwnedQuantity(assetId) {
    const position = getPosition(assetId);
    return position ? position.quantity : 0;
  }

  function getGoodsAssetKind(asset) {
    if (!asset) return "Bien";
    if (asset.type === "real_estate") return asset.propertyKind === "Hotel" ? "Hotel" : "Propiedad";
    if (asset.type === "business") return asset.acquisitionType === "franchise" ? "Franquicia" : "Adquisicion";
    return asset.categoryLabel || "Bien";
  }

  function getGoodsLocation(asset) {
    if (!asset) return "Operacion";
    if (asset.type !== "real_estate") return asset.sectorLabel || asset.categoryLabel || "Operacion";

    return [asset.city, asset.country].filter(Boolean).join(", ") || asset.city || "Ubicacion";
  }

  function getGoodsAnnualYield(asset) {
    if (!asset || !asset.simPrice) return 0;
    if (asset.type === "business") return ((Number(asset.monthlyProfit) || 0) * 12) / asset.simPrice;
    if (asset.type === "real_estate") {
      const netMonthly = (Number(asset.monthlyRent) || 0) - (Number(asset.monthlyMaintenance) || 0);
      return (netMonthly * 12) / asset.simPrice;
    }
    return 0;
  }

  function getGoodsLiquidityLabel(asset) {
    const liquidity = Number(asset && asset.liquidity) || 0;
    if (liquidity >= 0.26) return "Liquidez alta";
    if (liquidity >= 0.18) return "Liquidez media";
    return "Liquidez baja";
  }

  function getGoodsRiskLabel(asset) {
    const volatility = Number(asset && asset.volatility) || 0;
    if (volatility >= 0.9) return "Riesgo alto";
    if (volatility >= 0.5) return "Riesgo medio";
    return "Riesgo bajo";
  }

  function getGoodsMonthlyGross(asset) {
    if (!asset) return 0;
    return asset.type === "business"
      ? Number(asset.monthlyProfit) || 0
      : Number(asset.monthlyRent) || 0;
  }

  function getGoodsMonthlyNet(asset) {
    if (!asset) return 0;
    if (asset.type === "business") return Number(asset.monthlyProfit) || 0;
    return (Number(asset.monthlyRent) || 0) - (Number(asset.monthlyMaintenance) || 0);
  }

  function getGoodsSortValue(asset, sortKey) {
    switch (sortKey) {
      case "rent_desc":
        return getGoodsMonthlyGross(asset);
      case "net_desc":
        return getGoodsMonthlyNet(asset);
      case "yield_desc":
        return getGoodsAnnualYield(asset);
      case "liquidity_desc":
        return Number(asset && asset.liquidity) || 0;
      case "risk_desc":
        return Number(asset && asset.volatility) || 0;
      case "price_desc":
      default:
        return Number(asset && asset.simPrice) || 0;
    }
  }

  function isManagedBusiness(assetId) {
    return Array.isArray(state.businesses) && state.businesses.some((business) => business.sourceAssetId === assetId);
  }

  function getCashflowSummarySince(daysBack) {
    if (!state || !Array.isArray(state.cashflows)) {
      return { count: 0, net: 0, operating: 0, financing: 0, investing: 0, internal: 0, windfall: 0 };
    }
    const startDay = Math.max(1, state.time.day - daysBack + 1);
    if (player && typeof player.summarizeCashflows === "function") {
      return player.summarizeCashflows(state.cashflows, { startDay });
    }
    return { count: 0, net: 0, operating: 0, financing: 0, investing: 0, internal: 0, windfall: 0 };
  }

  function getCashflowSince(daysBack) {
    return getCashflowSummarySince(daysBack).operating;
  }

  function getAlerts() {
    const alerts = [];
    const netWorth = Math.max(1, state.player.netWorth || 1);
    const cashRatio = (state.player.cash || 0) / netWorth;
    const bankSummary = bank ? bank.getBankSummary(state) : { debtTotal: 0 };
    const businessSummary = businesses ? businesses.getBusinessSummary(state.businesses) : { alerts: [] };
    const portfolioSummary = player ? player.getPortfolioSummary(state.portfolio, state.assets) : { allocation: {} };
    const allocations = Object.values(portfolioSummary.allocation || {});
    const maxAllocation = allocations.length ? Math.max(...allocations.map((item) => item.value)) / netWorth : 0;

    if (cashRatio < 0.05) alerts.push({ severity: "critical", text: "Liquidez baja: conserva efectivo antes de expandir.", view: "bank", actionLabel: "Banco" });
    if (bankSummary.debtTotal / netWorth > 0.4) alerts.push({ severity: "warning", text: "Deuda alta: las cuotas pueden presionar el cashflow operativo.", view: "bank", actionLabel: "Deuda" });
    if (state.macro && state.macro.phase === "recession") alerts.push({ severity: "warning", text: "Recesion activa: activos ciclicos y negocios tendran menor demanda.", view: "news", actionLabel: "Noticias" });
    if (maxAllocation > 0.55) alerts.push({ severity: "warning", text: "Concentracion elevada: diversificar reduce volatilidad.", view: "market", actionLabel: "Mercado" });
    businessSummary.alerts.forEach((alert) => alerts.push(alert));
    if (state.events && state.events.some((item) => !item.read && item.severity === "critical")) alerts.push({ severity: "critical", text: "Hay una noticia critica sin leer.", view: "news", actionLabel: "Leer" });
    if (strategy && typeof strategy.getRiskProfile === "function") {
      strategy.getRiskProfile(state).alerts.forEach((alert) => alerts.push(alert));
    }

    const seen = new Set();
    return alerts.filter((alert) => {
      const key = alert.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  function getAlertKey(alert) {
    if (!alert) return "";
    return [alert.severity || "info", alert.view || "none", alert.actionLabel || "", alert.text || ""].join("|");
  }

  function getAlertPresentation(alert) {
    const text = String(alert && alert.text ? alert.text : "").trim();
    const separatorIndex = text.indexOf(":");
    if (separatorIndex > 0 && separatorIndex < text.length - 1) {
      return {
        title: text.slice(0, separatorIndex).trim(),
        detail: text.slice(separatorIndex + 1).trim()
      };
    }

    return {
      title: text || "Alerta del juego",
      detail: alert && alert.view ? "Toca para ver mas contexto y accion sugerida." : "Toca para ver mas contexto."
    };
  }

  function prepareCanvas(canvas) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const attributeWidth = Number(canvas.getAttribute("width")) || 320;
    const attributeHeight = Number(canvas.getAttribute("height")) || 180;
    const previousWidth = Number(canvas.dataset.cssWidth) || attributeWidth;
    const previousHeight = Number(canvas.dataset.cssHeight) || attributeHeight;
    const measuredWidth = canvas.clientWidth || rect.width;
    const measuredHeight = canvas.clientHeight || rect.height;
    const cssWidth = Math.max(96, Math.round(measuredWidth || previousWidth));
    const cssHeight = Math.max(72, Math.round(measuredHeight || previousHeight));
    const targetWidth = Math.round(cssWidth * ratio);
    const targetHeight = Math.round(cssHeight * ratio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    canvas.dataset.cssWidth = String(cssWidth);
    canvas.dataset.cssHeight = String(cssHeight);
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = true;
    return {
      context,
      width: cssWidth,
      height: cssHeight
    };
  }

  function drawLineChart(canvas, series, valueKey, options) {
    if (!canvas || !canvas.getContext) return;
    const settings = options || {};
    const prepared = prepareCanvas(canvas);
    const context = prepared.context;
    const width = prepared.width;
    const height = prepared.height;
    const showValueScale = Boolean(settings.showValueScale);
    const formatValue = typeof settings.formatValue === "function"
      ? settings.formatValue
      : (value) => String(Math.round(Number(value) || 0));
    const paddingTop = 16;
    const paddingBottom = 26;
    const paddingLeft = showValueScale ? 82 : 22;
    const paddingRight = showValueScale ? 92 : 22;
    const points = Array.isArray(series) ? series.filter((point) => Number.isFinite(Number(point[valueKey]))) : [];
    const chartWidth = Math.max(1, width - paddingLeft - paddingRight);
    const chartHeight = Math.max(1, height - paddingTop - paddingBottom);

    context.clearRect(0, 0, width, height);
    const bg = context.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#081419");
    bg.addColorStop(1, "#111510");
    context.fillStyle = bg;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(129, 230, 217, 0.12)";
    context.lineWidth = 1;
    context.font = "11px Consolas, monospace";
    context.textBaseline = "middle";

    for (let row = 0; row <= 4; row += 1) {
      const y = paddingTop + (chartHeight / 4) * row;
      context.beginPath();
      context.moveTo(paddingLeft, y);
      context.lineTo(width - paddingRight, y);
      context.stroke();
    }

    if (points.length < 2) {
      context.fillStyle = "rgba(244, 241, 232, 0.56)";
      context.font = "13px Consolas, monospace";
      context.fillText("Esperando historico", paddingLeft, height / 2);
      return;
    }

    const values = points.map((point) => Number(point[valueKey]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(0.01, max - min);
    const xStep = chartWidth / Math.max(1, points.length - 1);
    const isUp = values[values.length - 1] >= values[0];
    const lineColor = isUp ? "#2fffd1" : "#ff5f7d";
    const fillGradient = context.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    fillGradient.addColorStop(0, isUp ? "rgba(47, 255, 209, 0.28)" : "rgba(255, 95, 125, 0.26)");
    fillGradient.addColorStop(1, "rgba(8, 20, 25, 0)");

    if (showValueScale) {
      context.save();
      context.fillStyle = "rgba(244, 241, 232, 0.68)";
      context.textAlign = "left";
      for (let row = 0; row <= 4; row += 1) {
        const value = max - (range / 4) * row;
        const y = paddingTop + (chartHeight / 4) * row;
        context.fillText(formatValue(value), 10, y);
      }
      context.restore();
    }

    const chartPoints = points.map((point, index) => {
      const x = paddingLeft + xStep * index;
      const y = height - paddingBottom - ((Number(point[valueKey]) - min) / range) * chartHeight;
      return { x, y };
    });

    context.beginPath();
    chartPoints.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.lineTo(chartPoints[chartPoints.length - 1].x, height - paddingBottom);
    context.lineTo(chartPoints[0].x, height - paddingBottom);
    context.closePath();
    context.fillStyle = fillGradient;
    context.fill();

    context.strokeStyle = lineColor;
    context.lineWidth = 2.4;
    context.shadowColor = lineColor;
    context.shadowBlur = 12;
    context.beginPath();

    chartPoints.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });

    context.stroke();
    context.shadowBlur = 0;

    const last = chartPoints[chartPoints.length - 1];
    context.fillStyle = lineColor;
    context.beginPath();
    context.arc(last.x, last.y, 4, 0, Math.PI * 2);
    context.fill();

    if (showValueScale) {
      const label = formatValue(values[values.length - 1]);
      context.save();
      context.font = "11px Consolas, monospace";
      const labelWidth = context.measureText(label).width + 16;
      const labelX = Math.min(width - labelWidth - 10, last.x + 10);
      const labelY = Math.max(8, Math.min(height - 26, last.y - 11));
      context.fillStyle = "rgba(8, 20, 25, 0.92)";
      context.strokeStyle = "rgba(47, 255, 209, 0.38)";
      context.lineWidth = 1;
      context.beginPath();
      context.roundRect(labelX, labelY, labelWidth, 22, 8);
      context.fill();
      context.stroke();
      context.fillStyle = "#f4f1e8";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(label, labelX + 8, labelY + 11);
      context.restore();
    }
  }

  function drawMarketChart(points) {
    drawLineChart(els.marketChart, points, "value");
  }

  function getBusinessTrendInfo(business) {
    const rawHistory = Array.isArray(business && business.financialHistory) ? business.financialHistory : [];
    const currentDay = Math.max(1, Number(state && state.time && state.time.day) || 1);
    const currentValuation = Math.max(1000, Number(business && business.valuation) || Number(business && business.seedValuation) || 1000);
    const seedValuation = Math.max(1000, Number(business && business.seedValuation) || currentValuation);
    const history = rawHistory
      .map((point) => ({
        day: Math.max(1, Math.floor(Number(point.day) || currentDay)),
        value: Math.max(1, Number(point.valuation) || 0),
        netIncome: Number(point.netIncome) || 0,
        cashFlow: Number(point.cashFlow) || 0
      }))
      .filter((point) => point.value > 0)
      .slice(-12);
    const actual = history.length
      ? history
      : [
        { day: Math.max(1, currentDay - 30), value: seedValuation, netIncome: 0, cashFlow: 0 },
        { day: currentDay, value: currentValuation, netIncome: Number(business && business.monthlyPnl && business.monthlyPnl.netIncome) || 0, cashFlow: Number(business && business.monthlyPnl && business.monthlyPnl.cashFlow) || 0 }
      ];

    if (actual.length === 1) {
      actual.unshift({
        day: Math.max(1, actual[0].day - 30),
        value: seedValuation,
        netIncome: 0,
        cashFlow: 0
      });
    }

    const first = actual[0];
    const last = actual[actual.length - 1];
    const periods = Math.max(1, actual.length - 1);
    const historicalRate = first.value > 0
      ? Math.pow(Math.max(0.1, last.value / first.value), 1 / periods) - 1
      : 0;
    const latestPnl = business && business.monthlyPnl ? business.monthlyPnl : {};
    const monthlyNetYield = (Number(latestPnl.netIncome) || 0) / Math.max(1, currentValuation);
    const monthlyCashYield = (Number(latestPnl.cashFlow) || 0) / Math.max(1, currentValuation);
    const fundamentalRate = Math.max(-0.06, Math.min(0.08, monthlyNetYield * 0.35 + monthlyCashYield * 0.15));
    const blendedMonthlyRate = Math.max(-0.08, Math.min(0.1, actual.length >= 3
      ? historicalRate * 0.65 + fundamentalRate * 0.35
      : fundamentalRate));
    const projection = [];
    let projectedValue = currentValuation;

    for (let month = 1; month <= 12; month += 1) {
      projectedValue = Math.max(seedValuation * 0.25, projectedValue * (1 + blendedMonthlyRate));
      projection.push({
        day: currentDay + month * 30,
        value: projectedValue,
        projected: true
      });
    }

    const annualReturn = currentValuation > 0
      ? (projection[projection.length - 1].value / currentValuation) - 1
      : 0;
    const latestDelta = last.value - first.value;
    const label = annualReturn > 0.08
      ? "Expansion"
      : annualReturn < -0.04
        ? "Presion"
        : latestDelta >= 0
          ? "Estable +"
          : "Estable -";
    const className = annualReturn >= 0 ? "is-positive" : "is-negative";

    return {
      actual,
      projection,
      annualReturn,
      projectedValue: projection[projection.length - 1].value,
      label,
      className
    };
  }

  function drawBusinessTrendChart(canvas, trendInfo) {
    if (!canvas || !canvas.getContext || !trendInfo) return;
    const prepared = prepareCanvas(canvas);
    const context = prepared.context;
    const width = prepared.width;
    const height = prepared.height;
    const actual = Array.isArray(trendInfo.actual) ? trendInfo.actual : [];
    const projection = Array.isArray(trendInfo.projection) ? trendInfo.projection : [];
    const allPoints = actual.concat(projection);

    context.clearRect(0, 0, width, height);
    const bg = context.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#071216");
    bg.addColorStop(1, "#10130f");
    context.fillStyle = bg;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(129, 230, 217, 0.12)";
    context.lineWidth = 1;
    for (let row = 1; row <= 3; row += 1) {
      const y = (height / 4) * row;
      context.beginPath();
      context.moveTo(10, y);
      context.lineTo(width - 10, y);
      context.stroke();
    }

    if (allPoints.length < 2) {
      context.fillStyle = "rgba(244, 241, 232, 0.58)";
      context.font = "12px Consolas, monospace";
      context.fillText("Esperando cierres", 12, Math.round(height / 2));
      return;
    }

    const minDay = Math.min(...allPoints.map((point) => Number(point.day) || 1));
    const maxDay = Math.max(...allPoints.map((point) => Number(point.day) || 1));
    const values = allPoints.map((point) => Number(point.value) || 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(1, maxValue - minValue);
    const dayRange = Math.max(1, maxDay - minDay);
    const padding = { top: 10, right: 12, bottom: 18, left: 12 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const toXY = (point) => ({
      x: padding.left + (((Number(point.day) || minDay) - minDay) / dayRange) * chartWidth,
      y: height - padding.bottom - (((Number(point.value) || minValue) - minValue) / range) * chartHeight
    });
    const actualPoints = actual.map(toXY);
    const projectedPoints = actual.length ? [toXY(actual[actual.length - 1])].concat(projection.map(toXY)) : projection.map(toXY);
    const isUp = trendInfo.annualReturn >= 0;
    const lineColor = isUp ? "#2fffd1" : "#ff5f7d";

    if (actualPoints.length >= 2) {
      const fillGradient = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      fillGradient.addColorStop(0, isUp ? "rgba(47, 255, 209, 0.22)" : "rgba(255, 95, 125, 0.2)");
      fillGradient.addColorStop(1, "rgba(8, 20, 25, 0)");
      context.beginPath();
      actualPoints.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.lineTo(actualPoints[actualPoints.length - 1].x, height - padding.bottom);
      context.lineTo(actualPoints[0].x, height - padding.bottom);
      context.closePath();
      context.fillStyle = fillGradient;
      context.fill();
    }

    context.strokeStyle = lineColor;
    context.lineWidth = 2.2;
    context.shadowColor = lineColor;
    context.shadowBlur = 10;
    context.beginPath();
    actualPoints.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.shadowBlur = 0;

    context.save();
    context.setLineDash([7, 6]);
    context.strokeStyle = "rgba(246, 196, 83, 0.86)";
    context.lineWidth = 2;
    context.beginPath();
    projectedPoints.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.restore();

    const lastActual = actualPoints[actualPoints.length - 1];
    const lastProjection = projectedPoints[projectedPoints.length - 1];
    if (lastActual) {
      context.fillStyle = lineColor;
      context.beginPath();
      context.arc(lastActual.x, lastActual.y, 3.6, 0, Math.PI * 2);
      context.fill();
    }
    if (lastProjection) {
      context.fillStyle = "#f6c453";
      context.beginPath();
      context.arc(lastProjection.x, lastProjection.y, 3.4, 0, Math.PI * 2);
      context.fill();
    }

    context.font = "10px Consolas, monospace";
    context.fillStyle = "rgba(244, 241, 232, 0.62)";
    context.fillText("Hist.", 12, height - 7);
    context.fillStyle = "rgba(246, 196, 83, 0.86)";
    context.textAlign = "right";
    context.fillText("12m", width - 12, height - 7);
    context.textAlign = "left";
  }

  function drawPieChart(canvas, entries) {
    if (!canvas || !canvas.getContext) return;
    const prepared = prepareCanvas(canvas);
    const context = prepared.context;
    const width = prepared.width;
    const height = prepared.height;
    const list = Array.isArray(entries) ? entries.filter((item) => item.value > 0) : [];
    const total = list.reduce((sum, item) => sum + item.value, 0);
    const colors = ["#f6c84c", "#2fffd1", "#68a7ff", "#ff5f7d", "#b18cff", "#f09b4f", "#8dd6a5", "#d7d2c2"];

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#081419";
    context.fillRect(0, 0, width, height);

    if (total <= 0) {
      context.fillStyle = "rgba(244, 241, 232, 0.56)";
      context.font = "700 12px Consolas, monospace";
      context.fillText("Sin allocation", 12, Math.round(height / 2));
      return;
    }

    const padding = 12;
    const barX = padding;
    const barY = Math.max(48, height - 26);
    const barW = Math.max(24, width - padding * 2);
    const barH = 12;
    const dominant = list.slice().sort((a, b) => b.value - a.value)[0];
    let currentX = barX;

    const compactLabel = width < 130 ? "Alloc." : "Allocation";

    context.fillStyle = "#f4f1e8";
    context.font = "800 12px Consolas, monospace";
    context.textAlign = "left";
    context.fillText(compactLabel, padding, 18);
    context.fillStyle = "rgba(244, 241, 232, 0.68)";
    context.font = "11px Consolas, monospace";
    context.fillText(`${list.length} grupos`, padding, 34);
    context.fillStyle = colors[0];
    context.font = "800 11px Consolas, monospace";
    context.textAlign = "right";
    context.fillText(`${((dominant.value / total) * 100).toFixed(0)}%`, width - padding, 18);

    context.strokeStyle = "rgba(114, 248, 224, 0.24)";
    context.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);
    list.forEach((item, index) => {
      const segmentWidth = index === list.length - 1
        ? barX + barW - currentX
        : Math.max(2, (item.value / total) * barW);
      context.fillStyle = colors[index % colors.length];
      context.fillRect(currentX, barY, segmentWidth, barH);
      currentX += segmentWidth;
    });

    context.textAlign = "left";
  }

  function renderMacro(macro) {
    if (!macro) return;
    const pressureLabels = {
      "Riesgo activo": "Riesgo",
      "Inflacion alta": "Inflacion",
      "Balanceado": "Balance"
    };
    const pressure = pressureLabels[macro.pressure] || macro.pressure;
    els.macroPhase.textContent = macro.phaseLabel;
    els.macroInflation.textContent = formatPercent(macro.inflation);
    els.macroInterest.textContent = formatPercent(macro.interestRate);
    els.macroGdp.textContent = formatPercent(macro.gdpGrowth);
    els.macroGdp.classList.toggle("is-positive", macro.gdpGrowth >= 0);
    els.macroGdp.classList.toggle("is-negative", macro.gdpGrowth < 0);
    els.macroSentiment.textContent = macro.sentimentLabel;
    els.macroSentiment.classList.toggle("is-positive", macro.sentiment > 0.1);
    els.macroSentiment.classList.toggle("is-negative", macro.sentiment < -0.1);
    els.macroPressure.textContent = pressure;
  }

  function renderCommand() {
    const portfolioSummary = player.getPortfolioSummary(state.portfolio, state.assets);
    const businessSummary = businesses ? businesses.getBusinessSummary(state.businesses) : { valuation: 0, cash: 0, equityValue: 0, count: 0 };
    const bankSummary = bank ? bank.getBankSummary(state) : { debtTotal: 0 };
    const operatedBusinessValue = Number(businessSummary.equityValue ?? businessSummary.valuation) || 0;
    const alerts = getAlerts();
    const firstHistory = state.history[0];
    const lastHistory = state.history[state.history.length - 1];
    const netChange = firstHistory && lastHistory && firstHistory.netWorth
      ? (lastHistory.netWorth - firstHistory.netWorth) / firstHistory.netWorth
      : 0;
    const cashflow30 = getCashflowSince(30);
    els.summaryCashflow.textContent = formatMoney(cashflow30);
    els.summaryCashflow.classList.toggle("is-positive", cashflow30 >= 0);
    els.summaryCashflow.classList.toggle("is-negative", cashflow30 < 0);
    els.summaryAlerts.textContent = String(alerts.length);
    els.summaryNews.textContent = String(events ? events.getNewsSummary(state.events).unread : 0);
    els.commandNetChange.textContent = formatSignedPercent(netChange);
    els.commandNetChange.classList.toggle("is-positive", netChange >= 0);
    els.commandNetChange.classList.toggle("is-negative", netChange < 0);
    els.commandLiquidity.textContent = formatMoney(state.player.cash);
    els.commandBusinesses.textContent = formatMoney(operatedBusinessValue);
    els.commandDebt.textContent = formatMoney(bankSummary.debtTotal);
    els.commandPassive.textContent = formatMoney(cashflow30);
    els.commandPassive.classList.toggle("is-positive", cashflow30 >= 0);
    els.commandPassive.classList.toggle("is-negative", cashflow30 < 0);

    const total = Math.max(1, state.player.netWorth);
    const managedBusinessAssetIds = new Set((state.businesses || []).map((business) => business.sourceAssetId).filter(Boolean));
    const investableAllocation = portfolioSummary.positions
      .filter((position) => !(position.asset.type === "business" && managedBusinessAssetIds.has(position.assetId)))
      .reduce((groups, position) => {
        const label = position.asset.categoryLabel || position.asset.type;
        groups[label] = (groups[label] || 0) + position.value;
        return groups;
      }, {});
    const allocationEntries = Object.entries(investableAllocation)
      .map(([label, value]) => ({ label, value }))
      .concat([
        { label: "Efectivo", value: state.player.cash },
        { label: "Empresas operadas", value: operatedBusinessValue }
      ])
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    els.allocationList.innerHTML = "";
    allocationEntries.forEach((item) => {
      const row = document.createElement("div");
      row.className = "allocation-row";
      row.innerHTML = `<span>${item.label}</span><strong>${formatMoney(item.value)}</strong><i style="width:${Math.min(100, item.value / total * 100).toFixed(1)}%"></i>`;
      els.allocationList.appendChild(row);
    });
    drawPieChart(els.allocationChart, allocationEntries);

    els.alertList.innerHTML = "";
    alerts.forEach((alert) => {
      const alertKey = getAlertKey(alert);
      const isExpanded = expandedAlertKey === alertKey;
      const presentation = getAlertPresentation(alert);
      const item = document.createElement("article");
      item.className = `alert-item ${alert.severity || "info"} ${isExpanded ? "expanded" : "collapsed"}`.trim();
      item.innerHTML = `
        <button type="button" class="alert-toggle" data-alert-toggle="${escapeHtml(alertKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
          <span class="alert-toggle-copy">
            <strong>${escapeHtml(presentation.title)}</strong>
            <small>${escapeHtml(presentation.detail)}</small>
          </span>
          <span class="alert-toggle-icon" aria-hidden="true">${isExpanded ? "−" : "+"}</span>
        </button>
        <div class="alert-detail"${isExpanded ? "" : " hidden"}>
          <p>${escapeHtml(alert.text)}</p>
          ${alert.view ? `<button type="button" data-alert-view="${alert.view}">${escapeHtml(alert.actionLabel || "Abrir")}</button>` : ""}
        </div>
      `;
      els.alertList.appendChild(item);
    });

    if (alerts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "alert-item info";
      empty.textContent = "Sin alertas criticas.";
      els.alertList.appendChild(empty);
    }

    drawLineChart(els.netWorthChart, state.history.slice(-90), "netWorth", {
      showValueScale: true,
      formatValue: formatHudMoney
    });
  }

  function renderStrategyRadar() {
    if (!strategy || !els.strategyRiskScore) return;
    const risk = strategy.getRiskProfile(state);
    const cashflow = strategy.getCashflowDiagnosis(state);
    const advisors = strategy.getAdvisorTips(state);
    const contracts = strategy.refreshContracts(state);
    const perks = strategy.getCityPerks(state);

    els.strategyRiskScore.textContent = `${risk.score}/100`;
    els.strategyRiskScore.classList.toggle("is-negative", risk.score >= 55);
    els.strategyRiskScore.classList.toggle("is-positive", risk.score < 55);
    if (els.riskMeterFill) {
      els.riskMeterFill.style.width = `${Math.max(4, risk.score)}%`;
      els.riskMeterFill.dataset.severity = risk.severity;
    }
    if (els.strategyRiskLabel) {
      els.strategyRiskLabel.textContent = `${risk.label} / Poder ${perks.power}`;
    }
    if (els.cashflowDiagnosis) {
      const drivers = cashflow.drivers.length ? ` ${cashflow.drivers.join(" / ")}.` : "";
      els.cashflowDiagnosis.textContent = `${cashflow.headline} ${cashflow.action}${drivers}`;
    }

    if (els.advisorList) {
      els.advisorList.innerHTML = "";
      advisors.forEach((tip) => {
        const row = document.createElement("article");
        row.className = `advisor-card ${tip.severity || "info"}`;
        row.innerHTML = `
          <span>${escapeHtml(tip.role)}</span>
          <strong>${escapeHtml(tip.title)}</strong>
          <p>${escapeHtml(tip.body)}</p>
          <button type="button" data-advisor-view="${tip.view}">${escapeHtml(tip.actionLabel || "Abrir")}</button>
        `;
        els.advisorList.appendChild(row);
      });
    }

    if (els.contractList) {
      els.contractList.innerHTML = "";
      contracts.items.forEach((contract) => {
        const progress = contract.target > 0 ? Math.min(1, contract.progress / contract.target) : 0;
        const item = document.createElement("article");
        item.className = `weekly-contract ${contract.done ? "done" : ""}`;
        item.innerHTML = `
          <div>
            <strong>${escapeHtml(contract.title)}</strong>
            <span>${escapeHtml(contract.body)}</span>
          </div>
          <small>${Math.round(progress * 100)}% / +${formatMoney(contract.rewardCash)} / +${contract.rewardPower} poder</small>
          <i aria-hidden="true"><b style="width:${Math.round(progress * 100)}%"></b></i>
        `;
        els.contractList.appendChild(item);
      });
    }
  }

  function renderWatchlist() {
    if (!strategy || !els.watchlistList) return;
    const assets = strategy.getWatchlistAssets(state);
    els.watchlistList.innerHTML = "";

    if (!assets.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state compact-empty";
      empty.textContent = "Usa Vigilar en el mercado para guardar candidatos.";
      els.watchlistList.appendChild(empty);
      return;
    }

    assets.slice(0, 8).forEach((asset) => {
      const row = document.createElement("div");
      row.className = "watchlist-row";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(asset.ticker || getAssetSymbol(asset))}</strong>
          <span>${escapeHtml(asset.name)}</span>
        </div>
        <div>
          <strong>${formatMoney(asset.simPrice)}</strong>
          <span class="${asset.dailyChangePercent >= 0 ? "is-positive" : "is-negative"}">${formatSignedPercent(asset.dailyChangePercent || 0)}</span>
        </div>
        <button type="button" data-watch-action="detail" data-asset-id="${asset.id}">Detalle</button>
        <button type="button" data-watch-action="buy" data-asset-id="${asset.id}">Comprar</button>
        <button type="button" data-watch-action="remove" data-asset-id="${asset.id}">Quitar</button>
      `;
      els.watchlistList.appendChild(row);
    });
  }

  function renderHedges() {
    if (!strategy || !els.hedgeList) return;
    const active = new Map((state.strategy && state.strategy.activeHedges || []).map((hedge) => [hedge.id, hedge]));
    els.hedgeList.innerHTML = "";

    strategy.getHedgeCatalog(state).forEach((hedge) => {
      const activeHedge = active.get(hedge.id);
      const row = document.createElement("div");
      row.className = `hedge-row ${activeHedge ? "active" : ""}`;
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(hedge.label)}</strong>
          <span>${escapeHtml(hedge.body)}</span>
          <small>${activeHedge ? `Activa hasta dia ${activeHedge.endDay}` : `${hedge.days} dias / costo ${formatMoney(hedge.cost)}`}</small>
        </div>
        <button type="button" data-hedge-id="${hedge.id}" ${activeHedge ? "disabled" : ""}>${activeHedge ? "Activa" : "Contratar"}</button>
      `;
      els.hedgeList.appendChild(row);
    });
  }

  function renderLegacy() {
    if (!strategy || !els.legacyStatus) return;
    const perks = strategy.getCityPerks(state);
    const prestige = strategy.getPrestigeStatus(state);
    const opportunities = strategy.getTakeoverOpportunities(state);
    const claims = strategy.getTakeoverClaims ? strategy.getTakeoverClaims(state) : [];
    const scenario = strategy.getScenarioMeta(state.strategy && state.strategy.scenario);
    const macroLabel = state.macro && state.macro.phaseLabel ? state.macro.phaseLabel : "Ciclo base";

    if (els.legacyClaim) els.legacyClaim.disabled = !prestige.available;
    els.legacyStatus.innerHTML = `
      <div><span>Escenario</span><strong>${escapeHtml(scenario.label)}</strong></div>
      <div><span>Poder ciudad</span><strong>${perks.power}</strong></div>
      <div><span>Legado</span><strong>${prestige.points} pts</strong></div>
      <div><span>Siguiente ciclo</span><strong>${escapeHtml(prestige.nextText)}</strong></div>
      <div><span>OPA activas</span><strong>${claims.length}</strong></div>
      <div><span>Ciclo macro</span><strong>${escapeHtml(macroLabel)}</strong></div>
      <div><span>Comisiones</span><strong>${formatPercent(1 - perks.tradeFeeModifier)}</strong></div>
      <div><span>Tasas</span><strong>${formatPercent(1 - perks.loanRateModifier)}</strong></div>
    `;

    if (els.takeoverList) {
      els.takeoverList.innerHTML = "";
      if (!claims.length && !opportunities.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state compact-empty";
        empty.textContent = "Compra posiciones relevantes en acciones o empresas para desbloquear OPA blandas.";
        els.takeoverList.appendChild(empty);
        return;
      }

      claims.forEach((item) => {
        const row = document.createElement("div");
        row.className = "takeover-row claimed ready";
        const feeBoost = formatPercent(1 - (Number(item.tradeFeeModifier) || 1));
        const dividendBoost = formatPercent((Number(item.dividendMultiplier) || 1) - 1);
        const valuationBoost = formatPercent((Number(item.businessValuation) || 1) - 1);
        row.innerHTML = `
          <div>
            <strong>${escapeHtml(item.ticker || item.label || "OPA activa")}</strong>
            <span>${escapeHtml(item.label || "Participacion estrategica")} / ${escapeHtml(item.stageLabel || "Etapa activa")} / Influencia ${item.influence}%</span>
            <small>Fee ${feeBoost} / Div. ${dividendBoost} / Valor ${valuationBoost}</small>
          </div>
          <button type="button" disabled>Activa</button>
        `;
        els.takeoverList.appendChild(row);
      });

      opportunities.forEach((item) => {
        const row = document.createElement("div");
        row.className = `takeover-row ${item.ready ? "ready" : ""}`;
        row.innerHTML = `
          <div>
            <strong>${escapeHtml(item.ticker || item.label)}</strong>
            <span>${escapeHtml(item.label)} / Influencia ${item.influence}% / Meta ${escapeHtml(item.stageLabel || "Observador")}</span>
          </div>
          <small>Due diligence ${formatMoney(item.cost)}</small>
          <button type="button" data-takeover-asset="${item.assetId}" ${item.ready ? "" : "disabled"}>OPA</button>
        `;
        els.takeoverList.appendChild(row);
      });
    }
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function getEmpireProfile() {
    const portfolioSummary = player.getPortfolioSummary(state.portfolio, state.assets);
    const businessSummary = businesses ? businesses.getBusinessSummary(state.businesses) : { count: 0, valuation: 0, netIncome: 0 };
    const positions = player.getDecoratedPositions(state.portfolio, state.assets);
    const propertyCount = positions.filter((position) => position.asset.type === "real_estate").length;
    const categoryCount = new Set(positions.map((position) => position.asset.type)).size;
    const achievementCount = state.achievements && Array.isArray(state.achievements.unlocked)
      ? state.achievements.unlocked.length
      : 0;
    const netWorth = Math.max(0, state.player.netWorth || state.player.cash || 0);
    const milestones = [
      { label: "Base", goal: 100000 },
      { label: "Distrito", goal: 500000 },
      { label: "Centro", goal: 1000000 },
      { label: "Holding", goal: 5000000 },
      { label: "Metropoli", goal: 10000000 },
      { label: "Imperio", goal: 50000000 }
    ];
    const stageIndex = milestones.reduce((best, milestone, index) => netWorth >= milestone.goal ? index : best, 0);
    const nextGoal = milestones[stageIndex + 1] ? milestones[stageIndex + 1].goal : milestones[stageIndex].goal;
    const score = clampNumber(
      Math.log10(Math.max(10000, netWorth)) * 13 +
        categoryCount * 5 +
        propertyCount * 3 +
        businessSummary.count * 6 +
        achievementCount * 1.2 +
        Math.max(0, businessSummary.netIncome) / 9000,
      0,
      100
    );
    const districts = [
      { id: "mercado", label: "Mercado", view: "market", active: portfolioSummary.count > 0 },
      { id: "banco", label: "Banco", view: "bank", active: (state.debts || []).length > 0 || (state.bank && state.bank.deposits && state.bank.deposits.length > 0) },
      { id: "propiedades", label: "Propiedades", view: "realestate", active: propertyCount > 0 },
      { id: "empresas", label: "Empresas", view: "business", active: businessSummary.count > 0 },
      { id: "logros", label: "Logros", view: "progress", active: achievementCount >= 5 },
      { id: "diversificacion", label: "Diversificacion", view: "market", active: categoryCount >= 4 }
    ];

    return {
      stage: milestones[stageIndex].label,
      nextGoal,
      score: Math.round(score),
      districts,
      activeDistricts: districts.filter((district) => district.active).length
    };
  }

  function hashString(value) {
    const text = String(value || "");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }

  function hexToRgbTriplet(hexValue) {
    const hex = String(hexValue || "").replace("#", "");
    const value = hex.length === 3
      ? hex.split("").map((character) => character + character).join("")
      : hex;
    const number = Number.parseInt(value, 16);
    if (!Number.isFinite(number)) return "47, 255, 209";
    return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
  }

  function getStableLocationCoords(key, index) {
    if (EMPIRE_LOCATION_COORDS[key]) return EMPIRE_LOCATION_COORDS[key];
    const hash = hashString(key);
    const angle = (hash % 360) * Math.PI / 180;
    const ring = 1.55 + (index % 4) * 0.52;
    return {
      x: clampNumber(Math.cos(angle) * ring, -3.7, 3.7),
      z: clampNumber(Math.sin(angle) * ring, -3.2, 3.2)
    };
  }

  function getAssetMapLocation(asset) {
    if (!asset) {
      return { key: "Mercado global", title: "Mercado global", subtitle: "Activos simulados", view: "market" };
    }
    if (asset.type === "real_estate" && asset.city) {
      return {
        key: asset.city,
        title: asset.city,
        subtitle: [asset.neighborhood, asset.country].filter(Boolean).join(" / ") || asset.country || "Bienes raices",
        view: "realestate"
      };
    }
    if (asset.city) {
      return {
        key: asset.city,
        title: asset.city,
        subtitle: asset.country || getAssetCategoryLabel(asset),
        view: asset.type === "business" ? "business" : "market"
      };
    }

    const fallback = {
      stock: { key: "Distrito Bolsa", title: "Distrito Bolsa", subtitle: "Acciones compradas", view: "market" },
      bond: { key: "Centro financiero", title: "Centro financiero", subtitle: "Bonos y deuda", view: "bank" },
      business: { key: asset.sector === "software" ? "Distrito tecnologico" : "Distrito corporativo", title: asset.sector === "software" ? "Distrito tecnologico" : "Distrito corporativo", subtitle: "Empresas adquiridas", view: "business" },
      commodity: { key: "Puerto de commodities", title: "Puerto de commodities", subtitle: "Materias primas", view: "market" },
      crypto: { key: "Nodo crypto", title: "Nodo crypto", subtitle: "Activos digitales", view: "market" },
      collectible: { key: "Galeria patrimonial", title: "Galeria patrimonial", subtitle: "Coleccionables", view: "market" }
    };

    return fallback[asset.type] || { key: "Mercado global", title: "Mercado global", subtitle: getAssetCategoryLabel(asset), view: "market" };
  }

  function getLocationDominantType(assets) {
    const weights = assets.reduce((map, item) => {
      const type = item.type || "mixed";
      map[type] = (map[type] || 0) + Math.max(1, Number(item.value) || 0);
      return map;
    }, {});
    const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return "mixed";
    if (entries.length > 1 && entries[0][1] === entries[1][1]) return "mixed";
    return entries[0][0];
  }

  function getEmpireOpportunityLocations(ownedLocations) {
    const ownedAssetIds = new Set((state.portfolio || []).map((position) => position.assetId));
    const occupiedKeys = new Set((ownedLocations || []).map((location) => location.key));
    const cash = Math.max(0, Number(state.player && state.player.cash) || 0);
    const candidates = Object.values(state.assets || {})
      .filter((asset) => asset && asset.id && !ownedAssetIds.has(asset.id))
      .filter((asset) => ["real_estate", "business", "stock"].includes(asset.type))
      .map((asset, index) => {
        const mapLocation = getAssetMapLocation(asset);
        const price = Math.max(0, Number(asset.simPrice || asset.seedPrice) || 0);
        const mortgageEntry = asset.type === "real_estate" && price > 0 && price * 0.25 <= Math.max(cash, 1);
        const affordable = price > 0 && (price <= cash || mortgageEntry);
        const dailyChange = Number(asset.dailyChangePercent) || 0;
        const fitScore = cash > 0 && price > 0
          ? -Math.abs(Math.log10(price) - Math.log10(Math.max(1000, cash)))
          : 0;
        const typeScore = asset.type === "real_estate" ? 18 : asset.type === "business" ? 14 : 7;
        const yieldScore = getGoodsAnnualYield(asset) * 80;
        return {
          asset,
          mapLocation,
          price,
          dailyChange,
          score: typeScore + yieldScore + fitScore + (affordable ? 16 : 0) + Math.max(0, dailyChange) * 40 - index * 0.01
        };
      })
      .sort((a, b) => b.score - a.score);

    const selected = [];
    const usedMapKeys = new Set();
    candidates.forEach((candidate) => {
      if (selected.length >= 5) return;
      if (usedMapKeys.has(candidate.mapLocation.key)) return;
      usedMapKeys.add(candidate.mapLocation.key);
      selected.push(candidate);
    });

    return selected.map((candidate, index) => {
      const { asset, mapLocation, price, dailyChange } = candidate;
      const base = getStableLocationCoords(mapLocation.key, index + 23);
      const offsetSeed = hashString(`${asset.id}:opportunity`);
      const offsetX = ((offsetSeed % 7) - 3) * 0.12;
      const offsetZ = (((offsetSeed >> 3) % 7) - 3) * 0.1;
      const overlapsOwned = occupiedKeys.has(mapLocation.key);
      const typeLabel = getAssetCategoryLabel(asset);
      return {
        key: `opportunity_${asset.id}`,
        title: asset.city ? `${asset.city}: ${asset.name}` : asset.name,
        subtitle: `En venta / ${typeLabel}`,
        view: asset.type === "real_estate" || asset.type === "business" ? "realestate" : "market",
        type: asset.type || "mixed",
        x: clampNumber(base.x + offsetX + (overlapsOwned ? 0.34 : 0), -3.8, 3.8),
        z: clampNumber(base.z + offsetZ + (overlapsOwned ? -0.28 : 0), -3.35, 3.35),
        totalValue: price,
        totalCost: price,
        count: 1,
        roi: dailyChange,
        isOpportunity: true,
        assets: [{
          assetId: asset.id,
          name: asset.name || asset.ticker || "Activo en venta",
          symbol: getAssetSymbol(asset),
          type: asset.type || "mixed",
          typeLabel,
          value: price,
          quantity: 0,
          roi: getGoodsAnnualYield(asset) || dailyChange,
          dayChange: dailyChange,
          reason: asset.lastMoveReason || "Oferta disponible en el mapa."
        }]
      };
    });
  }

  function getEmpireAssetLocations(profile) {
    const positions = player.getDecoratedPositions(state.portfolio, state.assets);
    const groups = new Map();

    positions.forEach((position, index) => {
      const asset = position.asset || {};
      const mapLocation = getAssetMapLocation(asset);
      const key = mapLocation.key;
      const current = groups.get(key) || {
        key,
        title: mapLocation.title,
        subtitle: mapLocation.subtitle,
        view: mapLocation.view,
        x: getStableLocationCoords(key, index).x,
        z: getStableLocationCoords(key, index).z,
        totalValue: 0,
        totalCost: 0,
        assets: []
      };
      const value = Number(position.value) || 0;
      current.totalValue += value;
      current.totalCost += Number(position.totalCost) || 0;
      current.assets.push({
        assetId: position.assetId,
        name: asset.name || asset.ticker || "Activo",
        symbol: getAssetSymbol(asset),
        type: asset.type || "mixed",
        typeLabel: getAssetCategoryLabel(asset),
        value,
        quantity: Number(position.quantity) || 0,
        roi: Number(position.roi) || 0,
        dayChange: Number(asset.dailyChangePercent) || 0,
        reason: asset.lastMoveReason || "Precio simulado por mercado."
      });
      groups.set(key, current);
    });

    const assetLocations = Array.from(groups.values()).map((location) => ({
      ...location,
      type: getLocationDominantType(location.assets),
      count: location.assets.length,
      roi: location.totalCost > 0 ? (location.totalValue - location.totalCost) / location.totalCost : 0
    })).sort((a, b) => b.totalValue - a.totalValue);
    const opportunityLocations = getEmpireOpportunityLocations(assetLocations);

    return [
      {
        key: "HQ del imperio",
        title: "HQ del imperio",
        subtitle: profile.stage,
        view: "dashboard",
        type: "hq",
        x: 0,
        z: 0,
        totalValue: Math.max(0, Number(state.player && state.player.netWorth) || 0),
        totalCost: 0,
        count: 0,
        roi: 0,
        assets: [],
        isHeadquarters: true
      },
      ...assetLocations,
      ...opportunityLocations
    ];
  }

  function disposeThreeObject(object) {
    if (!object) return;
    if (object.geometry && typeof object.geometry.dispose === "function") object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material && typeof material.dispose === "function") material.dispose();
      });
    }
  }

  function createEmpireMap3d(canvas, stage, onProject) {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const mapGroup = new THREE.Group();
    const markerGroup = new THREE.Group();
    const markerObjects = new Map();
    const pointer = { active: false, id: null, x: 0, y: 0, moved: false };
    const target = { rotationY: -0.36, pitch: 0.03, zoom: 0.72 };
    const current = { rotationY: -0.36, pitch: 0.03, zoom: 0.72 };
    let lastWidth = 0;
    let lastHeight = 0;
    let frameId = 0;

    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x071012, 0);
    if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    scene.fog = new THREE.FogExp2(0x071012, 0.045);

    scene.add(mapGroup);
    mapGroup.add(markerGroup);
    scene.add(new THREE.AmbientLight(0xb8d5cb, 0.95));
    const keyLight = new THREE.DirectionalLight(0xf4c44e, 1.25);
    keyLight.position.set(2.5, 7, 5);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x68a7ff, 0.72, 18);
    fillLight.position.set(-4, 4, -3);
    scene.add(fillLight);

    function clearGroup(group) {
      while (group.children.length) {
        const child = group.children.pop();
        child.traverse(disposeThreeObject);
      }
    }

    function resize() {
      const width = Math.max(1, Math.floor(stage.clientWidth || canvas.clientWidth || 1));
      const height = Math.max(1, Math.floor(stage.clientHeight || canvas.clientHeight || 1));
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function makeMaterial(color, options) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: options && options.roughness !== undefined ? options.roughness : 0.58,
        metalness: options && options.metalness !== undefined ? options.metalness : 0.2,
        transparent: options && options.opacity !== undefined,
        opacity: options && options.opacity !== undefined ? options.opacity : 1,
        emissive: options && options.emissive ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: options && options.emissiveIntensity !== undefined ? options.emissiveIntensity : 0
      });
    }

    function addZone(width, depth, x, z, color, opacity) {
      const zone = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.028, depth),
        makeMaterial(color, { opacity, metalness: 0.03, roughness: 0.88 })
      );
      zone.position.set(x, 0.018, z);
      mapGroup.add(zone);
    }

    function addRoad(width, depth, x, z, color, opacity) {
      const geometry = new THREE.BoxGeometry(width, 0.04, depth);
      const material = makeMaterial(color, { opacity, metalness: 0.03, roughness: 0.76 });
      const road = new THREE.Mesh(geometry, material);
      road.position.set(x, 0.045, z);
      mapGroup.add(road);

      const horizontal = width >= depth;
      const length = horizontal ? width : depth;
      const stripeCount = Math.max(2, Math.floor(length / 1.22));
      for (let index = 0; index < stripeCount; index += 1) {
        const offset = -length / 2 + 0.72 + index * 1.22;
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(horizontal ? 0.34 : 0.024, 0.014, horizontal ? 0.024 : 0.34),
          makeMaterial(0xf4f1e8, { opacity: 0.48, roughness: 0.6 })
        );
        stripe.position.set(horizontal ? x + offset : x, 0.078, horizontal ? z : z + offset);
        mapGroup.add(stripe);
      }
    }

    function addTree(x, z, scale) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * scale, 0.032 * scale, 0.16 * scale, 6),
        makeMaterial(0x51422a, { roughness: 0.9 })
      );
      trunk.position.set(x, 0.12 * scale, z);
      mapGroup.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.095 * scale, 10, 8),
        makeMaterial(0x2f6b4c, { opacity: 0.86, roughness: 0.95 })
      );
      crown.position.set(x, 0.23 * scale, z);
      mapGroup.add(crown);
    }

    function addCityBlock(x, z, score, index) {
      const seed = hashString(`${x}:${z}:${index}`);
      const progress = clampNumber(score / 100, 0.08, 1);
      const width = 0.34 + (seed % 5) * 0.055;
      const depth = 0.32 + ((seed >> 3) % 5) * 0.05;
      const height = 0.1 + ((seed % 100) / 100) * 0.34 + progress * (0.16 + (index % 7) * 0.035);
      const palette = [0x273033, 0x2e302a, 0x22323a, 0x352f25, 0x1f302d];
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        makeMaterial(palette[seed % palette.length], { opacity: 0.9, roughness: 0.7, metalness: 0.08 })
      );
      block.position.set(x, height / 2 + 0.045, z);
      mapGroup.add(block);

      if (seed % 4 === 0) {
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.72, 0.035, depth * 0.72),
          makeMaterial(0x465052, { opacity: 0.78, roughness: 0.62 })
        );
        roof.position.set(x, height + 0.08, z);
        mapGroup.add(roof);
      }
    }

    function addLocationTower(location, maxValue) {
      const color = EMPIRE_LOCATION_TYPE_COLORS[location.type] || EMPIRE_LOCATION_TYPE_COLORS.mixed;
      const valueRatio = maxValue > 0 ? Math.log10(1 + Math.max(0, location.totalValue)) / Math.log10(1 + maxValue) : 0.2;
      const height = location.isHeadquarters
        ? 1.24
        : location.isOpportunity
          ? 0.32 + clampNumber(valueRatio, 0.12, 1) * 0.58
          : 0.42 + clampNumber(valueRatio, 0.14, 1) * 1.58;
      const radius = location.isHeadquarters ? 0.34 : location.isOpportunity ? 0.17 : 0.22 + Math.min(0.14, location.count * 0.025);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * (location.isOpportunity ? 1.75 : 1.2), radius * (location.isOpportunity ? 1.95 : 1.35), 0.12, location.isOpportunity ? 18 : 6),
        makeMaterial(color, { opacity: location.isOpportunity ? 0.68 : 0.82, emissive: color, emissiveIntensity: location.isOpportunity ? 0.07 : 0.12 })
      );
      base.position.set(location.x, 0.09, location.z);
      mapGroup.add(base);

      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(radius * (location.isOpportunity ? 1.65 : 1.2), height, radius * (location.isOpportunity ? 0.72 : 1.2)),
        makeMaterial(color, { opacity: location.isOpportunity ? 0.64 : 0.78, emissive: color, emissiveIntensity: location.isOpportunity ? 0.1 : 0.16, metalness: 0.28 })
      );
      tower.position.set(location.x, 0.16 + height / 2, location.z);
      tower.rotation.y = (hashString(location.key) % 90) * Math.PI / 180;
      mapGroup.add(tower);

      if (location.isHeadquarters) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.48, 0.68, 32),
          makeMaterial(0xf4c44e, { opacity: 0.5, emissive: 0xf4c44e, emissiveIntensity: 0.14 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(location.x, 0.084, location.z);
        mapGroup.add(ring);
      }

      if (location.isOpportunity) {
        const tag = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.13, 0.045),
          makeMaterial(0xf4c44e, { opacity: 0.84, emissive: 0xf4c44e, emissiveIntensity: 0.12, metalness: 0.12 })
        );
        tag.position.set(location.x, 0.28 + height, location.z);
        tag.rotation.y = tower.rotation.y;
        mapGroup.add(tag);
      }

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.58, 16, 10),
        makeMaterial(color, { opacity: 0.9, emissive: color, emissiveIntensity: location.isOpportunity ? 0.54 : 0.9, roughness: 0.28 })
      );
      beacon.position.set(location.x, 0.28 + height, location.z);
      markerGroup.add(beacon);
      markerObjects.set(location.key, beacon);
    }

    function update(locations, profile) {
      clearGroup(markerGroup);
      clearGroup(mapGroup);
      markerObjects.clear();
      mapGroup.add(markerGroup);
      mapGroup.scale.set(1.08, 1.08, 1.08);

      const ground = new THREE.Mesh(
        new THREE.BoxGeometry(9.3, 0.08, 7.75),
        makeMaterial(0x111816, { opacity: 0.98, roughness: 0.92 })
      );
      ground.position.y = -0.04;
      mapGroup.add(ground);

      addZone(1.8, 1.05, -3.3, 2.72, 0x234d39, 0.72);
      addZone(1.55, 0.74, 3.0, -2.82, 0x1f3d54, 0.68);
      addZone(2.0, 0.96, 2.6, 2.55, 0x4b3d22, 0.42);
      addZone(1.7, 0.9, -2.92, -2.62, 0x243844, 0.54);

      const grid = new THREE.GridHelper(9, 14, 0xd7e2d8, 0x31413b);
      grid.material.transparent = true;
      grid.material.opacity = 0.07;
      grid.position.y = 0.025;
      mapGroup.add(grid);

      addRoad(8.9, 0.34, 0, -1.08, 0x1b2224, 0.95);
      addRoad(8.7, 0.26, 0, 1.2, 0x202625, 0.92);
      addRoad(8.2, 0.18, 0.2, -2.58, 0x242927, 0.88);
      addRoad(7.8, 0.16, -0.15, 2.48, 0x242927, 0.86);
      addRoad(0.34, 7.35, -1.25, 0, 0x1d2529, 0.94);
      addRoad(0.28, 7.15, 1.68, 0, 0x202826, 0.92);
      addRoad(0.18, 6.8, -3.12, 0.1, 0x282d2b, 0.82);
      addRoad(0.16, 6.4, 3.25, -0.1, 0x282d2b, 0.8);

      [
        [-3.65, 2.58, 0.9],
        [-3.2, 2.94, 0.7],
        [-2.86, 2.48, 0.76],
        [2.72, -2.78, 0.68],
        [3.24, -2.58, 0.82],
        [3.18, 2.62, 0.7],
        [2.46, 2.78, 0.62],
        [-2.92, -2.78, 0.74]
      ].forEach(([treeX, treeZ, scale]) => addTree(treeX, treeZ, scale));

      let blockIndex = 0;
      const roadXs = [-3.12, -1.25, 1.68, 3.25];
      const roadZs = [-2.58, -1.08, 1.2, 2.48];
      for (let x = -3.85; x <= 3.85; x += 0.68) {
        for (let z = -3.08; z <= 3.08; z += 0.62) {
          const onRoad = roadZs.some((roadZ) => Math.abs(z - roadZ) < 0.25) || roadXs.some((roadX) => Math.abs(x - roadX) < 0.24);
          const inPark = x < -2.35 && z > 2.25;
          const inWater = x > 2.35 && z < -2.42;
          if (onRoad || inPark || inWater) continue;
          addCityBlock(x, z, profile.score, blockIndex);
          blockIndex += 1;
        }
      }

      const maxValue = Math.max(...locations.map((location) => Number(location.totalValue) || 0), 1);
      locations.forEach((location) => addLocationTower(location, maxValue));
      resize();
      project();
    }

    function project() {
      const projections = [];
      const vector = new THREE.Vector3();
      markerObjects.forEach((object, key) => {
        object.getWorldPosition(vector);
        vector.project(camera);
        projections.push({
          key,
          x: (vector.x * 0.5 + 0.5) * 100,
          y: (-vector.y * 0.5 + 0.5) * 100,
          visible: vector.z > -1 && vector.z < 1,
          depth: vector.z
        });
      });
      onProject(projections);
    }

    function renderLoop() {
      resize();
      current.rotationY += (target.rotationY - current.rotationY) * 0.12;
      current.pitch += (target.pitch - current.pitch) * 0.12;
      current.zoom += (target.zoom - current.zoom) * 0.12;
      mapGroup.rotation.y = current.rotationY;
      mapGroup.rotation.x = current.pitch;
      camera.position.set(0, 5.0 * current.zoom, 5.86 * current.zoom);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      project();
      frameId = window.requestAnimationFrame(renderLoop);
    }

    function onPointerDown(event) {
      if (event.target.closest(".empire-location-pin, .empire-location-popover, .empire-district")) return;
      pointer.active = true;
      pointer.id = event.pointerId;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.moved = false;
      stage.classList.add("is-dragging");
      stage.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (!pointer.active || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) pointer.moved = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      target.rotationY += dx * 0.008;
      target.pitch = clampNumber(target.pitch + dy * 0.002, -0.24, 0.32);
      event.preventDefault();
    }

    function onPointerUp(event) {
      if (pointer.id === event.pointerId) {
        pointer.active = false;
        pointer.id = null;
        stage.classList.remove("is-dragging");
      }
    }

    function onWheel(event) {
      target.zoom = clampNumber(target.zoom + event.deltaY * 0.0012, 0.62, 1.16);
      event.preventDefault();
    }

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    renderLoop();

    return {
      update,
      resize,
      dispose() {
        window.cancelAnimationFrame(frameId);
        stage.removeEventListener("pointerdown", onPointerDown);
        stage.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerup", onPointerUp);
        stage.removeEventListener("pointercancel", onPointerUp);
        stage.removeEventListener("wheel", onWheel);
        clearGroup(mapGroup);
        renderer.dispose();
      }
    };
  }

  function ensureEmpireMap3d() {
    if (empireMap3d || !els.empireMapCanvas || !els.empireMapStage || !window.THREE) return empireMap3d;
    try {
      empireMap3d = createEmpireMap3d(els.empireMapCanvas, els.empireMapStage, updateEmpireMapProjections);
      els.empireMapStage.classList.remove("is-flat");
    } catch (error) {
      empireMap3d = null;
      els.empireMapStage.classList.add("is-flat");
      console.warn("Mapa 3D no disponible, usando vista plana.", error);
    }
    return empireMap3d;
  }

  function renderEmpireMapInfo(profile, locations) {
    if (!els.empireSkyline) return;
    const ownedLocations = locations.filter((location) => !location.isHeadquarters && !location.isOpportunity);
    const opportunities = locations.filter((location) => location.isOpportunity);
    const topLocation = ownedLocations[0] || opportunities[0];
    els.empireSkyline.innerHTML = `
      <div class="empire-map-metric">
        <span>Activos propios</span>
        <strong>${ownedLocations.length}</strong>
      </div>
      <div class="empire-map-metric">
        <span>En venta</span>
        <strong>${opportunities.length}</strong>
      </div>
      <div class="empire-map-metric">
        <span>Zona fuerte</span>
        <strong>${escapeHtml(topLocation ? topLocation.title : "HQ")}</strong>
      </div>
      <div class="empire-map-metric">
        <span>Distrito activo</span>
        <strong>${profile.activeDistricts}/${profile.districts.length}</strong>
      </div>
      <div class="empire-map-metric">
        <span>Siguiente hito</span>
        <strong>${formatMoney(profile.nextGoal)}</strong>
      </div>
      <button class="empire-map-metric action" type="button" data-empire-view="realestate">
        <span>Explorar mapa</span>
        <strong>${opportunities.length ? "Ver ofertas" : "Bienes"}</strong>
      </button>
    `;
  }

  function renderEmpireLocationPins(locations) {
    if (!els.empireLocationLayer) return;
    empireLocationDataMap.clear();
    empireLocationPinElements.clear();
    els.empireLocationLayer.innerHTML = "";

    locations.forEach((location) => {
      empireLocationDataMap.set(location.key, location);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `empire-location-pin ${location.type || "mixed"} ${location.isOpportunity ? "opportunity" : ""} ${location.key === activeEmpireLocationKey ? "active" : ""}`.trim();
      button.dataset.empireLocationKey = location.key;
      const pinColor = EMPIRE_LOCATION_TYPE_COLORS[location.type] || EMPIRE_LOCATION_TYPE_COLORS.mixed;
      button.style.setProperty("--pin-color", pinColor);
      button.style.setProperty("--pin-rgb", hexToRgbTriplet(pinColor));
      button.setAttribute("aria-expanded", String(location.key === activeEmpireLocationKey));
      button.setAttribute("aria-label", `${location.title}: ${location.isOpportunity ? "activo en venta" : location.assets.length ? `${location.assets.length} activos` : "mi ubicacion"}`);
      button.innerHTML = `
        <span class="pin-core" aria-hidden="true"></span>
        <strong>${escapeHtml(location.isHeadquarters ? "HQ" : location.isOpportunity ? "VENTA" : location.assets.length > 1 ? String(location.assets.length) : (location.assets[0] && location.assets[0].symbol) || "CE")}</strong>
      `;
      els.empireLocationLayer.appendChild(button);
      empireLocationPinElements.set(location.key, button);
    });
  }

  function updateEmpireMapProjections(projections) {
    empireLocationProjectionMap.clear();
    projections.forEach((projection) => {
      empireLocationProjectionMap.set(projection.key, projection);
      const button = empireLocationPinElements.get(projection.key);
      if (!button) return;
      const location = empireLocationDataMap.get(projection.key);
      button.hidden = !projection.visible;
      button.style.left = `${clampNumber(projection.x, 8, 92)}%`;
      button.style.top = `${clampNumber(projection.y, 14, 90)}%`;
      button.style.zIndex = String(120 - Math.round((projection.depth + 1) * 35) + (location && location.isOpportunity ? -22 : 24));
    });
    positionEmpirePopover();
  }

  function updateEmpireFlatProjections(locations) {
    const projections = locations.map((location) => ({
      key: location.key,
      x: ((location.x + 4.2) / 8.4) * 100,
      y: ((location.z + 3.6) / 7.2) * 100,
      visible: true,
      depth: 0
    }));
    updateEmpireMapProjections(projections);
  }

  function getEmpireLocationAssetsHtml(location) {
    if (!location.assets.length) {
      return `<div class="empire-location-empty">Sin activos comprados en esta zona.</div>`;
    }
    return location.assets.map((asset) => {
      const roiClass = asset.roi >= 0 ? "is-positive" : "is-negative";
      const dayClass = asset.dayChange >= 0 ? "is-positive" : "is-negative";
      const assetLabel = location.isOpportunity
        ? `${asset.typeLabel} en venta`
        : `${asset.typeLabel} / ${asset.symbol}`;
      const valueLabel = location.isOpportunity ? "Precio" : "Valor";
      const performanceLabel = location.isOpportunity ? "Yield" : "ROI";
      return `
        <button class="empire-location-asset" type="button" data-empire-asset-id="${escapeHtml(asset.assetId)}">
          <span>${escapeHtml(assetLabel)}</span>
          <strong>${escapeHtml(asset.name)}</strong>
          <small>${valueLabel} ${formatMoney(asset.value)} / ${performanceLabel} <b class="${roiClass}">${formatSignedPercent(asset.roi)}</b> / Dia <b class="${dayClass}">${formatSignedPercent(asset.dayChange)}</b></small>
        </button>
      `;
    }).join("");
  }

  function positionEmpirePopover() {
    if (!els.empireLocationPopover || els.empireLocationPopover.hidden || !activeEmpireLocationKey || !els.empireMapStage) return;
    const projection = empireLocationProjectionMap.get(activeEmpireLocationKey);
    if (!projection) return;
    const dockBottom = projection.y < 54;
    els.empireLocationPopover.style.left = "8px";
    els.empireLocationPopover.style.right = "8px";
    els.empireLocationPopover.style.top = dockBottom ? "auto" : "8px";
    els.empireLocationPopover.style.bottom = dockBottom ? "8px" : "auto";
    els.empireLocationPopover.style.transform = "none";
  }

  function renderEmpireLocationPopover() {
    if (!els.empireLocationPopover) return;
    const location = empireLocationDataMap.get(activeEmpireLocationKey);
    if (!location) {
      els.empireLocationPopover.hidden = true;
      return;
    }
    const valueLabel = location.isHeadquarters ? "Patrimonio" : location.isOpportunity ? "Precio" : "Valor";
    const countLabel = location.isOpportunity ? "Oferta" : "Activos";
    const returnLabel = location.isOpportunity ? "Dia" : "ROI";
    els.empireLocationPopover.hidden = false;
    els.empireLocationPopover.innerHTML = `
      <div class="empire-popover-head">
        <div>
          <span>${escapeHtml(location.subtitle || "Zona")}</span>
          <h4>${escapeHtml(location.title)}</h4>
        </div>
        <button class="icon-button empire-location-close" type="button" data-empire-location-close aria-label="Cerrar locacion">X</button>
      </div>
      <div class="empire-popover-metrics">
        <div><span>${valueLabel}</span><strong>${formatMoney(location.totalValue)}</strong></div>
        <div><span>${countLabel}</span><strong>${location.isOpportunity ? "Disponible" : location.assets.length}</strong></div>
        <div><span>${returnLabel}</span><strong class="${location.roi >= 0 ? "is-positive" : "is-negative"}">${formatSignedPercent(location.roi)}</strong></div>
      </div>
      <div class="empire-location-assets">
        ${getEmpireLocationAssetsHtml(location)}
      </div>
      <button class="btn btn-secondary btn-small empire-location-view" type="button" data-empire-view="${escapeHtml(location.view)}">${location.isOpportunity ? "Ver oferta" : "Gestionar zona"}</button>
    `;
    positionEmpirePopover();
  }

  function closeEmpireLocationPopover() {
    activeEmpireLocationKey = "";
    if (els.empireLocationPopover) els.empireLocationPopover.hidden = true;
    empireLocationPinElements.forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function toggleEmpireLocationPopover(locationKey) {
    if (activeEmpireLocationKey === locationKey && els.empireLocationPopover && !els.empireLocationPopover.hidden) {
      closeEmpireLocationPopover();
      return;
    }
    activeEmpireLocationKey = locationKey;
    empireLocationPinElements.forEach((button, key) => {
      const isActive = key === activeEmpireLocationKey;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-expanded", String(isActive));
    });
    renderEmpireLocationPopover();
  }

  function renderEmpireVisual() {
    if (!els.empirePanel || !els.empireDistricts) return;
    const profile = getEmpireProfile();
    const progress = getPlayerProgressProfile();
    const locations = getEmpireAssetLocations(profile);

    els.empireStage.textContent = profile.stage;
    els.empireScore.textContent = `${profile.score}/100`;
    els.empireDistrictCount.textContent = String(profile.activeDistricts);
    els.empireNextGoal.textContent = formatMoney(profile.nextGoal);
    els.empirePanel.dataset.stage = profile.stage.toLowerCase();
    els.empirePanel.dataset.score = String(profile.score);
    els.empirePanel.style.setProperty("--city-score", `${profile.score}%`);
    els.empireCaption.textContent = profile.score >= 95
      ? "El imperio ya opera como una metropoli financiera completa."
      : `${progress.rank}: el mapa concentra activos, locaciones y distritos activos.`;

    if (activeEmpireLocationKey && !locations.some((location) => location.key === activeEmpireLocationKey)) {
      closeEmpireLocationPopover();
    }

    renderEmpireMapInfo(profile, locations);
    renderEmpireLocationPins(locations);
    const map = ensureEmpireMap3d();
    if (map) map.update(locations, profile);
    else updateEmpireFlatProjections(locations);
    renderEmpireLocationPopover();

    els.empireDistricts.innerHTML = "";
    profile.districts.forEach((district) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `empire-district ${district.active ? "active" : ""}`.trim();
      item.dataset.empireView = district.view;
      item.dataset.district = district.id;
      item.setAttribute("aria-label", `${district.label}: ${district.active ? "activo" : "pendiente"}. Abrir ${VIEW_LABELS[district.view] || district.label}.`);
      item.innerHTML = `<span></span><strong>${district.label}</strong><small>${district.active ? "Activo" : "Bloq."}</small>`;
      els.empireDistricts.appendChild(item);
    });
  }

  function getMissionProgress() {
    const portfolioSummary = player.getPortfolioSummary(state.portfolio, state.assets);
    const categories = Object.keys(portfolioSummary.allocation || {}).length;

    return [
      { id: "buy", label: "Compra tu primer activo", reward: ONBOARDING_REWARDS.firstBuy.label, bonus: ONBOARDING_REWARDS.firstBuy, done: portfolioSummary.count > 0 },
      { id: "news", label: "Lee una noticia", reward: ONBOARDING_REWARDS.news.label, bonus: ONBOARDING_REWARDS.news, done: (state.events || []).some((item) => item.read) },
      { id: "time", label: "Cierra el dia 7", reward: ONBOARDING_REWARDS.time.label, bonus: ONBOARDING_REWARDS.time, done: state.time.day >= 7 },
      { id: "business", label: "Abre una empresa", reward: ONBOARDING_REWARDS.business.label, bonus: ONBOARDING_REWARDS.business, done: (state.businesses || []).length > 0 },
      { id: "diversify", label: "Diversificar 3 categorias", reward: ONBOARDING_REWARDS.diversify.label, bonus: ONBOARDING_REWARDS.diversify, done: categories >= 3 }
    ];
  }

  function applyOnboardingRewards() {
    if (!state) return [];
    const onboarding = ensureOnboardingState();
    const claimed = new Set(onboarding.rewardsClaimed);
    const rewarded = [];

    getMissionProgress().forEach((mission) => {
      if (!mission.done || claimed.has(mission.id) || !mission.bonus) return;

      if (mission.bonus.cash) {
        state.player.cash = Math.round(((state.player.cash || 0) + mission.bonus.cash) * 100) / 100;
      }

      claimed.add(mission.id);
      rewarded.push(mission);
    });

    onboarding.rewardsClaimed = Array.from(claimed);
    return rewarded;
  }

  function renderOnboarding() {
    const onboarding = ensureOnboardingState();
    const missions = getMissionProgress();
    const completed = missions.filter((mission) => mission.done).map((mission) => mission.id);
    onboarding.completed = Array.from(new Set((onboarding.completed || []).concat(completed)));

    if (onboarding.skipped || onboarding.completed.length === missions.length) {
      els.onboardingPanel.dataset.forceHidden = "true";
      els.onboardingPanel.hidden = true;
      return;
    }

    delete els.onboardingPanel.dataset.forceHidden;
    els.onboardingPanel.hidden = false;
    els.missionList.innerHTML = "";
    missions.forEach((mission) => {
      const item = document.createElement("div");
      item.className = `mission-item ${mission.done ? "done" : ""}`;
      item.title = `${mission.label} · ${mission.bonus.tier}: ${mission.reward}`;
      item.innerHTML = `
        <span>${mission.done ? "OK" : "CT"}</span>
        <strong>${mission.label}</strong>
        <small>${mission.bonus.tier}: ${mission.reward}</small>
      `;
      els.missionList.appendChild(item);
    });
  }

  function getAmountLimit(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function parseMoneyInput(value) {
    const digits = sanitizeMoneyInput(value);
    if (!digits) return NaN;
    return Number(digits);
  }

  function sanitizeMoneyInput(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function supportsTextSelection(input) {
    if (!input || typeof input !== "object") return false;
    const type = String(input.type || "").toLowerCase();
    return ["text", "search", "tel", "url", "password"].includes(type);
  }

  function isTouchViewport() {
    return Boolean(
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
      window.innerWidth <= 679
    );
  }

  function normalizeMoneyInput(input) {
    if (!input) return;
    const value = input.value;
    const cleanValue = sanitizeMoneyInput(value);
    if (value === cleanValue) return;
    const canSelect = supportsTextSelection(input);
    const cursor = canSelect && typeof input.selectionStart === "number" ? input.selectionStart : cleanValue.length;
    const removedBeforeCursor = sanitizeMoneyInput(value.slice(0, cursor)).length;
    input.value = cleanValue;
    if (canSelect && typeof input.setSelectionRange === "function") {
      const nextCursor = Math.min(cleanValue.length, removedBeforeCursor);
      window.setTimeout(() => {
        try {
          input.setSelectionRange(nextCursor, nextCursor);
        } catch (error) {
          // Android can reject text-selection APIs on virtualized inputs.
        }
      }, 0);
    }
  }

  function focusAmountInput(input, options = {}) {
    if (!input) return;
    const touchViewport = isTouchViewport();
    const target = input.closest(".business-contribution, .modal, .inline-form") || input;
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({
        block: touchViewport ? "nearest" : "center",
        inline: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    }
    if (touchViewport) {
      if (!options.allowTouchFocus) return;
      input.focus({ preventScroll: true });
      return;
    }
    input.focus({ preventScroll: true });
    const canSelect = supportsTextSelection(input);
    if (!touchViewport && canSelect && typeof input.select === "function" && input.value) {
      window.setTimeout(() => {
        try {
          input.select();
        } catch (error) {
          // Ignore selection failures on constrained mobile runtimes.
        }
      }, 0);
      return;
    }
    if (canSelect && typeof input.setSelectionRange === "function") {
      const end = input.value.length;
      window.setTimeout(() => {
        try {
          input.setSelectionRange(end, end);
        } catch (error) {
          // Ignore selection failures on constrained mobile runtimes.
        }
      }, 0);
    }
  }

  function getSuggestedAmount(value, available, min) {
    const limit = getAmountLimit(available);
    if (limit <= 0) return "";
    const floor = Math.max(0, Number(min) || 0);
    const suggested = Math.round(Math.max(floor, Number(value) || 0));
    return String(Math.min(limit, suggested));
  }

  function getSupplierCreditCapacity(business) {
    const suppliers = Array.isArray(business && business.suppliers) ? business.suppliers : [];
    const supplier = suppliers
      .slice()
      .sort((a, b) => (Number(b.creditLimit) || 0) - (Number(b.payableBalance) || 0) - ((Number(a.creditLimit) || 0) - (Number(a.payableBalance) || 0)))[0];

    return supplier
      ? getAmountLimit((Number(supplier.creditLimit) || 0) - (Number(supplier.payableBalance) || 0))
      : 0;
  }

  function getBusinessDistributableCash(business) {
    const reserve = Math.max(1000, Number(business && business.monthlyPnl && business.monthlyPnl.opex) || 0);
    const distributableCash = Math.max(0, (Number(business && business.cash) || 0) - reserve);
    const pending = Math.max(0, Number(business && business.pendingDividends) || distributableCash);
    return getAmountLimit(Math.min(distributableCash, pending));
  }

  function renderBusinessFormAvailability() {
    const available = getAmountLimit(state && state.player && state.player.cash);
    if (els.businessCapital) {
      els.businessCapital.max = String(available);
    }
    if (els.businessCapitalAvailable) {
      els.businessCapitalAvailable.innerHTML = `<span>Disponible personal</span><strong>${formatMoney(available)}</strong>`;
    }
  }

  function getBusinessAmountConfig(business, action) {
    const businessCash = getAmountLimit(business && business.cash);
    const supplierCreditAvailable = getSupplierCreditCapacity(business);
    const availableDividend = getBusinessDistributableCash(business);
    const supply = businesses && typeof businesses.getSupplySnapshot === "function"
      ? businesses.getSupplySnapshot(business)
      : null;
    const configs = {
      marketing: {
        label: "Marketing",
        inputLabel: "Presupuesto de campana",
        availableLabel: "Caja empresa disponible",
        available: businessCash,
        min: 100,
        step: 100,
        buttonLabel: "Aplicar marketing",
        value: getSuggestedAmount(Number(business.marketing || 0) * 0.2, businessCash, 100)
      },
      inventory: {
        label: "Insumos",
        inputLabel: supply ? `Compra de ${supply.label}` : "Compra de insumos",
        availableLabel: "Caja empresa disponible",
        available: businessCash,
        min: 500,
        step: 100,
        buttonLabel: "Comprar insumos",
        value: getSuggestedAmount(supply ? supply.reorderGapValue : Number(business.inventory || 0) * 0.4, businessCash, 500)
      },
      rnd: {
        label: "I+D",
        inputLabel: "Inversion en I+D",
        availableLabel: "Caja empresa disponible",
        available: businessCash,
        min: 250,
        step: 50,
        buttonLabel: "Invertir en I+D",
        value: getSuggestedAmount(Number(business.rnd || 0) * 0.25 || Number(business.valuation || 0) * 0.004, businessCash, 250)
      },
      supplier_credit: {
        label: "Credito proveedor",
        inputLabel: "Uso de credito comercial",
        availableLabel: "Credito proveedor disponible",
        available: supplierCreditAvailable,
        min: 500,
        step: 100,
        buttonLabel: "Tomar credito",
        value: getSuggestedAmount(Number(business.valuation || 0) * 0.012, supplierCreditAvailable, 500)
      },
      dividend: {
        label: "Dividendos",
        inputLabel: "Distribucion al jugador",
        availableLabel: "Caja distribuible disponible",
        available: availableDividend,
        min: 250,
        step: 50,
        buttonLabel: "Distribuir dividendos",
        value: getSuggestedAmount(availableDividend * 0.35, availableDividend, 250)
      }
    };

    return configs[action] || null;
  }

  function getBusinessMonthlyPlan(business, action) {
    const plans = business && business.monthlyInjections && typeof business.monthlyInjections === "object"
      ? business.monthlyInjections
      : {};
    const plan = plans[action] && typeof plans[action] === "object" ? plans[action] : {};
    const amount = getAmountLimit(plan.amount);

    return {
      active: Boolean(plan.active) && amount > 0,
      amount,
      label: MONTHLY_BUSINESS_ACTION_LABELS[action] || "Plan mensual",
      lastOk: Object.prototype.hasOwnProperty.call(plan, "lastOk") ? Boolean(plan.lastOk) : true,
      lastMessage: typeof plan.lastMessage === "string" ? plan.lastMessage : ""
    };
  }

  function getMonthlyPlanStatusHtml(plan) {
    if (!plan || !plan.active) {
      return `<p class="amount-availability monthly-injection-status"><span>Mensual</span><strong>Sin programar</strong></p>`;
    }

    return `
      <p class="amount-availability monthly-injection-status ${plan.lastOk ? "is-active" : "is-warning"}">
        <span>Activo cada mes</span>
        <strong>${formatMoney(plan.amount)}</strong>
      </p>
    `;
  }

  function getBusinessSupplyStatus(business) {
    const supply = businesses && typeof businesses.getSupplySnapshot === "function"
      ? businesses.getSupplySnapshot(business)
      : null;
    const inventory = supply ? supply.inventoryValue : Math.max(0, Number(business && business.inventory) || 0);
    const monthlyNeed = supply ? Math.max(1, supply.monthlyNeedUnits) : Math.max(500, (Number(business && business.monthlyPnl && business.monthlyPnl.cogs) || 0) * 0.92);
    const coverage = supply ? supply.coverageMonths : inventory / monthlyNeed;
    const fillPercent = Math.round(Math.min(1, Math.max(0, coverage)) * 100);
    const status = coverage < 0.5
      ? { className: "is-supply-critical", label: "Critico" }
      : coverage < 1
        ? { className: "is-supply-watch", label: "Bajo" }
        : { className: "is-supply-ok", label: "Sano" };
    const coverageLabel = coverage >= 9.9 ? "9.9+ meses" : `${coverage.toFixed(1)} meses`;
    const targetLabel = supply
      ? `${formatSupplyUnits(supply.monthlyNeedUnits)} ${supply.unitLabel}/mes`
      : formatMoney(monthlyNeed);

    return {
      supply,
      inventory,
      fillPercent,
      className: status.className,
      label: status.label,
      coverageLabel,
      title: supply
        ? `${supply.label}: ${formatSupplyUnits(supply.stockUnits)} ${supply.unitLabel} / objetivo ${targetLabel} / cobertura ${coverageLabel}`
        : `Insumos ${formatMoney(inventory)} / objetivo mensual ${targetLabel} / cobertura ${coverageLabel}`
    };
  }

  function renderMarket(assets) {
    if (!market || !els.marketList) return;

    const summary = market.getMarketSummary(assets);
    const allAssets = market.getAssetList(assets);
    const query = String(els.marketSearch.value || "").trim().toLowerCase();
    const category = els.marketCategoryFilter.value || "all";
    const visibleAssets = allAssets.filter((asset) => {
      const matchesCategory = category === "all" || asset.type === category;
      const haystack = `${asset.ticker || ""} ${asset.name || ""} ${asset.categoryLabel || ""} ${asset.sectorLabel || ""} ${asset.city || ""}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });

    els.marketIndex.textContent = summary.marketIndex.toFixed(2);
    els.marketCount.textContent = String(summary.count);
    els.marketAverage.textContent = formatSignedPercent(summary.averageChange);
    els.marketAverage.classList.toggle("is-positive", summary.averageChange >= 0);
    els.marketAverage.classList.toggle("is-negative", summary.averageChange < 0);
    els.marketTop.textContent = summary.topMover ? `${summary.topMover.ticker} ${formatSignedPercent(summary.topMover.dailyChangePercent)}` : "-";
    els.marketTop.classList.toggle("is-positive", summary.topMover && summary.topMover.dailyChangePercent >= 0);
    els.marketTop.classList.toggle("is-negative", summary.topMover && summary.topMover.dailyChangePercent < 0);
    els.marketVolume.textContent = formatCompactNumber(summary.totalVolume);
    drawMarketChart(summary.indexHistory);
    els.marketStatus.textContent = `${visibleAssets.length} de ${summary.count} activos visibles.`;
    els.marketList.innerHTML = "";

    visibleAssets.forEach((asset) => {
      const row = document.createElement("div");
      row.className = "market-row";
      const watched = strategy && strategy.isWatched ? strategy.isWatched(state, asset.id) : false;

      const mortgageButton = asset.type === "real_estate"
        ? `<button class="market-action mortgage" type="button" data-action="mortgage" data-asset-id="${asset.id}">Hipoteca</button>`
        : "";

      row.innerHTML = `
        <div class="asset-badge" data-category="${asset.type}">
          <span class="category-icon" aria-hidden="true"></span>
          <span class="asset-symbol">${getAssetSymbol(asset)}</span>
        </div>
        <div class="market-identity">
          <strong>${asset.name}</strong>
          <span class="market-meta">${asset.categoryLabel} / ${asset.sectorLabel}</span>
          <span class="market-meta">${asset.lastMoveReason || ""}</span>
        </div>
        <div class="market-values" aria-label="Datos del activo">
          <div class="market-metric market-metric-price">
            <span>Precio</span>
            <strong class="market-price">${formatMoney(asset.simPrice)}</strong>
          </div>
          <div class="market-metric">
            <span>Cambio dia</span>
            <strong class="market-delta ${asset.dailyChangePercent >= 0 ? "is-positive" : "is-negative"}">${formatSignedPercent(asset.dailyChangePercent)}</strong>
          </div>
          <div class="market-metric">
            <span>Liquidez</span>
            <strong>${formatPercent(asset.liquidity)}</strong>
          </div>
          <div class="market-metric">
            <span>Desliz.</span>
            <strong>${formatPercent(asset.slippageEstimate)}</strong>
          </div>
        </div>
        <div class="market-actions">
          <button class="market-action detail" type="button" data-action="detail" data-asset-id="${asset.id}">Detalle</button>
          <button class="market-action watch ${watched ? "active" : ""}" type="button" data-action="watch" data-asset-id="${asset.id}">${watched ? "Vigilado" : "Vigilar"}</button>
          <button class="market-action buy" type="button" data-action="buy" data-asset-id="${asset.id}">Comprar</button>
          <button class="market-action sell" type="button" data-action="sell" data-asset-id="${asset.id}" ${getOwnedQuantity(asset.id) <= 0 ? "disabled" : ""}>Vender</button>
          ${mortgageButton}
        </div>
      `;
      els.marketList.appendChild(row);
    });

    if (visibleAssets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Sin activos para ese filtro";
      els.marketList.appendChild(empty);
    }
  }

  function getAssetCategoryLabel(asset) {
    if (!asset) return "Activo";
    return ASSET_CATEGORY_LABELS[asset.type] || asset.categoryLabel || titleCase(String(asset.type || "activo").replace(/_/g, " "));
  }

  function getPortfolioDayChange(positions) {
    const totalValue = positions.reduce((sum, position) => sum + Math.max(0, Number(position.value) || 0), 0);
    if (totalValue <= 0) return 0;
    return positions.reduce((sum, position) => {
      const weight = Math.max(0, Number(position.value) || 0) / totalValue;
      return sum + (Number(position.asset && position.asset.dailyChangePercent) || 0) * weight;
    }, 0);
  }

  function getDashboardPortfolioTabs(positions) {
    const groups = positions.reduce((map, position) => {
      const type = position.asset && position.asset.type ? position.asset.type : "other";
      const current = map.get(type) || {
        type,
        label: getAssetCategoryLabel(position.asset),
        count: 0,
        value: 0
      };
      current.count += 1;
      current.value += Number(position.value) || 0;
      map.set(type, current);
      return map;
    }, new Map());
    const ordered = ASSET_CATEGORY_ORDER
      .filter((type) => groups.has(type))
      .map((type) => groups.get(type));
    const extras = Array.from(groups.values())
      .filter((group) => !ASSET_CATEGORY_ORDER.includes(group.type))
      .sort((a, b) => b.value - a.value);
    const totalValue = positions.reduce((sum, position) => sum + (Number(position.value) || 0), 0);

    return [
      { type: "all", label: "Todos", count: positions.length, value: totalValue },
      ...ordered,
      ...extras
    ];
  }

  function renderDashboardPortfolio(summary) {
    if (!els.dashboardAssetList || !els.dashboardAssetTabs) return;

    const positions = summary.positions
      .slice()
      .sort((a, b) => b.value - a.value);
    const tabs = getDashboardPortfolioTabs(positions);
    const activeTypes = new Set(tabs.map((tab) => tab.type));
    if (!activeTypes.has(dashboardPortfolioFilter)) dashboardPortfolioFilter = "all";
    const dayChange = getPortfolioDayChange(positions);
    const visiblePositions = dashboardPortfolioFilter === "all"
      ? positions
      : positions.filter((position) => position.asset.type === dashboardPortfolioFilter);

    els.dashboardPortfolioTotal.textContent = formatMoney(summary.totalValue);
    els.dashboardPortfolioValue.textContent = formatMoney(summary.totalValue);
    els.dashboardPortfolioRoi.textContent = formatSignedPercent(summary.roi);
    els.dashboardPortfolioRoi.classList.toggle("is-positive", summary.roi >= 0);
    els.dashboardPortfolioRoi.classList.toggle("is-negative", summary.roi < 0);
    els.dashboardPortfolioDay.textContent = formatSignedPercent(dayChange);
    els.dashboardPortfolioDay.classList.toggle("is-positive", dayChange >= 0);
    els.dashboardPortfolioDay.classList.toggle("is-negative", dayChange < 0);
    els.dashboardPortfolioCount.textContent = String(summary.count);
    els.dashboardPortfolioEmpty.hidden = summary.count > 0;

    els.dashboardAssetTabs.innerHTML = "";
    tabs.forEach((tab) => {
      const button = document.createElement("button");
      const isActive = tab.type === dashboardPortfolioFilter;
      button.type = "button";
      button.className = `dashboard-asset-tab ${isActive ? "active" : ""}`.trim();
      button.dataset.dashboardAssetTab = tab.type;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(isActive));
      button.innerHTML = `<span>${escapeHtml(tab.label)}</span><strong>${tab.count}</strong>`;
      els.dashboardAssetTabs.appendChild(button);
    });

    els.dashboardAssetList.innerHTML = "";
    visiblePositions.forEach((position) => {
      const asset = position.asset;
      const assetId = String(position.assetId);
      const isExpanded = expandedDashboardAssetIds.has(assetId);
      const primaryLabel = asset.name || asset.ticker || getAssetSymbol(asset);
      const secondaryLabel = asset.ticker && asset.ticker !== primaryLabel
        ? asset.ticker
        : getAssetSymbol(asset) !== primaryLabel
          ? getAssetSymbol(asset)
          : "";
      const marketLabel = `${getAssetCategoryLabel(asset)} / ${asset.sectorLabel || "Mercado"}`;
      const dayDelta = Number(asset.dailyChangePercent) || 0;
      const dayClass = dayDelta >= 0 ? "is-positive" : "is-negative";
      const roiClass = position.roi >= 0 ? "is-positive" : "is-negative";
      const gainClass = position.unrealizedGain >= 0 ? "is-positive" : "is-negative";
      const manageButton = asset.type === "business"
        ? `<button class="dashboard-asset-action manage" type="button" data-dashboard-asset-action="manage-business" data-asset-id="${escapeHtml(position.assetId)}">Gestionar</button>`
        : asset.type === "real_estate"
          ? `<button class="dashboard-asset-action manage" type="button" data-dashboard-asset-action="manage-property" data-asset-id="${escapeHtml(position.assetId)}">Operar</button>`
          : "";
      const card = document.createElement("article");
      card.className = `dashboard-asset-card ${escapeHtml(asset.type)} ${isExpanded ? "expanded" : "collapsed"}`.trim();
      card.innerHTML = `
        <button class="dashboard-asset-toggle" type="button" data-dashboard-asset-toggle="${escapeHtml(assetId)}" aria-expanded="${isExpanded ? "true" : "false"}">
          <div class="asset-badge" data-category="${escapeHtml(asset.type)}">
            <span class="category-icon" aria-hidden="true"></span>
            <span class="asset-symbol">${escapeHtml(getAssetSymbol(asset))}</span>
          </div>
          <div class="dashboard-asset-title">
            <span>${escapeHtml(marketLabel)}</span>
            <strong>${escapeHtml(primaryLabel)}</strong>
            ${secondaryLabel ? `<small>${escapeHtml(secondaryLabel)}</small>` : ""}
          </div>
          <div class="dashboard-asset-summary">
            <div><span>Valor</span><strong>${formatMoney(position.value)}</strong></div>
            <div><span>ROI</span><strong class="${roiClass}">${formatSignedPercent(position.roi)}</strong></div>
            <div><span>Dia</span><strong class="${dayClass}">${formatSignedPercent(dayDelta)}</strong></div>
          </div>
          <span class="dashboard-asset-chevron" aria-hidden="true">${isExpanded ? "−" : "+"}</span>
        </button>
        <div class="dashboard-asset-body"${isExpanded ? "" : " hidden"}>
          <em class="dashboard-asset-reason">${escapeHtml(asset.lastMoveReason || "Precio simulado por mercado.")}</em>
          <div class="dashboard-asset-metrics">
            <div><span>Precio</span><strong>${formatMoney(asset.simPrice)}</strong></div>
            <div><span>Dia</span><strong class="${dayClass}">${formatSignedPercent(dayDelta)}</strong></div>
            <div><span>Valor</span><strong>${formatMoney(position.value)}</strong></div>
            <div><span>ROI</span><strong class="${roiClass}">${formatSignedPercent(position.roi)}</strong></div>
            <div><span>Cantidad</span><strong>${formatQuantity(position.quantity)}</strong></div>
            <div><span>Promedio</span><strong>${formatMoney(position.averageCost)}</strong></div>
            <div><span>Resultado</span><strong class="${gainClass}">${formatSignedMoney(position.unrealizedGain)}</strong></div>
            <div><span>Liquidez</span><strong>${formatPercent(asset.liquidity)}</strong></div>
          </div>
          <div class="dashboard-asset-actions">
            <button class="dashboard-asset-action detail" type="button" data-dashboard-asset-action="detail" data-asset-id="${escapeHtml(position.assetId)}">Detalle</button>
            <button class="dashboard-asset-action buy" type="button" data-dashboard-asset-action="buy" data-asset-id="${escapeHtml(position.assetId)}">Comprar</button>
            <button class="dashboard-asset-action sell" type="button" data-dashboard-asset-action="sell" data-asset-id="${escapeHtml(position.assetId)}">Vender</button>
            ${manageButton}
          </div>
        </div>
      `;
      els.dashboardAssetList.appendChild(card);
    });
  }

  function renderPortfolio(assets) {
    if (!player || !els.portfolioList) return;

    const summary = player.getPortfolioSummary(state.portfolio, assets);
    renderDashboardPortfolio(summary);
    els.portfolioValue.textContent = formatMoney(summary.totalValue);
    els.portfolioRoi.textContent = formatSignedPercent(summary.roi);
    els.portfolioRoi.classList.toggle("is-positive", summary.roi >= 0);
    els.portfolioRoi.classList.toggle("is-negative", summary.roi < 0);
    els.portfolioCount.textContent = String(summary.count);
    els.portfolioEmpty.hidden = summary.count > 0;
    els.portfolioList.innerHTML = "";

    summary.positions
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .forEach((position) => {
        const row = document.createElement("div");
        row.className = "portfolio-row";
        row.innerHTML = `
          <div class="portfolio-row-head">
            <strong>${position.asset.ticker || position.asset.name}</strong>
            <strong class="portfolio-value">${formatMoney(position.value)}</strong>
          </div>
          <span>${formatQuantity(position.quantity)} u. / Prom ${formatMoney(position.averageCost)}</span>
          <span class="${position.unrealizedGain >= 0 ? "is-positive" : "is-negative"}">${formatMoney(position.unrealizedGain)} (${formatSignedPercent(position.roi)})</span>
        `;
        els.portfolioList.appendChild(row);
      });

    els.performanceList.innerHTML = "";
    const sorted = summary.positions.slice().sort((a, b) => b.roi - a.roi);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    [best, worst].filter(Boolean).forEach((position, index) => {
      const item = document.createElement("div");
      item.className = "performance-item";
      item.innerHTML = `<span>${index === 0 ? "Mejor" : "Peor"}</span><strong>${position.asset.ticker || position.asset.name} ${formatSignedPercent(position.roi)}</strong>`;
      els.performanceList.appendChild(item);
    });
  }

  function renderBusinesses() {
    const summary = businesses ? businesses.getBusinessSummary(state.businesses) : { businesses: [], count: 0, valuation: 0, cash: 0, equityValue: 0, netIncome: 0, receivables: 0, pendingDividends: 0 };
    const operatedBusinessValue = Number(summary.equityValue ?? summary.valuation) || 0;
    const playerCashAvailable = getAmountLimit(state && state.player && state.player.cash);
    renderBusinessFormAvailability();
    els.businessTotal.textContent = formatMoney(operatedBusinessValue);
    els.businessEmpty.hidden = summary.count > 0;
    els.businessSummary.innerHTML = `
      <div><span>Caja empresas</span><strong>${formatMoney(summary.cash)}</strong></div>
      <div><span>Utilidad mensual</span><strong class="${summary.netIncome >= 0 ? "is-positive" : "is-negative"}">${formatMoney(summary.netIncome)}</strong></div>
      <div><span>Empresas</span><strong>${summary.count}</strong></div>
      <div><span>CxP prov.</span><strong>${formatMoney(summary.payables || 0)}</strong></div>
      <div><span>CxC</span><strong>${formatMoney(summary.receivables || 0)}</strong></div>
      <div><span>Div. pend.</span><strong>${formatMoney(summary.pendingDividends || 0)}</strong></div>
    `;
    els.businessList.innerHTML = "";

    const activeIds = new Set(summary.businesses.map((business) => business.id));
    Array.from(expandedBusinessIds).forEach((businessId) => {
      if (!activeIds.has(businessId)) expandedBusinessIds.delete(businessId);
    });
    Array.from(openBusinessContributionIds).forEach((businessId) => {
      if (!activeIds.has(businessId)) openBusinessContributionIds.delete(businessId);
    });
    Array.from(openBusinessAmountActions.keys()).forEach((businessId) => {
      if (!activeIds.has(businessId)) openBusinessAmountActions.delete(businessId);
    });

    summary.businesses.forEach((business) => {
      const netLabel = business.monthlyPnl && business.monthlyPnl.estimated ? "Neto est." : "Neto";
      const incomeLabel = business.monthlyPnl && business.monthlyPnl.estimated ? "Ingresos est." : "Ingresos";
      const runway = business.monthlyPnl.opex > 0 ? business.cash / business.monthlyPnl.opex : 99;
      const supplierScore = business.suppliers.length
        ? business.suppliers.reduce((sum, supplier) => sum + supplier.reliability, 0) / business.suppliers.length
        : business.suppliersReliability;
      const row = document.createElement("details");
      const businessId = escapeHtml(business.id);
      const businessName = escapeHtml(business.name);
      const sectorLabel = escapeHtml(business.sectorLabel);
      const isExpanded = expandedBusinessIds.has(business.id);
      const isContributionOpen = openBusinessContributionIds.has(business.id);
      const activeAmountAction = openBusinessAmountActions.get(business.id) || "";
      const amountConfig = activeAmountAction ? getBusinessAmountConfig(business, activeAmountAction) : null;
      const supplyStatus = getBusinessSupplyStatus(business);
      row.className = `business-row business-card ${isExpanded ? "is-expanded" : ""}`.trim();
      row.dataset.businessId = business.id;
      row.open = isExpanded;
      row.addEventListener("toggle", () => {
        if (row.open) {
          expandedBusinessIds.add(business.id);
        } else {
          expandedBusinessIds.delete(business.id);
        }
        row.classList.toggle("is-expanded", row.open);
        const toggleLabel = row.querySelector(".business-toggle");
        if (toggleLabel) toggleLabel.textContent = row.open ? "Ocultar gestion" : "Gestionar";
        const chart = row.querySelector("[data-business-trend-chart]");
        if (chart) {
          window.requestAnimationFrame(() => drawBusinessTrendChart(chart, getBusinessTrendInfo(business)));
        }
      });
      const supply = supplyStatus.supply;
      const monthlyPnl = business.monthlyPnl || {};
      const supplyPanelHtml = supply ? `
          <div class="supply-panel ${supplyStatus.className}">
            <div class="supply-panel-head">
              <span>Insumos</span>
              <strong>${escapeHtml(supply.label)}</strong>
              <small>${supplyStatus.label} / ${supplyStatus.coverageLabel}</small>
            </div>
            <div class="supply-grid">
              <div><span>Stock</span><strong>${formatSupplyUnits(supply.stockUnits)} ${escapeHtml(supply.unitLabel)}</strong></div>
              <div><span>Costo unit.</span><strong>${formatMoney(supply.unitCost)}</strong></div>
              <div><span>Necesidad mes</span><strong>${formatSupplyUnits(supply.monthlyNeedUnits)} ${escapeHtml(supply.unitLabel)}</strong></div>
              <div><span>Objetivo</span><strong>${formatSupplyUnits(supply.minStockUnits)} ${escapeHtml(supply.unitLabel)}</strong></div>
              <div><span>Consumido</span><strong>${formatSupplyUnits(monthlyPnl.supplyConsumedUnits || supply.lastConsumedUnits)} ${escapeHtml(supply.unitLabel)}</strong></div>
              <div><span>Merma</span><strong>${formatSupplyUnits(monthlyPnl.supplyWastedUnits || supply.lastWastedUnits)} ${escapeHtml(supply.unitLabel)}</strong></div>
              <div><span>Faltante</span><strong class="${(monthlyPnl.supplyShortageUnits || supply.lastShortageUnits) > 0 ? "is-negative" : "is-positive"}">${formatSupplyUnits(monthlyPnl.supplyShortageUnits || supply.lastShortageUnits)} ${escapeHtml(supply.unitLabel)}</strong></div>
              <div><span>Reposicion auto</span><strong>${formatMoney(monthlyPnl.supplyPurchaseCost || supply.lastPurchaseCost)}</strong></div>
            </div>
          </div>
        ` : "";
      const suppliersHtml = business.suppliers.slice(0, 3).map((supplier) => {
        return `<span><strong>${escapeHtml(supplier.name)}</strong> ${escapeHtml(supplier.contractType)} / CxP ${formatMoney(supplier.payableBalance)} / calidad ${formatPercent(supplier.quality)} / conf. ${formatPercent(supplier.reliability)} / plazo ${supplier.paymentTermsDays}d</span>`;
      }).join("");
      const employeeCount = Math.max(0, Math.floor(Number(business.employees) || 0));
      const requiredEmployees = businesses && typeof businesses.getRequiredEmployees === "function"
        ? businesses.getRequiredEmployees(business)
        : Math.max(1, Math.floor(Number(business.requiredEmployees) || business.units.length * 5));
      const payroll = Number(business.monthlyPnl && business.monthlyPnl.payroll) || employeeCount * (Number(business.salaryPerEmployee) || 0);
      const staffCapacity = employeeCount / Math.max(1, requiredEmployees);
      const staffStatus = staffCapacity >= 1.15
        ? "Plantilla holgada"
        : staffCapacity >= 1
          ? "Operativa normal"
          : employeeCount > 0
            ? "Contratacion parcial"
            : "Sin operar";
      const staffStatusClass = staffCapacity >= 1 ? "is-positive" : "is-negative";
      const businessFeed = Array.isArray(business.newsFeed) ? business.newsFeed.slice(-2).reverse() : [];
      const businessFeedHtml = businessFeed.length
        ? businessFeed.map((item) => `
          <article class="business-news-item ${escapeHtml(item.severity || "info")}">
            <span>Dia ${Number(item.day) || 1} / ${escapeHtml(item.source === "event" ? "Evento" : "Pulso")}</span>
            <strong>${escapeHtml(item.title || "Radar empresarial")}</strong>
            <small>${escapeHtml(item.body || "")}</small>
            ${item.actionHint ? `<small class="business-news-action">Gestion sugerida: ${escapeHtml(item.actionHint)}</small>` : ""}
          </article>
        `).join("")
        : `<article class="business-news-item info"><span>Radar</span><strong>Sin novedades recientes</strong><small>La empresa todavia no emitio alertas o hitos operativos nuevos.</small></article>`;
      const synergy = strategy && typeof strategy.getBusinessSynergy === "function"
        ? strategy.getBusinessSynergy(state, business)
        : { demand: 1, cost: 1, valuation: 1, label: "" };
      const takeover = strategy && typeof strategy.getTakeoverBusinessModifiers === "function"
        ? strategy.getTakeoverBusinessModifiers(state, business)
        : { label: "Sin influencia", stage: "none", demand: 1, cost: 1, valuation: 1 };
      const financialHistory = Array.isArray(business.financialHistory) ? business.financialHistory : [];
      const latestFinance = financialHistory[financialHistory.length - 1] || null;
      const previousFinance = financialHistory[financialHistory.length - 2] || null;
      const netTrend = latestFinance && previousFinance ? latestFinance.netIncome - previousFinance.netIncome : 0;
      const trendInfo = getBusinessTrendInfo(business);
      const contributionSuggestion = playerCashAvailable >= 1000
        ? String(Math.min(Math.max(1000, Math.round(business.valuation * 0.025)), playerCashAvailable))
        : "";
      const contributionPlan = getBusinessMonthlyPlan(business, "contribute");
      const amountCanSchedule = Boolean(amountConfig && MONTHLY_BUSINESS_ACTION_LABELS[activeAmountAction]);
      const amountPlan = amountCanSchedule ? getBusinessMonthlyPlan(business, activeAmountAction) : null;
      row.innerHTML = `
        <summary class="business-head">
          <div class="business-title">
            <strong>${businessName}</strong>
            <span>${sectorLabel} / ${business.units.length} unidades / ${employeeCount} empleados / ${Math.round(business.ownershipPercent * 100)}% propio</span>
          </div>
          <div class="business-quick-stats">
            <div><span>Valor</span><strong>${formatMoney(business.valuation)}</strong></div>
            <div><span>Caja</span><strong>${formatMoney(business.cash)}</strong></div>
            <div><span>${netLabel}</span><strong class="${business.monthlyPnl.netIncome >= 0 ? "is-positive" : "is-negative"}">${formatMoney(business.monthlyPnl.netIncome)}</strong></div>
            <div><span>Runway</span><strong>${runway >= 99 ? "99+" : runway.toFixed(1)}m</strong></div>
            <div class="business-supply ${supplyStatus.className}" title="${escapeHtml(supplyStatus.title)}" aria-label="${escapeHtml(supplyStatus.title)}" style="--supply-fill: ${supplyStatus.fillPercent}%;">
              <span>Insumos</span>
              <strong><i aria-hidden="true"></i>${formatMoney(supplyStatus.inventory)}</strong>
              <small>${supplyStatus.label} / ${supplyStatus.coverageLabel}</small>
              <b aria-hidden="true"><em></em></b>
            </div>
          </div>
          <div class="business-trend-card" title="Historico de valuacion y proyeccion anual segun cierres recientes">
            <div class="business-trend-head">
              <span>Direccion</span>
              <strong class="${trendInfo.className}">${trendInfo.label}</strong>
              <small class="${trendInfo.className}">12m ${formatSignedPercent(trendInfo.annualReturn)}</small>
            </div>
            <canvas class="business-trend-chart" width="260" height="92" data-business-trend-chart="${businessId}" aria-label="Historico y proyeccion anual de ${businessName}"></canvas>
          </div>
          <span class="business-toggle">${isExpanded ? "Ocultar gestion" : "Gestionar"}</span>
        </summary>
        <div class="business-card-body">
          <div class="business-metrics">
            <div><span>Caja</span><strong>${formatMoney(business.cash)}</strong></div>
            <div><span>${incomeLabel}</span><strong>${formatMoney(business.monthlyPnl.revenue)}</strong></div>
            <div><span>${netLabel}</span><strong class="${business.monthlyPnl.netIncome >= 0 ? "is-positive" : "is-negative"}">${formatMoney(business.monthlyPnl.netIncome)}</strong></div>
            <div><span>Insumos</span><strong>${formatMoney(business.inventory)}</strong></div>
            <div><span>CxP prov.</span><strong>${formatMoney(business.payables || 0)}</strong></div>
            <div><span>CxC</span><strong>${formatMoney(business.receivables || 0)}</strong></div>
            <div><span>Div. pend.</span><strong>${formatMoney(business.pendingDividends || 0)}</strong></div>
            <div><span>Confiabilidad</span><strong>${formatPercent(supplierScore)}</strong></div>
            <div><span>I+D</span><strong>${formatMoney(business.rnd || 0)}</strong></div>
            <div><span>Precio medio</span><strong>${formatPercent((business.priceIndex || 1) - 1)}</strong></div>
            <div><span>Franquicias</span><strong>${business.franchiseUnits || 0}</strong></div>
            <div><span>IPO</span><strong>${business.ipo && business.ipo.listed ? "Publica" : "Privada"}</strong></div>
            <div><span>Empleados</span><strong>${employeeCount}</strong></div>
            <div><span>Necesarios</span><strong>${requiredEmployees}</strong></div>
            <div><span>Nomina mes</span><strong>${formatMoney(payroll)}</strong></div>
            <div><span>Moral</span><strong>${formatPercent(business.morale || 0)}</strong></div>
            <div><span>Productividad</span><strong>${formatPercent(business.productivity || 0)}</strong></div>
            <div><span>Sinergia</span><strong>${synergy.label ? escapeHtml(synergy.label) : "Sin red"}</strong></div>
            <div><span>Gobierno</span><strong>${escapeHtml(takeover.label || "Sin influencia")}</strong></div>
            <div><span>Tendencia neta</span><strong class="${netTrend >= 0 ? "is-positive" : "is-negative"}">${formatSignedMoney(netTrend)}</strong></div>
            <div><span>Proy. anual</span><strong class="${trendInfo.className}">${formatSignedPercent(trendInfo.annualReturn)}</strong></div>
            <div><span>Valor 12m</span><strong>${formatMoney(trendInfo.projectedValue)}</strong></div>
          </div>
          <div class="staff-line">
            <span>Plantilla</span>
            <strong>${employeeCount} / ${requiredEmployees} necesarios</strong>
            <span>${formatMoney(business.salaryPerEmployee || 0)} por empleado</span>
            <span class="${staffStatusClass}">${staffStatus}</span>
          </div>
          <div class="staff-line">
            <span>Ubicaciones</span>
            <strong>${business.units.map((unit) => escapeHtml(unit.location)).join(" / ")}</strong>
            <span>Cobro ${formatPercent(Math.min(0.99, Math.max(0, (business.monthlyPnl.receivablesCollected || 0) / Math.max(1, (business.monthlyPnl.receivablesCollected || 0) + (business.receivables || 0)))))}</span>
            <span class="${(business.receivables || 0) > (business.monthlyPnl.revenue || 0) * 0.35 ? "is-negative" : "is-positive"}">${(business.receivables || 0) > (business.monthlyPnl.revenue || 0) * 0.35 ? "Cobro lento" : "Cobro sano"}</span>
          </div>
          <div class="business-news-list">
            ${businessFeedHtml}
          </div>
          ${supplyPanelHtml}
          <div class="supplier-list">
            ${suppliersHtml || "<span>Sin proveedores pendientes.</span>"}
          </div>
          <form class="business-contribution business-money-form ${isContributionOpen ? "active" : ""}" data-business-contribution-panel="${businessId}" ${isContributionOpen ? "" : "hidden"} novalidate>
            <div class="business-money-primary">
              <label for="capital-${businessId}">Inyeccion de capital</label>
              <input id="capital-${businessId}" name="capitalAmount" type="tel" min="1000" max="${playerCashAvailable}" step="1000" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" placeholder="${contributionSuggestion ? `Sugerido ${formatMoney(Number(contributionSuggestion))}` : "Monto a aportar"}" data-money-input="business-contribution" />
              <p class="amount-availability"><span>Disponible personal</span><strong>${formatMoney(playerCashAvailable)}</strong></p>
            </div>
            <div class="monthly-injection-field">
              <label for="capital-monthly-${businessId}">Aporte mensual programado</label>
              <input id="capital-monthly-${businessId}" name="monthlyAmount" type="tel" min="1000" step="1000" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" placeholder="Monto mensual" value="${contributionPlan.active ? Math.round(contributionPlan.amount) : ""}" data-money-input="business-monthly" data-business-monthly-action="contribute" />
              ${getMonthlyPlanStatusHtml(contributionPlan)}
            </div>
            <div class="business-form-actions">
              <button class="btn btn-secondary btn-small" type="button" data-business-contribution-max="${businessId}">Max</button>
              <button class="btn btn-primary btn-small" type="submit">Confirmar aporte</button>
              <button class="btn btn-secondary btn-small" type="button" data-business-contribution-cancel="${businessId}">Cancelar</button>
            </div>
            <div class="monthly-injection-controls">
              <button class="btn btn-secondary btn-small" type="button" data-business-monthly-set="${businessId}" data-business-monthly-action="contribute">${contributionPlan.active ? "Actualizar mensual" : "Activar mensual"}</button>
              ${contributionPlan.active ? `<button class="btn btn-secondary btn-small" type="button" data-business-monthly-pause="${businessId}" data-business-monthly-action="contribute">Pausar mensual</button>` : ""}
            </div>
          </form>
          <form class="business-contribution business-money-form ${amountConfig ? "active" : ""}" data-business-amount-panel="${businessId}" ${amountConfig ? "" : "hidden"} novalidate>
            <input type="hidden" name="businessAction" value="${amountConfig ? activeAmountAction : ""}" />
            <div class="business-money-primary">
              <label for="amount-${businessId}">${escapeHtml(amountConfig ? amountConfig.inputLabel : "Monto")}</label>
              <input id="amount-${businessId}" name="actionAmount" type="tel" min="${amountConfig ? amountConfig.min : 0}" max="${amountConfig ? amountConfig.available : 0}" step="${amountConfig ? amountConfig.step : 1}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" placeholder="${escapeHtml(amountConfig ? amountConfig.inputLabel : "Monto")}" value="${amountConfig ? amountConfig.value : ""}" data-money-input="business-action" />
              ${amountConfig ? `<p class="amount-availability"><span>${escapeHtml(amountConfig.availableLabel)}</span><strong>${formatMoney(amountConfig.available)}</strong></p>` : ""}
            </div>
            ${amountCanSchedule ? `
              <div class="monthly-injection-field">
                <label for="amount-monthly-${businessId}">${escapeHtml(amountPlan.label)}</label>
                <input id="amount-monthly-${businessId}" name="monthlyAmount" type="tel" min="${amountConfig.min}" step="${amountConfig.step}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" placeholder="Monto mensual" value="${amountPlan.active ? Math.round(amountPlan.amount) : ""}" data-money-input="business-monthly" data-business-monthly-action="${escapeHtml(activeAmountAction)}" />
                ${getMonthlyPlanStatusHtml(amountPlan)}
              </div>
            ` : ""}
            <div class="business-form-actions">
              <button class="btn btn-secondary btn-small" type="button" data-business-amount-max="${businessId}" data-business-amount-suggested="${amountConfig ? amountConfig.value : ""}" data-business-amount-available="${amountConfig ? amountConfig.available : 0}">Usar sugerido</button>
              <button class="btn btn-primary btn-small" type="submit">${amountConfig ? amountConfig.buttonLabel : "Confirmar"}</button>
              <button class="btn btn-secondary btn-small" type="button" data-business-amount-cancel="${businessId}">Cancelar</button>
            </div>
            ${amountCanSchedule ? `
              <div class="monthly-injection-controls">
                <button class="btn btn-secondary btn-small" type="button" data-business-monthly-set="${businessId}" data-business-monthly-action="${escapeHtml(activeAmountAction)}">${amountPlan.active ? "Actualizar mensual" : "Activar mensual"}</button>
                ${amountPlan.active ? `<button class="btn btn-secondary btn-small" type="button" data-business-monthly-pause="${businessId}" data-business-monthly-action="${escapeHtml(activeAmountAction)}">Pausar mensual</button>` : ""}
              </div>
            ` : ""}
          </form>
          <div class="business-actions">
            <button type="button" class="${isContributionOpen ? "active" : ""}" data-business-id="${businessId}" data-business-contribute-toggle="${businessId}" aria-expanded="${isContributionOpen}">${isContributionOpen ? "Cerrar aporte" : "Aportar"}</button>
            <button type="button" data-business-id="${businessId}" data-business-action="hire">Contratar</button>
            <button type="button" data-business-id="${businessId}" data-business-action="fire">Despedir</button>
            <button type="button" class="${activeAmountAction === "inventory" ? "active" : ""}" data-business-id="${businessId}" data-business-amount-toggle="inventory" aria-expanded="${activeAmountAction === "inventory"}">Insumos</button>
            <button type="button" class="${activeAmountAction === "supplier_credit" ? "active" : ""}" data-business-id="${businessId}" data-business-amount-toggle="supplier_credit" aria-expanded="${activeAmountAction === "supplier_credit"}">Credito prov.</button>
            <button type="button" data-business-id="${businessId}" data-business-action="supplier_negotiate">Negociar prov.</button>
            <button type="button" data-business-id="${businessId}" data-business-action="pay_supplier">Pagar prov.</button>
            <button type="button" class="${activeAmountAction === "marketing" ? "active" : ""}" data-business-id="${businessId}" data-business-amount-toggle="marketing" aria-expanded="${activeAmountAction === "marketing"}">Marketing</button>
            <button type="button" class="${activeAmountAction === "rnd" ? "active" : ""}" data-business-id="${businessId}" data-business-amount-toggle="rnd" aria-expanded="${activeAmountAction === "rnd"}">I+D</button>
            <button type="button" data-business-id="${businessId}" data-business-action="price_up">Precio +</button>
            <button type="button" data-business-id="${businessId}" data-business-action="price_down">Precio -</button>
            <button type="button" data-business-id="${businessId}" data-business-action="expand">Expandir</button>
            <button type="button" data-business-id="${businessId}" data-business-action="franchise">Franquiciar</button>
            <button type="button" data-business-id="${businessId}" data-business-action="ipo">IPO</button>
            <button type="button" class="${activeAmountAction === "dividend" ? "active" : ""}" data-business-id="${businessId}" data-business-amount-toggle="dividend" aria-expanded="${activeAmountAction === "dividend"}">Dividendos</button>
            <button type="button" data-business-id="${businessId}" data-business-action="sell">Vender</button>
          </div>
        </div>
      `;
      els.businessList.appendChild(row);
      const chart = row.querySelector("[data-business-trend-chart]");
      if (chart) {
        window.requestAnimationFrame(() => drawBusinessTrendChart(chart, trendInfo));
      }
    });
  }

  function renderGoodsCatalog(assets) {
    if (!els.goodsList || !market) return;

    const allAssets = market.getAssetList(assets)
      .filter((asset) => asset.type === "real_estate" || asset.type === "business")
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "real_estate" ? -1 : 1;
        return (Number(a.simPrice) || 0) - (Number(b.simPrice) || 0);
      });
    const query = String(els.goodsSearch.value || "").trim().toLowerCase();
    const filter = els.goodsCategoryFilter.value || "all";
    const sortKey = els.goodsSortFilter ? els.goodsSortFilter.value || "price_desc" : "price_desc";
    const visibleGoods = allAssets.filter((asset) => {
      const kind = getGoodsAssetKind(asset).toLowerCase();
      const matchesFilter =
        filter === "all" ||
        (filter === "colombia" && asset.type === "real_estate" && asset.country === "Colombia") ||
        (filter === "international" && asset.type === "real_estate" && asset.country && asset.country !== "Colombia") ||
        (filter === "real_estate" && asset.type === "real_estate") ||
        (filter === "hotel" && asset.type === "real_estate" && asset.propertyKind === "Hotel") ||
        (filter === "franchise" && asset.type === "business" && asset.acquisitionType === "franchise") ||
        (filter === "acquisition" && asset.type === "business" && asset.acquisitionType !== "franchise");
      const haystack = `${asset.ticker || ""} ${asset.name || ""} ${asset.neighborhood || ""} ${asset.city || ""} ${asset.country || ""} ${asset.region || ""} ${asset.propertyKind || ""} ${asset.categoryLabel || ""} ${asset.sectorLabel || ""} ${asset.acquisitionType || ""} ${kind}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    }).sort((a, b) => {
      const valueDiff = getGoodsSortValue(b, sortKey) - getGoodsSortValue(a, sortKey);
      if (valueDiff !== 0) return valueDiff;
      if (a.type !== b.type) return a.type === "real_estate" ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });

    els.goodsCount.textContent = `${visibleGoods.length}/${allAssets.length}`;
    els.goodsEmpty.hidden = visibleGoods.length > 0;
    els.goodsList.innerHTML = "";
    if (els.goodsSummary) {
      const averageYield = visibleGoods.length
        ? visibleGoods.reduce((sum, asset) => sum + getGoodsAnnualYield(asset), 0) / visibleGoods.length
        : 0;
      els.goodsSummary.innerHTML = `<div><span>Yield prom.</span><strong>${formatPercent(averageYield)}</strong></div>`;
    }

    visibleGoods.forEach((asset) => {
      const ownedQuantity = getOwnedQuantity(asset.id);
      const kind = getGoodsAssetKind(asset);
      const isBusiness = asset.type === "business";
      const metricLabel = isBusiness ? "Utilidad mes" : "Renta mes";
      const metricValue = isBusiness ? asset.monthlyProfit : asset.monthlyRent;
      const costLabel = isBusiness ? "Modelo" : "Neto mes";
      const costValue = isBusiness ? kind : formatMoney((asset.monthlyRent || 0) - (asset.monthlyMaintenance || 0));
      const location = getGoodsLocation(asset);
      const region = asset.neighborhood || asset.region || asset.sectorLabel || asset.categoryLabel || "Operacion";
      const annualYield = getGoodsAnnualYield(asset);
      const ownedLabel = ownedQuantity > 0
        ? (isBusiness && isManagedBusiness(asset.id) ? "Operando" : `${formatQuantity(ownedQuantity)} u.`)
        : "Disponible";
      const mortgageButton = asset.type === "real_estate"
        ? `<button class="goods-action mortgage" type="button" data-good-action="mortgage" data-asset-id="${asset.id}">Hipoteca</button>`
        : "";

      const card = document.createElement("div");
      card.className = `goods-card ${asset.type}`;
      card.innerHTML = `
        <div class="asset-badge" data-category="${asset.type}">
          <span class="category-icon" aria-hidden="true"></span>
          <span class="asset-symbol">${getAssetSymbol(asset)}</span>
        </div>
        <div class="goods-identity">
          <span>${kind} / ${location}</span>
          <strong>${asset.name}</strong>
          <small>${region} / ${asset.lastMoveReason || "Precio simulado"}</small>
          <div class="goods-detail-line">
            <span>${ownedLabel}</span>
            <span>${getGoodsLiquidityLabel(asset)}</span>
            <span>${getGoodsRiskLabel(asset)}</span>
            <span>${formatSignedPercent(asset.dailyChangePercent || 0)}</span>
          </div>
        </div>
        <div class="goods-metrics">
          <div><span>Precio</span><strong>${formatMoney(asset.simPrice)}</strong></div>
          <div><span>${metricLabel}</span><strong>${formatMoney(metricValue || 0)}</strong></div>
          <div><span>${costLabel}</span><strong>${costValue}</strong></div>
          <div><span>Yield anual</span><strong class="${annualYield >= 0 ? "is-positive" : "is-negative"}">${formatPercent(annualYield)}</strong></div>
        </div>
        <div class="goods-actions">
          <button class="goods-action detail" type="button" data-good-action="detail" data-asset-id="${asset.id}">Detalle</button>
          <button class="goods-action buy" type="button" data-good-action="buy" data-asset-id="${asset.id}">Comprar</button>
          ${mortgageButton}
          <button class="goods-action sell" type="button" data-good-action="sell" data-asset-id="${asset.id}" ${ownedQuantity <= 0 ? "disabled" : ""}>Vender</button>
          ${isBusiness && ownedQuantity > 0 ? `<button class="goods-action manage" type="button" data-good-action="manage-business" data-asset-id="${asset.id}">Gestionar</button>` : ""}
          ${asset.type === "real_estate" && ownedQuantity > 0 ? `<button class="goods-action manage" type="button" data-good-action="manage-property" data-asset-id="${asset.id}">Operar</button>` : ""}
        </div>
      `;
      els.goodsList.appendChild(card);
    });
  }

  function renderPropertySaleOffers(position) {
    const offers = player.getRealEstateSaleOffers
      ? player.getRealEstateSaleOffers(state, position.assetId)
      : [];

    const offersHtml = offers.length
      ? offers.map((offer) => {
        const gainClass = offer.realizedGain >= 0 ? "is-positive" : "is-negative";
        const debtLine = offer.mortgagePayoff > 0
          ? `<span>Hipoteca a cancelar ${formatMoney(offer.mortgagePayoff)}${offer.debtShortfall > 0 ? ` / saldo ${formatMoney(offer.debtShortfall)}` : ""}</span>`
          : "";
        return `
          <article class="property-offer-card">
            <div>
              <span>${escapeHtml(offer.buyerLabel)}</span>
              <strong>${escapeHtml(offer.buyerName)}</strong>
              <small>Precio vs mercado ${formatSignedPercent(offer.premium)}</small>
            </div>
            <div class="property-offer-metrics">
              <div><span>Oferta</span><strong>${formatMoney(offer.gross)}</strong></div>
              <div><span>Recibes</span><strong>${formatMoney(offer.total)}</strong></div>
              <div><span>Ganancia</span><strong class="${gainClass}">${formatSignedMoney(offer.realizedGain)}</strong></div>
            </div>
            <small>Comision ${formatMoney(offer.fees)} / Impuestos ${formatMoney(offer.taxes)}</small>
            ${debtLine}
            <button type="button" data-property-sale-offer="${escapeHtml(offer.id)}" data-asset-id="${escapeHtml(position.assetId)}">Vender a este comprador</button>
          </article>
        `;
      }).join("")
      : `<p class="property-offer-empty">Sin compradores activos para este inmueble.</p>`;

    return `
      <details class="property-sale-panel">
        <summary>Vender inmueble</summary>
        <div class="property-offer-list">
          <div class="property-offer-intro">
            <strong>Compradores interesados</strong>
            <span>Compara oferta, impuestos y efectivo neto antes de cerrar.</span>
          </div>
          ${offersHtml}
        </div>
      </details>
    `;
  }

  function renderRealEstate(assets) {
    renderGoodsCatalog(assets);

    const summary = player.getRealEstateSummary
      ? player.getRealEstateSummary(state)
      : {
        positions: player.getDecoratedPositions(state.portfolio, state.assets).filter((position) => position.asset.type === "real_estate"),
        projections: [],
        value: 0,
        gross: 0,
        costs: 0,
        net: 0,
        averageOccupancy: 0,
        hotels: 0
      };
    const propertyUnits = summary.positions.reduce((sum, position) => sum + (Number(position.quantity) || 0), 0);

    els.realestateEmpty.hidden = summary.positions.length > 0;
    els.realestateSummary.innerHTML = `
      <div><span>Valor</span><strong>${formatMoney(summary.value)}</strong></div>
      <div><span>Ingresos mes</span><strong>${formatMoney(summary.gross)}</strong></div>
      <div><span>Costos mes</span><strong>${formatMoney(summary.costs)}</strong></div>
      <div><span>Neto mes</span><strong class="${summary.net >= 0 ? "is-positive" : "is-negative"}">${formatMoney(summary.net)}</strong></div>
      <div><span>Inmuebles</span><strong>${summary.positions.length}</strong></div>
      <div><span>Unidades</span><strong>${formatQuantity(propertyUnits)}</strong></div>
      <div><span>Ocupacion</span><strong>${formatPercent(summary.averageOccupancy)}</strong></div>
      <div><span>Hoteles</span><strong>${summary.hotels}</strong></div>
    `;
    els.realestateList.innerHTML = "";
    summary.projections.forEach(({ position, metrics }) => {
      const op = metrics.operation;
      const row = document.createElement("div");
      row.className = "realestate-row property-card";
      row.innerHTML = `
        <div class="property-head">
          <div>
            <strong>${position.asset.name}</strong>
            <span>${position.asset.city || "Ciudad"} / ${position.asset.propertyKind || "Propiedad"} / ${formatQuantity(position.quantity)} u.</span>
          </div>
          <strong>${formatMoney(position.value)}</strong>
        </div>
        <div class="property-metrics">
          <div><span>Ingreso bruto</span><strong>${formatMoney(metrics.gross)}</strong></div>
          <div><span>Costos</span><strong>${formatMoney(metrics.costs)}</strong></div>
          <div><span>Neto estimado</span><strong class="${metrics.net >= 0 ? "is-positive" : "is-negative"}">${formatMoney(metrics.net)}</strong></div>
          <div><span>Ocupacion</span><strong>${formatPercent(metrics.occupancy)}</strong></div>
          <div><span>Condicion</span><strong>${formatPercent(op.condition)}</strong></div>
          <div><span>Servicio</span><strong>${formatPercent(op.serviceLevel)}</strong></div>
          <div><span>Renta/precio</span><strong>${formatPercent(op.rentIndex - 1)}</strong></div>
          <div><span>Ultimo neto</span><strong class="${op.lastNet >= 0 ? "is-positive" : "is-negative"}">${formatMoney(op.lastNet)}</strong></div>
        </div>
        <div class="property-actions">
          <button type="button" data-property-action="renovate" data-asset-id="${position.assetId}">Renovar</button>
          <button type="button" data-property-action="maintenance" data-asset-id="${position.assetId}">Mantenimiento</button>
          <button type="button" data-property-action="marketing" data-asset-id="${position.assetId}">Marketing</button>
          <button type="button" data-property-action="manager" data-asset-id="${position.assetId}">Gestion pro</button>
          <button type="button" data-property-action="price_up" data-asset-id="${position.assetId}">Renta +</button>
          <button type="button" data-property-action="price_down" data-asset-id="${position.assetId}">Renta -</button>
        </div>
        ${renderPropertySaleOffers(position)}
      `;
      els.realestateList.appendChild(row);
    });
  }

  function renderBankAndTaxes() {
    const summary = bank ? bank.getBankSummary(state) : { creditScore: 700, borrowingCapacity: 0, debtTotal: 0, depositTotal: 0, debts: [], deposits: [] };
    const taxSummary = taxes ? taxes.getTaxSummary(state.taxes) : state.taxes;
    const businessList = Array.isArray(state.businesses) ? state.businesses : [];

    els.bankSummary.innerHTML = `
      <div><span>Score</span><strong>${summary.creditScore}</strong></div>
      <div><span>Capacidad</span><strong>${formatMoney(summary.borrowingCapacity)}</strong></div>
      <div><span>Deuda</span><strong>${formatMoney(summary.debtTotal)}</strong></div>
      <div><span>Plazos</span><strong>${formatMoney(summary.depositTotal)}</strong></div>
      <div><span>Impuestos</span><strong>${formatMoney(taxSummary.taxesPaid)}</strong></div>
      <div><span>Riesgo audit.</span><strong>${formatPercent(taxSummary.auditRisk || 0)}</strong></div>
    `;
    if (els.bankAvailability) {
      els.bankAvailability.innerHTML = `
        <span>Efectivo disponible</span><strong>${formatMoney(state.player && state.player.cash)}</strong>
        <span>Capacidad credito</span><strong>${formatMoney(summary.borrowingCapacity)}</strong>
      `;
    }
    els.taxStrategy.textContent = `Plan fiscal: ${taxSummary.strategy}`;
    if (els.bankBusinessTarget) {
      const previousValue = els.bankBusinessTarget.value;
      els.bankBusinessTarget.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = businessList.length ? "Empresa destino" : "Sin empresas operativas";
      els.bankBusinessTarget.appendChild(placeholder);

      businessList.forEach((business) => {
        const option = document.createElement("option");
        option.value = business.id;
        option.textContent = `${business.name} / Caja ${formatMoney(business.cash)}`;
        els.bankBusinessTarget.appendChild(option);
      });

      els.bankBusinessTarget.disabled = businessList.length === 0;
      if (businessList.some((business) => business.id === previousValue)) {
        els.bankBusinessTarget.value = previousValue;
      } else if (businessList.length === 1) {
        els.bankBusinessTarget.value = businessList[0].id;
      } else {
        els.bankBusinessTarget.value = "";
      }
    }
    els.debtList.innerHTML = "";

    summary.debts.slice(0, 5).forEach((debt) => {
      const row = document.createElement("div");
      row.className = "debt-row";
      const owner = debt.type === "business_credit" && debt.businessId
        ? (businessList.find((business) => business.id === debt.businessId) || {}).name || "Empresa"
        : "Jugador";
      row.innerHTML = `<span>${debt.label} / ${owner}</span><strong>${formatMoney(debt.balance)} / ${formatPercent(debt.annualRate)}</strong>`;
      els.debtList.appendChild(row);
    });

    summary.deposits.slice(0, 5).forEach((deposit) => {
      const row = document.createElement("div");
      row.className = "debt-row";
      row.innerHTML = `<span>${deposit.label}</span><strong>${formatMoney(deposit.principal)} / ${deposit.remainingDays}d</strong>`;
      els.debtList.appendChild(row);
    });
  }

  function renderNews() {
    const summary = events ? events.getNewsSummary(state.events) : { unread: 0, latest: [], ticker: [] };
    els.newsUnread.textContent = String(summary.unread);
    els.newsEmpty.hidden = summary.latest.length > 0;
    els.newsList.innerHTML = "";
    summary.latest.forEach((item) => {
      const row = document.createElement("button");
      row.className = `news-item ${item.severity} ${item.read ? "read" : ""}`.trim();
      row.type = "button";
      row.dataset.newsId = item.id;
      const summaryText = getPublicNewsSummary(item.summary);
      row.innerHTML = `
        <span>Dia ${item.day}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(summaryText)}</small>
      `;
      els.newsList.appendChild(row);
    });
    els.newsTickerText.textContent = summary.ticker.length ? summary.ticker.join("  |  ") : "Sin titulares.";
  }

  function renderAchievements() {
    const list = achievements ? achievements.getAchievementList(state.achievements) : [];
    const unlocked = list.filter((item) => item.unlocked).length;
    els.achievementCount.textContent = `${unlocked}/${list.length}`;
    els.achievementList.innerHTML = "";
    list.slice(0, 12).forEach((item) => {
      const row = document.createElement("div");
      row.className = `achievement-row ${item.unlocked ? "unlocked" : ""}`;
      row.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <span>${item.description}</span>
        </div>
        <small>${Math.round((item.progress.ratio || 0) * 100)}%</small>
      `;
      els.achievementList.appendChild(row);
    });
  }

  function renderActivity() {
    els.activityList.innerHTML = "";
    state.activity.slice(-8).reverse().forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `Dia ${item.day}: ${getPublicNewsSummary(item.text)}`;
      els.activityList.appendChild(li);
    });
  }

  function closeTurnSummary() {
    if (els.turnSummary) els.turnSummary.hidden = true;
  }

  function showTurnSummary(summary) {
    if (!els.turnSummary || !summary) return;
    els.turnRange.textContent = `Dias ${summary.fromDay} a ${summary.toDay}`;
    els.turnTitle.textContent = `Turno +${summary.days}d cerrado`;
    els.turnNet.textContent = formatSignedMoney(summary.netWorthDelta);
    els.turnCash.textContent = formatSignedMoney(summary.cashDelta);
    els.turnIncome.textContent = formatSignedMoney(summary.cashflowDelta);
    els.turnEvents.textContent = String(summary.eventCount);
    els.turnNet.classList.toggle("is-positive", summary.netWorthDelta >= 0);
    els.turnNet.classList.toggle("is-negative", summary.netWorthDelta < 0);
    els.turnCash.classList.toggle("is-positive", summary.cashDelta >= 0);
    els.turnCash.classList.toggle("is-negative", summary.cashDelta < 0);
    els.turnIncome.classList.toggle("is-positive", summary.cashflowDelta >= 0);
    els.turnIncome.classList.toggle("is-negative", summary.cashflowDelta < 0);
    els.turnHighlights.innerHTML = "";

    const highlights = summary.highlights.length
      ? summary.highlights
      : ["Sin eventos nuevos: el imperio mantiene su curso."];

    highlights.slice(0, 4).forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      els.turnHighlights.appendChild(li);
    });

    els.turnSummary.hidden = false;
    if (!prefersReducedMotion()) {
      els.turnSummary.classList.remove("summary-enter");
      void els.turnSummary.offsetWidth;
      els.turnSummary.classList.add("summary-enter");
    }
  }

  function render(options) {
    if (!state) return;
    const macro = ensureMacro();
    const assets = ensureAssets();
    ensureExtendedState();

    els.hudPlayerName.textContent = state.player.name;
    renderPlayerAvatar();
    els.hudDay.textContent = `Dia ${state.time.day}`;
    els.hudCash.textContent = formatHudMoney(state.player.cash);
    els.hudCash.setAttribute("title", formatMoney(state.player.cash));
    els.hudNetWorth.textContent = formatHudMoney(state.player.netWorth);
    els.hudNetWorth.setAttribute("title", formatMoney(state.player.netWorth));
    const progress = getPlayerProgressProfile();
    const cashflow30 = getCashflowSince(30);
    els.hudLevel.textContent = `Nivel ${progress.level}`;
    els.hudRank.textContent = progress.rank;
    els.hudXpFill.style.width = `${progress.xpPercent}%`;
    els.hudXpLabel.textContent = `${progress.xpPercent}% XP a ${formatCompactNumber(progress.nextGoal)}`;
    els.hudCashflow.textContent = formatHudMoney(cashflow30);
    els.hudCashflow.setAttribute("title", formatMoney(cashflow30));
    els.hudCashflow.classList.toggle("is-positive", cashflow30 >= 0);
    els.hudCashflow.classList.toggle("is-negative", cashflow30 < 0);
    if (els.nextDecision) els.nextDecision.textContent = getNextDecisionText();
    els.menuPlayerName.textContent = state.player.name;
    els.saveStatus.textContent = `Slot ${currentSlot} / ${formatDateTime(state.updatedAt)}`;
    els.summaryDifficulty.textContent = titleCase(state.player.difficulty);
    els.summaryStartingCash.textContent = formatMoney(state.player.initialBudget);
    els.summaryLastSave.textContent = formatCompactDateTime(state.updatedAt);
    els.summaryLastSave.setAttribute("title", formatDateTime(state.updatedAt));
    if (!options || !options.skipChrono) renderChrono();

    renderMacro(macro);
    renderOnboarding();
    applyViewVisibility();
    renderCommand();
    renderStrategyRadar();
    renderEmpireVisual();
    renderMarket(assets);
    renderWatchlist();
    renderPortfolio(assets);
    renderBusinesses();
    renderRealEstate(assets);
    renderBankAndTaxes();
    renderHedges();
    renderNews();
    renderAchievements();
    renderLegacy();
    renderActivity();
    renderMessages();
  }

  function getAssetDetailRows(asset, position) {
    const quantity = position ? position.quantity : 0;
    const value = position ? position.value : 0;
    const roi = position ? position.roi : 0;
    const passiveIncome = asset.dividendYield || asset.couponYield || asset.stakingYield || getGoodsAnnualYield(asset);

    return [
      { label: "Precio", value: formatMoney(asset.simPrice) },
      { label: "Cambio", value: formatSignedPercent(asset.dailyChangePercent), className: asset.dailyChangePercent >= 0 ? "is-positive" : "is-negative" },
      { label: "Tenencia", value: formatQuantity(quantity) },
      { label: "Valor posicion", value: formatMoney(value) },
      { label: "Costo prom.", value: position ? formatMoney(position.averageCost) : "-" },
      { label: "ROI", value: position ? formatSignedPercent(roi) : "0.0%", className: roi >= 0 ? "is-positive" : "is-negative" },
      { label: "Liquidez", value: formatPercent(asset.liquidity) },
      { label: "Ingreso anual", value: formatPercent(passiveIncome || 0) }
    ];
  }

  function openAssetDetail(assetId) {
    if (!state || !state.assets || !state.assets[assetId] || !els.assetDetailModal) return;
    const asset = state.assets[assetId];
    const position = player && player.getDecoratedPositions
      ? player.getDecoratedPositions(state.portfolio, state.assets).find((item) => item.assetId === assetId)
      : null;
    const rows = getAssetDetailRows(asset, position);

    els.assetDetailKicker.textContent = `${asset.categoryLabel || "Activo"} / ${asset.ticker || getAssetSymbol(asset)}`;
    els.assetDetailTitle.textContent = asset.name;
    els.assetDetailSubtitle.textContent = asset.lastMoveReason || "Precio simulado por macro, sector, liquidez y ruido.";
    els.assetDetailMetrics.innerHTML = rows.map((row) => `
      <div>
        <span>${row.label}</span>
        <strong class="${row.className || ""}">${row.value}</strong>
      </div>
    `).join("");
    els.assetDetailPosition.innerHTML = position
      ? `<strong>Posicion abierta</strong><span>${formatQuantity(position.quantity)} u. / valor ${formatMoney(position.value)} / resultado ${formatMoney(position.unrealizedGain)}</span>`
      : "<strong>Sin posicion</strong><span>Analiza el grafico, liquidez y ultimo movimiento antes de comprar.</span>";
    els.assetDetailBuy.dataset.assetId = assetId;
    els.assetDetailSell.dataset.assetId = assetId;
    els.assetDetailSell.disabled = !position || position.quantity <= 0;
    els.assetDetailModal.hidden = false;
    window.requestAnimationFrame(() => drawLineChart(els.assetDetailChart, asset.history || [], "price"));
  }

  function closeAssetDetail() {
    if (!els.assetDetailModal) return;
    els.assetDetailModal.hidden = true;
    els.assetDetailBuy.dataset.assetId = "";
    els.assetDetailSell.dataset.assetId = "";
  }

  function updateTradeAvailability(estimate) {
    if (!els.tradeAvailable || !tradeDraft) return;
    const asset = state && state.assets ? state.assets[tradeDraft.assetId] : null;
    const owned = getOwnedQuantity(tradeDraft.assetId);

    if (els.tradeOwnedLabel) {
      els.tradeOwnedLabel.textContent = tradeDraft.side === "buy" ? "Tenencia" : "Disponible venta";
    }

    if (tradeDraft.side === "buy") {
      const cash = Math.max(0, Number(state.player && state.player.cash) || 0);
      let maxLabel = "";
      if (els.tradeQuantity) els.tradeQuantity.max = "";
      if (estimate && estimate.ok && estimate.quantity > 0 && estimate.total > 0) {
        const step = asset && player ? player.getQuantityStep(asset) : 1;
        const unitCost = estimate.total / estimate.quantity;
        const maxUnits = unitCost > 0 ? Math.floor(cash / unitCost / step) * step : 0;
        if (els.tradeQuantity) els.tradeQuantity.max = maxUnits > 0 ? String(maxUnits) : "";
        maxLabel = maxUnits > 0 ? `<span>Max aprox.</span><strong>${formatQuantity(maxUnits)}</strong>` : "";
      }
      els.tradeAvailable.innerHTML = `<span>Presupuesto compra</span><strong>${formatMoney(cash)}</strong>${maxLabel}`;
      return;
    }

    if (els.tradeQuantity) els.tradeQuantity.max = String(owned);
    els.tradeAvailable.innerHTML = `<span>Disponible para vender</span><strong>${formatQuantity(owned)}</strong>`;
  }

  function resetTradeEstimate() {
    els.tradePrice.textContent = "$0";
    els.tradeGross.textContent = "$0";
    els.tradeFees.textContent = "$0";
    els.tradeTaxes.textContent = "$0";
    els.tradeTotal.textContent = "$0";
    els.tradeError.textContent = "";
    if (els.tradeImpact) els.tradeImpact.textContent = "";
    updateTradeAvailability(null);
  }

  function updateTradeEstimate() {
    if (!tradeDraft || !player) return;
    const estimate = player.estimateTrade(state, tradeDraft.assetId, els.tradeQuantity.value, tradeDraft.side);
    updateTradeAvailability(estimate);

    if (!estimate.ok) {
      resetTradeEstimate();
      els.tradeError.textContent = estimate.message;
      els.tradeConfirm.disabled = true;
      return;
    }

    els.tradePrice.textContent = formatMoney(estimate.unitPrice);
    els.tradeGross.textContent = formatMoney(estimate.gross);
    els.tradeFees.textContent = formatMoney(estimate.fees);
    els.tradeTaxes.textContent = formatMoney(estimate.taxes);
    els.tradeTotal.textContent = formatMoney(estimate.total);
    els.tradeError.textContent = "";
    if (els.tradeImpact) {
      const feeDiscount = estimate.feeModifier && estimate.feeModifier < 0.995
        ? ` Descuento de broker ${formatPercent(1 - estimate.feeModifier)}.`
        : "";
      const cashAfter = tradeDraft.side === "buy"
        ? state.player.cash - estimate.total
        : state.player.cash + estimate.total;
      const risk = strategy && strategy.getRiskProfile ? strategy.getRiskProfile(state) : null;
      els.tradeImpact.textContent = `Caja estimada despues: ${formatMoney(cashAfter)}.${feeDiscount}${risk ? ` Radar actual: ${risk.label}.` : ""}`;
    }

    if (tradeDraft.side === "buy" && state.player.cash < estimate.total) {
      els.tradeError.textContent = "Efectivo insuficiente.";
      els.tradeConfirm.disabled = true;
      return;
    }

    els.tradeConfirm.disabled = false;
  }

  function openTradeModal(assetId, side) {
    if (!state || !player || !state.assets[assetId]) return;
    const asset = state.assets[assetId];
    const owned = getOwnedQuantity(assetId);
    const step = player.getQuantityStep(asset);
    tradeDraft = { assetId, side };

    els.tradeMode.textContent = side === "buy" ? "Compra" : "Venta";
    els.tradeTitle.textContent = `${side === "buy" ? "Comprar" : "Vender"} ${asset.ticker || asset.name}`;
    els.tradeSubtitle.textContent = `${asset.name} / ${asset.categoryLabel} / ${asset.sectorLabel}`;
    if (els.tradeOwnedLabel) els.tradeOwnedLabel.textContent = side === "buy" ? "Tenencia" : "Disponible venta";
    els.tradeOwned.textContent = formatQuantity(owned);
    els.tradeQuantity.step = String(step);
    els.tradeQuantity.min = String(step);
    els.tradeQuantity.max = side === "sell" ? String(owned) : "";
    els.tradeQuantity.value = side === "sell" && owned > 0 ? String(Math.min(owned, step)) : String(step);
    els.tradeModal.hidden = false;
    updateTradeEstimate();
    window.setTimeout(() => focusAmountInput(els.tradeQuantity), 0);
  }

  function closeTradeModal() {
    tradeDraft = null;
    els.tradeModal.hidden = true;
    els.tradeForm.reset();
    resetTradeEstimate();
    els.tradeConfirm.disabled = false;
  }

  function handleAchievementUnlocks() {
    if (!achievements) return;
    const unlocked = achievements.checkAchievements(state);
    unlocked.forEach((item) => {
      const bonusText = item.bonus && item.bonus.cash ? ` Bono: ${formatMoney(item.bonus.cash)}.` : "";
      pushActivity(`Logro desbloqueado: ${item.name}.${bonusText}`);
      pushMessage({
        key: `achievement:${item.id}`,
        category: "milestone",
        title: `Hito completado: ${item.name}`,
        body: item.bonus && item.bonus.cash
          ? `Recibiste ${formatMoney(item.bonus.cash)} en tu cuenta personal.`
          : "Nuevo hito registrado en tu progreso."
      });
      showToast(`Logro desbloqueado: ${item.name}`, "success");
    });
  }

  function updateCloudStatus(message) {
    const config = cloudSync && typeof cloudSync.readConfig === "function" ? cloudSync.readConfig() : null;
    if (els.cloudStatus) {
      els.cloudStatus.textContent = config
        ? `Nube conectada: ${config.handle}`
        : "Nube desconectada";
    }
    if (els.cloudPassphraseStatus) {
      els.cloudPassphraseStatus.textContent = config && config.passphrase
        ? `Clave sync: ${config.passphrase}`
        : "Clave sync: no guardada";
    }
  }

  function promptCloudCredentials() {
    if (!cloudSync) {
      showToast("Modulo de nube no disponible.", "error");
      return null;
    }

    const current = cloudSync.readConfig && cloudSync.readConfig();
    const handle = window.prompt("Handle de nube (mismo en web y APK):", current && current.handle ? current.handle : "");
    if (!handle) return null;
    const passphrase = window.prompt("Clave de sincronizacion:", current && current.passphrase ? current.passphrase : "");
    if (!passphrase) return null;
    const suggestedBaseUrl = current && current.baseUrl ? current.baseUrl : cloudSync.DEFAULT_BASE_URL;
    const baseUrl = window.prompt("URL del servidor sync:", suggestedBaseUrl);
    if (!baseUrl) return null;

    return { handle, passphrase, baseUrl };
  }

  async function connectCloudAccount() {
    const credentials = promptCloudCredentials();
    if (!credentials) return false;

    try {
      const result = await cloudSync.connect(credentials);
      updateCloudStatus(result.created ? "Cuenta nube creada y conectada." : "Cuenta nube conectada.");
      showToast(result.created ? "Cuenta nube creada." : "Cuenta nube conectada.", "success");
      return true;
    } catch (error) {
      console.error(error);
      updateCloudStatus(error.message || "No se pudo conectar la nube.");
      showToast(error.message || "No se pudo conectar la nube.", "error");
      return false;
    }
  }

  async function pushCurrentSlotToCloud(options) {
    if (!cloudSync) return false;
    if (!state) {
      showToast("No hay partida activa para sincronizar.", "error");
      return false;
    }

    const silent = Boolean(options && options.silent);
    if (!cloudSync.readConfig || !cloudSync.readConfig()) {
      const connected = await connectCloudAccount();
      if (!connected) return false;
    }

    try {
      await cloudSync.pushSlot(currentSlot, state);
      updateCloudStatus(`Slot ${currentSlot} sincronizado en nube.`);
      if (!silent) showToast(`Slot ${currentSlot} subido a nube.`, "success");
      return true;
    } catch (error) {
      console.error(error);
      updateCloudStatus(error.message || "No se pudo subir el slot a nube.");
      if (!silent) showToast(error.message || "No se pudo subir el slot a nube.", "error");
      return false;
    }
  }

  async function pullCloudSlotToCurrent() {
    if (!cloudSync) return;
    if (!cloudSync.readConfig || !cloudSync.readConfig()) {
      const connected = await connectCloudAccount();
      if (!connected) return;
    }

    try {
      const payload = await cloudSync.pullSlot(currentSlot);
      const normalized = storage.normalizeState(payload.state);
      if (!normalized) {
        throw new Error("El save remoto llego invalido o incompleto.");
      }

      state = storage.save(normalized, currentSlot);
      render();
      updateLoadButton();
      updateCloudStatus(`Slot ${currentSlot} traido desde nube.`);
      showToast(`Slot ${currentSlot} cargado desde nube.`, "success");
      if (els.cloudSetupStatus) els.cloudSetupStatus.textContent = `Slot ${currentSlot} remoto listo para jugar.`;
    } catch (error) {
      console.error(error);
      updateCloudStatus(error.message || "No se pudo traer el slot remoto.");
      showToast(error.message || "No se pudo traer el slot remoto.", "error");
    }
  }

  function persist(message, slot, options) {
    try {
      const rewardedMissions = applyOnboardingRewards();
      rewardedMissions.forEach((mission) => {
        pushActivity(`Contrato completado: ${mission.label}. Recompensa ${mission.reward}.`);
        pushMessage({
          key: `mission:${mission.id}:reward`,
          category: "bonus",
          title: `Bonificacion: ${mission.label}`,
          body: `${mission.reward} acreditado a tu efectivo personal. La caja de tus empresas no se modifica.`
        });
        showToast(`Contrato completado: ${mission.label}`, "success");
      });
      if (strategy && typeof strategy.evaluateContracts === "function") {
        const strategyRewards = strategy.evaluateContracts(state);
        strategyRewards.forEach((contract) => {
          pushActivity(`Contrato semanal completado: ${contract.title}. Recompensa ${formatMoney(contract.rewardCash)} y +${contract.rewardPower} poder.`);
          pushMessage({
            key: `strategy-contract:${contract.id}`,
            category: "bonus",
            title: `Contrato semanal: ${contract.title}`,
            body: `Recibiste ${formatMoney(contract.rewardCash)} y +${contract.rewardPower} poder de ciudad.`
          });
          showToast(`Contrato semanal completado: ${contract.title}`, "success");
        });
      }
      handleAchievementUnlocks();
      syncAlertMessages();
      state = storage.save(state, slot || currentSlot);
      render({ skipChrono: Boolean(options && options.chronoFrom) });
      if (options && options.chronoFrom) {
        animateChrono(options.chronoFrom, getChronoDateTime(), options.chronoLabel);
      }
      updateLoadButton();
      updateCloudStatus();
      if (cloudSync && cloudSync.readConfig && cloudSync.readConfig()) {
        pushCurrentSlotToCloud({ silent: true });
      }
      if (message) showToast(message);
    } catch (error) {
      console.error(error);
      showToast("No se pudo guardar la partida en este dispositivo.", "error");
    }
  }

  function confirmTrade(event) {
    event.preventDefault();
    if (!tradeDraft || !player) return;

    const action = tradeDraft.side === "sell" ? player.sellAsset : player.buyAsset;
    const result = action(state, tradeDraft.assetId, els.tradeQuantity.value);

    if (!result.ok) {
      els.tradeError.textContent = result.message || "No se pudo completar la operacion.";
      updateTradeEstimate();
      return;
    }

    if (tradeDraft.side === "buy" && result.estimate.asset.type === "business" && businesses) {
      const business = businesses.createFromAsset(state, tradeDraft.assetId);
      if (business) pushActivity(`${business.name} queda operativa con caja separada.`);
    }

    pushActivity(`${result.message} Total: ${formatMoney(result.estimate.total)}.`);
    closeTradeModal();
    persist(result.message);
  }

  function handleMortgage(assetId) {
    if (!bank) return;
    const result = bank.buyPropertyWithMortgage(state, assetId);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    pushActivity(result.message);
    persist(result.message);
  }

  function startGame(event) {
    event.preventDefault();
    if (isTransitioning) return;
    if (!validateSetup()) return;

    setSetupBusy(true);
    currentSlot = Number(els.loadSlot.value || 1);
    state = storage.createInitialState({
      playerName: els.playerName.value,
      initialBudget: parseMoneyInput(els.initialBudget.value),
      difficulty: selectedDifficulty,
      avatarId: selectedAvatarId,
      scenario: selectedScenario
    });
    setChronoSpeed(0);
    persist("Partida creada y guardada.");
    setScreen("game", { animate: true });
    scheduleWelcomeGuide();
  }

  function loadGame() {
    if (isTransitioning) return;
    currentSlot = Number(els.loadSlot.value || 1);
    const savedState = storage.load(currentSlot);
    if (!savedState) {
      showToast("No se encontro una partida guardada valida en ese slot.", "error");
      updateLoadButton();
      return;
    }
    setSetupBusy(true);
    state = savedState;
    selectedAvatarId = getAvatarId(state.player.avatarId);
    selectedScenario = state.strategy && state.strategy.scenario ? state.strategy.scenario : "free";
    renderAvatarSelection();
    renderScenarioSelection();
    setChronoSpeed(0);
    render();
    setScreen("game", { animate: true });
    scheduleWelcomeGuide();
    showToast(`Partida cargada desde slot ${currentSlot}.`);
  }

  function resetGame() {
    const confirmed = window.confirm("Seguro que quieres reiniciar la partida? Se borraran los guardados locales y empezaras desde cero.");
    if (!confirmed) return;

    cancelChronoAnimation();
    setChronoSpeed(0);
    storage.clear();
    state = null;
    els.setupForm.reset();
    els.initialBudget.value = "100000";
    selectedDifficulty = "facil";
    selectedAvatarId = "man-suit";
    selectedScenario = "free";
    currentSlot = 1;
    els.difficultyButtons.forEach((button) => button.classList.toggle("active", button.dataset.difficulty === selectedDifficulty));
    renderAvatarSelection();
    renderScenarioSelection();
    closeUserMenu();
    closeMessageCenter();
    if (els.welcomeGuide) els.welcomeGuide.hidden = true;
    closeTradeModal();
    closeAssetDetail();
    closeTurnSummary();
    expandedBusinessIds.clear();
    openBusinessContributionIds.clear();
    openBusinessAmountActions.clear();
    updateLoadButton();
    setScreen("setup");
    showToast("Partidas reiniciadas.");
  }

  function tickDay() {
    const previousPhase = state.macro && state.macro.phase;

    state.time.day += 1;
    const dayEventImpact = events && typeof events.prepareDay === "function" ? events.prepareDay(state) : null;
    if (economy) {
      state.macro = economy.tickMacro(state.macro, 1, { difficulty: state.player.difficulty, eventImpact: dayEventImpact });
    }
    if (market) {
      state.assets = market.tickMarketDay(state.assets, state.macro, {
        day: state.time.day,
        difficulty: state.player.difficulty,
        eventImpact: dayEventImpact
      });
    }

    const entries = [];
    if (businesses) {
      const businessEntries = businesses.processDailyBusinesses(state, dayEventImpact);
      businessEntries.forEach((entry) => {
        if (Array.isArray(entry.messages)) entry.messages.forEach((message) => pushBusinessPulseMessage(message));
      });
      entries.push(...businessEntries);
    }
    if (player) entries.push(...player.processPassiveIncome(state, dayEventImpact));
    if (bank) entries.push(...bank.processDailyBank(state));
    if (taxes) entries.push(...taxes.processDailyTaxes(state));
    if (events) {
      const emittedNews = events.tickEvents(state);
      const newsList = Array.isArray(emittedNews) ? emittedNews : emittedNews ? [emittedNews] : [];
      newsList.forEach((news) => {
        if (Array.isArray(news.businessImpactDetails)) {
          news.businessImpactDetails.forEach((detail, index) => {
            pushBusinessPulseMessage({
              key: `event:${news.id}:${detail.id || detail.name || index}`,
              businessId: detail.id,
              businessName: detail.name,
              severity: detail.severity || news.severity || "info",
              title: detail.title || `${detail.name}: ${news.title}`,
              body: getPublicNewsSummary(detail.body || news.summary),
              actionHint: detail.actionHint || ""
            });
          });
        }
        entries.push({ type: "news", text: `${news.title}: ${getPublicNewsSummary(news.summary)}` });
      });
    }
    if (strategy && typeof strategy.processDay === "function") {
      const rewards = strategy.processDay(state);
      rewards.forEach((contract) => {
        entries.push({ type: "contract", text: `Contrato semanal completado: ${contract.title}. Recompensa ${formatMoney(contract.rewardCash)} y +${contract.rewardPower} poder.` });
        pushMessage({
          key: `strategy-contract:${contract.id}`,
          category: "bonus",
          title: `Contrato semanal: ${contract.title}`,
          body: `Recibiste ${formatMoney(contract.rewardCash)} y +${contract.rewardPower} poder de ciudad.`
        });
      });
    }

    if (state.macro && previousPhase && state.macro.phase !== previousPhase) {
      entries.push({ type: "macro", text: `El ciclo cambio a ${state.macro.phaseLabel}. Presion macro: ${state.macro.pressure}.` });
    }

    entries.forEach((entry) => pushActivity(entry.text));
    ensureExtendedState();
    state.history.push({
      day: state.time.day,
      netWorth: state.player.netWorth,
      marketIndex: market ? market.getMarketIndex(state.assets) : null
    });
    state.history = state.history.slice(-730);
  }

  function tickDays(days) {
    const totalDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 1)));
    for (let day = 0; day < totalDays; day += 1) tickDay();
    return totalDays;
  }

  function advanceDays(days) {
    if (!state) return;
    if (strategy && typeof strategy.getAdvanceWarning === "function") {
      const warning = strategy.getAdvanceWarning(state, days);
      if (warning && !window.confirm(`${warning}\n\nDeseas avanzar de todos modos?`)) return;
    }
    const previous = {
      day: state.time.day,
      cash: state.player.cash || 0,
      netWorth: state.player.netWorth || 0,
      cashflow: getCashflowSince(30),
      activityCount: Array.isArray(state.activity) ? state.activity.length : 0,
      newsCount: Array.isArray(state.events) ? state.events.length : 0
    };
    const chronoFrom = getChronoDisplayDate();
    const elapsedDays = tickDays(days);
    const marketSummary = market ? market.getMarketSummary(state.assets) : null;
    const marketText = marketSummary ? ` Mercado: ${formatSignedPercent(marketSummary.averageChange)}.` : "";
    const newActivity = (state.activity || []).slice(previous.activityCount);
    const newEvents = Math.max(0, (Array.isArray(state.events) ? state.events.length : 0) - previous.newsCount);
    const turnSummary = {
      days: elapsedDays,
      fromDay: previous.day,
      toDay: state.time.day,
      cashDelta: (state.player.cash || 0) - previous.cash,
      netWorthDelta: (state.player.netWorth || 0) - previous.netWorth,
      cashflowDelta: getCashflowSince(30) - previous.cashflow,
      eventCount: newEvents,
      highlights: newActivity.map((entry) => entry.text).filter(Boolean).slice(-4).reverse()
    };

    pushActivity(`Avanzaste ${elapsedDays} dia${elapsedDays === 1 ? "" : "s"}. Macro: ${state.macro ? state.macro.phaseLabel : "sin datos"}, ${state.macro ? state.macro.sentimentLabel : "neutral"}.${marketText}`);
    persist("Tiempo avanzado y partida guardada.", null, {
      chronoFrom,
      chronoLabel: `Avanzando +${elapsedDays}d`
    });
    showTurnSummary(turnSummary);
  }

  function updateLoadButton() {
    const slots = storage.listSlots();
    const hasAnySave = slots.some((slot) => slot.hasSave);
    els.loadSlotWrap.hidden = !hasAnySave;
    els.loadButton.disabled = !hasAnySave;
    els.loadSlot.innerHTML = "";

    slots.forEach((slot) => {
      const option = document.createElement("option");
      option.value = String(slot.slot);
      option.textContent = slot.hasSave && slot.state
        ? `Slot ${slot.slot} / Dia ${slot.state.time.day} / ${slot.state.player.name}`
        : `Slot ${slot.slot} / vacio`;
      option.disabled = !slot.hasSave;
      els.loadSlot.appendChild(option);
    });

    const firstFilled = slots.find((slot) => slot.hasSave);
    if (firstFilled) els.loadSlot.value = String(firstFilled.slot);
  }

  function openStrategicView(view) {
    if (!view) return;
    setActiveView(view);
  }

  function handleAlertAction(event) {
    const toggle = event.target.closest("[data-alert-toggle]");
    if (toggle) {
      const nextKey = toggle.dataset.alertToggle || "";
      expandedAlertKey = expandedAlertKey === nextKey ? null : nextKey;
      render();
      return;
    }

    const button = event.target.closest("[data-alert-view]");
    if (!button) return;
    openStrategicView(button.dataset.alertView);
  }

  function handleAdvisorAction(event) {
    const button = event.target.closest("[data-advisor-view]");
    if (!button) return;
    openStrategicView(button.dataset.advisorView);
  }

  function handleWatchlistAction(event) {
    const button = event.target.closest("[data-watch-action][data-asset-id]");
    if (!button || !strategy) return;
    const assetId = button.dataset.assetId;
    const action = button.dataset.watchAction;

    if (action === "detail") {
      openAssetDetail(assetId);
      return;
    }
    if (action === "buy") {
      openTradeModal(assetId, "buy");
      return;
    }
    if (action === "remove") {
      const result = strategy.toggleWatchlist(state, assetId);
      persist(result.message);
    }
  }

  function handleHedgeAction(event) {
    const button = event.target.closest("[data-hedge-id]");
    if (!button || !strategy) return;
    const result = strategy.buyHedge(state, button.dataset.hedgeId);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    pushActivity(`${result.message} Costo ${formatMoney(result.cost)}.`);
    persist(result.message);
  }

  function handleLegacyClaim() {
    if (!state || !strategy) return;
    const result = strategy.claimPrestige(state);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    pushActivity(result.message);
    persist(result.message);
  }

  function handleTakeoverAction(event) {
    const button = event.target.closest("[data-takeover-asset]");
    if (!button || !strategy) return;
    const result = strategy.claimTakeover(state, button.dataset.takeoverAsset);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    pushActivity(result.message);
    persist(result.message);
  }

  function toggleUserMenu() {
    const isOpen = !els.userMenu.hidden;
    els.userMenu.hidden = isOpen;
    els.userMenuButton.setAttribute("aria-expanded", String(!isOpen));
    if (!isOpen) closeMessageCenter();
  }

  function closeUserMenu() {
    els.userMenu.hidden = true;
    els.userMenuButton.setAttribute("aria-expanded", "false");
  }

  function submitBusiness(event) {
    event.preventDefault();
    if (!businesses) return;
    const capital = parseMoneyInput(els.businessCapital.value);
    const available = getAmountLimit(state && state.player && state.player.cash);
    els.businessError.textContent = "";
    if (Number.isFinite(capital) && capital > available) {
      els.businessError.textContent = `Disponible personal: ${formatMoney(available)}.`;
      els.businessCapital.focus({ preventScroll: true });
      return;
    }
    const result = businesses.foundBusiness(state, {
      name: els.businessName.value,
      sector: els.businessSector.value,
      capital
    });
    if (!result.ok) {
      els.businessError.textContent = result.message;
      return;
    }
    els.businessForm.reset();
    pushActivity(result.message);
    persist(result.message);
  }

  function handleBusinessAction(event) {
    const button = event.target.closest("[data-business-action][data-business-id]");
    if (!button || !businesses) return;
    const result = businesses.applyBusinessAction(state, button.dataset.businessId, button.dataset.businessAction);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    pushActivity(result.message);
    persist(result.message);
  }

  function getBusinessContributionPanel(businessId) {
    return Array.from(els.businessList.querySelectorAll("[data-business-contribution-panel]"))
      .find((panel) => panel.dataset.businessContributionPanel === businessId) || null;
  }

  function getBusinessAmountPanel(businessId) {
    return Array.from(els.businessList.querySelectorAll("[data-business-amount-panel]"))
      .find((panel) => panel.dataset.businessAmountPanel === businessId) || null;
  }

  function getBusinessMonthlyInput(businessId, action) {
    const panel = action === "contribute"
      ? getBusinessContributionPanel(businessId)
      : getBusinessAmountPanel(businessId);
    if (!panel) return null;
    return Array.from(panel.querySelectorAll("input[name='monthlyAmount'][data-business-monthly-action]"))
      .find((input) => input.dataset.businessMonthlyAction === action) || null;
  }

  function getBusinessMonthlyFallbackInput(businessId, action) {
    const panel = action === "contribute"
      ? getBusinessContributionPanel(businessId)
      : getBusinessAmountPanel(businessId);
    if (!panel) return null;
    return panel.querySelector(action === "contribute" ? "input[name='capitalAmount']" : "input[name='actionAmount']");
  }

  function readBusinessMonthlyAmount(businessId, action) {
    const monthlyInput = getBusinessMonthlyInput(businessId, action);
    let amount = parseMoneyInput(monthlyInput && monthlyInput.value);
    let input = monthlyInput;

    if (!Number.isFinite(amount) || amount <= 0) {
      const fallbackInput = getBusinessMonthlyFallbackInput(businessId, action);
      const fallbackAmount = parseMoneyInput(fallbackInput && fallbackInput.value);
      if (Number.isFinite(fallbackAmount) && fallbackAmount > 0) {
        amount = fallbackAmount;
        input = fallbackInput;
        if (monthlyInput) monthlyInput.value = String(Math.floor(fallbackAmount));
      }
    }

    return { amount, input };
  }

  function setBusinessContributionOpen(businessId, isOpen) {
    const panel = getBusinessContributionPanel(businessId);
    const card = panel ? panel.closest(".business-card") : els.businessList.querySelector(`[data-business-id="${businessId}"]`);
    const toggle = els.businessList.querySelector(`[data-business-contribute-toggle="${businessId}"]`);

    if (isOpen) {
      openBusinessContributionIds.add(businessId);
      openBusinessAmountActions.delete(businessId);
      expandedBusinessIds.add(businessId);
      if (card && "open" in card) card.open = true;
    } else {
      openBusinessContributionIds.delete(businessId);
    }

    if (panel) {
      panel.hidden = !isOpen;
      panel.classList.toggle("active", isOpen);
      if (isOpen) {
        const input = panel.querySelector("input");
        window.setTimeout(() => focusAmountInput(input), 0);
      }
    }

    if (toggle) {
      toggle.classList.toggle("active", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "Cerrar aporte" : "Aportar";
    }
  }

  function setBusinessAmountActionOpen(businessId, action) {
    const panel = getBusinessAmountPanel(businessId);
    const card = panel ? panel.closest(".business-card") : els.businessList.querySelector(`[data-business-id="${businessId}"]`);
    const buttons = els.businessList.querySelectorAll(`[data-business-id="${businessId}"][data-business-amount-toggle]`);
    const isOpen = Boolean(action);

    if (isOpen) {
      openBusinessContributionIds.delete(businessId);
      openBusinessAmountActions.set(businessId, action);
      expandedBusinessIds.add(businessId);
      if (card && "open" in card) card.open = true;
    } else {
      openBusinessAmountActions.delete(businessId);
    }

    if (panel) {
      panel.hidden = !isOpen;
      panel.classList.toggle("active", isOpen);
      const hiddenAction = panel.querySelector("input[name='businessAction']");
      if (hiddenAction) hiddenAction.value = action || "";
      if (isOpen) {
        const input = panel.querySelector("input[name='actionAmount']");
        window.setTimeout(() => focusAmountInput(input), 0);
      }
    }

    buttons.forEach((button) => {
      const active = isOpen && button.dataset.businessAmountToggle === action;
      button.classList.toggle("active", active);
      button.setAttribute("aria-expanded", String(active));
    });

    renderBusinesses();
    if (isOpen) {
      window.setTimeout(() => {
        const freshPanel = getBusinessAmountPanel(businessId);
        const input = freshPanel ? freshPanel.querySelector("input[name='actionAmount']") : null;
        focusAmountInput(input);
      }, 0);
    }
  }

  function handleBusinessContributionClick(event) {
    const monthlySet = event.target.closest("[data-business-monthly-set][data-business-monthly-action]");
    if (monthlySet) {
      event.preventDefault();
      const businessId = monthlySet.dataset.businessMonthlySet;
      const action = monthlySet.dataset.businessMonthlyAction;
      const monthlyAmount = readBusinessMonthlyAmount(businessId, action);
      const input = monthlyAmount.input;
      const amount = monthlyAmount.amount;

      if (!Number.isFinite(amount) || amount <= 0) {
        showToast(action === "contribute"
          ? "Ingresa el monto mensual o el monto del aporte."
          : "Ingresa un monto mensual valido.", "error");
        focusAmountInput(input, { allowTouchFocus: true });
        return;
      }

      const result = businesses.applyBusinessAction(state, businessId, "schedule_monthly", {
        action,
        amount,
        active: true
      });
      if (!result.ok) {
        showToast(result.message, "error");
        focusAmountInput(input, { allowTouchFocus: true });
        return;
      }

      if (action === "contribute") openBusinessContributionIds.add(businessId);
      else openBusinessAmountActions.set(businessId, action);
      expandedBusinessIds.add(businessId);
      pushActivity(result.message);
      persist(result.message);
      return;
    }

    const monthlyPause = event.target.closest("[data-business-monthly-pause][data-business-monthly-action]");
    if (monthlyPause) {
      event.preventDefault();
      const businessId = monthlyPause.dataset.businessMonthlyPause;
      const action = monthlyPause.dataset.businessMonthlyAction;
      const result = businesses.applyBusinessAction(state, businessId, "schedule_monthly", {
        action,
        active: false
      });
      if (!result.ok) {
        showToast(result.message, "error");
        return;
      }

      if (action === "contribute") openBusinessContributionIds.add(businessId);
      else openBusinessAmountActions.set(businessId, action);
      expandedBusinessIds.add(businessId);
      pushActivity(result.message);
      persist(result.message);
      return;
    }

    const toggle = event.target.closest("[data-business-contribute-toggle]");
    if (toggle) {
      event.preventDefault();
      const businessId = toggle.dataset.businessContributeToggle;
      setBusinessContributionOpen(businessId, !openBusinessContributionIds.has(businessId));
      return;
    }

    const cancel = event.target.closest("[data-business-contribution-cancel]");
    if (cancel) {
      event.preventDefault();
      setBusinessContributionOpen(cancel.dataset.businessContributionCancel, false);
      return;
    }

    const max = event.target.closest("[data-business-contribution-max]");
    if (max) {
      event.preventDefault();
      const panel = getBusinessContributionPanel(max.dataset.businessContributionMax);
      const input = panel ? panel.querySelector("input[name='capitalAmount']") : null;
      if (input) {
        input.value = String(Math.max(0, Math.floor(Number(state.player && state.player.cash) || 0)));
        const monthlyInput = getBusinessMonthlyInput(max.dataset.businessContributionMax, "contribute");
        if (monthlyInput && !sanitizeMoneyInput(monthlyInput.value)) monthlyInput.value = input.value;
        focusAmountInput(input, { allowTouchFocus: true });
      }
    }

    const amountToggle = event.target.closest("[data-business-amount-toggle][data-business-id]");
    if (amountToggle) {
      event.preventDefault();
      const businessId = amountToggle.dataset.businessId;
      const action = amountToggle.dataset.businessAmountToggle;
      const current = openBusinessAmountActions.get(businessId) || "";
      setBusinessAmountActionOpen(businessId, current === action ? "" : action);
      return;
    }

    const amountCancel = event.target.closest("[data-business-amount-cancel]");
    if (amountCancel) {
      event.preventDefault();
      setBusinessAmountActionOpen(amountCancel.dataset.businessAmountCancel, "");
      return;
    }

    const amountMax = event.target.closest("[data-business-amount-max]");
    if (amountMax) {
      event.preventDefault();
      const businessId = amountMax.dataset.businessAmountMax;
      const panel = getBusinessAmountPanel(businessId);
      const input = panel ? panel.querySelector("input[name='actionAmount']") : null;
      if (input) {
        const suggested = Number(amountMax.dataset.businessAmountSuggested);
        const available = Number(amountMax.dataset.businessAmountAvailable);
        const nextAmount = Number.isFinite(suggested) && suggested > 0 ? suggested : available;
        if (Number.isFinite(nextAmount) && nextAmount > 0) input.value = String(Math.floor(nextAmount));
        focusAmountInput(input, { allowTouchFocus: true });
      }
    }
  }

  function handleBusinessMoneyInput(event) {
    const input = event.target.closest("input[data-money-input]");
    if (!input) return;
    normalizeMoneyInput(input);
  }

  function submitBusinessContribution(event) {
    const form = event.target.closest("[data-business-contribution-panel]");
    if (form && businesses) {
      event.preventDefault();
      const businessId = form.dataset.businessContributionPanel;
      const input = form.querySelector("input[name='capitalAmount']");
      const amount = parseMoneyInput(input && input.value);

      if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Ingresa un monto valido para aportar.", "error");
        return;
      }
      const available = Number(input && input.max);
      if (Number.isFinite(available) && amount > available) {
        showToast(`Disponible personal: ${formatMoney(available)}.`, "error");
        if (input) input.focus({ preventScroll: true });
        return;
      }

      const result = businesses.applyBusinessAction(state, businessId, "contribute", amount);
      if (!result.ok) {
        showToast(result.message, "error");
        if (input) input.focus({ preventScroll: true });
        return;
      }

      openBusinessContributionIds.delete(businessId);
      expandedBusinessIds.add(businessId);
      pushActivity(result.message);
      persist(result.message);
      return;
    }

    const amountForm = event.target.closest("[data-business-amount-panel]");
    if (!amountForm || !businesses) return;
    event.preventDefault();
    const businessId = amountForm.dataset.businessAmountPanel;
    const action = (amountForm.querySelector("input[name='businessAction']") || {}).value;
    const input = amountForm.querySelector("input[name='actionAmount']");
    const amount = parseMoneyInput(input && input.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Ingresa un monto valido para esta decision.", "error");
      return;
    }
    const available = Number(input && input.max);
    if (Number.isFinite(available) && amount > available) {
      showToast(`Disponible para esta decision: ${formatMoney(available)}.`, "error");
      if (input) input.focus({ preventScroll: true });
      return;
    }

    const result = businesses.applyBusinessAction(state, businessId, action, amount);
    if (!result.ok) {
      showToast(result.message, "error");
      if (input) input.focus({ preventScroll: true });
      return;
    }

    openBusinessAmountActions.delete(businessId);
    expandedBusinessIds.add(businessId);
    pushActivity(result.message);
    persist(result.message);
  }

  function setBusinessCardsExpanded(expanded) {
    if (!state) return;
    expandedBusinessIds.clear();
    if (!expanded) {
      openBusinessContributionIds.clear();
      openBusinessAmountActions.clear();
    }
    if (expanded) {
      (state.businesses || []).forEach((business) => {
        if (business && business.id) expandedBusinessIds.add(business.id);
      });
    }
    renderBusinesses();
  }

  function handleRealEstateAction(event) {
    const offerButton = event.target.closest("[data-property-sale-offer][data-asset-id]");
    if (offerButton && player && typeof player.sellRealEstateToBuyer === "function") {
      const result = player.sellRealEstateToBuyer(state, offerButton.dataset.assetId, offerButton.dataset.propertySaleOffer);
      if (!result.ok) {
        showToast(result.message, "error");
        return;
      }
      pushActivity(result.message);
      persist(result.message);
      return;
    }

    const button = event.target.closest("[data-property-action][data-asset-id]");
    if (!button || !player) return;
    const result = player.applyRealEstateAction
      ? player.applyRealEstateAction(state, button.dataset.assetId, button.dataset.propertyAction)
      : player.renovateProperty(state, button.dataset.assetId);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    pushActivity(result.message);
    persist(result.message);
  }

  function handleGoodsAction(event) {
    const button = event.target.closest("[data-good-action][data-asset-id]");
    if (!button) return;

    const action = button.dataset.goodAction;
    const assetId = button.dataset.assetId;

    if (action === "detail") {
      openAssetDetail(assetId);
      return;
    }

    if (action === "mortgage") {
      handleMortgage(assetId);
      return;
    }

    if (action === "buy" || action === "sell") {
      openTradeModal(assetId, action);
      return;
    }

    if (action === "manage-business") {
      setActiveView("business");
      return;
    }

    if (action === "manage-property") {
      (els.realestateManagement || els.realestateList).scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
  }

  function handleDashboardPortfolioTab(event) {
    const button = event.target.closest("[data-dashboard-asset-tab]");
    if (!button || !state || !player) return;
    dashboardPortfolioFilter = button.dataset.dashboardAssetTab || "all";
    renderDashboardPortfolio(player.getPortfolioSummary(state.portfolio, state.assets));
  }

  function handleDashboardPortfolioAction(event) {
    const toggle = event.target.closest("[data-dashboard-asset-toggle]");
    if (toggle) {
      const assetId = toggle.dataset.dashboardAssetToggle || "";
      if (expandedDashboardAssetIds.has(assetId)) expandedDashboardAssetIds.delete(assetId);
      else expandedDashboardAssetIds.add(assetId);
      renderDashboardPortfolio(player.getPortfolioSummary(state.portfolio, state.assets));
      return;
    }

    const button = event.target.closest("[data-dashboard-asset-action][data-asset-id]");
    if (!button) return;
    const action = button.dataset.dashboardAssetAction;
    const assetId = button.dataset.assetId;

    if (action === "detail") {
      openAssetDetail(assetId);
      return;
    }

    if (action === "buy" || action === "sell") {
      openTradeModal(assetId, action);
      return;
    }

    if (action === "manage-business") {
      setActiveView("business");
      return;
    }

    if (action === "manage-property") {
      setActiveView("realestate");
      window.setTimeout(() => {
        const target = els.realestateManagement || els.realestateList;
        if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }, 0);
    }
  }

  function handleEmpireDistrictClick(event) {
    const close = event.target.closest("[data-empire-location-close]");
    if (close) {
      closeEmpireLocationPopover();
      return;
    }

    const assetButton = event.target.closest("[data-empire-asset-id]");
    if (assetButton) {
      openAssetDetail(assetButton.dataset.empireAssetId);
      return;
    }

    const pin = event.target.closest("[data-empire-location-key]");
    if (pin) {
      toggleEmpireLocationPopover(pin.dataset.empireLocationKey);
      return;
    }

    const button = event.target.closest("[data-empire-view]");
    if (!button) return;
    setActiveView(button.dataset.empireView);
  }

  function handleBankAction(event) {
    const button = event.target.closest("[data-bank-action]");
    if (!button || !bank) return;
    const amount = parseMoneyInput(els.bankAmount.value);
    const action = button.dataset.bankAction;
    const targetBusinessId = els.bankBusinessTarget ? els.bankBusinessTarget.value : "";
    const summary = bank.getBankSummary(state);
    const available = action === "deposit"
      ? getAmountLimit(state && state.player && state.player.cash)
      : getAmountLimit(summary.borrowingCapacity);

    if (Number.isFinite(amount) && amount > available) {
      showToast(`${action === "deposit" ? "Efectivo disponible" : "Capacidad credito"}: ${formatMoney(available)}.`, "error");
      els.bankAmount.focus({ preventScroll: true });
      return;
    }

    const result = button.dataset.bankAction === "deposit"
      ? bank.startDeposit(state, amount)
      : bank.requestLoan(
        state,
        amount,
        action === "business_credit" ? "business_credit" : "personal",
        action === "business_credit" ? { businessId: targetBusinessId } : undefined
      );

    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }

    els.bankAmount.value = "";
    if (action === "business_credit" && els.bankBusinessTarget && result.business) {
      els.bankBusinessTarget.value = result.business.id;
    }
    pushActivity(result.message);
    persist(result.message);
  }

  function toggleTaxStrategy() {
    if (!taxes) return;
    const current = taxes.normalizeTaxes(state.taxes).strategy;
    const next = current === "agresiva" ? "normal" : "agresiva";
    taxes.setStrategy(state, next);
    pushActivity(`Plan fiscal cambiado a ${next}.`);
    persist(`Plan fiscal: ${next}.`);
  }

  function bindEvents() {
    els.setupForm.addEventListener("submit", startGame);
    els.loadButton.addEventListener("click", loadGame);
    els.playerName.addEventListener("input", () => {
      els.nameError.textContent = "";
      els.playerName.setAttribute("aria-invalid", "false");
    });
    els.initialBudget.addEventListener("input", () => {
      normalizeMoneyInput(els.initialBudget);
      els.budgetError.textContent = "";
      els.initialBudget.setAttribute("aria-invalid", "false");
    });
    els.saveNowButton.addEventListener("click", () => {
      if (!state) return;
      persist("Partida guardada.");
      closeUserMenu();
    });
    if (els.otaCheckButton) {
      els.otaCheckButton.addEventListener("click", checkOtaNow);
    }
    if (els.cloudConnectButton) {
      els.cloudConnectButton.addEventListener("click", async () => {
        await connectCloudAccount();
      });
    }
    if (els.cloudPushButton) {
      els.cloudPushButton.addEventListener("click", async () => {
        await pushCurrentSlotToCloud();
      });
    }
    if (els.cloudPullButton) {
      els.cloudPullButton.addEventListener("click", async () => {
        await pullCloudSlotToCurrent();
      });
    }
    if (els.cloudDisconnectButton) {
      els.cloudDisconnectButton.addEventListener("click", () => {
        if (!cloudSync) return;
        cloudSync.disconnect();
        updateCloudStatus("Nube desconectada en este dispositivo.");
        showToast("Conexion nube eliminada de este dispositivo.");
      });
    }
    els.saveSlotButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!state) return;
        currentSlot = Number(button.dataset.saveSlot);
        persist(`Partida guardada en slot ${currentSlot}.`, currentSlot);
        closeUserMenu();
      });
    });
    els.resetButton.addEventListener("click", resetGame);
    els.userMenuButton.addEventListener("click", toggleUserMenu);
    if (els.messageButton) els.messageButton.addEventListener("click", toggleMessageCenter);
    if (els.messageMarkRead) els.messageMarkRead.addEventListener("click", markMessagesRead);
    if (els.messageDeleteRead) els.messageDeleteRead.addEventListener("click", deleteReadMessages);
    if (els.messageFilters) {
      els.messageFilters.forEach((button) => {
        button.addEventListener("click", () => setMessageFilter(button.dataset.messageFilter));
      });
    }
    if (els.welcomeGuideClose) els.welcomeGuideClose.addEventListener("click", closeWelcomeGuide);
    if (els.welcomeGuideCloseX) els.welcomeGuideCloseX.addEventListener("click", closeWelcomeGuide);
    if (els.welcomeGuide) {
      els.welcomeGuide.addEventListener("click", (event) => {
        if (event.target === els.welcomeGuide) closeWelcomeGuide();
      });
    }
    els.viewTabs.forEach((tab) => {
      tab.addEventListener("click", () => setActiveView(tab.dataset.view));
    });
    if (els.alertList) els.alertList.addEventListener("click", handleAlertAction);
    if (els.advisorList) els.advisorList.addEventListener("click", handleAdvisorAction);
    if (els.dashboardAssetTabs) els.dashboardAssetTabs.addEventListener("click", handleDashboardPortfolioTab);
    if (els.dashboardAssetList) els.dashboardAssetList.addEventListener("click", handleDashboardPortfolioAction);
    els.marketSearch.addEventListener("input", render);
    els.marketCategoryFilter.addEventListener("change", render);
    if (els.watchlistList) els.watchlistList.addEventListener("click", handleWatchlistAction);
    els.marketList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action][data-asset-id]");
      if (!button) return;
      if (button.dataset.action === "detail") {
        openAssetDetail(button.dataset.assetId);
        return;
      }
      if (button.dataset.action === "mortgage") {
        handleMortgage(button.dataset.assetId);
        return;
      }
      if (button.dataset.action === "watch" && strategy) {
        const result = strategy.toggleWatchlist(state, button.dataset.assetId);
        persist(result.message);
        return;
      }
      openTradeModal(button.dataset.assetId, button.dataset.action);
    });
    els.goodsSearch.addEventListener("input", render);
    els.goodsCategoryFilter.addEventListener("change", render);
    if (els.goodsSortFilter) els.goodsSortFilter.addEventListener("change", render);
    els.goodsList.addEventListener("click", handleGoodsAction);
    els.tradeForm.addEventListener("submit", confirmTrade);
    els.tradeQuantity.addEventListener("input", updateTradeEstimate);
    els.tradeCancel.addEventListener("click", closeTradeModal);
    els.tradeClose.addEventListener("click", closeTradeModal);
    els.tradeModal.addEventListener("click", (event) => {
      if (event.target === els.tradeModal) closeTradeModal();
    });
    if (els.assetDetailClose) els.assetDetailClose.addEventListener("click", closeAssetDetail);
    if (els.assetDetailModal) {
      els.assetDetailModal.addEventListener("click", (event) => {
        if (event.target === els.assetDetailModal) closeAssetDetail();
      });
    }
    if (els.assetDetailBuy) {
      els.assetDetailBuy.addEventListener("click", () => {
        const assetId = els.assetDetailBuy.dataset.assetId;
        closeAssetDetail();
        openTradeModal(assetId, "buy");
      });
    }
    if (els.assetDetailSell) {
      els.assetDetailSell.addEventListener("click", () => {
        const assetId = els.assetDetailSell.dataset.assetId;
        closeAssetDetail();
        openTradeModal(assetId, "sell");
      });
    }
    if (els.turnClose) els.turnClose.addEventListener("click", closeTurnSummary);
    if (els.turnContinue) els.turnContinue.addEventListener("click", closeTurnSummary);
    if (els.turnSummary) {
      els.turnSummary.addEventListener("click", (event) => {
        if (event.target === els.turnSummary) closeTurnSummary();
      });
    }
    els.businessForm.addEventListener("submit", submitBusiness);
    if (els.businessCapital) els.businessCapital.addEventListener("input", () => normalizeMoneyInput(els.businessCapital));
    els.businessList.addEventListener("click", handleBusinessAction);
    els.businessList.addEventListener("click", handleBusinessContributionClick);
    els.businessList.addEventListener("input", handleBusinessMoneyInput);
    els.businessList.addEventListener("submit", submitBusinessContribution);
    if (els.businessExpandAll) els.businessExpandAll.addEventListener("click", () => setBusinessCardsExpanded(true));
    if (els.businessCollapseAll) els.businessCollapseAll.addEventListener("click", () => setBusinessCardsExpanded(false));
    els.skipOnboarding.addEventListener("click", () => {
      if (!state) return;
      const onboarding = ensureOnboardingState();
      onboarding.skipped = true;
      persist("Misiones iniciales omitidas.");
    });
    els.realestateList.addEventListener("click", handleRealEstateAction);
    [els.empireVisual, els.empireSkyline, els.empireDistricts]
      .filter(Boolean)
      .forEach((element) => element.addEventListener("click", handleEmpireDistrictClick));
    els.bankButtons.forEach((button) => button.addEventListener("click", handleBankAction));
    els.taxStrategy.addEventListener("click", toggleTaxStrategy);
    if (els.hedgeList) els.hedgeList.addEventListener("click", handleHedgeAction);
    if (els.legacyClaim) els.legacyClaim.addEventListener("click", handleLegacyClaim);
    if (els.takeoverList) els.takeoverList.addEventListener("click", handleTakeoverAction);
    els.newsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-news-id]");
      if (!button || !events) return;
      events.markRead(state, button.dataset.newsId);
      persist("Noticia marcada como leida.");
    });

    document.addEventListener("click", (event) => {
      if (els.userMenu.hidden) return;
      if (els.userMenu.contains(event.target) || els.userMenuButton.contains(event.target)) return;
      closeUserMenu();
    });

    document.addEventListener("click", (event) => {
      if (!els.messageCenter || els.messageCenter.hidden) return;
      if (els.messageCenter.contains(event.target) || els.messageButton.contains(event.target)) return;
      closeMessageCenter();
    });

    els.budgetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        els.initialBudget.value = button.dataset.budget;
        els.budgetError.textContent = "";
        els.initialBudget.setAttribute("aria-invalid", "false");
      });
    });

    els.difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectedDifficulty = button.dataset.difficulty;
        els.difficultyButtons.forEach((item) => item.classList.toggle("active", item === button));
      });
    });

    els.scenarioButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setSelectedScenario(button.dataset.scenario);
      });
    });

    els.avatarButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setSelectedAvatarId(button.dataset.avatarId);
      });
    });

    els.advanceButtons.forEach((button) => {
      button.addEventListener("click", () => advanceDays(Number(button.dataset.advance)));
    });
    els.chronoSpeedButtons.forEach((button) => {
      button.addEventListener("click", () => setChronoSpeed(Number(button.dataset.chronoSpeed)));
    });

    window.addEventListener("resize", () => {
      if (!state || !els.gameScreen.classList.contains("active")) return;
      window.cancelAnimationFrame(resizeRenderId);
      resizeRenderId = window.requestAnimationFrame(render);
    });
    window.addEventListener("cashEmpire:ota", handleOtaEvent);
  }

  function init() {
    els.initialBudget.value = "100000";
    renderAvatarSelection();
    renderScenarioSelection();
    setSetupBusy(false);
    updateLoadButton();
    updateCloudStatus();
    bindEvents();
  }

  init();
})();
