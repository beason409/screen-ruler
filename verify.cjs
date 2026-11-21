'use strict';

// Run with: node verify.cjs
// Executes the shipped inline script unchanged against a deliberately small DOM.
// These are behavior checks, not a substitute for a browser or physical calibration.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, 'screen-ruler.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const KEY = 'screen-ruler-v1';
const LANGUAGE_KEY = 'screen-ruler-language';

function createApp({ width = 800, height = 500, dpr = 1, stored, language, denyStorage = false } = {}) {
  let document;
  const raf = [];
  const memory = new Map(stored === undefined ? [] : [[KEY, typeof stored === 'string' ? stored : JSON.stringify(stored)]]);
  if (language !== undefined) memory.set(LANGUAGE_KEY, language);
  const context2d = () => Object.fromEntries(['scale', 'beginPath', 'moveTo', 'lineTo', 'save', 'translate', 'rotate', 'fillText', 'restore', 'stroke'].map(name => [name, () => {}]));
  class Element {
    constructor(tag = 'div', attrs = '') {
      this.tagName = tag.toUpperCase();
      this.listeners = new Map();
      this.attributes = {};
      this.dataset = {};
      this._value = '';
      Object.defineProperty(this, 'value', {
        get() { return this._value; },
        set(value) { this._value = String(value); },
      });
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.childrenBySelector = new Map();
      this.textContent = '';
      this.innerHTML = '';
      this.open = false;
      this.hidden = /\bhidden\b/.test(attrs);
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
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
      const event = { type, target: this, button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {}, ...details };
      const pending = [];
      if (typeof this['on' + type] === 'function') {
        const result = this['on' + type](event);
        if (result?.then) pending.push(result);
      }
      for (const callback of this.listeners.get(type) || []) {
        const result = callback(event);
        if (result?.then) pending.push(result);
      }
      return pending.length ? Promise.all(pending).then(() => event) : event;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    hasAttribute(name) { return name in this.attributes; }
    removeAttribute(name) { delete this.attributes[name]; }
    toggleAttribute(name, force) {
      const enabled = force === undefined ? !this.hasAttribute(name) : force;
      if (enabled) this.setAttribute(name, ''); else this.removeAttribute(name);
      return enabled;
    }
    click() { return this.emit('click'); }
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
  document.documentElement = new Element('html');
  document.activeElement = null;
  document.hidden = false;
  document.fullscreenElement = null;
  document.getElementById = id => byId.get(id) || null;
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
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} },
    matchMedia: () => new Element('mediaquery'),
    getComputedStyle: () => ({ getPropertyValue: () => '#8597a5' }),
    setTimeout: () => 1,
    clearTimeout() {},
    console,
  };
  vm.runInNewContext(source, sandbox, { filename: 'screen-ruler.html:inline', timeout: 1000 });
  const flushRaf = () => {
    let count = 0;
    while (raf.length) {
      assert(++count < 100, 'Animation frame queue must settle');
      raf.shift()();
    }
  };
  flushRaf();
  const get = id => {
    const element = document.getElementById(id);
    assert.ok(element, `Missing UI element: ${id}`);
    return element;
  };
  const click = id => get(id).emit('click');
  const enter = (id, value, event = 'change') => { get(id).value = String(value); get(id).emit(event); };
  const selectUnit = unit => dataElements.find(el => el.dataset.unit === unit).emit('click');
  const px = property => parseFloat(get('measureBox').style[property]);
  const calibration = pmm => { click('calibrateBtn'); enter('calScaleInput', pmm); click('saveCalBtn'); };
  const addElement = (id, tag = 'button') => {
    const element = new Element(tag);
    element.setAttribute('id', id);
    byId.set(id, element);
    return element;
  };
  const setSize = (nextWidth, nextHeight) => { width = nextWidth; height = nextHeight; };
  return { get, click, enter, selectUnit, px, calibration, window, screen, document, memory, dataElements, flushRaf, addElement, setSize };
}

