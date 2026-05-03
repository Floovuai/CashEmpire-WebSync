(function () {
  "use strict";

  const CONFIG_KEY = "cashEmpire.cloudSync.v1";
  const DEFAULT_BASE_URL = (() => {
    if (typeof window === "undefined" || !window.location) return "http://localhost:8787";
    if (window.location.protocol === "file:") return "http://localhost:8787";
    return `${window.location.protocol}//${window.location.hostname}:8787`;
  })();

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeBaseUrl(value) {
    return String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  }

  function readConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isObject(parsed)) return null;
      const handle = typeof parsed.handle === "string" ? parsed.handle.trim() : "";
      const passphrase = typeof parsed.passphrase === "string" ? parsed.passphrase : "";
      const baseUrl = normalizeBaseUrl(parsed.baseUrl);
      if (!handle || !passphrase) return null;
      return { handle, passphrase, baseUrl };
    } catch (error) {
      return null;
    }
  }

  function writeConfig(config) {
    if (!config) {
      localStorage.removeItem(CONFIG_KEY);
      return null;
    }

    const next = {
      handle: String(config.handle || "").trim(),
      passphrase: String(config.passphrase || ""),
      baseUrl: normalizeBaseUrl(config.baseUrl)
    };

    localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    return next;
  }

  async function postJson(path, body, configOverride) {
    const config = configOverride || readConfig();
    if (!config) {
      throw new Error("Primero conecta una cuenta de nube.");
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload && payload.message ? payload.message : "No se pudo completar la sincronizacion.");
    }

    return payload;
  }

  async function connect(options) {
    const config = {
      handle: String(options && options.handle || "").trim(),
      passphrase: String(options && options.passphrase || ""),
      baseUrl: normalizeBaseUrl(options && options.baseUrl)
    };
    const payload = await postJson("/api/sync/connect", config, config);
    writeConfig(config);
    return payload;
  }

  async function listSlots(options) {
    const config = {
      handle: String(options && options.handle || "").trim(),
      passphrase: String(options && options.passphrase || ""),
      baseUrl: normalizeBaseUrl(options && options.baseUrl)
    };
    const payload = await postJson("/api/sync/list", config, config);
    writeConfig(config);
    return payload;
  }

  async function pushSlot(slot, state) {
    const config = readConfig();
    return postJson("/api/sync/push", {
      handle: config.handle,
      passphrase: config.passphrase,
      slot,
      state
    }, config);
  }

  async function pullSlot(slot) {
    const config = readConfig();
    return postJson("/api/sync/pull", {
      handle: config.handle,
      passphrase: config.passphrase,
      slot
    }, config);
  }

  function disconnect() {
    writeConfig(null);
  }

  window.CashEmpireCloudSync = {
    DEFAULT_BASE_URL,
    readConfig,
    writeConfig,
    connect,
    listSlots,
    pushSlot,
    pullSlot,
    disconnect
  };
})();
