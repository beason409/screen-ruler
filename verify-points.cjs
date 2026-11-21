'use strict';

// Run with: node verify-points.cjs
// Executes the real point-measurement module against a small DOM, then checks
// pointer, keyboard, history, and distance behavior through its visible output.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, 'point-measurement-source.js'), 'utf8');

function createApp({ pmm = 4, unit = 'mm', width = 803, height = 501, grid = true, language = 'zh' } = {}) {
  const geometry = { left: 100, top: 50, width, height };
  const notices = [];
  let document;
  let ensureGridCalls = 0;

  class DOMEvent {
    constructor(type, options = {}) {
      Object.assign(this, { type, bubbles: false, defaultPrevented: false }, options);
    }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
    stopImmediatePropagation() { this.stopped = this.immediateStopped = true; }
  }

  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.ownerDocument = document;
      this.children = [];
      this.parentElement = null;
      this.attributes = new Map();
      this.listeners = new Map();
      this.dataset = {};
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.textContent = '';
      this.value = '';
      this.hidden = false;
      this.disabled = false;
      this.classes = new Set();
      this.capturedPointers = new Set();
      this.classList = {
        contains: name => this.classes.has(name),
        add: (...names) => names.forEach(name => this.classes.add(name)),
        remove: (...names) => names.forEach(name => this.classes.delete(name)),
        toggle: (name, force) => {
          const enabled = force === undefined ? !this.classes.has(name) : force;
          enabled ? this.classes.add(name) : this.classes.delete(name);
          return enabled;
        },
      };
    }
    set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
    get className() { return [...this.classes].join(' '); }
    get options() { return this.children.filter(node => node.tagName === 'OPTION'); }
    append(...nodes) {
      for (const node of nodes) {
        if (node.parentElement) node.remove();
        node.parentElement = this;
        this.children.push(node);
      }
    }
    before(node) {
      assert(this.parentElement, 'Cannot insert before a detached element');
      if (node.parentElement) node.remove();
      const parent = this.parentElement;
      parent.children.splice(parent.children.indexOf(this), 0, node);
      node.parentElement = parent;
    }
    remove() {
      if (this.parentElement) {
        this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
        this.parentElement = null;
      }
    }
    replaceChildren(...nodes) {
      for (const child of this.children) child.parentElement = null;
      this.children = [];
      this.append(...nodes);
    }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === 'class') this.className = value;
      if (name === 'id') this.id = String(value);
      if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    }
    getAttribute(name) {
      if (name === 'id' && this.id) return this.id;
      if (name === 'class') return this.className || null;
      return this.attributes.get(name) ?? null;
    }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    removeAttribute(name) { this.attributes.delete(name); }
    toggleAttribute(name, force) {
      const enabled = force === undefined ? !this.hasAttribute(name) : force;
      if (enabled) this.setAttribute(name, ''); else this.removeAttribute(name);
      return enabled;
    }
    matches(selector) {
      return selector.split(',').some(part => {
        const item = part.trim();
        if (item.startsWith('.')) return this.classes.has(item.slice(1));
        if (item.startsWith('#')) return this.id === item.slice(1);
        const attr = item.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);
        if (attr) return (!attr[1] || this.tagName === attr[1].toUpperCase()) && this.hasAttribute(attr[2]) && (attr[3] === undefined || this.getAttribute(attr[2]) === attr[3]);
        return this.tagName === item.toUpperCase();
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
    querySelectorAll(selector) {
      const found = [];
      for (const child of this.children) {
        if (child.matches(selector)) found.push(child);
        found.push(...child.querySelectorAll(selector));
      }
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    dispatchEvent(event) {
      if (!event.target) event.target = this;
      event.currentTarget = this;
      for (const callback of this.listeners.get(event.type) || []) {
        callback(event);
        if (event.immediateStopped) break;
      }
      if (event.bubbles && !event.stopped && this.parentElement) this.parentElement.dispatchEvent(event);
      return !event.defaultPrevented;
    }
    emit(type, details = {}) {
      const event = new DOMEvent(type, { bubbles: true, target: this, button: 0, pointerId: 1, clientX: 0, clientY: 0, ...details });
      this.dispatchEvent(event);
      return event;
    }
    click() { if (!this.disabled) this.emit('click'); }
    focus() {
      document.activeElement = this;
      this.emit('focus', { bubbles: false });
    }
    setPointerCapture(id) { this.capturedPointers.add(id); }
    hasPointerCapture(id) { return this.capturedPointers.has(id); }
    releasePointerCapture(id) {
      this.capturedPointers.delete(id);
      this.emit('lostpointercapture', { pointerId: id });
    }
    getBoundingClientRect() { return { ...geometry, right: geometry.left + geometry.width, bottom: geometry.top + geometry.height }; }
  }

  document = new Element('document');
  document.ownerDocument = document;
  document.createElement = tag => new Element(tag);
  document.createElementNS = (_ns, tag) => new Element(tag);
  document.head = new Element('head');
  document.body = new Element('body');
  document.activeElement = document.body;
  document.append(document.head, document.body);
  document.getElementById = id => document.querySelector('#' + id);
  const workspace = new Element('section');
  workspace.className = 'workspace';
  const viewport = new Element('div');
  viewport.className = 'viewport';
  const stage = new Element('div');
  stage.id = 'stage';
  const box = new Element('div');
  box.id = 'measureBox';
  stage.append(box);
  viewport.append(stage);
  if (!grid) stage.classList.add('no-grid');
  const bottom = new Element('div');
  bottom.className = 'bottom-strip';
  const originalReadout = new Element('div');
  originalReadout.className = 'readout';
  bottom.append(originalReadout);
  workspace.append(viewport, bottom);
  document.body.append(workspace);

  const sandbox = { Event: DOMEvent, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'point-measurement-source.js', timeout: 1000 });
  const languageListeners = new Set();
  const i18n = {
    getLanguage: () => language,
    onChange: callback => { languageListeners.add(callback); return () => languageListeners.delete(callback); },
  };
  const tool = sandbox.installPointMeasurement({
    stage, box,
    i18n,
    getScale: () => pmm,
    getUnit: () => unit,
    toast: message => notices.push(message),
    ensureGridVisible: () => { ensureGridCalls++; stage.classList.remove('no-grid'); },
  });
  const get = id => {
    const node = document.getElementById(id);
    assert(node, `Missing UI element: ${id}`);
    return node;
  };
  const pointer = (node, type, x, y, details) => node.emit(type, { clientX: geometry.left + x, clientY: geometry.top + y, ...details });
  const clickAt = (x, y) => { pointer(stage, 'pointerdown', x, y); pointer(stage, 'pointerup', x, y); };
  const nodes = () => stage.querySelectorAll('.pm-point');
  const coordinates = node => {
    const match = node.getAttribute('transform').match(/^translate\(([-\d.e+]+),([-\d.e+]+)\)$/i);
    assert(match, 'Point must expose its rendered SVG position');
    return { x: Number(match[1]), y: Number(match[2]) };
  };
  const point = index => coordinates(nodes()[index]);
  const drag = (index, from, to, moves = [to]) => {
    pointer(nodes()[index], 'pointerdown', from.x, from.y);
    for (const move of moves) pointer(stage, 'pointermove', move.x, move.y);
    pointer(stage, 'pointerup', to.x, to.y);
  };
  const key = (name, shiftKey = false) => stage.emit('keydown', { key: name, shiftKey });
  return {
    get, stage, tool, document, notices, geometry, clickAt, point, nodes, drag, key, pointer,
    ensureGridCalls: () => ensureGridCalls,
    setScale: value => { pmm = value; tool.render(); },
    setUnit: value => { unit = value; tool.render(); },
    setLanguage: value => { language = value; languageListeners.forEach(callback => callback()); },
  };
}

