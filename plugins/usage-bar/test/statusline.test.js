'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { formatDuration, renderBar, render } = require('../scripts/statusline.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'statusline.js');
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const NOW = 1_000_000;
const sample = {
  rate_limits: {
    five_hour: { used_percentage: 48, resets_at: NOW + 2 * 3600 + 13 * 60 },
    seven_day: { used_percentage: 22, resets_at: NOW + 3 * 86400 + 4 * 3600 },
  },
};
const PLAIN = '5h ▰▰▰▰▰▱▱▱▱▱ 48% · 2h13m   7d ▰▰▱▱▱▱▱▱▱▱ 22% · 3d4h';

test('formatDuration', () => {
  assert.strictEqual(formatDuration(-5), '0m');
  assert.strictEqual(formatDuration(0), '0m');
  assert.strictEqual(formatDuration(59), '0m');
  assert.strictEqual(formatDuration(42 * 60 + 30), '42m');
  assert.strictEqual(formatDuration(3600), '1h0m');
  assert.strictEqual(formatDuration(2 * 3600 + 5 * 60), '2h5m');
  assert.strictEqual(formatDuration(2 * 3600 + 13 * 60), '2h13m');
  assert.strictEqual(formatDuration(86400 - 1), '23h59m');
  assert.strictEqual(formatDuration(86400), '1d0h');
  assert.strictEqual(formatDuration(3 * 86400 + 4 * 3600 + 59 * 60), '3d4h');
});

test('renderBar', () => {
  assert.strictEqual(renderBar(0), '▱'.repeat(10));
  assert.strictEqual(renderBar(48), '▰▰▰▰▰▱▱▱▱▱');
  assert.strictEqual(renderBar(100), '▰'.repeat(10));
  assert.strictEqual(renderBar(250), '▰'.repeat(10));
  assert.strictEqual(renderBar(-20), '▱'.repeat(10));
});

test('render with both windows', () => {
  assert.strictEqual(strip(render(sample, NOW, { cols: 120 })), PLAIN);
});

test('render with only five_hour', () => {
  const data = { rate_limits: { five_hour: sample.rate_limits.five_hour } };
  assert.strictEqual(strip(render(data, NOW, { cols: 120 })), '5h ▰▰▰▰▰▱▱▱▱▱ 48% · 2h13m');
});

test('render with context_window', () => {
  const data = { ...sample, context_window: { used_percentage: 37.6 } };
  assert.strictEqual(strip(render(data, NOW, { cols: 120 })), `${PLAIN}   ctx ▰▰▰▰▱▱▱▱▱▱ 38%`);
  assert.strictEqual(strip(render(data, NOW, { cols: 49 })), '5h 48% · 2h13m   7d 22% · 3d4h   ctx 38%');
});

test('context_window alone, or with null percentage', () => {
  assert.strictEqual(strip(render({ context_window: { used_percentage: 10 } }, NOW, {})), 'ctx ▰▱▱▱▱▱▱▱▱▱ 10%');
  assert.strictEqual(strip(render({ ...sample, context_window: { used_percentage: null } }, NOW, { cols: 120 })), PLAIN);
});

test('render with no rate_limits', () => {
  assert.strictEqual(strip(render({}, NOW, { cols: 120 })), '5h — · 7d —');
  assert.strictEqual(strip(render({ rate_limits: {} }, NOW, {})), '5h — · 7d —');
  assert.match(render({}, NOW, {}), /38;2;107;106;101/);
});

test('resets_at in the past shows 0m', () => {
  const data = { rate_limits: { five_hour: { used_percentage: 10, resets_at: NOW - 100 } } };
  assert.strictEqual(strip(render(data, NOW, {})), '5h ▰▱▱▱▱▱▱▱▱▱ 10% · 0m');
});

test('color thresholds', () => {
  const at = (p) => render({ rate_limits: { five_hour: { used_percentage: p, resets_at: NOW + 60 } } }, NOW, {});
  assert.ok(at(79).includes('38;2;217;119;87'));
  assert.ok(!at(79).includes('38;2;193;95;60'));
  assert.ok(at(80).includes('38;2;193;95;60'));
  assert.ok(!at(80).includes('38;2;217;119;87'));
  assert.ok(at(95).includes('38;2;229;72;77'));
  assert.ok(at(79).includes('38;2;194;192;182'));
  assert.ok(at(79).includes('38;2;107;106;101'));
  assert.ok(at(79).includes('\x1b[0m'));
});

test('narrow cols omit the bar', () => {
  assert.strictEqual(strip(render(sample, NOW, { cols: 49 })), '5h 48% · 2h13m   7d 22% · 3d4h');
  assert.strictEqual(strip(render(sample, NOW, { cols: 50 })), PLAIN);
});

test('color:false emits no ANSI', () => {
  assert.ok(!render(sample, NOW, { color: false }).includes('\x1b'));
  assert.ok(!render({}, NOW, { color: false }).includes('\x1b'));
});

test('script: invalid JSON prints nothing and exits 0', () => {
  for (const input of ['not json', '']) {
    const r = spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
    assert.strictEqual(r.stdout, '');
    assert.strictEqual(r.status, 0);
  }
});

test('script: valid JSON with NO_COLOR prints plain line', () => {
  const now = Math.floor(Date.now() / 1000);
  const data = {
    rate_limits: {
      five_hour: { used_percentage: 48, resets_at: now + 2 * 3600 + 13 * 60 + 30 },
      seven_day: { used_percentage: 22, resets_at: now + 3 * 86400 + 4 * 3600 + 30 * 60 },
    },
  };
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.COLUMNS;
  const r = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(data), encoding: 'utf8', env });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, PLAIN + '\n');
});