function near(actual, expected, label) { assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: expected ${expected}, got ${actual}`); }
function noChinese(text, label) { assert.ok(!/\p{Script=Han}/u.test(text), `${label} should be translated: ${text}`); }
function pageLanguage(app) { return app.document.documentElement.lang || app.document.documentElement.getAttribute('lang'); }
const checks = [];
function check(name, callback) {
  callback();
  checks.push(name);
  console.log(`PASS ${name}`);
}

check('uncalibrated startup and calibration save/cancel', () => {
  const app = createApp();
  assert.equal(app.document.getElementById('statusBtn'), null, 'the duplicate workspace calibration entry is removed');
  assert.equal(app.memory.has(KEY), false, 'startup has no committed calibration');
  app.calibration(4);
  near(app.px('width'), 320, 'calibrated width');
  near(app.px('height'), 240, 'calibrated height');
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.method, 'card');
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.signature, '1920|1080|1|landscape');
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
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.signature, '1920|1080|2|landscape');
  assert.equal(app.get('rulerX').style.width, '800px');
  assert.equal(app.get('rulerX').style.height, '36px');
  assert.equal(app.get('rulerX').width, 1600);
  assert.equal(app.get('rulerY').style.width, '36px');
  assert.equal(app.get('rulerY').style.height, '500px');
  assert.equal(app.get('rulerY').height, 1000);
  app.window.devicePixelRatio = 1.5;
  app.window.emit('resize');
  assert.match(app.get('warning').textContent, /重新校准/);
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.signature, '1920|1080|2|landscape', 'environment changes do not rewrite the previous signature');
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
  assert.equal(JSON.parse(restored.memory.get(KEY)).calibration.method, 'card');
  assert.equal(restored.get('warning').textContent.includes('重新校准'), false);
  const malformed = createApp({ stored: '{invalid-json' });
  near(malformed.px('width'), 80 * 96 / 25.4, 'invalid storage default');
});

check('pinch zoom blocks saving calibration', () => {
  const app = createApp();
  app.window.visualViewport.scale = 1.2;
  app.calibration(4);
  assert.equal(app.get('calDialog').open, true);
  assert.equal(app.memory.has(KEY), false);
  assert.match(app.get('toast').textContent, /结束双指缩放/);
});

function screenParameters(app, { diagonal = 27, width = 3840, height = 2160, mode = 'auto', percent = 100 } = {}) {
  app.click('calibrateBtn');
  app.click('screenTab');
  const preset = app.get('screenSizePreset').options.find(option => option.value === String(diagonal) && option.value !== 'custom');
  app.enter('screenSizePreset', preset ? preset.value : 'custom');
  app.enter('screenVisibleDiagonal', preset || diagonal === '' ? '' : Number(diagonal) * 25.4, 'input');
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
    const saved = JSON.parse(app.memory.get(KEY));
    near(saved.pmm, expected, 'saved parameter scale');
    assert.equal(saved.calibration.method, 'screen');
    const { source: chosenSource, specs, ...legacyFields } = saved.calibration.screen;
    assert.deepEqual(legacyFields, { diagonal: 27, width: 3840, height: 2160, scaleMode: 'auto', manualPercent: 100 });
    assert.equal(chosenSource, '常见屏幕尺寸');
    assert.equal(specs.sizePreset, '27');
    assert.equal(specs.sizeUnit, 'in');
    assert.equal('diagonalValue' in specs, false);
    assert.equal('diagonalUnit' in specs, false);
    assert.equal(specs.physicalWidth, '');
    assert.equal(specs.nativeMode, 'unknown');
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

check('screen presets and visible dimensions save the latest inputs without a duplicate diagonal field', () => {
  const app = createApp();
  assert.equal(app.document.getElementById('screenDiagonal'), null, 'the independent diagonal input is removed');
  assert.equal(app.document.getElementById('screenDiagonalUnit'), null, 'the removed input has no leftover unit control');
  app.click('calibrateBtn');
  app.click('screenTab');
  app.enter('screenSizePreset', '31.5');
  app.enter('screenResolution', '3440,1440');
  assert.equal(app.get('screenSizePreset').value, '31.5');
  assert.equal(String(app.get('screenPixelWidth').value), '3440');
  assert.equal(String(app.get('screenPixelHeight').value), '1440');
  app.enter('screenSizePreset', 'custom');
  app.enter('screenVisibleDiagonal', 27.2 * 25.4, 'input');
  app.enter('screenPixelWidth', '3000', 'input');
  app.enter('screenPixelHeight', '2000', 'input');
  assert.equal(app.get('screenSizePreset').value, 'custom');
  assert.equal(app.get('screenResolution').value, 'custom');
  // A save must not depend on the browser having fired a preceding input event.
  app.get('screenVisibleDiagonal').value = 28 * 25.4;
  app.click('saveCalBtn');
  near(app.px('width'), 80 * Math.hypot(3000, 2000) / 28 / 25.4, 'save uses latest values');
  near(JSON.parse(app.memory.get(KEY)).calibration.screen.diagonal, 28, 'custom visible size is recorded');
});

check('invalid screen inputs cannot overwrite a committed physical calibration', () => {
  const invalidInputs = [
    ['screenSizePreset', 'custom'], ['screenVisibleDiagonal', 0], ['screenVisibleDiagonal', 'NaN'], ['screenVisibleDiagonal', 151 * 25.4],
    ['screenPixelWidth', 319], ['screenPixelHeight', 32769], ['screenPixelWidth', 1920.5],
    ['screenScaleInput', 24], ['screenScaleInput', 1001],
  ];
  for (const [field, value] of invalidInputs) {
    const app = createApp();
    app.calibration(4);
    const saved = app.memory.get(KEY);
    screenParameters(app, { mode: 'manual' });
    app.enter(field, value, field === 'screenSizePreset' ? 'change' : 'input');
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
  assert.equal(JSON.parse(restored.memory.get(KEY)).calibration.method, 'screen');
  restored.click('calibrateBtn');
  assert.equal(restored.get('screenTab').getAttribute('aria-pressed'), 'true');
  assert.equal(restored.get('screenSizePreset').value, '27');
  assert.equal(Number(restored.get('screenPixelWidth').value), 2560);
  assert.equal(Number(restored.get('screenPixelHeight').value), 1440);
  assert.equal(restored.get('screenScaleMode').value, 'manual');
  assert.equal(Number(restored.get('screenScaleInput').value), 150);
  restored.click('cancelCalBtn');
  restored.window.devicePixelRatio = 2;
  restored.window.emit('resize');
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
    if (mode === 'screen') app.enter('screenSizePreset', '32');
    else app.enter('calScaleInput', 5);
    app.click('cancelCalBtn');
    near(app.px('width'), 320, `${mode} cancellation preserves width`);
    assert.equal(app.memory.get(KEY), saved, `${mode} cancellation preserves persisted calibration`);
  }
});

function enterSpecs(app, fields) {
  for (const [id, value] of Object.entries(fields)) app.enter(id, value);
}

const SAMPLE_WIDTH_MM = 596.736;
const SAMPLE_HEIGHT_MM = 335.664;
const SAMPLE_PITCH_MM = 0.2331;

check('precise display dimensions override rounded diagonals and cross-check consistent specifications', () => {
  const app = createApp({ dpr: 1.475 });
  screenParameters(app, { width: 2560, height: 1440 });
  enterSpecs(app, {
    screenVisibleDiagonal: 685,
    screenPhysicalWidth: SAMPLE_WIDTH_MM,
    screenPhysicalHeight: SAMPLE_HEIGHT_MM,
    screenPitchX: SAMPLE_PITCH_MM,
    screenPitchY: SAMPLE_PITCH_MM,
    screenAspectRatio: '16:9',
    screenNativeMode: 'current',
  });
  assert.equal(app.get('saveCalBtn').disabled, false);
  assert.match(app.get('screenResult').textContent, /采用：画面宽高/);
  assert.match(app.get('screenResult').textContent, /596\.736 × 335\.664 mm/);
  assert.match(app.get('screenResult').textContent, /其余已填规格一致/);
  assert.equal(app.get('screenChecks').hidden, true, '27 inches and 685 mm are valid rounded specifications');
  app.click('saveCalBtn');
  const saved = JSON.parse(app.memory.get(KEY));
  near(saved.pmm, 2.90847748474867, 'exact sample display scale');
  near(app.px('width'), 80 / SAMPLE_PITCH_MM / 1.475, 'exact dimensions drive the visible ruler');
  assert.equal(saved.calibration.screen.source, '画面宽高');
});

check('a single physical dimension or visible diagonal can calibrate without a screen size preset', () => {
  for (const [field, value] of [['screenPhysicalWidth', SAMPLE_WIDTH_MM], ['screenPhysicalHeight', SAMPLE_HEIGHT_MM]]) {
    const app = createApp();
    screenParameters(app, { diagonal: '', width: 2560, height: 1440 });
    enterSpecs(app, { screenAspectRatio: '16:9', [field]: value });
    assert.equal(app.get('saveCalBtn').disabled, false, `${field} is sufficient`);
    app.click('saveCalBtn');
    near(JSON.parse(app.memory.get(KEY)).pmm, 1 / SAMPLE_PITCH_MM, `${field} derives the missing axis`);
  }
  const app = createApp({ dpr: 1.5 });
  screenParameters(app, { diagonal: '', width: 2560, height: 1440 });
  app.enter('screenVisibleDiagonal', 685);
  app.click('saveCalBtn');
  near(JSON.parse(app.memory.get(KEY)).pmm, Math.hypot(2560, 1440) / 685 / 1.5, 'visible diagonal alone');
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.screen.source, '可视对角线');
});

check('pixel pitch uses confirmed native pixels while output resolution controls CSS scale', () => {
  for (const [width, height, expected] of [[2560, 1440, 2.90847748474867], [1920, 1080, 2.1813581135615]]) {
    const app = createApp({ dpr: 1.475 });
    screenParameters(app, { diagonal: '', width, height });
    enterSpecs(app, {
      screenPitchX: SAMPLE_PITCH_MM,
      screenPitchY: SAMPLE_PITCH_MM,
      screenNativeMode: 'custom',
      screenNativeWidth: 2560,
      screenNativeHeight: 1440,
    });
    assert.equal(app.get('screenNativeWrap').hidden, false);
    assert.equal(app.get('saveCalBtn').disabled, false);
    assert.match(app.get('screenResult').textContent, /596\.736 × 335\.664 mm/);
    app.click('saveCalBtn');
    near(JSON.parse(app.memory.get(KEY)).pmm, expected, `${width}x${height} output at unchanged physical dimensions`);
  }
  const app = createApp({ dpr: 2 });
  screenParameters(app, { diagonal: '', width: 2560, height: 1440, mode: 'manual', percent: 147.5 });
  enterSpecs(app, { screenPitchX: SAMPLE_PITCH_MM, screenNativeMode: 'current' });
  app.click('saveCalBtn');
  near(JSON.parse(app.memory.get(KEY)).pmm, 2.90847748474867, 'single-axis pitch and manual scale avoid double DPR scaling');
});

check('unknown native resolution never treats pixel pitch or density as a physical size', () => {
  const app = createApp();
  app.calibration(4);
  const committed = app.memory.get(KEY);
  screenParameters(app, { diagonal: '', width: 2560, height: 1440 });
  enterSpecs(app, { screenPitchX: SAMPLE_PITCH_MM, screenDensity: 1 / SAMPLE_PITCH_MM });
  assert.equal(app.get('saveCalBtn').disabled, true);
  assert.match(app.get('screenChecks').textContent, /尚未参与/);
  app.click('saveCalBtn');
  assert.equal(app.memory.get(KEY), committed, 'unconfirmed pitch cannot replace a physical calibration');
  app.enter('screenSizePreset', '27');
  assert.equal(app.get('saveCalBtn').disabled, false, 'known diagonal remains sufficient');
  app.click('saveCalBtn');
  const expected = Math.hypot(2560, 1440) / 27 / 25.4;
  near(JSON.parse(app.memory.get(KEY)).pmm, expected, 'unconfirmed pitch is excluded from the chosen scale');
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.screen.source, '常见屏幕尺寸');
});

check('panel density supports metric and imperial units without changing the physical scale', () => {
  const app = createApp({ dpr: 1.475 });
  screenParameters(app, { diagonal: '', width: 2560, height: 1440 });
  enterSpecs(app, { screenDensity: 1 / SAMPLE_PITCH_MM, screenNativeMode: 'current' });
  for (const [unit, factor] of [['ppmm', 1], ['ppcm', 10], ['ppi', 25.4], ['ppmm', 1]]) {
    app.enter('screenDensityUnit', unit);
    near(Number(app.get('screenDensity').value), factor / SAMPLE_PITCH_MM, `density converted to ${unit}`);
    assert.equal(app.get('saveCalBtn').disabled, false);
    app.click('saveCalBtn');
    near(JSON.parse(app.memory.get(KEY)).pmm, 2.90847748474867, `${unit} scale remains unchanged`);
    app.click('calibrateBtn');
  }
});

check('length unit changes convert existing inputs, presets, and blanks without changing calibration', () => {
  const app = createApp({ dpr: 1.475 });
  screenParameters(app, { width: 2560, height: 1440 });
  enterSpecs(app, {
    screenPhysicalWidth: SAMPLE_WIDTH_MM,
    screenPhysicalHeight: SAMPLE_HEIGHT_MM,
    screenPitchX: SAMPLE_PITCH_MM,
    screenNativeMode: 'current',
  });
  for (const [unit, factor] of [['cm', 10], ['in', 25.4], ['mm', 1]]) {
    app.enter('screenSpecUnit', unit);
    near(Number(app.get('screenPhysicalWidth').value), SAMPLE_WIDTH_MM / factor, `${unit} physical width`);
    near(Number(app.get('screenPitchX').value), SAMPLE_PITCH_MM / factor, `${unit} pitch`);
    assert.equal(app.get('screenVisibleDiagonal').value, '', `${unit} preserves empty diagonal`);
    assert.equal(app.get('screenPitchY').value, '', `${unit} preserves empty pitch`);
    assert.equal(app.get('physicalWidthUnit').textContent, unit);
    app.click('saveCalBtn');
    near(JSON.parse(app.memory.get(KEY)).pmm, 2.90847748474867, `${unit} retains the same ruler scale`);
    app.click('calibrateBtn');
  }
  app.enter('screenSizeUnit', 'cm');
  assert.equal(app.get('screenSizePreset').value, '27');
  assert.match(app.get('screenSizePreset').selectedOptions[0].textContent, /68\.58 cm/);
  app.enter('screenSizePreset', '24');
  assert.match(app.get('screenSizePreset').selectedOptions[0].textContent, /60\.96 cm/);
  app.enter('screenSizeUnit', 'mm');
  assert.match(app.get('screenSizePreset').selectedOptions[0].textContent, /609\.6 mm/);
  assert.equal(app.get('screenSizePreset').value, '24', 'display units never replace the selected screen size');
  app.enter('screenSizePreset', 'custom');
  app.enter('screenSizeUnit', 'in');
  assert.equal(app.get('screenVisibleDiagonal').value, '', 'an empty visible size stays optional');
  const presetOnly = createApp({ dpr: 1.475 });
  screenParameters(presetOnly, { width: 2560, height: 1440 });
  for (const unit of ['cm', 'mm', 'in']) {
    presetOnly.enter('screenSizeUnit', unit);
    presetOnly.click('saveCalBtn');
    near(JSON.parse(presetOnly.memory.get(KEY)).pmm, Math.hypot(2560, 1440) / 27 / 25.4 / 1.475, `${unit} screen preset retains its actual size`);
    presetOnly.click('calibrateBtn');
  }
});

check('conflicting redundant specifications warn without averaging, and disappear when corrected', () => {
  const app = createApp();
  screenParameters(app, { diagonal: 32, width: 2560, height: 1440 });
  enterSpecs(app, { screenPhysicalWidth: SAMPLE_WIDTH_MM, screenPhysicalHeight: SAMPLE_HEIGHT_MM });
  assert.equal(app.get('saveCalBtn').disabled, false, 'direct dimensions remain usable');
  assert.equal(app.get('screenChecks').hidden, false);
  assert.match(app.get('screenChecks').textContent, /常见屏幕尺寸.*画面宽高.*相差/);
  app.click('saveCalBtn');
  near(JSON.parse(app.memory.get(KEY)).pmm, 1 / SAMPLE_PITCH_MM, 'conflicting diagonal is not averaged in');
  app.click('calibrateBtn');
  app.enter('screenSizePreset', '27');
  assert.equal(app.get('screenChecks').hidden, true, 'corrected rounded diagonal clears the warning');
  app.enter('screenAspectRatio', '4:3');
  assert.equal(app.get('saveCalBtn').disabled, false, 'explicit two-axis dimensions remain authoritative');
  assert.match(app.get('screenChecks').textContent, /宽高比.*不一致/);
});

check('incompatible axes and invalid optional specs preserve the committed calibration', () => {
  for (const [field, value] of [
    ['screenPhysicalWidth', 0], ['screenPhysicalHeight', -1], ['screenVisibleDiagonal', 0],
    ['screenPitchX', 0.0001], ['screenPitchY', 'NaN'], ['screenDensity', 0],
    ['screenAspectRatio', '16:0'], ['screenAspectRatio', 'wide'],
  ]) {
    const app = createApp();
    app.calibration(4);
    const committed = app.memory.get(KEY);
    screenParameters(app, { width: 2560, height: 1440 });
    app.enter(field, value);
    assert.equal(app.get('saveCalBtn').disabled, true, `${field} ${value} blocks save`);
    app.click('saveCalBtn');
    assert.equal(app.get('calDialog').open, true);
    assert.equal(app.memory.get(KEY), committed);
    near(app.px('width'), 320, `${field} ${value} preserves the displayed ruler`);
  }
  const app = createApp();
  app.calibration(4);
  const committed = app.memory.get(KEY);
  screenParameters(app, { diagonal: '', width: 2560, height: 1440 });
  enterSpecs(app, { screenPhysicalWidth: SAMPLE_WIDTH_MM, screenPhysicalHeight: 400 });
  assert.equal(app.get('saveCalBtn').disabled, true);
  assert.match(app.get('screenResult').textContent, /宽高比不一致/);
  app.click('saveCalBtn');
  assert.equal(app.memory.get(KEY), committed);
  app.enter('screenPhysicalHeight', SAMPLE_HEIGHT_MM);
  assert.equal(app.get('saveCalBtn').disabled, false, 'matching axes recover without reopening the dialog');
  enterSpecs(app, { screenNativeMode: 'custom', screenNativeWidth: 2560 });
  assert.equal(app.get('saveCalBtn').disabled, true, 'custom native mode needs both pixel dimensions');
  app.enter('screenNativeHeight', 1440);
  assert.equal(app.get('saveCalBtn').disabled, false);
});

check('unfinished number input is not treated as an optional blank or allowed to replace calibration', () => {
  for (const id of [
    'screenVisibleDiagonal', 'screenPhysicalWidth', 'screenPhysicalHeight',
    'screenPitchX', 'screenPitchY', 'screenDensity', 'screenPixelWidth', 'screenPixelHeight',
    'screenScaleInput', 'screenNativeWidth', 'screenNativeHeight',
  ]) {
    const app = createApp();
    app.calibration(4);
    const committed = app.memory.get(KEY);
    screenParameters(app, { width: 2560, height: 1440, mode: 'manual' });
    enterSpecs(app, { screenNativeMode: 'custom', screenNativeWidth: 2560, screenNativeHeight: 1440 });
    const input = app.get(id);
    const validValue = input.value;
    // Native number inputs expose value='' but badInput=true while the user types '-' or '1e'.
    input.validity = { badInput: true };
    app.enter(id, '', 'input');
    assert.equal(app.get('saveCalBtn').disabled, true, `${id} unfinished input disables save`);
    assert.match(app.get('screenResult').textContent, /尚未填写完整/);
    app.click('saveCalBtn');
    assert.equal(app.get('calDialog').open, true);
    assert.equal(app.memory.get(KEY), committed, `${id} cannot overwrite the previous calibration`);
    near(app.px('width'), 320, `${id} keeps the committed ruler scale`);
    input.validity = { badInput: false };
    app.enter(id, validValue, 'input');
    assert.equal(app.get('saveCalBtn').disabled, false, `${id} recovers when the number is completed or cleared`);
  }
  const app = createApp();
  screenParameters(app, { width: 2560, height: 1440, mode: 'manual' });
  app.get('screenScaleInput').validity = { badInput: true };
  app.enter('screenScaleInput', '', 'input');
  assert.equal(app.get('saveCalBtn').disabled, true);
  app.enter('screenScaleMode', 'auto');
  assert.equal(app.get('saveCalBtn').disabled, false, 'unused manual scale does not block automatic mode');
  enterSpecs(app, { screenNativeMode: 'custom', screenNativeWidth: 2560, screenNativeHeight: 1440 });
  app.get('screenNativeWidth').validity = { badInput: true };
  app.enter('screenNativeWidth', '', 'input');
  assert.equal(app.get('saveCalBtn').disabled, true);
  app.enter('screenNativeMode', 'unknown');
  assert.equal(app.get('saveCalBtn').disabled, false, 'unused custom native input does not block known diagonal calibration');
});

check('portrait specifications use current axis directions instead of silently stretching the ruler', () => {
  const app = createApp();
  screenParameters(app, { diagonal: '', width: 1440, height: 2560 });
  enterSpecs(app, { screenPhysicalWidth: SAMPLE_WIDTH_MM, screenPhysicalHeight: SAMPLE_HEIGHT_MM });
  assert.equal(app.get('saveCalBtn').disabled, true, 'landscape spec order is incompatible with portrait output');
  assert.match(app.get('screenResult').textContent, /横竖方向/);
  enterSpecs(app, { screenPhysicalWidth: SAMPLE_HEIGHT_MM, screenPhysicalHeight: SAMPLE_WIDTH_MM, screenAspectRatio: '9:16' });
  assert.equal(app.get('saveCalBtn').disabled, false);
  app.click('saveCalBtn');
  near(JSON.parse(app.memory.get(KEY)).pmm, 1 / SAMPLE_PITCH_MM, 'correctly oriented portrait scale');
});

check('optional specifications and unit preferences restore while old parameter records remain compatible', () => {
  const app = createApp({ dpr: 1.475 });
  screenParameters(app, { diagonal: '', width: 1920, height: 1080, mode: 'manual', percent: 147.5 });
  enterSpecs(app, {
    screenVisibleDiagonal: 685,
    screenPhysicalWidth: SAMPLE_WIDTH_MM,
    screenPhysicalHeight: SAMPLE_HEIGHT_MM,
    screenPitchX: SAMPLE_PITCH_MM,
    screenPitchY: SAMPLE_PITCH_MM,
    screenDensity: 1 / SAMPLE_PITCH_MM,
    screenAspectRatio: '16:9',
    screenNativeMode: 'custom',
    screenNativeWidth: 2560,
    screenNativeHeight: 1440,
    screenSizeUnit: 'cm',
    screenSpecUnit: 'cm',
    screenDensityUnit: 'ppcm',
  });
  app.click('saveCalBtn');
  const saved = JSON.parse(app.memory.get(KEY));
  near(saved.pmm, 2.1813581135615, 'saved lowered-output scale');
  const restored = createApp({ dpr: 1.475, stored: saved });
  restored.click('calibrateBtn');
  assert.equal(restored.get('screenSizePreset').value, 'custom', 'an unselected preset is retained');
  assert.equal(restored.get('screenSizeUnit').value, 'cm');
  assert.equal(restored.get('screenSpecUnit').value, 'cm');
  assert.equal(restored.get('screenDensityUnit').value, 'ppcm');
  assert.equal(restored.get('screenNativeMode').value, 'custom');
  assert.equal(restored.get('screenNativeWidth').value, '2560');
  assert.equal(restored.get('screenNativeHeight').value, '1440');
  near(Number(restored.get('screenPhysicalWidth').value), 59.6736, 'restored metric width');
  near(Number(restored.get('screenPitchY').value), 0.02331, 'restored metric pitch');
  assert.equal(restored.get('screenAspectRatio').value, '16:9');
  assert.equal(restored.get('saveCalBtn').disabled, false);
  restored.click('saveCalBtn');
  assert.deepEqual(JSON.parse(restored.memory.get(KEY)).calibration.screen.specs, saved.calibration.screen.specs);
  near(restored.px('width'), app.px('width'), 're-saving restored specs leaves the scale unchanged');

  const legacy = createApp({ dpr: 1.5 });
  screenParameters(legacy, { width: 2560, height: 1440 });
  legacy.click('saveCalBtn');
  const legacyRecord = JSON.parse(legacy.memory.get(KEY));
  delete legacyRecord.calibration.screen.source;
  delete legacyRecord.calibration.screen.specs;
  const migrated = createApp({ dpr: 1.5, stored: legacyRecord });
  migrated.click('calibrateBtn');
  assert.equal(migrated.get('screenSizeUnit').value, 'in');
  assert.equal(migrated.get('screenSizePreset').value, '27');
  assert.equal(migrated.get('screenPhysicalWidth').value, '');
  assert.equal(migrated.get('screenNativeMode').value, 'unknown');
  assert.equal(migrated.get('saveCalBtn').disabled, false);
  near(migrated.px('width'), legacy.px('width'), 'older calibration still displays at its committed scale');

  for (const prior of [
    { value: '68.58', oldUnit: 'cm', unit: 'mm', visible: '', preset: '27', expectedVisible: null },
    { value: '27.2', oldUnit: 'in', unit: 'cm', visible: '', preset: 'custom', expectedVisible: 69.088 },
    { value: '', oldUnit: 'in', unit: 'mm', visible: '685', preset: 'custom', expectedVisible: 685 },
    { value: '27.2', oldUnit: 'in', unit: 'mm', visible: '685', preset: 'custom', expectedVisible: 685 },
  ]) {
    const previous = JSON.parse(JSON.stringify(legacyRecord));
    previous.calibration.screen.source = '标称对角线';
    previous.calibration.screen.specs = { diagonalValue: prior.value, diagonalUnit: prior.oldUnit, unit: prior.unit, visibleDiagonal: prior.visible };
    const migratedSpecs = createApp({ dpr: 1.5, stored: previous });
    migratedSpecs.click('calibrateBtn');
    assert.equal(migratedSpecs.get('screenSizePreset').value, prior.preset, `${prior.value} old input migrates to a selected or optional preset`);
    assert.equal(migratedSpecs.get('screenSizeUnit').value, prior.oldUnit, 'old display-unit preference survives');
    if (prior.expectedVisible === null) assert.equal(migratedSpecs.get('screenVisibleDiagonal').value, '');
    else near(Number(migratedSpecs.get('screenVisibleDiagonal').value), prior.expectedVisible, 'custom or existing visible dimensions are retained');
    assert.equal(migratedSpecs.get('saveCalBtn').disabled, false);
    migratedSpecs.click('saveCalBtn');
    const updated = JSON.parse(migratedSpecs.memory.get(KEY));
    assert.equal('diagonalValue' in updated.calibration.screen.specs, false, 're-saving removes obsolete independent input metadata');
    const visibleMM = prior.expectedVisible === null ? 27 * 25.4 : prior.expectedVisible * (prior.unit === 'cm' ? 10 : 1);
    near(updated.pmm, Math.hypot(2560, 1440) / visibleMM / 1.5, 'migrated dimensions drive the correct saved scale');
  }
});

check('circle diameter uses the calibrated scale across units and presets', () => {
  const app = createApp();
  app.calibration(4);
  app.enter('widthInput', 90);
  app.enter('heightInput', 45);
  app.click('circleShapeBtn');
  near(app.px('width'), 360, 'first circle adopts rectangle width');
  near(app.px('height'), 360, 'circle height equals its diameter');
  assert.equal(app.get('measureBox').classList.contains('circle'), true);
  assert.equal(app.get('circleShapeBtn').getAttribute('aria-pressed'), 'true');
  assert.equal(app.get('rectangleShapeBtn').getAttribute('aria-pressed'), 'false');
  assert.equal(app.get('widthInput').getAttribute('aria-label'), '圆形直径');
  assert.equal(app.get('heightField').hidden, true);
  assert.equal(app.get('rectangleActions').hidden, true);
  assert.equal(app.get('squareBtn').disabled, true);
  assert.equal(app.get('swapBtn').disabled, true);
  assert.match(app.get('mainReadout').textContent, /Φ\s*90\.0 mm/);
  assert.equal(app.get('measureReadoutLabel').textContent, '直径');
  app.enter('widthInput', 42.5, 'input');
  for (const unit of ['cm', 'in', 'mm']) {
    app.selectUnit(unit);
    near(app.px('width'), 170, `${unit} preserves circle width`);
    near(app.px('height'), 170, `${unit} preserves circle height`);
  }
  app.selectUnit('in');
  app.enter('widthInput', 2, 'input');
  near(app.px('width'), 203.2, 'two-inch circle diameter');
  near(app.px('height'), 203.2, 'two-inch circle remains circular');
  const preset = app.dataElements.find(element => element.dataset.size === '50,80');
  assert.match(preset.textContent, /Φ\s*50/);
  preset.emit('click');
  near(app.px('width'), 200, 'circle preset uses the nominal 50 mm diameter');
  near(app.px('height'), 200, 'rectangular preset cannot make a circle elliptical');
  app.click('squareBtn');
  app.click('swapBtn');
  near(app.px('width'), 200, 'hidden rectangle controls cannot alter circle width');
  near(app.px('height'), 200, 'hidden rectangle controls cannot alter circle height');
});

check('shape switching and storage retain independent rectangle and circle dimensions', () => {
  const app = createApp();
  app.calibration(4);
  app.enter('widthInput', 110);
  app.enter('heightInput', 45);
  app.click('circleShapeBtn');
  app.enter('widthInput', 35.5);
  app.click('rectangleShapeBtn');
  near(app.px('width'), 440, 'rectangle width restored');
  near(app.px('height'), 180, 'rectangle height restored');
  assert.equal(app.get('heightField').hidden, false);
  assert.equal(app.get('measureBox').classList.contains('circle'), false);
  assert.equal(app.get('widthInput').getAttribute('aria-label'), '测量框宽度');
  app.click('circleShapeBtn');
  near(app.px('width'), 142, 'previous circle diameter restored');
  near(app.px('height'), 142, 'restored circle remains circular');
  const saved = JSON.parse(app.memory.get(KEY));
  assert.equal(saved.shape, 'circle');
  near(saved.circleDiameter, 35.5, 'current diameter persisted');
  assert.deepEqual(saved.rectangle, { w: 110, h: 45, square: false });
  const restored = createApp({ stored: app.memory.get(KEY) });
  near(restored.px('width'), 142, 'circle restored after reopening');
  near(restored.px('height'), 142, 'reopened circle aspect ratio');
  assert.equal(restored.get('measureBox').classList.contains('circle'), true);
  restored.click('rectangleShapeBtn');
  near(restored.px('width'), 440, 'rectangle backup restored after reopening');
  near(restored.px('height'), 180, 'rectangle backup height restored after reopening');
  restored.click('squareBtn');
  restored.click('circleShapeBtn');
  restored.enter('widthInput', 20);
  restored.click('rectangleShapeBtn');
  assert.equal(restored.get('squareBtn').getAttribute('aria-pressed'), 'true');
  near(restored.px('width'), 440, 'square width survives a circle round trip');
  near(restored.px('height'), 440, 'square constraint survives a circle round trip');
});

function dragCircleHandle(app, direction, dx, dy) {
  const box = app.get('measureBox');
  const handle = app.dataElements.find(element => element.dataset.h === direction);
  assert.ok(handle, `Missing ${direction} handle`);
  const x = app.px('left'), y = app.px('top'), diameter = app.px('width');
  const start = {
    clientX: x + (direction === 'w' ? 0 : direction === 'e' ? diameter : diameter / 2),
    clientY: y + (direction === 'n' ? 0 : direction === 's' ? diameter : diameter / 2),
  };
  box.emit('pointerdown', { target: handle, ...start });
  box.emit('pointermove', { clientX: start.clientX + dx, clientY: start.clientY + dy });
  box.emit('pointerup', { clientX: start.clientX + dx, clientY: start.clientY + dy });
}

check('circle side handles preserve the opposite endpoint and perpendicular center', () => {
  for (const [direction, dx, dy] of [['e', 40, 0], ['w', -40, 0], ['n', 0, -40], ['s', 0, 40]]) {
    const app = createApp({ width: 1200, height: 900 });
    app.calibration(4);
    app.click('circleShapeBtn');
    app.enter('widthInput', 50);
    const before = { x: app.px('left'), y: app.px('top'), d: app.px('width') };
    dragCircleHandle(app, direction, dx, dy);
    const x = app.px('left'), y = app.px('top'), diameter = app.px('width');
    near(diameter, 240, `${direction} changes diameter by its axis movement`);
    near(app.px('height'), diameter, `${direction} keeps the circle round`);
    if (direction === 'e' || direction === 'w') {
      near(y + diameter / 2, before.y + before.d / 2, `${direction} preserves vertical center`);
      near(direction === 'e' ? x : x + diameter, direction === 'e' ? before.x : before.x + before.d, `${direction} preserves opposite horizontal endpoint`);
    } else {
      near(x + diameter / 2, before.x + before.d / 2, `${direction} preserves horizontal center`);
      near(direction === 's' ? y : y + diameter, direction === 's' ? before.y : before.y + before.d, `${direction} preserves opposite vertical endpoint`);
    }
    dragCircleHandle(app, 'se', 200, 200);
    near(app.px('width'), diameter, 'hidden diagonal handle cannot resize a circle');
    near(app.px('height'), diameter, 'hidden diagonal handle cannot distort a circle');
    near(app.px('left'), x, 'ignored diagonal drag preserves position');
    near(app.px('top'), y, 'ignored diagonal drag preserves vertical position');
  }
});

check('circle resizing respects visible bounds while direct oversized diameters stay exact', () => {
  for (const [direction, dx, dy] of [['e', 1e6, 0], ['w', -1e6, 0], ['n', 0, -1e6], ['s', 0, 1e6]]) {
    const app = createApp({ width: 500, height: 400 });
    app.calibration(4);
    app.click('circleShapeBtn');
    app.enter('widthInput', 50);
    dragCircleHandle(app, direction, dx, dy);
    const x = app.px('left'), y = app.px('top'), diameter = app.px('width');
    near(app.px('height'), diameter, `${direction} boundary still has one diameter`);
    assert.ok(x >= 8 - 1e-8 && y >= 8 - 1e-8, `${direction} top and left stay visible`);
    assert.ok(x + diameter <= 500 - 12 + 1e-8 && y + diameter <= 400 - 12 + 1e-8, `${direction} entire resized circle stays visible`);
    dragCircleHandle(app, direction, -dx * 2, -dy * 2);
    near(app.px('width'), 4, `${direction} minimum diameter is 1 mm`);
    near(app.px('height'), 4, `${direction} minimum remains circular`);
  }
  const app = createApp({ width: 500, height: 400 });
  app.calibration(4);
  app.click('circleShapeBtn');
  app.enter('widthInput', 1000);
  near(app.px('width'), 4000, 'explicit oversized diameter is not auto-scaled');
  near(app.px('height'), 4000, 'explicit oversized diameter remains circular');
  assert.equal(app.get('warning').hidden, false);
  assert.match(app.get('warning').textContent, /超出/);
});

check('circle locking, free movement, and keyboard movement keep the diameter unchanged', () => {
  const app = createApp();
  app.calibration(4);
  app.click('circleShapeBtn');
  app.enter('widthInput', 50);
  const before = { x: app.px('left'), y: app.px('top'), d: app.px('width') };
  app.click('lockBtn');
  dragCircleHandle(app, 'e', 40, 0);
  app.document.emit('keydown', { target: app.get('measureBox'), key: 'ArrowRight' });
  near(app.px('left'), before.x, 'locked circle does not move');
  near(app.px('top'), before.y, 'locked circle keeps vertical position');
  near(app.px('width'), before.d, 'locked circle cannot resize');
  app.click('lockBtn');
  const box = app.get('measureBox');
  box.emit('pointerdown', { target: box, clientX: 100, clientY: 100 });
  box.emit('pointermove', { clientX: 112, clientY: 116 });
  box.emit('pointerup', { clientX: 112, clientY: 116 });
  near(app.px('left'), before.x + 12, 'circle body drag moves horizontally');
  near(app.px('top'), before.y + 16, 'circle body drag moves vertically');
  app.document.emit('keydown', { target: box, key: 'ArrowRight' });
  app.document.emit('keydown', { target: box, key: 'ArrowDown', shiftKey: true });
  near(app.px('left'), before.x + 12.4, 'circle keyboard movement is 0.1 mm');
  near(app.px('top'), before.y + 20, 'circle shifted keyboard movement is 1 mm');
  near(app.px('width'), before.d, 'moving never changes diameter');
  near(app.px('height'), before.d, 'moving never makes an ellipse');
});

check('language switching updates shape labels while preserving calibration, units, and independent dimensions', () => {
  const app = createApp();
  app.calibration(4);
  app.enter('widthInput', 90);
  app.enter('heightInput', 45);
  app.click('circleShapeBtn');
  app.enter('widthInput', 35);
  app.selectUnit('cm');
  const committed = app.memory.get(KEY);
  const before = { width: app.px('width'), height: app.px('height'), scale: app.get('stage').dataset.pmm, readout: app.get('mainReadout').textContent };

  app.click('languageBtn');
  assert.equal(app.window.RulerI18n.getLanguage(), 'en');
  assert.equal(pageLanguage(app), 'en');
  assert.match(app.document.title, /screen ruler/i);
  assert.equal(app.get('languageBtn').textContent, '中文');
  assert.match(app.get('widthLabel').textContent, /diameter/i);
  assert.match(app.get('measureBox').getAttribute('aria-label'), /diameter/i);
  noChinese(app.get('measureBox').getAttribute('aria-label'), 'circle accessibility label');
  near(app.px('width'), before.width, 'English keeps circle width');
  near(app.px('height'), before.height, 'English keeps circle height');
  assert.equal(app.get('mainReadout').textContent, before.readout, 'changing language does not change numerical distance or units');
  assert.equal(app.get('stage').dataset.pmm, before.scale);
  assert.equal(app.memory.get(KEY), committed, 'language preference does not rewrite calibration data');
  assert.equal(app.memory.get(LANGUAGE_KEY), 'en');

  app.click('languageBtn');
  assert.equal(app.window.RulerI18n.getLanguage(), 'zh');
  assert.match(pageLanguage(app), /^zh(?:-CN)?$/i);
  assert.equal(app.get('languageBtn').textContent, 'English');
  assert.equal(app.get('widthLabel').textContent, '直径');
  app.click('rectangleShapeBtn');
  near(app.px('width'), 360, 'rectangle retains its separate width across languages');
  near(app.px('height'), 180, 'rectangle retains its separate height across languages');
});

check('English calibration retains metric drafts and translates live results and validation errors', () => {
  const app = createApp();
  app.calibration(4);
  const committed = app.memory.get(KEY);
  screenParameters(app, { diagonal: '', width: 2560, height: 1440, mode: 'manual', percent: 150 });
  app.enter('screenSpecUnit', 'cm');
  app.enter('screenPhysicalWidth', 59.6736, 'input');
  app.enter('screenPhysicalHeight', 33.5664, 'input');
  app.enter('screenAspectRatio', '16:9', 'input');
  app.click('languageBtn');
  assert.equal(app.get('calDialog').open, true);
  assert.equal(app.get('screenSpecUnit').value, 'cm');
  assert.equal(app.get('screenPhysicalWidth').value, '59.6736');
  assert.equal(app.get('screenPhysicalHeight').value, '33.5664');
  assert.equal(app.get('screenAspectRatio').value, '16:9');
  assert.equal(app.get('screenScaleMode').value, 'manual');
  assert.equal(app.get('screenScaleInput').value, '150');
  assert.equal(app.get('saveCalBtn').disabled, false);
  assert.match(app.get('screenResult').textContent, /59\.6736.*33\.5664.*cm/);
  noChinese(app.get('screenResult').textContent, 'screen parameter readout');
  noChinese(app.get('screenDpr').textContent, 'automatic scale explanation');
  noChinese(app.get('calIntro').textContent, 'screen calibration instructions');
  assert.match(app.get('saveCalLabel').textContent, /save/i);

  app.enter('screenPixelWidth', 319, 'input');
  assert.equal(app.get('saveCalBtn').disabled, true);
  assert.match(app.get('screenResult').textContent, /320.*32768/);
  noChinese(app.get('screenResult').textContent, 'invalid resolution error');
  app.click('saveCalBtn');
  assert.equal(app.memory.get(KEY), committed, 'English validation protects the prior calibration');
  assert.equal(app.get('calDialog').open, true);
  app.click('languageBtn');
  assert.match(app.get('screenResult').textContent, /水平和垂直分辨率/);
  app.enter('screenPixelWidth', 2560, 'input');
  app.click('languageBtn');
  assert.equal(app.get('saveCalBtn').disabled, false);
  app.click('cancelCalBtn');
  assert.equal(app.memory.get(KEY), committed, 'canceling a translated draft preserves prior data');
  near(app.px('width'), 320, 'canceling translated screen draft keeps the committed physical size');
});

check('coin instructions, diameter labels, and calibration notices use the selected language', () => {
  const app = createApp();
  app.calibration(4);
  app.click('calibrateBtn');
  app.click('coinTab');
  app.enter('coinSelect', 'cny-1-1999');
  app.click('languageBtn');
  assert.equal(app.get('coinSelect').value, 'cny-1-1999');
  assert.match(app.get('referenceLabel').textContent, /diameter.*25\.00 mm/i);
  assert.match(app.get('calIntro').textContent, /coin/i);
  noChinese(app.get('calIntro').textContent, 'coin calibration instructions');
  noChinese(app.get('coinInfo').textContent, 'coin version explanation');
  near(parseFloat(app.get('calCard').style.width), 100, 'translation keeps the coin outline scale');
  app.click('customTab');
  app.enter('referenceLength', 0);
  assert.match(app.get('toast').textContent, /1.*300.*mm/);
  noChinese(app.get('toast').textContent, 'known-length validation notice');
  assert.equal(app.get('referenceLength').value, '100');
  app.click('saveCalBtn');
  noChinese(app.get('toast').textContent, 'calibration saved notice');
  assert.equal(JSON.parse(app.memory.get(KEY)).calibration.method, 'custom');
  near(app.px('width'), 320, 'English physical calibration saves the unchanged scale');
});

check('language preference restores independently of measurement data and tolerates blocked storage', () => {
  const app = createApp({ language: 'en' });
  assert.equal(app.window.RulerI18n.getLanguage(), 'en');
  assert.equal(pageLanguage(app), 'en');
  assert.match(app.document.title, /screen ruler/i);
  assert.match(app.get('widthLabel').textContent, /width/i);
  app.calibration(4);
  app.click('circleShapeBtn');
  app.selectUnit('in');
  app.enter('widthInput', 2);
  const restored = createApp({ stored: app.memory.get(KEY), language: app.memory.get(LANGUAGE_KEY) });
  assert.equal(restored.window.RulerI18n.getLanguage(), 'en');
  assert.equal(restored.get('languageBtn').textContent, '中文');
  assert.match(restored.get('widthLabel').textContent, /diameter/i);
  assert.equal(restored.get('stage').dataset.unit, 'in');
  near(restored.px('width'), 50.8 * 4, 'restored English preference keeps the saved circle diameter');
  assert.equal(JSON.parse(restored.memory.get(KEY)).calibration.method, 'card');
  const invalid = createApp({ language: 'unsupported-language' });
  assert.equal(invalid.window.RulerI18n.getLanguage(), 'zh');
  assert.equal(invalid.get('languageBtn').textContent, 'English');
  const restricted = createApp({ denyStorage: true });
  assert.doesNotThrow(() => restricted.click('languageBtn'));
  assert.equal(restricted.window.RulerI18n.getLanguage(), 'en');
  restricted.calibration(4);
  near(restricted.px('width'), 320, 'storage rejection does not stop English calibration');
});

async function checkAsync(name, callback) {
  await callback();
  checks.push(name);
  console.log(`PASS ${name}`);
}

(async () => {
  await checkAsync('native fullscreen targets the measurement viewport and preserves physical scale', async () => {
    const app = createApp({ dpr: 2 });
    app.calibration(4);
    const viewport = app.get('viewport');
    const before = { width: app.px('width'), height: app.px('height'), pmm: app.get('stage').dataset.pmm };
    let requestedElement = null;
    app.document.documentElement.requestFullscreen = async () => { throw new Error('Whole-document fullscreen must not be requested'); };
    viewport.requestFullscreen = async function () {
      requestedElement = this;
      app.setSize(1400, 900);
      app.document.fullscreenElement = viewport;
      app.document.emit('fullscreenchange');
    };
    await app.click('fullscreenBtn');
    app.flushRaf();
    assert.equal(requestedElement, viewport);
    assert.equal(app.document.fullscreenElement, viewport);
    assert.equal(viewport.classList.contains('canvas-expanded'), true);
    assert.equal(app.document.body.classList.contains('canvas-fullscreen'), true);
    assert.equal(app.get('canvasToolbar').hidden, false);
    near(app.px('width'), before.width, 'native fullscreen width');
    near(app.px('height'), before.height, 'native fullscreen height');
    assert.equal(app.get('stage').dataset.pmm, before.pmm);
    near(JSON.parse(app.memory.get(KEY)).pmm, 4, 'native fullscreen does not alter saved scale');
    assert.equal(JSON.parse(app.memory.get(KEY)).calibration.method, 'card', 'fullscreen retains the physical calibration method');
    assert.match(app.get('canvasReadout').textContent, /80\.0.*60\.0.*mm/);
  });

  await checkAsync('rejected or unsupported fullscreen keeps a usable CSS fallback with an exit', async () => {
    for (const nativeSupport of ['rejected', 'unsupported']) {
      const app = createApp();
      app.calibration(4);
      if (nativeSupport === 'rejected') app.get('viewport').requestFullscreen = async () => { throw new Error('Fullscreen denied'); };
      await app.click('fullscreenBtn');
      app.flushRaf();
      assert.equal(app.document.fullscreenElement, null, `${nativeSupport} uses no native fullscreen element`);
      assert.equal(app.get('viewport').classList.contains('canvas-expanded'), true, `${nativeSupport} expands the measurement area`);
      assert.equal(app.get('canvasToolbar').hidden, false);
      near(app.px('width'), 320, `${nativeSupport} preserves physical width`);
      near(app.px('height'), 240, `${nativeSupport} preserves physical height`);
      if (nativeSupport === 'rejected') await app.click('canvasExitBtn');
      else app.document.emit('keydown', { key: 'Escape', target: app.document.body });
      app.flushRaf();
      assert.equal(app.get('viewport').classList.contains('canvas-expanded'), false, `${nativeSupport} fallback exits`);
      assert.equal(app.document.body.classList.contains('canvas-fullscreen'), false);
      assert.equal(app.get('canvasToolbar').hidden, true);
      assert.equal(app.document.activeElement, app.get('fullscreenBtn'));
    }
  });

  await checkAsync('native fullscreen exit clears expansion state and restores the normal layout', async () => {
    for (const exitMethod of ['browser', 'button']) {
      const app = createApp();
      const viewport = app.get('viewport');
      viewport.requestFullscreen = async () => {
        app.document.fullscreenElement = viewport;
        app.document.emit('fullscreenchange');
      };
      let exits = 0;
      app.document.exitFullscreen = async () => {
        exits++;
        app.document.fullscreenElement = null;
        app.document.emit('fullscreenchange');
      };
      await app.click('fullscreenBtn');
      assert.equal(app.get('canvasToolbar').hidden, false);
      if (exitMethod === 'browser') {
        app.document.fullscreenElement = null;
        app.document.emit('fullscreenchange');
      } else await app.click('canvasExitBtn');
      app.flushRaf();
      assert.equal(app.document.fullscreenElement, null);
      assert.equal(viewport.classList.contains('canvas-expanded'), false);
      assert.equal(app.document.body.classList.contains('canvas-fullscreen'), false);
      assert.equal(app.get('canvasToolbar').hidden, true);
      assert.equal(exits, exitMethod === 'button' ? 1 : 0);
    }
  });

  await checkAsync('floating fullscreen tools forward mode and snap actions and can collapse', async () => {
    const app = createApp();
    const stage = app.get('stage');
    const pointMode = app.addElement('pointModeBtn');
    const boxMode = app.addElement('boxModeBtn');
    const snap = app.addElement('snapGridBtn');
    const total = app.addElement('pointTotal', 'strong');
    const summary = app.addElement('pointSummary', 'span');
    total.textContent = '12.3 mm';
    summary.textContent = '3 点 · 2 段';
    snap.setAttribute('aria-pressed', 'false');
    let pointCalls = 0, boxCalls = 0, snapCalls = 0;
    pointMode.onclick = () => { pointCalls++; stage.dataset.measureMode = 'points'; stage.emit('ruler-mode-change'); };
    boxMode.onclick = () => { boxCalls++; stage.dataset.measureMode = 'box'; stage.emit('ruler-mode-change'); };
    snap.onclick = () => { snapCalls++; snap.setAttribute('aria-pressed', String(snap.getAttribute('aria-pressed') !== 'true')); };
    await app.click('fullscreenBtn');
    app.click('canvasModeBtn');
    assert.equal(pointCalls, 1);
    assert.equal(stage.dataset.measureMode, 'points');
    assert.equal(app.get('canvasSnapBtn').hidden, false);
    assert.match(app.get('canvasReadout').textContent, /12\.3 mm.*3 点/);
    app.click('canvasSnapBtn');
    assert.equal(snapCalls, 1);
    assert.equal(app.get('canvasSnapBtn').getAttribute('aria-pressed'), 'true');
    app.click('canvasToggleBtn');
    assert.equal(app.get('canvasControls').hidden, true);
    assert.equal(app.get('canvasToggleBtn').getAttribute('aria-expanded'), 'false');
    app.click('canvasToggleBtn');
    assert.equal(app.get('canvasControls').hidden, false);
    assert.equal(app.get('canvasToggleBtn').getAttribute('aria-expanded'), 'true');
    app.click('canvasModeBtn');
    assert.equal(boxCalls, 1);
    assert.equal(stage.dataset.measureMode, 'box');
    assert.equal(app.get('canvasSnapBtn').hidden, true);
    assert.match(app.get('canvasReadout').textContent, /宽 × 高/);
  });

  await checkAsync('fullscreen circle controls display diameter and preserve independent shapes', async () => {
    const app = createApp();
    app.calibration(4);
    app.enter('widthInput', 90);
    app.enter('heightInput', 45);
    app.click('circleShapeBtn');
    app.enter('widthInput', 35);
    const viewport = app.get('viewport');
    viewport.requestFullscreen = async () => {
      app.setSize(1400, 900);
      app.document.fullscreenElement = viewport;
      app.document.emit('fullscreenchange');
    };
    app.document.exitFullscreen = async () => {
      app.document.fullscreenElement = null;
      app.document.emit('fullscreenchange');
    };
    await app.click('fullscreenBtn');
    app.flushRaf();
    near(app.px('width'), 140, 'fullscreen retains physical circle diameter');
    near(app.px('height'), 140, 'fullscreen retains circle aspect ratio');
    assert.match(app.get('canvasReadout').textContent, /直径.*Φ\s*35\.0 mm/);
    assert.equal(app.get('canvasShapeBtn').hidden, false);
    app.click('canvasShapeBtn');
    near(app.px('width'), 360, 'fullscreen rectangle width restored');
    near(app.px('height'), 180, 'fullscreen rectangle height restored');
    assert.equal(app.get('measureBox').classList.contains('circle'), false);
    assert.match(app.get('canvasReadout').textContent, /宽 × 高.*90\.0.*45\.0/);
    app.click('canvasShapeBtn');
    near(app.px('width'), 140, 'fullscreen restores previous circle diameter');
    near(app.px('height'), 140, 'fullscreen restores a true circle');
    app.enter('widthInput', 50, 'input');
    assert.match(app.get('canvasReadout').textContent, /直径.*Φ\s*50\.0 mm/);
    app.click('languageBtn');
    assert.match(app.get('canvasReadout').textContent, /diameter.*Φ\s*50\.0 mm/i);
    noChinese(app.get('canvasShapeBtn').textContent, 'fullscreen shape action');
    noChinese(app.get('canvasModeBtn').textContent, 'fullscreen measurement mode action');
    noChinese(app.get('canvasToggleBtn').textContent, 'fullscreen tool toggle');
    near(app.px('width'), 200, 'fullscreen translation keeps the edited diameter');
    app.click('languageBtn');
    await app.click('canvasExitBtn');
    app.flushRaf();
    assert.equal(viewport.classList.contains('canvas-expanded'), false);
    near(app.px('width'), 200, 'leaving fullscreen preserves edited diameter');
    near(app.px('height'), 200, 'leaving fullscreen keeps the edited circle round');
  });

  console.log(`\n${checks.length} behavior checks passed.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
