"use strict";
// Utilitários da bateria de testes (Fase 0). Nenhuma dependência externa.
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, ...opts });
}

// Comparação profunda que devolve a lista de caminhos divergentes.
function diff(a, b, caminho = "$", out = [], limite = 60) {
  if (out.length >= limite) return out;
  if (Object.is(a, b)) return out;
  const ta = Array.isArray(a) ? "array" : a === null ? "null" : typeof a;
  const tb = Array.isArray(b) ? "array" : b === null ? "null" : typeof b;
  if (ta !== tb) { out.push(`${caminho}: tipo ${ta} ≠ ${tb}`); return out; }
  if (ta === "array") {
    if (a.length !== b.length) out.push(`${caminho}: tamanho ${a.length} ≠ ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${caminho}[${i}]`, out, limite);
    return out;
  }
  if (ta === "object") {
    const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of ks) {
      if (!(k in a)) out.push(`${caminho}.${k}: ausente na referência`);
      else if (!(k in b)) out.push(`${caminho}.${k}: ausente no candidato`);
      else diff(a[k], b[k], `${caminho}.${k}`, out, limite);
    }
    return out;
  }
  out.push(`${caminho}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
  return out;
}

// Formatação de moeda idêntica à da loja (fmt) — usada só para gerar valores esperados.
const brl = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

module.exports = { RAIZ, sha256, git, diff, brl };
