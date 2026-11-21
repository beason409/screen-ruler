// Regenerates the inline point tool while keeping the deliverable as one offline HTML file.
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, 'screen-ruler.html');
const source = fs.readFileSync(path.join(__dirname, 'point-measurement-source.js'), 'utf8');
const i18nSource = fs.readFileSync(path.join(__dirname, 'i18n-source.js'), 'utf8');
const marker = '<!-- POINT-MEASUREMENT-START -->';
const end = '<!-- POINT-MEASUREMENT-END -->';
const bridge = `
(() => {
 const stage = document.getElementById('stage');
 let noticeTimer, pointNoticeMessage;
 const tool = installPointMeasurement({
  stage,
  i18n:window.RulerI18n,
  box:document.getElementById('measureBox'),
  getScale:() => Number(stage.dataset.pmm),
  getUnit:() => stage.dataset.unit || 'mm',
  ensureGridVisible:() => {
   const grid = document.getElementById('gridBtn');
   if (grid.getAttribute('aria-checked') !== 'true') grid.click();
  },
  toast:(message, translateMessage) => {
   const notice=document.getElementById('toast');
   notice.dataset.owner='points';pointNoticeMessage=translateMessage;
   notice.textContent=message;notice.hidden=false;
   clearTimeout(noticeTimer);noticeTimer=setTimeout(() => notice.hidden=true,3500);
  }
 });
 window.RulerI18n.onChange(() => {
  const notice=document.getElementById('toast');
  if (!notice.hidden && notice.dataset.owner==='points' && pointNoticeMessage) notice.textContent=pointNoticeMessage();
 });
 new MutationObserver(() => tool.render()).observe(stage,{attributes:true,attributeFilter:['data-pmm','data-unit','class']});
 new ResizeObserver(() => tool.layout()).observe(stage);
})();
`;
let html = fs.readFileSync(target, 'utf8');
const languageStart = '// I18N-START';
const languageEnd = '// I18N-END';
const languageSection = languageStart + '\n' + i18nSource + '\n' + languageEnd;
if (html.includes(languageStart)) {
  if (!html.includes(languageEnd)) throw new Error('Missing language section end marker');
  html = html.slice(0, html.indexOf(languageStart)) + languageSection + html.slice(html.indexOf(languageEnd) + languageEnd.length);
} else html = html.replace('<script>', '<script>\n' + languageSection);
const section = marker + '\n<script>\n' + source + '\n' + bridge + '\n</script>\n' + end;
if (html.includes(marker)) html = html.slice(0, html.indexOf(marker)) + section + html.slice(html.indexOf(end) + end.length);
else html = html.replace('</body>', section + '\n</body>');
fs.writeFileSync(target, html, 'utf8');
console.log('Built single-file offline HTML with point measurement.');
