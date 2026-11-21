// This source is inlined into the offline HTML; it does not load any assets.
function installPointMeasurement({stage, box, getScale, getUnit, toast, ensureGridVisible = () => {}, i18n = stage.ownerDocument.defaultView?.RulerI18n}) {
 const doc = stage.ownerDocument;
 const english = {
  '测量模式':'Measurement mode',
  '形状对比':'Shape comparison',
  '定点测量':'Point measurement',
  '拖动形状移动，拉动控制点调整尺寸':'Drag the shape to move it; drag its handles to resize.',
  '吸附网格':'Snap to grid',
  '新建和拖动的点吸附到 5 mm 网格交点；已有点位保持原位。方向键移动一格，Shift 移动两格。':'New and dragged points snap to the 5 mm grid. Existing points stay in place. Arrow keys move one cell; Shift moves two.',
  '撤销':'Undo',
  '撤销上一步定点操作':'Undo the last point operation',
  '删除点':'Delete point',
  '删除选中的测量点':'Delete the selected measurement point',
  '清空':'Clear',
  '清空所有测量点':'Clear all measurement points',
  '总长度':'Total length',
  '任意两点直线距离':'Straight-line distance between any two points',
  '两点直线':'Point-to-point',
  '两点距离起点':'Distance start point',
  '至':'to',
  '两点距离终点':'Distance end point',
  '多点距离与可拖动测量点':'Distances and draggable measurement points',
  '定点测量区：点击添加测量点，拖动点位调整，方向键微调选中的点。':'Point measurement area: click to add points, drag to move them, and use arrow keys to fine-tune the selected point.',
  '最多可添加 50 个点。可删除点位，或清空后重新测量。':'You can add up to 50 points. Delete points, or clear them to start again.',
  '点 {index}':'Point {index}',
  '网格已隐藏，吸附已关闭。':'The grid is hidden. Snapping is now off.',
  '测量点 {index}，横坐标 {x}，纵坐标 {y}。{movement}，Delete 删除。':'Measurement point {index}, x {x}, y {y}. {movement}; Delete to remove.',
  '方向键按 5 毫米网格移动':'Arrow keys move by one 5 mm grid cell',
  '方向键微调':'Arrow keys fine-tune the position',
  '{points} 点 · {segments} 段':'{points} point{pointSuffix} · {segments} segment{segmentSuffix}',
  '最近一段 {distance}':'Last segment {distance}',
  '{outside} 个点超出可见区域。请扩大窗口；点位与距离保持不变。':'{outside} point{suffix} outside the visible area. Enlarge the window; positions and distances stay unchanged.',
  '吸附 5 mm 网格；拖点调整，方向键移动一格':'Snap to the 5 mm grid; drag points or move one cell with arrow keys.',
  '吸附 5 mm 网格；点击交点附近添加点':'Snap to the 5 mm grid; click near an intersection to add a point.',
  '继续点击添加点；拖动圆点调整，方向键微调':'Click to add points; drag them or fine-tune with arrow keys.',
  '在测量区连续点击定点，显示各段距离与总长度':'Click in the measurement area to add points and see segment distances and total length.'
 };
 function t(message, values = {}) {
  const template = i18n?.getLanguage?.() === 'en' ? english[message] || message : message;
  return template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
 }
 const NS = 'http://www.w3.org/2000/svg';
 const factors = {mm:1, cm:10, in:25.4};
 const points = [];
 const history = [];
 const pointNodes = new Map();
 const GRID_MM = 5;
 let snapEnabled = false;
 let active = false, selected = null, gesture = null, nextId = 1;
 let pairA = null, pairB = null, pairPinned = false, optionSignature = '';
 const workspace = stage.closest('.workspace');
 const viewport = stage.closest('.viewport');
 const bottom = workspace.querySelector('.bottom-strip');
 const originalReadout = bottom.querySelector('.readout');
 const originalDisplay = originalReadout.style.display;
 const originalTabindex = stage.getAttribute('tabindex');
 const originalLabel = stage.getAttribute('aria-label');

 function el(tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
 }
 function svg(tag, attributes, text) {
  const node = doc.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes || {})) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
 }
 function button(text, label) {
  const node = el('button', '', text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  return node;
 }
 const style = el('style');
 style.textContent = `
 .pm-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;min-width:0}
 .pm-modes{flex-shrink:0;min-width:222px}
 .pm-modes button{padding:7px 13px;white-space:nowrap}
 .pm-toolbar .pm-hint{font-size:.8rem;line-height:1.7;color:var(--muted);flex:1;min-width:180px;margin:0}
 .pm-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 .pm-actions button{font-size:.8rem;padding:8px 10px}
 .pm-actions button[aria-pressed=true]{color:var(--accent);border-color:var(--accent);background:var(--bg)}
 .pm-toolbar [hidden],.pm-readout[hidden],.pm-canvas[hidden]{display:none!important}
 .pm-readout{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:.8rem;line-height:1.6}
 .pm-readout strong{font-weight:550;font-size:1.15rem;color:var(--text);font-variant-numeric:tabular-nums}
 .pm-readout .pm-last{font-variant-numeric:tabular-nums}
 .pm-pair{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:.8rem;color:var(--muted)}
 .pm-pair .select-field{width:auto;min-width:68px;padding:5px 27px 5px 8px;font-size:.8rem}
 .pm-pair strong{font-size:.95rem;min-width:72px;color:var(--accent);font-variant-numeric:tabular-nums}
 .pm-active{cursor:crosshair}
 .pm-active #measureBox{display:none!important}
 .pm-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;overflow:hidden}
 .pm-line{stroke:var(--accent);stroke-width:1.5;fill:none;vector-effect:non-scaling-stroke}
 .pm-length-bg{fill:var(--field);stroke:var(--line);stroke-width:1;opacity:.97}
 .pm-length{fill:var(--accent);font:14px "Segoe UI","Microsoft YaHei",sans-serif;pointer-events:none}
 .pm-point{cursor:grab;pointer-events:all;touch-action:none;outline:none}
 .pm-point.dragging{cursor:grabbing}
 .pm-point .pm-target{fill:transparent;stroke:none}
 .pm-dot{fill:var(--field);stroke:var(--accent);stroke-width:2}
 .pm-cross{stroke:var(--accent);stroke-width:1;opacity:.65}
 .pm-point.selected .pm-dot{fill:var(--accent)}
 .pm-focus-ring{fill:none;stroke:var(--accent);stroke-width:1;stroke-dasharray:3 3;opacity:0;pointer-events:none}
 .pm-point:focus-visible .pm-focus-ring{opacity:1}
 .pm-number-bg{fill:var(--panel);stroke:var(--line);stroke-width:1;pointer-events:none}
 .pm-number{fill:var(--text);font:12px "Segoe UI",sans-serif;text-anchor:middle;dominant-baseline:central;pointer-events:none}
 .pm-overflow{color:var(--warn)!important}
 @media(max-width:820px){.pm-modes{min-width:200px}.pm-toolbar .pm-hint{min-width:150px}.pm-readout{gap:6px}}
 @media(max-width:580px){.pm-toolbar{gap:8px}.pm-modes{min-width:190px;flex:1}.pm-toolbar .pm-hint{flex-basis:100%;order:3;font-size:.75rem}.pm-modes button{font-size:.8rem;padding:6px 8px}.pm-actions{gap:5px}.pm-actions button{font-size:.75rem;padding:7px}.pm-readout{font-size:.72rem;gap:6px}.pm-readout strong{font-size:.95rem}}
 `;
 doc.head.append(style);
 const toolbar = el('div', 'pm-toolbar');
 toolbar.id = 'pointToolbar';
 const modes = el('div', 'segmented pm-modes');
 modes.setAttribute('aria-label', t('测量模式'));
 const boxButton = button(t('形状对比'));
 boxButton.id = 'boxModeBtn';
 const pointButton = button(t('定点测量'));
 pointButton.id = 'pointModeBtn';
 boxButton.setAttribute('aria-pressed', 'true');
 pointButton.setAttribute('aria-pressed', 'false');
 modes.append(boxButton, pointButton);
 const hint = el('p', 'pm-hint', t('拖动形状移动，拉动控制点调整尺寸'));
 hint.id = 'pointHelp';
 const actions = el('div', 'pm-actions');
 actions.hidden = true;
 const snapButton = button(t('吸附网格'), t('吸附网格'));
 snapButton.id = 'snapGridBtn';
 snapButton.setAttribute('aria-pressed', 'false');
 snapButton.title = t('新建和拖动的点吸附到 5 mm 网格交点；已有点位保持原位。方向键移动一格，Shift 移动两格。');
 const undoButton = button(t('撤销'), t('撤销上一步定点操作'));
 undoButton.id = 'undoPointBtn';
 const deleteButton = button(t('删除点'), t('删除选中的测量点'));
 deleteButton.id = 'deletePointBtn';
 const clearButton = button(t('清空'), t('清空所有测量点'));
 clearButton.id = 'clearPointsBtn';
 actions.append(snapButton, undoButton, deleteButton, clearButton);
 toolbar.append(modes, hint, actions);
 viewport.before(toolbar);
 const readout = el('div', 'pm-readout');
 readout.id = 'pointReadout';
 readout.hidden = true;
 readout.setAttribute('role', 'status');
 readout.setAttribute('aria-live', 'polite');
 const totalLabel = el('span', '', t('总长度'));
 const totalValue = el('strong', '', '0.0 mm');
 totalValue.id = 'pointTotal';
 const summary = el('span');
 summary.id = 'pointSummary';
 const lastValue = el('span', 'pm-last');
 lastValue.id = 'pointLast';
 const pair = el('div', 'pm-pair');
 pair.setAttribute('role', 'group');
 pair.setAttribute('aria-label', t('任意两点直线距离'));
 const pairTitle = el('span', '', t('两点直线'));
 const pairFrom = el('select', 'select-field');
 pairFrom.id = 'pointPairFrom';
 pairFrom.setAttribute('aria-label', t('两点距离起点'));
 const pairSeparator = el('span', '', t('至'));
 const pairTo = el('select', 'select-field');
 pairTo.id = 'pointPairTo';
 pairTo.setAttribute('aria-label', t('两点距离终点'));
 const pairValue = el('strong', '', '—');
 pairValue.id = 'pointPairDistance';
 pair.append(pairTitle, pairFrom, pairSeparator, pairTo, pairValue);
 readout.append(totalLabel, totalValue, summary, lastValue, pair);
 originalReadout.before(readout);
 const overlay = svg('svg', {class:'pm-canvas', 'aria-label':t('多点距离与可拖动测量点'), role:'group'});
 overlay.id = 'pointOverlay';
 overlay.setAttribute('hidden', '');
 const lineLayer = svg('g', {'aria-hidden':'true', 'pointer-events':'none'});
 const pointLayer = svg('g');
 overlay.append(lineLayer, pointLayer);
 stage.append(overlay);

 function scale() {
  const value = Number(getScale());
  return Number.isFinite(value) && value > 0 ? value : 96 / 25.4;
 }
 function unit() { return Object.hasOwn(factors, getUnit()) ? getUnit() : 'mm'; }
 function format(mm) {
  const name = unit();
  return (mm / factors[name]).toFixed(name === 'mm' ? 1 : 2) + ' ' + name;
 }
 function snapshot() { return {points:points.map(p => ({...p})), selected}; }
 function remember(value = snapshot()) {
  history.push(value);
  if (history.length > 100) history.shift();
 }
 function bounds() {
  const rect = stage.getBoundingClientRect();
  return {width:rect.width, height:rect.height, left:rect.left, top:rect.top};
 }
 function local(event, clamp = true) {
  const rect = bounds();
  let x = event.clientX - rect.left, y = event.clientY - rect.top;
  if (clamp) { x = Math.max(0, Math.min(rect.width, x)); y = Math.max(0, Math.min(rect.height, y)); }
  return {x, y};
 }
 function snapAxis(value, extent) {
  const step = GRID_MM * scale();
  const last = Math.max(0, Math.floor((extent + 1e-7) / step));
  return Math.max(0, Math.min(last, Math.round(value / step))) * step;
 }
 function fitPosition(position) {
  const rect = bounds();
  return snapEnabled ? {x:snapAxis(position.x, rect.width), y:snapAxis(position.y, rect.height)} : {
   x:Math.max(0, Math.min(rect.width, position.x)),
   y:Math.max(0, Math.min(rect.height, position.y))
  };
 }
 function updateDraggedPoint(event) {
  const position = local(event, false);
  const dx = position.x - gesture.start.x, dy = position.y - gesture.start.y;
  if (!gesture.moved && Math.hypot(dx, dy) < (snapEnabled ? Math.min(3, GRID_MM * scale() / 2) : .001)) return;
  gesture.moved = true;
  const point = findPoint(gesture.id);
  if (!point) return;
  Object.assign(point, fitPosition({x:gesture.x + dx, y:gesture.y + dy}));
 }
 function capture(event) {
  try { stage.setPointerCapture(event.pointerId); } catch (_) {}
 }
 function release(event) {
  try { if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId); } catch (_) {}
 }
 function findPoint(id) { return points.find(p => p.id === id); }
 function stopGesture(restore = false) {
  if (!gesture) return;
  if (restore && gesture.kind === 'move' && gesture.before) {
   points.splice(0, points.length, ...gesture.before.points.map(p => ({...p})));
  }
  const id = gesture.pointerId;
  gesture = null;
  try { if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id); } catch (_) {}
 }
 function setMode(value) {
  stopGesture(true);
  active = value;
  stage.dataset.measureMode = active ? 'points' : 'box';
  stage.classList.toggle('pm-active', active);
  boxButton.setAttribute('aria-pressed', String(!active));
  pointButton.setAttribute('aria-pressed', String(active));
  actions.hidden = !active;
  if (active) overlay.removeAttribute('hidden'); else overlay.setAttribute('hidden', '');
  readout.hidden = !active;
  originalReadout.style.display = active ? 'none' : originalDisplay;
  box.setAttribute('aria-hidden', String(active));
  if (active) {
   stage.setAttribute('tabindex', '0');
   stage.setAttribute('aria-label', t('定点测量区：点击添加测量点，拖动点位调整，方向键微调选中的点。'));
  } else {
   if (originalTabindex === null) stage.removeAttribute('tabindex'); else stage.setAttribute('tabindex', originalTabindex);
   if (originalLabel === null) stage.removeAttribute('aria-label'); else stage.setAttribute('aria-label', originalLabel);
  }
  render();
  stage.dispatchEvent(new Event('ruler-mode-change'));
 }
 function undo() {
  if (!active || !history.length) return;
  stopGesture(true);
  const previous = history.pop();
  points.splice(0, points.length, ...previous.points.map(p => ({...p})));
  selected = previous.selected;
  render();
 }
 function deleteSelected() {
  if (!active || selected === null) return;
  const index = points.findIndex(p => p.id === selected);
  if (index < 0) return;
  stopGesture(true);
  remember();
  points.splice(index, 1);
  selected = points[Math.min(index, points.length - 1)]?.id ?? null;
  render();
 }
 function clear() {
  if (!active || !points.length) return;
  stopGesture(true);
  remember();
  points.length = 0;
  selected = null;
  pairA = null;
  pairB = null;
  pairPinned = false;
  render();
 }
 function addPoint(position) {
  if (points.length >= 50) { const message='最多可添加 50 个点。可删除点位，或清空后重新测量。'; toast(t(message), () => t(message)); return; }
  remember();
  const point = {...fitPosition(position), id:nextId++};
  points.push(point);
  selected = point.id;
  render();
 }
 function createPointNode(point) {
  const group = svg('g', {class:'pm-point', tabindex:'0', role:'button', 'data-point-id':point.id});
  const target = svg('circle', {class:'pm-target', r:16});
  const ring = svg('circle', {class:'pm-focus-ring', r:13});
  const cross = svg('path', {class:'pm-cross', d:'M -10 0 H 10 M 0 -10 V 10'});
  const dot = svg('circle', {class:'pm-dot', r:5});
  const numberBg = svg('rect', {class:'pm-number-bg', x:10, y:-27, width:23, height:20, rx:5});
  const number = svg('text', {class:'pm-number', x:21.5, y:-17});
  group.append(target, ring, cross, dot, numberBg, number);
  group.addEventListener('pointerdown', event => {
   if (!active || event.button !== 0 || gesture) return;
   event.preventDefault();
   event.stopPropagation();
   const current = findPoint(point.id);
   if (!current) return;
   selected = current.id;
   gesture = {kind:'move', pointerId:event.pointerId, start:local(event, false), before:snapshot(), x:current.x, y:current.y, id:current.id, moved:false};
   group.focus({preventScroll:true});
   capture(event);
   render();
  });
  group.addEventListener('focus', () => { if (active && selected !== point.id) { selected = point.id; render(); } });
  pointNodes.set(point.id, {group, number});
  pointLayer.append(group);
  return pointNodes.get(point.id);
 }
 function drawSegments() {
  const nodes = [];
  let total = 0, last = 0;
  for (let i = 1; i < points.length; i++) {
   const a = points[i - 1], b = points[i];
   last = Math.hypot(b.x - a.x, b.y - a.y) / scale();
   total += last;
   nodes.push(svg('line', {class:'pm-line', x1:a.x, y1:a.y, x2:b.x, y2:b.y}));
   const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
   const text = format(last), width = Math.max(60, text.length * 8 + 14);
   const label = svg('g', {transform:`translate(${mx},${my})`});
   label.append(svg('rect', {class:'pm-length-bg', x:-width / 2, y:-12, width, height:24, rx:5}), svg('text', {class:'pm-length', 'text-anchor':'middle', 'dominant-baseline':'central', x:0, y:0}, text));
   nodes.push(label);
  }
  lineLayer.replaceChildren(...nodes);
  return {total, last};
 }
 function renderPair() {
  const signature = (i18n?.getLanguage?.() || 'zh') + ':' + points.map(p => p.id).join(',');
  if (!points.length) { pairA = null; pairB = null; pairPinned = false; }
  if (!pairPinned) { pairA = points[0]?.id ?? null; pairB = points[points.length - 1]?.id ?? null; }
  if (!findPoint(pairA)) pairA = points[0]?.id ?? null;
  if (!findPoint(pairB)) pairB = points[points.length - 1]?.id ?? null;
  if (signature !== optionSignature || !pairFrom.options.length) {
   optionSignature = signature;
   const makeOptions = () => points.map((point, index) => {
    const option = el('option', '', t('点 {index}', {index:index + 1}));
    option.value = String(point.id);
    return option;
   });
   pairFrom.replaceChildren(...makeOptions());
   pairTo.replaceChildren(...makeOptions());
  }
  pairFrom.disabled = pairTo.disabled = points.length < 2;
  pairFrom.value = pairA === null ? '' : String(pairA);
  pairTo.value = pairB === null ? '' : String(pairB);
  const a = findPoint(pairA), b = findPoint(pairB);
  pairValue.textContent = a && b && points.length > 1 ? format(Math.hypot(b.x - a.x, b.y - a.y) / scale()) : '—';
 }
 function translateControls() {
  for (const [node, text] of [[boxButton,'形状对比'],[pointButton,'定点测量'],[snapButton,'吸附网格'],[undoButton,'撤销'],[deleteButton,'删除点'],[clearButton,'清空'],[totalLabel,'总长度'],[pairTitle,'两点直线'],[pairSeparator,'至']]) {
   const value = t(text);
   if (node.textContent !== value) node.textContent = value;
  }
  for (const [node, label] of [[modes,'测量模式'],[snapButton,'吸附网格'],[undoButton,'撤销上一步定点操作'],[deleteButton,'删除选中的测量点'],[clearButton,'清空所有测量点'],[pair,'任意两点直线距离'],[pairFrom,'两点距离起点'],[pairTo,'两点距离终点'],[overlay,'多点距离与可拖动测量点']]) {
   const value = t(label);
   if (node.getAttribute('aria-label') !== value) node.setAttribute('aria-label', value);
  }
  snapButton.title = t('新建和拖动的点吸附到 5 mm 网格交点；已有点位保持原位。方向键移动一格，Shift 移动两格。');
  if (active) stage.setAttribute('aria-label', t('定点测量区：点击添加测量点，拖动点位调整，方向键微调选中的点。'));
 }
 function render() {
  translateControls();
  if (snapEnabled && stage.classList.contains('no-grid')) {
   stopGesture(true);
   snapEnabled = false;
   const message='网格已隐藏，吸附已关闭。';toast(t(message), () => t(message));
  }
  snapButton.setAttribute('aria-pressed', String(snapEnabled));
  const distances = drawSegments();
  const remaining = new Set(points.map(p => p.id));
  for (const [id, node] of pointNodes) if (!remaining.has(id)) { node.group.remove(); pointNodes.delete(id); }
  for (let i = 0; i < points.length; i++) {
   const p = points[i], node = pointNodes.get(p.id) || createPointNode(p);
   node.group.setAttribute('transform', `translate(${p.x},${p.y})`);
   node.group.setAttribute('aria-label', t('测量点 {index}，横坐标 {x}，纵坐标 {y}。{movement}，Delete 删除。', {index:i + 1,x:format(p.x / scale()),y:format(p.y / scale()),movement:t(snapEnabled ? '方向键按 5 毫米网格移动' : '方向键微调')}));
   node.group.setAttribute('aria-pressed', String(selected === p.id));
   node.group.classList.toggle('selected', selected === p.id);
   node.group.classList.toggle('dragging', gesture?.kind === 'move' && gesture.id === p.id);
   node.number.textContent = String(i + 1);
  }
  totalValue.textContent = format(distances.total);
  const segments = Math.max(0, points.length - 1);
  summary.textContent = t('{points} 点 · {segments} 段', {points:points.length,segments,pointSuffix:points.length === 1 ? '' : 's',segmentSuffix:segments === 1 ? '' : 's'});
  lastValue.textContent = points.length > 1 ? t('最近一段 {distance}', {distance:format(distances.last)}) : '';
  renderPair();
  undoButton.disabled = !history.length;
  deleteButton.disabled = selected === null || !findPoint(selected);
  clearButton.disabled = !points.length;
  const rect = bounds();
  const outside = points.filter(p => p.x < 0 || p.y < 0 || p.x > rect.width || p.y > rect.height).length;
  hint.classList.toggle('pm-overflow', active && outside > 0);
  if (!active) hint.textContent = t('拖动形状移动，拉动控制点调整尺寸');
  else if (outside) hint.textContent = t('{outside} 个点超出可见区域。请扩大窗口；点位与距离保持不变。', {outside,suffix:outside === 1 ? ' is' : 's are'});
  else if (snapEnabled) hint.textContent = t(points.length ? '吸附 5 mm 网格；拖点调整，方向键移动一格' : '吸附 5 mm 网格；点击交点附近添加点');
  else hint.textContent = t(points.length ? '继续点击添加点；拖动圆点调整，方向键微调' : '在测量区连续点击定点，显示各段距离与总长度');
 }
 function layout() { render(); }

 boxButton.addEventListener('click', () => setMode(false));
 pointButton.addEventListener('click', () => setMode(true));
 snapButton.addEventListener('click', () => {
  stopGesture(true);
  snapEnabled = !snapEnabled;
  if (snapEnabled) ensureGridVisible();
  render();
 });
 undoButton.addEventListener('click', undo);
 deleteButton.addEventListener('click', deleteSelected);
 clearButton.addEventListener('click', clear);
 pairFrom.addEventListener('change', () => { pairA = Number(pairFrom.value); pairPinned = true; render(); });
 pairTo.addEventListener('change', () => { pairB = Number(pairTo.value); pairPinned = true; render(); });
 stage.addEventListener('pointerdown', event => {
  if (!active || event.button !== 0 || gesture || event.target.closest?.('.pm-point')) return;
  event.preventDefault();
  gesture = {kind:'add', pointerId:event.pointerId, start:local(event, false), moved:false};
  stage.focus({preventScroll:true});
  capture(event);
 });
 stage.addEventListener('pointermove', event => {
  if (!active || !gesture || gesture.pointerId !== event.pointerId) return;
  const position = local(event, false);
  if (gesture.kind === 'add') {
   if (Math.hypot(position.x - gesture.start.x, position.y - gesture.start.y) > 5) gesture.moved = true;
   return;
  }
  updateDraggedPoint(event);
  render();
 });
 stage.addEventListener('pointerup', event => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const completed = gesture;
  if (active && completed.kind === 'move') updateDraggedPoint(event);
  gesture = null;
  release(event);
  if (!active) return;
  if (completed.kind === 'add') {
   const position = local(event, false), rect = bounds();
   if (!completed.moved && position.x >= 0 && position.y >= 0 && position.x <= rect.width && position.y <= rect.height) addPoint(position);
  } else {
   const point = findPoint(completed.id);
   if (point && Math.hypot(point.x - completed.x, point.y - completed.y) > .001) remember(completed.before);
   render();
  }
 });
 stage.addEventListener('pointercancel', event => {
  if (gesture?.pointerId === event.pointerId) { stopGesture(true); render(); }
 });
 stage.addEventListener('lostpointercapture', event => {
  if (gesture?.pointerId === event.pointerId) { stopGesture(true); render(); }
 });
 stage.addEventListener('keydown', event => {
  if (!active || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  const point = findPoint(selected);
  if (!point) return;
  const next = {x:point.x, y:point.y};
  const step = (event.shiftKey ? 1 : .1) * scale(), rect = bounds();
  if (snapEnabled) {
   const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
   const axis = horizontal ? 'x' : 'y', extent = horizontal ? rect.width : rect.height;
   const positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
   const grid = GRID_MM * scale(), count = event.shiftKey ? 2 : 1;
   const index = positive ? Math.floor(point[axis] / grid + 1e-7) + count : Math.ceil(point[axis] / grid - 1e-7) - count;
   next[axis] = snapAxis(index * grid, extent);
  } else {
   if (event.key === 'ArrowLeft') next.x = Math.max(0, point.x - step);
   if (event.key === 'ArrowRight') next.x = point.x > rect.width ? point.x + step : Math.min(rect.width, point.x + step);
   if (event.key === 'ArrowUp') next.y = Math.max(0, point.y - step);
   if (event.key === 'ArrowDown') next.y = point.y > rect.height ? point.y + step : Math.min(rect.height, point.y + step);
  }
  if (Math.hypot(next.x - point.x, next.y - point.y) < .001) return;
  remember();
  Object.assign(point, next);
  render();
 });
 doc.addEventListener('keydown', event => {
  if (!active || event.ctrlKey || event.metaKey || event.altKey || event.target.matches?.('input,select,textarea') || event.target.isContentEditable || doc.querySelector('dialog[open]')) return;
  if (event.key === 'Backspace') { event.preventDefault(); undo(); stage.focus({preventScroll:true}); }
  if (event.key === 'Delete' && selected !== null) { event.preventDefault(); deleteSelected(); stage.focus({preventScroll:true}); }
 });
 i18n?.onChange?.(() => {
  render();
  stage.dispatchEvent(new Event('ruler-mode-change'));
 });
 render();
 return {render, layout};
}
