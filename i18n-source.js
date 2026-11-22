// Inlined into the offline HTML. Language changes update text without replacing controls.
window.RulerI18n = (() => {
 'use strict';
 const storageKey = 'screen-ruler-language';
 const english = {
  '在线屏幕尺子｜校准后按实际尺寸测量':'Online Screen Ruler | Measure at Actual Size',
  '屏幕尺子':'Screen Ruler',
  '个人标识':'Personal mark',
  '好用的话，给个 Star 吧':'Find this useful? Give it a star.',
  '前往 GitHub 仓库，给屏幕尺子点个 Star（新标签页）':'Visit the GitHub repository and star Screen Ruler (opens a new tab)',
  'beason409/screen-ruler · 在 GitHub 上支持这个工具':'beason409/screen-ruler · Support this tool on GitHub',
  '免费的在线屏幕尺子，支持毫米、厘米和英寸。用银行卡、硬币或直尺校准屏幕后，即可测量物体的实际尺寸，也可下载单个 HTML 文件离线使用。':'Free online screen ruler with mm, cm and inches. Calibrate with a bank card, coin or ruler to compare actual object sizes, or download the HTML for offline use.',
  '本地运行 · 无需联网':'Local · Works offline',
  '切换明暗背景':'Switch light / dark theme',
  '收起工具栏，扩大测量区':'Hide the sidebar for more measuring space',
  '专注测量':'Focus mode',
  '显示工具栏':'Show tools',
  '校准屏幕':'Calibrate screen',
  '测量设置':'Measurement settings',
  '显示单位':'Units',
  '毫米 mm':'mm',
  '厘米 cm':'cm',
  '英寸 in':'in',
  '测量形状':'Shape',
  '方框':'Rectangle',
  '圆形':'Circle',
  '测量尺寸':'Dimensions',
  '宽度':'Width',
  '高度':'Height',
  '直径':'Diameter',
  '圆形直径':'Circle diameter',
  '测量框宽度':'Rectangle width',
  '测量框高度':'Rectangle height',
  '正方形':'Square',
  '开启后宽高相同':'Keep width and height equal',
  '交换宽度和高度':'Swap width and height',
  '旋转':'Rotate',
  '居中':'Center',
  '锁定':'Lock',
  '已锁定':'Locked',
  '常用尺寸':'Presets',
  '测量区外观':'Appearance',
  '显示网格':'Show grid',
  '中心标记':'Center mark',
  '显示中心标记':'Show center mark',
  '边框颜色':'Outline color',
  '绿色边框':'Green outline',
  '蓝色边框':'Blue outline',
  '橙色边框':'Orange outline',
  '拖动框内，移动测量框':'Drag inside the shape to move it',
  '拖动角点或边点，调整尺寸':'Drag a corner or edge handle to resize',
  '方向键':'Arrow keys',
  '微调 0.1 mm':'Move 0.1 mm',
  '移动 1 mm':'Move 1 mm',
  '专注模式 ·':'Focus mode ·',
  '退出':'Exit',
  '实物测量区':'Real-size measuring area',
  '把物品放到屏幕前，直接比一比。':'Hold an object up to the screen to compare.',
  '先用银行卡、硬币或直尺校准屏幕，再用测量框外沿对比实物尺寸。':'Calibrate with a bank card, coin, or ruler, then compare the object against the outer edge of the measuring shape.',
  '全屏测量工具':'Fullscreen measuring tools',
  '定点测量':'Point measurement',
  '形状对比':'Shape comparison',
  '吸附网格':'Snap to grid',
  '全屏吸附网格':'Snap to grid in fullscreen',
  '收起工具':'Hide tools',
  '展开工具':'Show tools',
  '退出全屏':'Exit fullscreen',
  '退出测量区全屏':'Exit measuring fullscreen',
  '水平刻度尺':'Horizontal ruler',
  '垂直刻度尺':'Vertical ruler',
  '可拖动的测量框':'Draggable measuring shape',
  '拖动移动':'Drag to move',
  '拖动角点调整大小':'Drag handles to resize',
  '拉动圆周点调整直径':'Drag circle handles to resize',
  '拖动与键盘微调已锁定':'Dragging and keyboard movement are locked',
  '拖动移动<br>拉动圆周点调整直径':'Drag to move<br>Drag circle handles to resize',
  '拖动移动<br>拖动角点调整大小':'Drag to move<br>Drag handles to resize',
  '调整左上角':'Resize top-left corner',
  '调整上边':'Resize top edge',
  '调整右上角':'Resize top-right corner',
  '调整右边':'Resize right edge',
  '调整右下角':'Resize bottom-right corner',
  '调整下边':'Resize bottom edge',
  '调整左下角':'Resize bottom-left corner',
  '调整左边':'Resize left edge',
  '上':'top',
  '下':'bottom',
  '左':'left',
  '右':'right',
  '调整圆形{side}端直径':'Resize circle from the {side}',
  '调整{side}边':'Resize {side} edge',
  '圆形测量，直径 {diameter} {unit}。拖动圆周控制点调整直径，方向键微调位置。':'Circle, diameter {diameter} {unit}. Drag a circle handle to resize; use arrow keys to move.',
  '测量框，宽 {width} {unit}，高 {height} {unit}。方向键可微调位置。':'Rectangle, width {width} {unit}, height {height} {unit}. Use arrow keys to move.',
  '宽 × 高':'Width × height',
  '总长度 {total} · {summary}':'Total {total} · {summary}',
  '0 点':'0 points',
  '测量区全屏':'Fullscreen',
  '首次使用请先校准；换显示器或改变浏览器缩放后，需要重新确认。':'Calibrate before use. Recheck after changing displays or browser zoom.',
  '让屏幕上的尺寸，对应真实尺寸。':'Match the screen to real dimensions.',
  '关闭校准':'Close calibration',
  '把一张标准银行卡放在屏幕前，调整下方轮廓，直到左右边缘与卡片完全重合。对齐宽度即可。':'Hold a standard bank card up to the screen. Adjust the outline until its left and right edges match the card.',
  '把一张标准银行卡放在屏幕前，调整下方轮廓，直到左右外边缘与卡片完全重合。对齐宽度即可。':'Hold a standard bank card up to the screen. Adjust the outline until its outer left and right edges match the card.',
  '用直尺或已知长度的物品对齐下方线段。先输入实际长度，再调整线段，让两端与实物刻度重合。':'Use a ruler or an object of known length. Enter its actual length, then adjust the line until both ends match.',
  '选择手边硬币的币种与版本，将硬币放在屏幕前，调整圆形轮廓，让圆周的最外缘与硬币重合。':'Choose your coin and version. Hold it up to the screen and adjust the circle until its outer edge matches the coin.',
  '选择当前输出分辨率，再填写你知道的尺寸。补充规格均选填，填写后自动计算并交叉核对。':'Choose the current output resolution and enter any dimensions you know. Extra specifications are optional and are cross-checked automatically.',
  '选择校准方式':'Choose a calibration method',
  '屏幕尺寸 / 分辨率':'Display / resolution',
  '硬币':'Coin',
  '银行卡':'Bank card',
  '直尺 / 已知长度':'Ruler / known length',
  '常见屏幕尺寸（选填）':'Screen size (optional)',
  '常见屏幕尺寸':'Screen-size preset',
  '常见屏幕尺寸单位':'Screen-size units',
  '自填规格 / 不选预设':'Custom specifications / no preset',
  '也可选择“自填规格”，使用下方已知尺寸。':'Choose custom specifications to use the dimensions below.',
  '当前屏幕输出分辨率':'Current output resolution',
  '屏幕分辨率':'Display resolution',
  '自定义分辨率':'Custom resolution',
  '超宽屏':'Ultrawide',
  '水平像素':'Horizontal pixels',
  '垂直像素':'Vertical pixels',
  '屏幕水平像素':'Display horizontal pixels',
  '屏幕垂直像素':'Display vertical pixels',
  '显示缩放换算':'Display scaling',
  '屏幕缩放换算方式':'Display scaling method',
  '自动适配当前系统与浏览器缩放（推荐）':'Automatic system and browser scaling (recommended)',
  '手动填写总缩放比例':'Enter total scaling manually',
  '总缩放百分比':'Total scaling percentage',
  '例：系统 150% × 浏览器 100% = 150%':'Example: system 150% × browser 100% = 150%',
  '补充显示器规格':'Additional display specifications',
  '选填 · 可按说明书填写':'Optional · Check your display specifications',
  '知道哪项就填哪项，可直接用可视尺寸或画面宽高计算。':'Enter whichever values you know. Visible diagonal or display dimensions can be used directly.',
  '规格长度单位':'Length units',
  '补充规格长度单位':'Specification length units',
  '可视对角线（可选）':'Visible diagonal (optional)',
  '画面宽高比（可选）':'Aspect ratio (optional)',
  '画面宽度（可选）':'Display width (optional)',
  '画面高度（可选）':'Display height (optional)',
  '水平点距 H（可选）':'Horizontal pixel pitch H (optional)',
  '垂直点距 V（可选）':'Vertical pixel pitch V (optional)',
  '像素密度（可选）':'Pixel density (optional)',
  '点距 / 密度所用分辨率':'Resolution for pitch / density',
  '暂不清楚 · 暂不使用点距和密度':'Unknown · Exclude pitch and density',
  '当前输出就是面板原生分辨率':'Current output is the native resolution',
  '另填面板原生分辨率':'Enter native resolution separately',
  '面板原生水平像素':'Native horizontal pixels',
  '面板原生垂直像素':'Native vertical pixels',
  '请按当前横竖方向填写规格。宽或高只填一项时，另一项按宽高比推算。点距对应面板原生像素；若系统降低了输出分辨率，请另填原生分辨率。亮度和面板类型不影响尺寸换算。':'Enter specifications for the current screen orientation. If only width or height is given, the other is derived from the aspect ratio. Pixel pitch uses native panel pixels; enter the native resolution if output resolution is reduced. Brightness and panel type do not affect dimensions.',
  '所有补充规格均选填，画面尺寸不包含边框。':'All extra specifications are optional. Display dimensions exclude the bezel.',
  '优先使用画面宽高，其次为点距或像素密度、可视对角线、常见屏幕尺寸；其余已填规格用于交叉核对。参数估算仍可用实物进一步校准。':'Display dimensions take priority, followed by pixel pitch or density, visible diagonal, and screen-size presets. Other values are cross-checked. A physical reference can refine the calibration.',
  '可视对角线':'Visible diagonal',
  '画面宽高比':'Aspect ratio',
  '画面宽度':'Display width',
  '画面高度':'Display height',
  '有效画面宽度':'Active display width',
  '有效画面高度':'Active display height',
  '水平点距':'Horizontal pixel pitch',
  '垂直点距':'Vertical pixel pitch',
  '可留空':'Optional',
  '面板像素密度':'Panel pixel density',
  '像素密度单位':'Pixel density units',
  '面板原生分辨率来源':'Native resolution source',
  '例如 {value}':'e.g. {value}',
  '{size} 英寸':'{size} in',
  '{size} {unit}（{inches} 英寸）':'{size} {unit} ({inches} in)',
  '当前自动换算系数：{percent}%（包含浏览器缩放）':'Automatic scaling: {percent}% (includes browser zoom)',
  '采用：{source}\n有效画面：{width} × {height} {unit}\n当前输出密度：{density} px / {unit} · 测量比例：{scale} px / mm':'Using: {source}\nActive display: {width} × {height} {unit}\nOutput density: {density} px / {unit} · Scale: {scale} px / mm',
  '\n核对：其余已填规格一致（允许 1% 取整差）':'\nCross-check: other specifications agree (1% rounding tolerance)',
  '画面宽高':'Display dimensions',
  '画面宽度 + 宽高比':'Display width + aspect ratio',
  '画面高度 + 宽高比':'Display height + aspect ratio',
  '点距 + 原生分辨率':'Pixel pitch + native resolution',
  '像素密度 + 原生分辨率':'Pixel density + native resolution',
  '币种 / 面额 / 版本':'Currency / denomination / version',
  '校准硬币种类':'Calibration coin',
  '人民币 CNY':'Chinese yuan CNY',
  '美元 USD':'US dollar USD',
  '欧元 EUR':'Euro EUR',
  '1 元 · 2019 版小号菊花 · 22.25 mm':'1 yuan · 2019 small chrysanthemum · 22.25 mm',
  '1 元 · 1999 版大号菊花 · 25.00 mm':'1 yuan · 1999 large chrysanthemum · 25.00 mm',
  '5 角 · 荷花 · 20.50 mm':'5 jiao · lotus · 20.50 mm',
  '1 角 · 兰花（2005 / 2019 版）· 19.00 mm':'1 jiao · orchid (2005 / 2019) · 19.00 mm',
  '25 美分 · Quarter · 24.26 mm':'25 cents · Quarter · 24.26 mm',
  '10 美分 · Dime · 17.91 mm':'10 cents · Dime · 17.91 mm',
  '5 美分 · Nickel · 21.21 mm':'5 cents · Nickel · 21.21 mm',
  '1 美分 · Penny · 19.05 mm':'1 cent · Penny · 19.05 mm',
  '2 欧元 · 25.75 mm':'2 euro · 25.75 mm',
  '1 欧元 · 23.25 mm':'1 euro · 23.25 mm',
  '人民币 1 元 · 2019 版小号菊花。与旧版 25 mm 大号硬币不同，请先确认版本。':'CNY 1 yuan, 2019 small chrysanthemum. This differs from the older 25 mm coin; check your version.',
  '人民币 1 元 · 1999 版大号菊花。不要与 2019 版小号硬币或纪念币混用。':'CNY 1 yuan, 1999 large chrysanthemum. Do not use the smaller 2019 coin or a commemorative coin.',
  '人民币荷花 5 角，适用 1999 版金黄色和 2019 版镍白色硬币；纪念币不适用。':'CNY lotus 5 jiao: 1999 gold-colored or 2019 nickel-colored circulating coins. Commemorative coins are not supported.',
  '人民币兰花 1 角，适用 2005 / 2019 版；不适用旧菊花 1 角。':'CNY orchid 1 jiao, 2005 / 2019 versions. The older chrysanthemum 1 jiao is not supported.',
  '美元 25 美分（Quarter）流通规格。请使用完整、未明显变形的硬币。':'US quarter circulating coin. Use an intact coin with no visible deformation.',
  '美元 10 美分（Dime）流通规格。请按最外圆周对齐。':'US dime circulating coin. Match the outermost edge.',
  '美元 5 美分（Nickel）流通规格。请按最外圆周对齐。':'US nickel circulating coin. Match the outermost edge.',
  '美元 1 美分（Penny）标准直径。请按最外圆周对齐。':'US penny standard diameter. Match the outermost edge.',
  '2 欧元流通规格，以外环最外缘为准。':'Circulating 2 euro coin. Match the outer edge of the outer ring.',
  '1 欧元流通规格，以外环最外缘为准。':'Circulating 1 euro coin. Match the outer edge of the outer ring.',
  '5角':'5 jiao',
  '1角':'1 jiao',
  '对比的实际长度':'Actual reference length',
  '校准参考长度':'Calibration reference length',
  '拖动调整校准轮廓的宽度':'Drag to adjust the calibration outline width',
  '缩小校准轮廓':'Make calibration outline smaller',
  '校准轮廓大小':'Calibration outline size',
  '放大校准轮廓':'Make calibration outline larger',
  '每毫米的屏幕像素':'Screen pixels per millimeter',
  '拖动右侧把手，或用滑块 / 加减按钮微调':'Drag the right handle, or fine-tune with the slider / − and + buttons',
  '请保持当前浏览器缩放与显示器不变。':'Keep the same display and browser zoom.',
  '轮廓只按真实比例绘制，不会自动缩小。若右边缘被遮住，可改用较短的已知长度校准。':'The outline keeps its real scale and will not shrink to fit. If its right edge is hidden, use a shorter known length.',
  '仅保存在此浏览器，无需上传任何信息':'Saved in this browser only. Nothing is uploaded.',
  '取消':'Cancel',
  '已对齐，保存校准':'Save calibration',
  '使用屏幕参数并保存':'Save display calibration',
  '直径 {diameter} mm':'Diameter {diameter} mm',
  '浏览器不允许保存设置；本次使用仍然有效。':'This browser cannot save settings. They still apply for this session.',
  '检测到缩放或屏幕环境变化，请重新校准后再测量。':'Display or zoom settings changed. Recalibrate before measuring.',
  '测量框超出可见区域，尺寸保持不变。请全屏、收起工具栏，或减小尺寸。':'The shape extends beyond the visible area; its scale is unchanged. Use fullscreen, hide tools, or choose a smaller size.',
  '请输入 1–2000 mm 范围内的尺寸。':'Enter a dimension between 1 and 2000 mm.',
  '测量框已锁定，避免物品遮挡时误拖。':'The shape is locked to prevent accidental movement.',
  '测量框已解锁。':'The shape is unlocked.',
  '未能退出全屏，请按 Esc。':'Could not exit fullscreen. Press Esc.',
  '测量区已铺满网页；按 F11 可隐藏浏览器边框。':'The measuring area fills the page. Press F11 to hide browser controls.',
  '测量区已铺满网页；按 F11 可进入屏幕全屏。':'The measuring area fills the page. Press F11 for screen fullscreen.',
  '有数值尚未填写完整，请补全数字或清空该项后再保存。':'A number is incomplete. Finish it or clear the field before saving.',
  '水平和垂直分辨率请输入 320–32768 范围内的整数。':'Horizontal and vertical resolution must be whole numbers from 320 to 32768.',
  '总缩放比例请输入 25%–1000%。':'Enter total scaling from 25% to 1000%.',
  '{field}请输入有效的正数，或留空。':'Enter a valid positive value for {field}, or leave it blank.',
  '请选择常见屏幕尺寸，或选择自填规格。':'Choose a screen-size preset or custom specifications.',
  '像素密度请输入有效的正数，或留空。':'Enter a valid positive pixel density, or leave it blank.',
  '宽高比请填 16:9、16:10 或 1.7778 这样的正数。':'Enter an aspect ratio such as 16:9, 16:10, or 1.7778.',
  '宽高比请输入 0.1–10 范围内的比例。':'Enter an aspect ratio between 0.1 and 10.',
  '请补全 320–32768 范围内的面板原生水平和垂直像素，或改为“暂不清楚”。':'Enter both native pixel dimensions from 320 to 32768, or choose Unknown.',
  '点距 / 像素密度尚未参与计算：请确认当前输出就是原生分辨率，或另填面板原生分辨率。':'Pixel pitch / density is excluded until you confirm the current output is native or enter the native resolution.',
  '请至少填写一种可用尺寸：可视对角线或常见屏幕尺寸、画面宽高中的一项，或已确认原生分辨率的点距 / 像素密度。':'Provide a visible diagonal or screen-size preset, a display width or height, or pixel pitch / density with a confirmed native resolution.',
  '计算出的画面尺寸超出范围，请检查长度单位与面板原生分辨率。':'Calculated display dimensions are out of range. Check length units and native resolution.',
  '当前输出分辨率与采用的画面宽高比不一致，无法使用统一比例。请按当前横竖方向填写宽高 / 点距，并确认输出铺满画面。':'Output resolution and display aspect ratio do not match, so a uniform scale cannot be used. Enter dimensions / pixel pitch for the current orientation and check that output fills the display.',
  '{other}与{source}相差 {difference}%，请核对；当前采用{source}。':'{other} differs from {source} by {difference}%. Check the values; {source} is being used.',
  '填写的宽高比与采用的画面宽高不一致，请核对；当前采用{source}。':'The entered aspect ratio differs from the display dimensions. Check the values; {source} is being used.',
  '这些参数计算出的比例超出支持范围，请检查尺寸、分辨率和缩放比例。':'The calculated scale is out of range. Check dimensions, resolution, and scaling.',
  '参考长度请输入 1–300 mm。':'Enter a reference length from 1 to 300 mm.',
  '请先结束双指缩放，再进行校准。':'End pinch zoom before calibrating.',
  '已按屏幕参数保存估算比例，可随时用实物进一步校准。':'Display-based calibration saved. You can refine it with a physical reference anytime.',
  '校准已保存，可以开始对比实物尺寸。':'Calibration saved. You can now compare real object dimensions.',
  '校准已生效，仅在本次打开时有效。':'Calibration applied for this session only.',
  '屏幕环境已变化，请重新打开校准。':'Display settings changed. Reopen calibration.'
 };
 let language = 'zh';
 try { if (localStorage.getItem(storageKey) === 'en') language = 'en'; } catch (_) {}
 const listeners = new Set();
 const textSources = new WeakMap();
 const attributeSources = new WeakMap();
 const doc = document;
 function translate(source) {
  if (Object.prototype.hasOwnProperty.call(english, source)) return english[source];
  const inches = source.match(/^(\d+(?:\.\d+)?) 英寸(?: · 超宽屏)?$/);
  if (inches) return inches[1] + ' in' + (source.endsWith('超宽屏') ? ' · Ultrawide' : '');
  if (/^\d+ × \d+ · 超宽屏$/.test(source)) return source.replace('超宽屏', 'Ultrawide');
  if (source.startsWith('例如 ')) return 'e.g. ' + source.slice(3);
  return source;
 }
 function t(source, variables = {}) {
  const template = language === 'en' ? translate(String(source)) : String(source);
  return template.replace(/\{([a-zA-Z][\w]*)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match);
 }
 function translatable(source) { return /[\u3400-\u9fff]/.test(source); }
 function withWhitespace(source) {
  const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return match[1] + t(match[2]) + match[3];
 }
 function updateShell() {
  doc.documentElement?.setAttribute('lang', language === 'en' ? 'en' : 'zh-CN');
  doc.title = t('在线屏幕尺子｜校准后按实际尺寸测量');
  const button = doc.getElementById?.('languageBtn');
  if (button) {
   button.textContent = language === 'en' ? '中文' : 'English';
   button.setAttribute('aria-label', language === 'en' ? 'Switch to Chinese' : '切换为英文');
   button.setAttribute('title', language === 'en' ? 'Switch to Chinese' : '切换为英文');
   button.setAttribute('lang', language === 'en' ? 'zh-CN' : 'en');
  }
 }
 function translateText(node) {
  const current = node.nodeValue;
  if (typeof current !== 'string') return;
  let record = textSources.get(node);
  if (!record || (current !== record.last && current !== record.source)) {
   if (!translatable(current)) { textSources.delete(node); return; }
   record = { source: current, last: current };
   textSources.set(node, record);
  }
  const next = withWhitespace(record.source);
  if (current !== next) node.nodeValue = next;
  record.last = next;
 }
 function translateAttribute(element, name) {
  const current = element.getAttribute(name);
  if (current === null) return;
  let records = attributeSources.get(element);
  if (!records) { records = new Map(); attributeSources.set(element, records); }
  let record = records.get(name);
  if (!record || (current !== record.last && current !== record.source)) {
   if (!translatable(current)) { records.delete(name); return; }
   record = { source: current, last: current };
   records.set(name, record);
  }
  const next = withWhitespace(record.source);
  if (current !== next) element.setAttribute(name, next);
  record.last = next;
 }
 function apply(root = doc) {
  // Node behavior checks use a small DOM; text traversal is a browser enhancement.
  if (typeof doc.createTreeWalker === 'function') {
   const walker = doc.createTreeWalker(root, 4);
   let node;
   while ((node = walker.nextNode())) {
    let parent = node.parentElement, excluded = false;
    while (parent) {
     if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName) || parent.id === 'languageBtn') { excluded = true; break; }
     parent = parent.parentElement;
    }
    if (!excluded) translateText(node);
   }
   const elements = [...(root.nodeType === 1 ? [root] : []), ...root.querySelectorAll('[title],[aria-label],[placeholder],optgroup[label],meta[name="description"]')];
   for (const element of elements) {
    if (element.id === 'languageBtn') continue;
    for (const name of ['title', 'aria-label', 'placeholder']) translateAttribute(element, name);
    if (element.tagName === 'OPTGROUP') translateAttribute(element, 'label');
    if (element.tagName === 'META' && element.getAttribute('name') === 'description') translateAttribute(element, 'content');
   }
  }
  updateShell();
 }
 function setLanguage(next) {
  if (next !== 'en' && next !== 'zh') return;
  if (next !== language) {
   language = next;
   try { localStorage.setItem(storageKey, language); } catch (_) {}
   for (const listener of [...listeners]) listener(language);
  }
  apply();
 }
 const api = { t, getLanguage: () => language, setLanguage, onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }, apply };
 apply();
 return api;
})();
