'use strict';

// Run with: node verify.cjs
// Executes the shipped inline script unchanged against a deliberately small DOM.
// These are behavior checks, not a substitute for a browser or physical calibration.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '屏幕尺子.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const KEY = 'screen-ruler-v1';

function createApp({ width = 800, height = 500, dpr = 1, stored, denyStorage = false } = {}) {
  let document;
  const raf = [];
  const memory = new Map(stored === undefined ? [] : [[KEY, typeof stored === 'string' ? stored : JSON.stringify(stored)]]);
  const context2d = () => Object.fromEntries(['scale', 'beginPath', 'moveTo', 'lineTo', 'save', 'translate', 'rotate', 'fillText', 'restore', 'stroke'].map(name => [name, () => {}]));
  class Element {
    constructor(tag = 'div', attrs = '') {
      this.tagName = tag.toUpperCase();
      this.listeners = new Map();
      this.attributes = {};
      this.dataset = {};
      this.value = '';
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.childrenBySelector = new Map();
      this.textContent = '';
      this.innerHTML = '';
      this.open = false;
      this.hidden = /\bhidden\b/.test(attrs);
      const classes = new Set();
      this.classList = {
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : force;
          enabled ? classes.add(name) : classes.delete(name);
          return enabled;
        },
        contains: name => classes.has(name),
      };
      for (const match of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
        this.attributes[match[1]] = match[2];
        if (match[1] === 'value') this.value = match[2];
        if (match[1] === 'class') match[2].split(/\s+/).forEach(name => classes.add(name));
        if (match[1].startsWith('data-')) this.dataset[match[1].slice(5)] = match[2];
      }
    }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    emit(type, details = {}) {
      const event = { target: this, button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, ...details };
      if (typeof this['on' + type] === 'function') this['on' + type](event);
      for (const callback of this.listeners.get(type) || []) callback(event);
      return event;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    querySelector(selector) {
      if (!this.childrenBySelector.has(selector)) this.childrenBySelector.set(selector, new Element('span'));
      return this.childrenBySelector.get(selector);
    }
    matches(selector) { return selector.split(',').map(s => s.trim().toUpperCase()).includes(this.tagName); }
    closest(selector) {
      if (selector === '[data-h]' && this.dataset.h) return this;
      if (selector === 'button' && this.tagName === 'BUTTON') return this;
      return this.parentElement?.closest(selector) || null;
    }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = null; }
    setPointerCapture(id) { this.capturedPointerId = id; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getBoundingClientRect() { return { x: 0, y: 0, width, height }; }
    getContext() { return context2d(); }
  }
  const byId = new Map();
  for (const match of html.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) byId.set(match[3], new Element(match[1], match[2]));
  // Model native select defaults; unlike inputs they take their value from an option.
  for (const match of html.matchAll(/<select\b([^>]*\bid="([^"]+)"[^>]*)>([\s\S]*?)<\/select>/g)) {
    const select = byId.get(match[2]);
    select.options = [...match[3].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(option => {
      const item = new Element('option', option[1]);
      item.textContent = option[2];
      item.selected = /\bselected\b/.test(option[1]);
      return item;
    });
    select.value = (select.options.find(option => option.selected) || select.options[0])?.value || '';
    Object.defineProperty(select, 'selectedOptions', { get: () => select.options.filter(option => option.value === select.value) });
  }
  const dataElements = [];
  for (const match of html.matchAll(/<(\w+)\b([^>]*\bdata-(?:unit|size|color|h)="[^"]+"[^>]*)>/g)) dataElements.push(new Element(match[1], match[2]));
  const unitLabels = [new Element('span'), new Element('span')];
  document = new Element('document');
  document.body = new Element('body');
  document.activeElement = null;
  document.hidden = false;
  document.getElementById = id => {
    assert.ok(byId.has(id), `Unknown element requested by application: ${id}`);
    return byId.get(id);
  };
  document.querySelectorAll = selector => {
    if (selector === '.unit-label') return unitLabels;
    const attr = selector.match(/^\[data-(\w+)\]$/)?.[1];
    assert.ok(attr, `Unsupported application selector: ${selector}`);
    return dataElements.filter(el => attr in el.dataset);
  };
  const window = new Element('window');
  window.devicePixelRatio = dpr;
  window.visualViewport = new Element('visualviewport');
  window.visualViewport.scale = 1;
  const screen = { width: 1920, height: 1080, orientation: { type: 'landscape-primary' } };
  const sandbox = {
    document, window, screen,
    localStorage: {
      getItem(key) { if (denyStorage) throw new Error('Storage is disabled'); return memory.get(key) || null; },
      setItem(key, value) { if (denyStorage) throw new Error('Storage is disabled'); memory.set(key, value); },
    },
    requestAnimationFrame: callback => raf.push(callback),
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
    matchMedia: () => new Element('mediaquery'),
    getComputedStyle: () => ({ getPropertyValue: () => '#8597a5' }),
    setTimeout: () => 1,
    clearTimeout() {},
    console,
  };
  vm.runInNewContext(source, sandbox, { filename: '屏幕尺子.html:inline', timeout: 1000 });
  while (raf.length) raf.shift()();
  const get = id => document.getElementById(id);
  const click = id => get(id).emit('click');
  const enter = (id, value, event = 'change') => { get(id).value = String(value); get(id).emit(event); };
  const selectUnit = unit => dataElements.find(el => el.dataset.unit === unit).emit('click');
  const px = property => parseFloat(get('measureBox').style[property]);
  const calibration = pmm => { click('calibrateBtn'); enter('calScaleInput', pmm); click('saveCalBtn'); };
  return { get, click, enter, selectUnit, px, calibration, window, screen, document, memory, dataElements };
}

function near(actual, expected, label) { assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: expected ${expected}, got ${actual}`); }
const checks = [];
function check(name, callback) {
  callback();
  checks.push(name);
  console.log(`PASS ${name}`);
}

check('uncalibrated startup and calibration save/cancel', () => {
  const app = createApp();
  assert.match(app.get('statusBtn').textContent, /未校准/);
  app.calibration(4);
  near(app.px('width'), 320, 'calibrated width');
  near(app.px('height'), 240, 'calibrated height');
  assert.match(app.get('statusBtn').textContent, /已校准/);
  assert.equal(JSON.parse(app.memory.get(KEY)).pmm, 4);
  assert.equal(app.get('calDialog').open, false);
  app.click('calibrateBtn');
  app.enter('calScaleInput', 6);
  near(parseFloat(app.get('calCard').style.width), 6 * 85.6, 'draft card width');
  app.click('cancelCalBtn');
  near(app.px('width'), 320, 'cancel preserves committed width');
  assert.equal(JSON.parse(app.memory.get(KEY)).pmm, 4);
  app.click('calibrateBtn');
  near(parseFloat(app.get('calCard').style.width), 4 * 85.6, 'reopen discards canceled draft');
});

check('unit switching preserves physical dimensions and inch input converts correctly', () => {
  const app = createApp();
  app.calibration(4);
  for (const unit of ['cm', 'in', 'mm']) {
    app.selectUnit(unit);
    near(app.px('width'), 320, `${unit} width`);
    near(app.px('height'), 240, `${unit} height`);
  }
  app.selectUnit('in');
  app.enter('widthInput', 2);
  near(app.px('width'), 50.8 * 4, 'two-inch width');
  near(app.px('height'), 240, 'inch input preserves other axis');
});

check('DPR changes invalidate calibration and keep canvas CSS dimensions correct', () => {
  const app = createApp({ width: 800, height: 500, dpr: 2 });
  app.calibration(4);
  assert.match(app.get('statusBtn').textContent, /已校准/);
  assert.equal(app.get('rulerX').style.width, '800px');
  assert.equal(app.get('rulerX').style.height, '36px');
  assert.equal(app.get('rulerX').width, 1600);
  assert.equal(app.get('rulerY').style.width, '36px');
  assert.equal(app.get('rulerY').style.height, '500px');
  assert.equal(app.get('rulerY').height, 1000);
  app.window.devicePixelRatio = 1.5;
  app.window.emit('resize');
  assert.match(app.get('statusBtn').textContent, /未校准/);
  assert.match(app.get('warning').textContent, /重新校准/);
  assert.equal(app.get('rulerX').width, 1200);
  assert.equal(app.get('rulerX').style.width, '800px');
});

check('single-edge resize preserves the untouched oversized axis', () => {
  const app = createApp({ width: 500, height: 400 });
  app.calibration(4);
  app.enter('widthInput', 150); // 600 px: intentionally wider than the stage.
  app.enter('heightInput', 50);
  const box = app.get('measureBox');
  const handle = direction => app.dataElements.find(el => el.dataset.h === direction);
  box.emit('pointerdown', { target: handle('n'), clientX: 200, clientY: 100 });
  box.emit('pointermove', { clientX: 200, clientY: 120 });
  box.emit('pointerup');
  near(app.px('width'), 600, 'north resize preserves oversized width');
  near(app.px('height'), 180, 'north resize changes height');
  app.enter('widthInput', 50);
  app.enter('heightInput', 150); // 600 px: intentionally taller than the stage.
  box.emit('pointerdown', { target: handle('e'), clientX: 200, clientY: 100 });
  box.emit('pointermove', { clientX: 220, clientY: 100 });
  box.emit('pointerup');
  near(app.px('width'), 220, 'east resize changes width');
  near(app.px('height'), 600, 'east resize preserves oversized height');
});

check('locked frame ignores drag and keyboard movement', () => {
  const app = createApp();
  app.click('lockBtn');
  const x = app.px('left'), y = app.px('top');
  app.get('measureBox').emit('pointerdown');
  app.get('measureBox').emit('pointermove', { clientX: 30, clientY: 30 });
  app.get('measureBox').emit('pointerup');
  app.document.emit('keydown', { target: app.get('measureBox'), key: 'ArrowRight' });
  near(app.px('left'), x, 'locked left');
  near(app.px('top'), y, 'locked top');
});

check('localStorage rejection does not crash or prevent current-session calibration', () => {
  const app = createApp({ denyStorage: true });
  app.calibration(4);
  near(app.px('width'), 320, 'in-memory calibration');
  assert.match(app.get('statusBtn').textContent, /已校准/);
  assert.match(app.get('toast').textContent, /仅在本次打开时有效/);
  app.selectUnit('cm');
  app.enter('widthInput', 5);
  near(app.px('width'), 200, 'size input with blocked storage');
});

check('saved calibration restores and malformed storage safely falls back', () => {
  const first = createApp({ dpr: 2 });
  first.calibration(4.5);
  first.enter('widthInput', 100);
  const restored = createApp({ dpr: 2, stored: first.memory.get(KEY) });
  near(restored.px('width'), 450, 'restored physical width');
  assert.match(restored.get('statusBtn').textContent, /已校准/);
  const malformed = createApp({ stored: '{invalid-json' });
  assert.match(malformed.get('statusBtn').textContent, /未校准/);
  near(malformed.px('width'), 80 * 96 / 25.4, 'invalid storage default');
});

check('pinch zoom blocks saving calibration', () => {
  const app = createApp();
  app.window.visualViewport.scale = 1.2;
  app.calibration(4);
  assert.equal(app.get('calDialog').open, true);
  assert.match(app.get('statusBtn').textContent, /未校准/);
  assert.equal(app.memory.has(KEY), false);
  assert.match(app.get('toast').textContent, /结束双指缩放/);
});

function screenParameters(app, { diagonal = 27, width = 3840, height = 2160, mode = 'auto', percent = 100 } = {}) {
  app.click('calibrateBtn');
  app.click('screenTab');
  app.enter('screenDiagonal', diagonal, 'input');
  app.enter('screenPixelWidth', width, 'input');
  app.enter('screenPixelHeight', height, 'input');
  app.enter('screenScaleMode', mode);
  app.enter('screenScaleInput', percent, 'input');
}

check('screen parameters use physical diagonal and current DPR without double scaling', () => {
  for (const dpr of [1, 1.5, 2]) {
    const app = createApp({ dpr });
    screenParameters(app);
    assert.equal(app.get('screenParams').hidden, false);
    assert.equal(app.get('calArea').hidden, true);
    assert.equal(app.get('physicalControls').hidden, true);
    assert.equal(app.get('saveCalBtn').disabled, false);
    app.click('saveCalBtn');
    const expected = Math.hypot(3840, 2160) / 27 / 25.4 / dpr;
    near(app.px('width'), 80 * expected, `DPR ${dpr} screen-calibrated width`);
    near(app.px('height'), 60 * expected, `DPR ${dpr} screen-calibrated height`);
    assert.match(app.get('statusBtn').textContent, /参数估算/);
    assert.equal(app.get('statusBtn').classList.contains('calibrated'), false);
    const saved = JSON.parse(app.memory.get(KEY));
    near(saved.pmm, expected, 'saved parameter scale');
    assert.equal(saved.calibration.method, 'screen');
    assert.deepEqual(saved.calibration.screen, { diagonal: 27, width: 3840, height: 2160, scaleMode: 'auto', manualPercent: 100 });
  }
});

check('manual total scaling replaces DPR and portrait resolution preserves the physical ratio', () => {
  const app = createApp({ dpr: 2 });
  screenParameters(app, { diagonal: 24, width: 1920, height: 1080, mode: 'manual', percent: 150 });
  assert.equal(app.get('screenScaleWrap').hidden, false);
  app.click('saveCalBtn');
  const expected = Math.hypot(1920, 1080) / 24 / 25.4 / 1.5;
  near(app.px('width'), 80 * expected, 'manual total scale replaces device DPR');
  screenParameters(app, { diagonal: 24, width: 1080, height: 1920, mode: 'manual', percent: 150 });
  app.click('saveCalBtn');
  near(app.px('width'), 80 * expected, 'portrait physical diagonal scale');
});

check('screen presets synchronize numeric fields and save recalculates the current inputs', () => {
  const app = createApp();
  app.click('calibrateBtn');
  app.click('screenTab');
  app.enter('screenSizePreset', '31.5');
  app.enter('screenResolution', '3440,1440');
  assert.equal(String(app.get('screenDiagonal').value), '31.5');
  assert.equal(String(app.get('screenPixelWidth').value), '3440');
  assert.equal(String(app.get('screenPixelHeight').value), '1440');
  app.enter('screenDiagonal', '27.2', 'input');
  app.enter('screenPixelWidth', '3000', 'input');
  app.enter('screenPixelHeight', '2000', 'input');
  assert.equal(app.get('screenSizePreset').value, 'custom');
  assert.equal(app.get('screenResolution').value, 'custom');
  // A save must not depend on the browser having fired a preceding input event.
  app.get('screenDiagonal').value = '28';
  app.click('saveCalBtn');
  near(app.px('width'), 80 * Math.hypot(3000, 2000) / 28 / 25.4, 'save uses latest values');
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.screen.diagonal, 28);
});

check('invalid screen inputs cannot overwrite a committed physical calibration', () => {
  const invalidInputs = [
    ['screenDiagonal', ''], ['screenDiagonal', 0], ['screenDiagonal', 'NaN'], ['screenDiagonal', 151],
    ['screenPixelWidth', 319], ['screenPixelHeight', 32769], ['screenPixelWidth', 1920.5],
    ['screenScaleInput', 24], ['screenScaleInput', 1001],
  ];
  for (const [field, value] of invalidInputs) {
    const app = createApp();
    app.calibration(4);
    const saved = app.memory.get(KEY);
    screenParameters(app, { mode: 'manual' });
    app.enter(field, value, 'input');
    assert.equal(app.get('saveCalBtn').disabled, true, `${field} ${value} disables save`);
    app.click('saveCalBtn'); // Exercise the handler's own guard, beyond disabled UI.
    assert.equal(app.get('calDialog').open, true, `${field} ${value} keeps dialog open`);
    near(app.px('width'), 320, `${field} ${value} preserves physical width`);
    assert.equal(app.memory.get(KEY), saved, `${field} ${value} preserves saved calibration`);
  }
  for (const parameters of [
    { diagonal: 150, width: 320, height: 320, mode: 'manual', percent: 1000 },
    { diagonal: 3, width: 32768, height: 32768, mode: 'manual', percent: 25 },
  ]) {
    const app = createApp();
    screenParameters(app, parameters);
    assert.equal(app.get('saveCalBtn').disabled, true, 'out-of-range calculated scale disables save');
    app.click('saveCalBtn');
    assert.equal(app.memory.has(KEY), false, 'invalid calculated scale not persisted');
    assert.equal(app.get('calDialog').open, true);
  }
});

check('coin presets render the selected diameter and persist the exact version', () => {
  const app = createApp();
  app.click('calibrateBtn');
  app.enter('calScaleInput', 4);
  app.click('coinTab');
  assert.equal(app.get('coinWrap').hidden, false);
  assert.equal(app.get('screenParams').hidden, true);
  assert.equal(app.get('calCard').classList.contains('coin'), true);
  const diameters = {
    'cny-1-2019': 22.25, 'cny-1-1999': 25, 'cny-05': 20.5, 'cny-01': 19,
    'usd-25': 24.26, 'usd-10': 17.91, 'usd-5': 21.21, 'usd-1': 19.05,
    'eur-2': 25.75, 'eur-1': 23.25,
  };
  for (const [coin, diameter] of Object.entries(diameters)) {
    app.enter('coinSelect', coin);
    near(parseFloat(app.get('calCard').style.width), diameter * 4, `${coin} circle width`);
    near(parseFloat(app.get('calCard').style.height), diameter * 4, `${coin} circle height`);
    assert.match(app.get('referenceLabel').textContent, new RegExp(diameter.toFixed(2).replace('.', '\\.')));
    assert.ok(app.get('coinInfo').textContent.length > 0, `${coin} version explanation`);
  }
  app.enter('coinSelect', 'cny-1-1999');
  app.click('saveCalBtn');
  const saved = JSON.parse(app.memory.get(KEY));
  assert.equal(saved.calibration.method, 'coin');
  assert.equal(saved.calibration.coin, 'cny-1-1999');
  near(saved.pmm, 4, 'saved coin-matched scale');
  assert.match(app.get('statusBtn').textContent, /已校准/);
  const restored = createApp({ stored: app.memory.get(KEY) });
  restored.click('calibrateBtn');
  assert.equal(restored.get('coinSelect').value, 'cny-1-1999');
  assert.equal(restored.get('coinTab').getAttribute('aria-pressed'), 'true');
  near(parseFloat(restored.get('calCard').style.width), 100, 'restored selected coin diameter');
});

check('parameter calibration restores with its method and becomes invalid after a DPR change', () => {
  const app = createApp({ dpr: 1.5 });
  screenParameters(app, { diagonal: 27, width: 2560, height: 1440, mode: 'manual', percent: 150 });
  app.click('saveCalBtn');
  const committedWidth = app.px('width');
  const restored = createApp({ dpr: 1.5, stored: app.memory.get(KEY) });
  near(restored.px('width'), committedWidth, 'restored parameter width');
  assert.match(restored.get('statusBtn').textContent, /参数估算/);
  restored.click('calibrateBtn');
  assert.equal(restored.get('screenTab').getAttribute('aria-pressed'), 'true');
  assert.equal(Number(restored.get('screenDiagonal').value), 27);
  assert.equal(Number(restored.get('screenPixelWidth').value), 2560);
  assert.equal(Number(restored.get('screenPixelHeight').value), 1440);
  assert.equal(restored.get('screenScaleMode').value, 'manual');
  assert.equal(Number(restored.get('screenScaleInput').value), 150);
  restored.click('cancelCalBtn');
  restored.window.devicePixelRatio = 2;
  restored.window.emit('resize');
  assert.match(restored.get('statusBtn').textContent, /未校准/);
  assert.match(restored.get('warning').textContent, /重新校准/);
  near(restored.px('width'), committedWidth, 'DPR change does not silently alter committed size');
});

check('canceling screen or coin drafts keeps the committed physical calibration', () => {
  for (const mode of ['screen', 'coin']) {
    const app = createApp();
    app.calibration(4);
    const saved = app.memory.get(KEY);
    app.click('calibrateBtn');
    app.click(mode + 'Tab');
    if (mode === 'screen') app.enter('screenDiagonal', 32, 'input');
    else app.enter('calScaleInput', 5);
    app.click('cancelCalBtn');
    near(app.px('width'), 320, `${mode} cancellation preserves width`);
    assert.match(app.get('statusBtn').textContent, /已校准/);
    assert.equal(app.memory.get(KEY), saved, `${mode} cancellation preserves persisted calibration`);
  }
});

console.log(`\n${checks.length} behavior checks passed.`);
