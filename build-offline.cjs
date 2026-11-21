// Regenerates the inline point tool while keeping the deliverable as one offline HTML file.
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '屏幕尺子.html');
const source = fs.readFileSync(path.join(__dirname, 'point-measurement-source.js'), 'utf8');
const marker = '<!-- POINT-MEASUREMENT-START -->';
const end = '<!-- POINT-MEASUREMENT-END -->';
const bridge = `
(() => {
 const stage = document.getElementById('stage');
 let noticeTimer;
 const tool = installPointMeasurement({
  stage,
  box:document.getElementById('measureBox'),
  getScale:() => Number(stage.dataset.pmm),
  getUnit:() => stage.dataset.unit || 'mm',
  toast:message => {
   const notice=document.getElementById('toast');
   notice.textContent=message;notice.hidden=false;
   clearTimeout(noticeTimer);noticeTimer=setTimeout(() => notice.hidden=true,3500);
  }
 });
 new MutationObserver(() => tool.render()).observe(stage,{attributes:true,attributeFilter:['data-pmm','data-unit']});
 new ResizeObserver(() => tool.layout()).observe(stage);
})();
`;
let html = fs.readFileSync(target, 'utf8');
const section = marker + '\n<script>\n' + source + '\n' + bridge + '\n</script>\n' + end;
if (html.includes(marker)) html = html.slice(0, html.indexOf(marker)) + section + html.slice(html.indexOf(end) + end.length);
else html = html.replace('</body>', section + '\n</body>');
fs.writeFileSync(target, html, 'utf8');
fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
console.log('Built single-file offline HTML with point measurement.');
