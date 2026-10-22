#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const targetDir = path.join(configDir, 'usage-bar');
const settingsPath = path.join(configDir, 'settings.json');
const target = path.join(targetDir, 'statusline.js');
const backupPath = path.join(targetDir, 'previous-statusline.json');
const MARK = 'usage-bar/statusline.js';
const ours = (sl) => !!sl && typeof sl.command === 'string' && sl.command.replace(/\\/g, '/').includes(MARK);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// Leer settings antes de tocar nada
let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('no es un objeto JSON');
  } catch (e) {
    fail(`Error: no se pudo leer ${settingsPath} (${e.message}). Corrige el JSON y vuelve a intentarlo; no se modificó nada.`);
  }
}

const src = path.join(__dirname, 'statusline.js');
if (!fs.existsSync(src)) fail(`Error: no se encontró ${src}.`);

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(src, target);
fs.chmodSync(target, 0o755);

let backedUp = false;
if (settings.statusLine && !ours(settings.statusLine) && !fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, JSON.stringify(settings.statusLine, null, 2) + '\n');
  backedUp = true;
}

settings.statusLine = { type: 'command', command: `node "${target}"`, refreshInterval: 30 };

const tmp = `${settingsPath}.tmp-${process.pid}`;
fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
fs.renameSync(tmp, settingsPath);

console.log(`usage-bar instalado en ${targetDir}`);
console.log(`- statusLine configurada en ${settingsPath}`);
if (backedUp) console.log(`- Tu statusLine anterior se guardó en ${backupPath} (se restaura al desinstalar)`);
console.log('La barra aparece tras el próximo mensaje en Claude Code. Requiere una suscripción Pro/Max.');
