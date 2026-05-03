(function () {
  "use strict";

  const APP_ID = "com.cashempire.game";
  const STORAGE_KEYS = {
    activeVersion: "cashEmpire.ota.activeVersion.v1",
    pendingVersion: "cashEmpire.ota.pendingVersion.v1",
    lastCheckAt: "cashEmpire.ota.lastCheckAt.v1"
  };

  const DEFAULT_CONFIG = {
    enabled: false,
    manifestUrl: "",
    checkDelayMs: 4500,
    minCheckIntervalMs: 30 * 60 * 1000
  };

  function getConfig() {
    return Object.assign({}, DEFAULT_CONFIG, window.CashEmpireOtaConfig || {});
  }

  function emit(status, detail) {
    const payload = Object.assign({ status }, detail || {});
    window.dispatchEvent(new CustomEvent("cashEmpire:ota", { detail: payload }));
    if (window.console && typeof window.console.info === "function") {
      window.console.info("[CashEmpire OTA]", status, detail || "");
    }
  }

  function getCapacitor() {
    return window.Capacitor || null;
  }

  function isNativeRuntime() {
    const capacitor = getCapacitor();
    if (!capacitor) return false;
    if (typeof capacitor.isNativePlatform === "function") return capacitor.isNativePlatform();
    return Boolean(capacitor.Plugins && capacitor.Plugins.CapacitorUpdater);
  }

  function getUpdater() {
    const capacitor = getCapacitor();
    return capacitor && capacitor.Plugins ? capacitor.Plugins.CapacitorUpdater : null;
  }

  function safeGet(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, String(value || ""));
    } catch (error) {
      // No-op: OTA should never block the game.
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // No-op.
    }
  }

  function normalizeVersion(value) {
    return String(value || "").trim();
  }

  function tokenizeVersion(version) {
    return normalizeVersion(version)
      .split(/[^0-9A-Za-z]+/)
      .filter(Boolean)
      .map((part) => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()));
  }

  function compareVersions(left, right) {
    const a = tokenizeVersion(left);
    const b = tokenizeVersion(right);
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      const leftPart = a[index] === undefined ? 0 : a[index];
      const rightPart = b[index] === undefined ? 0 : b[index];
      if (leftPart === rightPart) continue;
      if (typeof leftPart === "number" && typeof rightPart === "number") {
        return leftPart > rightPart ? 1 : -1;
      }
      return String(leftPart) > String(rightPart) ? 1 : -1;
    }
    return 0;
  }

  function resolveBundleUrl(manifestUrl, bundleUrl) {
    try {
      return new URL(bundleUrl, manifestUrl).toString();
    } catch (error) {
      return "";
    }
  }

  function shouldThrottle(now, minIntervalMs) {
    const lastCheckAt = Number(safeGet(STORAGE_KEYS.lastCheckAt));
    return Number.isFinite(lastCheckAt) && lastCheckAt > 0 && now - lastCheckAt < minIntervalMs;
  }

  async function notifyReady(updater) {
    try {
      await updater.notifyAppReady();
      const current = typeof updater.current === "function" ? await updater.current() : null;
      const activeVersion = normalizeVersion(current && current.bundle && current.bundle.version);
      if (activeVersion) {
        safeSet(STORAGE_KEYS.activeVersion, activeVersion);
        if (safeGet(STORAGE_KEYS.pendingVersion) === activeVersion) {
          safeRemove(STORAGE_KEYS.pendingVersion);
        }
      }
      return current;
    } catch (error) {
      emit("ready-failed", { message: error && error.message ? error.message : "No se pudo confirmar el bundle activo." });
      return null;
    }
  }

  function getCurrentVersion(current) {
    const bundleVersion = normalizeVersion(current && current.bundle && current.bundle.version);
    if (bundleVersion) return bundleVersion;
    return normalizeVersion(safeGet(STORAGE_KEYS.activeVersion)) || "0.0.0";
  }

  function isManifestValid(manifest) {
    if (!manifest || typeof manifest !== "object") return false;
    if (manifest.appId && manifest.appId !== APP_ID) return false;
    return Boolean(normalizeVersion(manifest.version) && normalizeVersion(manifest.url));
  }

  async function fetchManifest(manifestUrl) {
    const response = await fetch(`${manifestUrl}${manifestUrl.includes("?") ? "&" : "?"}t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Manifest OTA no disponible (${response.status}).`);
    }
    return response.json();
  }

  async function checkForUpdate(options) {
    const config = getConfig();
    const force = Boolean(options && options.force);
    const now = Date.now();
    const manifestUrl = normalizeVersion(config.manifestUrl);
    const updater = getUpdater();

    if (!config.enabled || !manifestUrl || !isNativeRuntime() || !updater) {
      emit("skipped", { reason: "OTA no disponible en este runtime." });
      return { updated: false, skipped: true };
    }

    if (!force && shouldThrottle(now, Number(config.minCheckIntervalMs) || DEFAULT_CONFIG.minCheckIntervalMs)) {
      emit("skipped", { reason: "Chequeo reciente." });
      return { updated: false, skipped: true };
    }

    safeSet(STORAGE_KEYS.lastCheckAt, String(now));
    const current = await notifyReady(updater);
    const currentVersion = getCurrentVersion(current);
    const pendingVersion = normalizeVersion(safeGet(STORAGE_KEYS.pendingVersion));

    try {
      const manifest = await fetchManifest(manifestUrl);
      if (!isManifestValid(manifest)) {
        emit("manifest-ignored", { reason: "Manifest invalido o de otra app." });
        return { updated: false };
      }

      const nextVersion = normalizeVersion(manifest.version);
      if (pendingVersion === nextVersion || compareVersions(nextVersion, currentVersion) <= 0) {
        emit("up-to-date", { currentVersion, nextVersion });
        return { updated: false };
      }

      const minNativeVersion = normalizeVersion(manifest.minNativeVersion);
      const nativeVersion = normalizeVersion(current && current.native);
      if (minNativeVersion && nativeVersion && compareVersions(nativeVersion, minNativeVersion) < 0) {
        emit("native-too-old", { nativeVersion, minNativeVersion, nextVersion });
        return { updated: false };
      }

      const bundleUrl = resolveBundleUrl(manifestUrl, manifest.url);
      if (!bundleUrl) {
        emit("manifest-ignored", { reason: "URL de bundle invalida." });
        return { updated: false };
      }

      emit("download-started", { version: nextVersion });
      const downloadOptions = {
        version: nextVersion,
        url: bundleUrl
      };
      if (manifest.sha256) {
        downloadOptions.checksum = String(manifest.sha256);
      }
      const bundle = await updater.download(downloadOptions);

      const bundleId = bundle && bundle.id;
      if (!bundleId) {
        throw new Error("El plugin no devolvio un bundle valido.");
      }

      if (typeof updater.next === "function") {
        await updater.next({ id: bundleId });
      } else {
        await updater.set({ id: bundleId });
      }

      safeSet(STORAGE_KEYS.pendingVersion, nextVersion);
      emit("ready", { version: nextVersion });
      return { updated: true, version: nextVersion };
    } catch (error) {
      emit("failed", { message: error && error.message ? error.message : "No se pudo descargar la actualizacion OTA." });
      return { updated: false, error };
    }
  }

  function schedule() {
    const config = getConfig();
    const delay = Math.max(0, Number(config.checkDelayMs) || DEFAULT_CONFIG.checkDelayMs);
    window.setTimeout(() => checkForUpdate(), delay);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    });
  }

  window.CashEmpireOta = {
    checkForUpdate
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
