import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const temp=mkdtempSync(join(tmpdir(),'daily-motion-illustrations-'));
const run=(args)=>{const r=spawnSync('ffmpeg',['-v','error','-y',...args],{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);};
// Only whole-frame extraction, uniform scale and margin alignment.
// No body masks, compositing, local warps, palette replacement or limb reuse.
const frames=[
 ['rotation-sheet.png','thoracic-rotation-setup',506,1,0,550],
 ['rotation-sheet.png','thoracic-rotation-start',1061,1,550,1090],
 ['rotation-sheet.png','thoracic-rotation-open',1649,1,1090,1717],
 ['cat-cow-sheet.png','cat-cow-exhale',678,916/992,0,750],
 ['cat-cow-sheet.png','cat-cow-inhale',1392,916/992,750,1586]
];
try{
 for(const [sheet,name,baseline,scale,start,end] of frames){
  const y=Math.round(baseline*scale)-Math.round(start*scale)-590+128;
  const filter=`scale=916:-1:flags=lanczos,crop=916:${Math.round(end*scale)-Math.round(start*scale)}:0:${Math.round(start*scale)},pad=1040:ih+256:62:128:color=0xEFF2EF,crop=1040:650:0:${y},scale=1200:750:flags=lanczos`;
  const out=join(temp,name+'.webp');
  run(['-i','artwork/illustrations/'+sheet,'-vf',filter,'-frames:v','1','-c:v','libwebp','-quality','96','-compression_level','6',out]);
  const bytes=readFileSync(out);
  if(bytes.length<1000)throw new Error('Empty export: '+name);
  writeFileSync(join(root,'media',name+'-v6.webp'),bytes);
 }
 console.log('Exported five complete generated frames; no body editing.');
}finally{rmSync(temp,{recursive:true,force:true});}
