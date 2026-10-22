#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const targetDir = path.join(configDir, 'usage-bar');
const settingsPath = path.join(configDir, 'settings.json');
const backupPath = path.join(targetDir, 'previous-statusline.json');
const MARK = 'usage-bar/statusline.js';
const ours = (sl) => !!sl && typeof sl.command === 'string' && sl.command.replace(/\\/g, '/').includes(MARK);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

let settings = null;
if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('no es un objeto JSON');
  } catch (e) {
    fail(`Error: no se pudo leer ${settingsPath} (${e.message}). Corrige el JSON y vuelve a intentarlo; no se modificó nada.`);
  }
}

let prev = null;
if (fs.existsSync(backupPath)) {
  try {
    prev = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  } catch (e) {
    fail(`Error: no se pudo leer la copia de respaldo ${backupPath} (${e.message}); no se modificó nada.`);
  }
}

let action = 'sin cambios (la statusLine actual no es de usage-bar)';
if (settings) {
  const mine = ours(settings.statusLine) || !settings.statusLine;
  if (prev && mine) {
    settings.statusLine = prev;
    action = 'statusLine anterior restaurada';
  } else if (ours(settings.statusLine)) {
    delete settings.statusLine;
    action = 'statusLine de usage-bar eliminada';
  }
  if (action.startsWith('statusLine')) {
    const tmp = `${settingsPath}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
    fs.renameSync(tmp, settingsPath);
  }
} else {
  action = 'no hay settings.json, nada que restaurar';
}

fs.rmSync(targetDir, { recursive: true, force: true });

console.log(`usage-bar desinstalado: ${action}.`);
console.log(`Directorio ${targetDir} eliminado.`);