function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: expected ${expected}, got ${actual}`);
}
function position(app, index, x, y, label) {
  const actual = app.point(index);
  near(actual.x, x, label + ' x');
  near(actual.y, y, label + ' y');
}
const checks = [];
function check(name, callback) {
  callback();
  checks.push(name);
  console.log('PASS ' + name);
}

check('snapping starts off; enabling it preserves existing points and reveals the grid', () => {
  const app = createApp({ grid: false });
  app.get('pointModeBtn').click();
  assert.equal(app.get('snapGridBtn').getAttribute('aria-pressed'), 'false');
  app.clickAt(23, 37);
  position(app, 0, 23, 37, 'free placement');
  app.get('snapGridBtn').click();
  assert.equal(app.get('snapGridBtn').getAttribute('aria-pressed'), 'true');
  assert.equal(app.ensureGridCalls(), 1);
  assert(!app.stage.classList.contains('no-grid'));
  position(app, 0, 23, 37, 'existing point after enabling');
});

check('clicks snap to calibrated 5 mm intersections and distance units stay consistent', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.get('snapGridBtn').click();
  app.clickAt(23, 37);
  app.clickAt(77, 99);
  position(app, 0, 20, 40, 'first snapped point');
  position(app, 1, 80, 100, 'second snapped point');
  assert.equal(app.get('pointTotal').textContent, '21.2 mm');
  app.setUnit('cm');
  assert.equal(app.get('pointTotal').textContent, '2.12 cm');
  app.setScale(3.7);
  position(app, 0, 20, 40, 'calibration preserves point position');
  app.clickAt(44, 65);
  position(app, 2, 37, 74, 'new point uses changed calibration');
});

check('turning snapping off restores free placement and free dragging', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.get('snapGridBtn').click();
  app.clickAt(23, 37);
  app.get('snapGridBtn').click();
  app.clickAt(77, 99);
  position(app, 1, 77, 99, 'free new point');
  app.drag(1, {x:77, y:99}, {x:83, y:106});
  position(app, 1, 83, 106, 'free dragged point');
});

check('dragging snaps the point center while a stationary offset click leaves it unchanged', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.clickAt(23, 37);
  app.get('snapGridBtn').click();
  app.drag(0, {x:27, y:40}, {x:27, y:40}, []);
  position(app, 0, 23, 37, 'stationary point click');
  app.drag(0, {x:27, y:40}, {x:66, y:83});
  position(app, 0, 60, 80, 'dragged point center');
  const lowScale = createApp({ pmm: .5 });
  lowScale.get('pointModeBtn').click();
  lowScale.get('snapGridBtn').click();
  lowScale.clickAt(20, 40);
  lowScale.drag(0, {x:20, y:40}, {x:22.5, y:40});
  position(lowScale, 0, 22.5, 40, 'one grid cell remains draggable at low scale');
});

check('pointerup uses the final coordinates even when no final move event arrived', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.get('snapGridBtn').click();
  app.clickAt(20, 40);
  app.drag(0, {x:20, y:40}, {x:89, y:109}, [{x:43, y:67}]);
  position(app, 0, 80, 100, 'final pointerup position');
  app.drag(0, {x:80, y:100}, {x:126, y:143}, []);
  position(app, 0, 120, 140, 'pointerup-only displacement');
});

check('edge placement stays on the last visible grid intersection', () => {
  const app = createApp({ width: 93, height: 67 });
  app.get('pointModeBtn').click();
  app.get('snapGridBtn').click();
  app.clickAt(92, 66);
  position(app, 0, 80, 60, 'right/bottom edge placement');
  app.drag(0, {x:80, y:60}, {x:160, y:120});
  position(app, 0, 80, 60, 'drag clamped to grid');
  app.drag(0, {x:80, y:60}, {x:-20, y:-20});
  position(app, 0, 0, 0, 'top/left edge placement');
});

check('snapped keyboard movement uses grid steps and preserves the untouched axis', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.clickAt(23, 37);
  app.get('snapGridBtn').click();
  app.key('ArrowRight');
  const moved = app.point(0);
  assert(moved.x > 23, 'Right arrow must advance rather than snap backwards');
  near(moved.x % 20, 0, 'moved x lies on grid');
  near(moved.y, 37, 'horizontal key preserves y');
  app.clickAt(40, 60);
  app.key('ArrowRight');
  position(app, 1, 60, 60, 'one grid cell');
  app.key('ArrowDown', true);
  position(app, 1, 60, 100, 'shift major cell');
  app.get('snapGridBtn').click();
  app.key('ArrowRight');
  position(app, 1, 60.4, 100, 'free fine movement');
});

check('undo restores exact unsnapped coordinates; hiding the grid disables snapping', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.clickAt(23, 37);
  app.get('snapGridBtn').click();
  app.drag(0, {x:23, y:37}, {x:68, y:87});
  position(app, 0, 60, 80, 'snapped move');
  app.get('undoPointBtn').click();
  position(app, 0, 23, 37, 'exact position from undo');
  app.stage.classList.add('no-grid');
  app.tool.render();
  assert.equal(app.get('snapGridBtn').getAttribute('aria-pressed'), 'false');
  app.clickAt(77, 99);
  position(app, 1, 77, 99, 'free placement with hidden grid');
});

check('English point mode translates controls, hints, labels, and distance summaries', () => {
  const app = createApp({language:'en'});
  assert.equal(app.get('boxModeBtn').textContent, 'Shape comparison');
  assert.equal(app.get('pointModeBtn').textContent, 'Point measurement');
  assert.equal(app.get('snapGridBtn').textContent, 'Snap to grid');
  assert.equal(app.get('undoPointBtn').getAttribute('aria-label'), 'Undo the last point operation');
  assert.equal(app.get('clearPointsBtn').getAttribute('aria-label'), 'Clear all measurement points');
  assert.match(app.get('pointHelp').textContent, /^Drag the shape/);
  app.get('pointModeBtn').click();
  assert.match(app.get('pointHelp').textContent, /^Click in the measurement area/);
  assert.match(app.stage.getAttribute('aria-label'), /^Point measurement area:/);
  assert.equal(app.get('pointSummary').textContent, '0 points · 0 segments');
  app.clickAt(0, 0);
  assert.equal(app.get('pointSummary').textContent, '1 point · 0 segments');
  app.clickAt(40, 0);
  assert.equal(app.get('pointSummary').textContent, '2 points · 1 segment');
  assert.equal(app.get('pointTotal').textContent, '10.0 mm');
  assert.equal(app.get('pointLast').textContent, 'Last segment 10.0 mm');
  assert.equal(app.get('pointPairFrom').options[0].textContent, 'Point 1');
  assert.equal(app.get('pointPairTo').getAttribute('aria-label'), 'Distance end point');
  assert.match(app.nodes()[1].getAttribute('aria-label'), /^Measurement point 2, x 10.0 mm, y 0.0 mm/);
  app.get('snapGridBtn').click();
  assert.match(app.get('pointHelp').textContent, /^Snap to the 5 mm grid/);
  assert.match(app.get('snapGridBtn').title, /Existing points stay in place/);
  app.stage.classList.add('no-grid');
  app.tool.render();
  assert.equal(app.notices.at(-1), 'The grid is hidden. Snapping is now off.');
});

check('language switching preserves points, pair selection, snap state, and undo history', () => {
  const app = createApp();
  app.get('pointModeBtn').click();
  app.clickAt(0, 0);
  app.clickAt(40, 0);
  app.clickAt(40, 40);
  const originalNodes = app.nodes();
  app.get('pointPairFrom').value = '2';
  app.get('pointPairFrom').emit('change');
  app.get('pointPairTo').value = '3';
  app.get('pointPairTo').emit('change');
  app.drag(2, {x:40, y:40}, {x:80, y:40});
  const beforeTotal = app.get('pointTotal').textContent;
  const beforePair = app.get('pointPairDistance').textContent;
  app.get('snapGridBtn').click();
  app.setLanguage('en');
  originalNodes.forEach((node, index) => assert.equal(app.nodes()[index], node, 'existing point nodes remain in place'));
  position(app, 2, 80, 40, 'English switch preserves dragged point');
  assert.equal(app.get('pointTotal').textContent, beforeTotal);
  assert.equal(app.get('pointPairDistance').textContent, beforePair);
  assert.equal(app.get('pointPairFrom').value, '2');
  assert.equal(app.get('pointPairTo').value, '3');
  assert.equal(app.get('pointPairTo').options[2].textContent, 'Point 3');
  assert.equal(app.get('snapGridBtn').getAttribute('aria-pressed'), 'true');
  assert.equal(app.nodes()[2].getAttribute('aria-pressed'), 'true');
  app.get('undoPointBtn').click();
  position(app, 2, 40, 40, 'undo remains available after language change');
  app.setLanguage('zh');
  assert.equal(app.get('pointModeBtn').textContent, '定点测量');
  assert.equal(app.get('snapGridBtn').textContent, '吸附网格');
  assert.equal(app.get('pointSummary').textContent, '3 点 · 2 段');
  assert.equal(app.get('pointPairFrom').options[1].textContent, '点 2');
  assert.match(app.nodes()[2].getAttribute('aria-label'), /^测量点 3，横坐标/);
  assert.equal(app.get('pointPairFrom').value, '2');
  assert.equal(app.get('pointPairTo').value, '3');
  assert.equal(app.get('pointTotal').textContent, '20.0 mm');
});

check('English limit and overflow notices keep existing point geometry unchanged', () => {
  const app = createApp({language:'en'});
  app.get('pointModeBtn').click();
  for (let i = 0; i < 50; i++) app.clickAt(i * 4, 20);
  app.clickAt(300, 20);
  assert.equal(app.nodes().length, 50);
  assert.equal(app.notices.at(-1), 'You can add up to 50 points. Delete points, or clear them to start again.');
  app.geometry.width = 193;
  app.tool.layout();
  assert.match(app.get('pointHelp').textContent, /^1 point is outside the visible area/);
  position(app, 49, 196, 20, 'overflow does not clamp saved point');
  app.setLanguage('zh');
  assert.match(app.get('pointHelp').textContent, /^1 个点超出可见区域/);
});

console.log(`\n${checks.length} point measurement checks passed.`);
