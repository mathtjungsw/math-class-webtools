import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),gas=path.join(root,'apps-script');
const read=name=>fs.readFile(path.join(root,name),'utf8');
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
let html=await read('index.html');
html=html.replace('<link rel="stylesheet" href="./style.css">',"<?!= include_('Styles'); ?>");
html=html.replace(/  <script defer src="\.\/(config|engine|collector|repository|app)\.js"><\/script>\r?\n/g,'');
html=html.replace('</body>',"<?!= include_('Data'); ?>\n<?!= include_('Engine'); ?>\n<?!= include_('Collector'); ?>\n<?!= include_('Repository'); ?>\n<?!= include_('App'); ?>\n</body>");
html=html.replace('href="../../index.html"','href="#"');
await fs.writeFile(path.join(gas,'Index.html'),html);
await fs.writeFile(path.join(gas,'Styles.html'),'<style>\n'+await read('style.css')+'\n</style>');
for(const [name,file] of [['Engine','engine.js'],['Collector','collector.js'],['Repository','repository.js'],['App','app.js']]){
  const source=await read(file);await fs.writeFile(path.join(gas,name+'.html'),'<script>\n'+escapeScript(source)+'\n</script>');
  if(name==='Engine'||name==='Collector')await fs.writeFile(path.join(gas,name+'Server.gs'),source);
}
const land=await read('data/land.json'),example=await read('data/example.json');
await fs.writeFile(path.join(gas,'Land.html'),land);
await fs.writeFile(path.join(gas,'Data.html'),'<script>window.HISTORY_EXAMPLE='+escapeScript(example)+';</script>');
// Include the one stored land file directly in the evaluated template.
const generated=await fs.readFile(path.join(gas,'Index.html'),'utf8');
await fs.writeFile(path.join(gas,'Index.html'),generated.replace("<?!= include_('Data'); ?>", "<script>window.HISTORY_LAND=<?!= include_('Land'); ?>;</script>\n<?!= include_('Data'); ?>"));
console.log('Apps Script sources generated.');
