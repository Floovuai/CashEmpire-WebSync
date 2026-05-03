const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "cloud-saves.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ accounts: {} }, null, 2));
}

function readStore() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return parsed && parsed.accounts ? parsed : { accounts: {} };
  } catch (error) {
    return { accounts: {} };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

function normalizeHandle(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

function hashSecret(secret) {
  return crypto.createHash("sha256").update(String(secret || "")).digest("hex");
}

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 1 && slot <= 3;
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Body demasiado grande."));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("JSON invalido."));
      }
    });
    request.on("error", reject);
  });
}

function verifyOrCreateAccount(store, handle, passphrase) {
  const normalizedHandle = normalizeHandle(handle);
  const normalizedPassphrase = String(passphrase || "").trim();
  if (!normalizedHandle) return { ok: false, status: 400, message: "Handle invalido." };
  if (normalizedPassphrase.length < 6) return { ok: false, status: 400, message: "La clave debe tener al menos 6 caracteres." };

  const secretHash = hashSecret(normalizedPassphrase);
  const existing = store.accounts[normalizedHandle];
  if (!existing) {
    store.accounts[normalizedHandle] = {
      handle: normalizedHandle,
      secretHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slots: {}
    };
    return { ok: true, created: true, account: store.accounts[normalizedHandle] };
  }
  if (existing.secretHash !== secretHash) {
    return { ok: false, status: 401, message: "La clave no coincide con esa cuenta." };
  }
  return { ok: true, created: false, account: existing };
}

async function handleConnect(request, response) {
  const store = readStore();
  const body = await parseJsonBody(request);
  const result = verifyOrCreateAccount(store, body.handle, body.passphrase);
  if (!result.ok) return json(response, result.status, { ok: false, message: result.message });
  result.account.updatedAt = new Date().toISOString();
  writeStore(store);
  json(response, 200, {
    ok: true,
    created: result.created,
    handle: result.account.handle,
    slots: Object.keys(result.account.slots || {}).map((slot) => Number(slot)).sort((a, b) => a - b)
  });
}

async function handlePush(request, response) {
  const store = readStore();
  const body = await parseJsonBody(request);
  const result = verifyOrCreateAccount(store, body.handle, body.passphrase);
  if (!result.ok) return json(response, result.status, { ok: false, message: result.message });
  const slot = Number(body.slot);
  if (!isValidSlot(slot)) return json(response, 400, { ok: false, message: "Slot invalido." });
  if (!body.state || typeof body.state !== "object") return json(response, 400, { ok: false, message: "No llego el estado del juego." });

  result.account.slots[String(slot)] = {
    slot,
    updatedAt: new Date().toISOString(),
    state: body.state
  };
  result.account.updatedAt = new Date().toISOString();
  writeStore(store);
  json(response, 200, { ok: true, slot, updatedAt: result.account.slots[String(slot)].updatedAt });
}

async function handlePull(request, response) {
  const store = readStore();
  const body = await parseJsonBody(request);
  const result = verifyOrCreateAccount(store, body.handle, body.passphrase);
  if (!result.ok) return json(response, result.status, { ok: false, message: result.message });
  const slot = Number(body.slot);
  if (!isValidSlot(slot)) return json(response, 400, { ok: false, message: "Slot invalido." });

  const entry = result.account.slots[String(slot)];
  if (!entry || !entry.state) return json(response, 404, { ok: false, message: "No hay save remoto en ese slot." });
  json(response, 200, { ok: true, slot, updatedAt: entry.updatedAt, state: entry.state });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") return json(response, 200, { ok: true });
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true, service: "cash-empire-sync", now: new Date().toISOString() });
    if (request.method === "POST" && request.url === "/api/sync/connect") return handleConnect(request, response);
    if (request.method === "POST" && request.url === "/api/sync/push") return handlePush(request, response);
    if (request.method === "POST" && request.url === "/api/sync/pull") return handlePull(request, response);
    json(response, 404, { ok: false, message: "Ruta no encontrada." });
  } catch (error) {
    json(response, 500, { ok: false, message: error && error.message ? error.message : "Error interno." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Cash Empire Sync API en http://${HOST}:${PORT}`);
});
