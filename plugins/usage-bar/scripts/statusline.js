#!/usr/bin/env node
'use strict';

const CREAM = [194, 192, 182];
const DIM = [107, 106, 101];
const TERRACOTTA = [217, 119, 87];
const DEEP = [193, 95, 60];
const RED = [229, 72, 77];
const WINDOWS = [['5h', 'five_hour'], ['7d', 'seven_day']];

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d${h}h`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

function renderBar(pct) {
  const filled = Math.min(10, Math.max(0, Math.round(pct / 10)));
  return '▰'.repeat(filled) + '▱'.repeat(10 - filled);
}

function accent(pct) {
  return pct >= 95 ? RED : pct >= 80 ? DEEP : TERRACOTTA;
}

function render(data, nowSeconds, { cols, color = true } = {}) {
  const paint = (text, rgb) => (color ? `\x1b[38;2;${rgb.join(';')}m${text}\x1b[0m` : text);
  const wide = !(cols < 50);
  const limits = (data && data.rate_limits) || {};

  const segments = [];
  for (const [label, key] of WINDOWS) {
    const w = limits[key];
    if (!w || typeof w.used_percentage !== 'number' || !Number.isFinite(w.used_percentage)) continue;
    const pct = w.used_percentage;
    const hot = accent(pct);
    let out = paint(label, CREAM) + ' ';
    if (wide) {
      const bar = renderBar(pct);
      const n = bar.indexOf('▱') < 0 ? 10 : bar.indexOf('▱');
      out += paint(bar.slice(0, n), hot) + paint(bar.slice(n), DIM) + ' ';
    }
    out += paint(`${Math.round(pct)}%`, hot);
    if (typeof w.resets_at === 'number') {
      out += paint(' · ', DIM) + paint(formatDuration(w.resets_at - nowSeconds), DIM);
    }
    segments.push(out);
  }

  if (!segments.length) return paint('5h — · 7d —', DIM);
  return segments.join('   ');
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input);
      const cols = parseInt(process.env.COLUMNS, 10);
      const line = render(data, Date.now() / 1000, {
        cols: Number.isNaN(cols) ? undefined : cols,
        color: !process.env.NO_COLOR,
      });
      process.stdout.write(line + '\n');
    } catch {
      // invalid input: print nothing
    }
  });
  process.stdin.on('error', () => {});
}

module.exports = { formatDuration, renderBar, render, main };

if (require.main === module) main();
