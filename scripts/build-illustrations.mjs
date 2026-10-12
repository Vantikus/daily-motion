import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const W=1200,H=750,N=W*H*4;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'daily-motion-illustrations-'));
process.on('exit',()=>fs.rmSync(tempDir,{recursive:true,force:true}));
// Offline asset builder: no code from this script runs in the application.
// Fixed colors and shared contact layers prevent pose-to-pose color/position drift.
const color={shirt:[82,117,101],shirtShadow:[68,99,85],shirtLine:[51,74,61],skin:[240,184,151],skinShadow:[217,156,123],pants:[52,53,53],pantsShadow:[41,43,42],socks:[238,236,234],socksShadow:[211,210,207],hair:[73,50,41],hairShadow:[55,38,30],hairLight:[91,64,51]};
function read(f){const temp=path.join(tempDir,'source.rgba');const r=cp.spawnSync('ffmpeg',['-y','-threads','1','-filter_threads','1','-hide_banner','-loglevel','error','-i',path.join(root,f),'-vf',`scale=${W}:${H}:flags=lanczos`,'-f','rawvideo','-pix_fmt','rgba','-frames:v','1',temp],{maxBuffer:100000});if(r.error||r.status!==0)throw Error(String(r.error||r.stderr.toString()||r.signal));const a=fs.readFileSync(temp);if(a.length!==N)throw Error('Unexpected image buffer size');return a;}
function material(r,g,b){if(g>r*1.08&&g>b*1.04)return 'shirt';if(r>190&&r>g*1.16&&r>b*1.2)return 'skin';if(r>g*1.16&&r>b*1.2)return 'hair';if((r+g+b)/3>165)return 'socks';return 'pants';}
function normalize(a){const out=Buffer.alloc(N);for(let i=0;i<N;i+=4){const [r,g,b,alpha]=a.subarray(i,i+4);if(alpha<=6)continue;const m=material(r,g,b);let c;if(m==='shirt')c=g<83?color.shirtLine:g<106?color.shirtShadow:color.shirt;else if(m==='skin')c=g<164?color.skinShadow:color.skin;else if(m==='hair')c=r<56?color.hairShadow:r>110?color.hairLight:color.hair;else if(m==='socks')c=(r+g+b)/3<217?color.socksShadow:color.socks;else c=(r+g+b)/3<47?color.pantsShadow:color.pants;out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=alpha;}return out;}
function inside(x,y,polygon){let v=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)v=!v;}return v;}
const frontPoly=[[760,540],[899,540],[907,580],[916,620],[923,642],[934,659],[1020,672],[1020,720],[760,720]];
const master=normalize(read('artwork/illustrations/master.webp'));
const lower=Buffer.alloc(N),hips=Buffer.alloc(N),waist=Buffer.alloc(N),front=Buffer.alloc(N),rear=Buffer.alloc(N);
function put(dst,src,i){src.copy(dst,i,i,i+4);}
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;if(!master[i+3])continue;const m=material(...master.subarray(i,i+3));if(x<680&&y>=550)put(lower,master,i);if(x<680&&y<550&&m==='pants')put(hips,master,i);if(x<650&&y<480&&m==='shirt')put(waist,master,i);if(x>700&&y>=620){if(inside(x,y,frontPoly))put(front,master,i);else put(rear,master,i);}}
function over(dst,src){for(let i=0;i<N;i+=4){const a=src[i+3]/255;if(!a)continue;const b=dst[i+3]/255,oa=a+b*(1-a);for(let c=0;c<3;c++)dst[i+c]=Math.round((src[i+c]*a+dst[i+c]*b*(1-a))/oa);dst[i+3]=Math.round(oa*255);}}
function write(name,b){const temp=path.join(tempDir,'export.rgba'),encoded=path.join(tempDir,path.basename(name));fs.writeFileSync(temp,b);const r=cp.spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-i',temp,'-frames:v','1','-c:v','png','-threads','1','-compression_level','9',encoded],{maxBuffer:100000});if(r.error||r.status!==0||fs.statSync(encoded).size<16)throw Error(String(r.error||r.stderr.toString()||r.signal||'Empty export'));fs.writeFileSync(name+'.new',fs.readFileSync(encoded));fs.renameSync(name+'.new',name);}
const jobs=[{name:'thoracic-rotation-setup',src:'master',two:true},{name:'cat-cow-exhale',src:'cat-cow-exhale',two:true},{name:'cat-cow-inhale',src:'cat-cow-inhale',two:true},{name:'thoracic-rotation-start',src:'thoracic-rotation-start',two:false},{name:'thoracic-rotation-open',src:'thoracic-rotation-open',two:false}];
function bounds(a,y,kind,mask){let lo=W,hi=-1;for(let x=0;x<W;x++){const i=(y*W+x)*4;if(a[i+3]>180&&material(...a.subarray(i,i+3))===kind&&(!mask||mask[i+3])){if(kind==='pants'&&x>680||kind==='skin'&&x<700)continue;lo=Math.min(lo,x);hi=Math.max(hi,x)}}if(hi<=lo)throw Error(`Missing ${kind} anchor at row ${y}`);return [lo,hi];}
function sample(a,x,y){x=Math.round(x);y=Math.round(y);if(x<0||x>=W||y<0||y>=H)return null;return a.subarray((y*W+x)*4,(y*W+x)*4+4);}
for(const job of jobs){const a=normalize(read(`artwork/illustrations/${job.src}.webp`));const upper=Buffer.alloc(N);const [pl,pr]=bounds(a,550,'pants'),[tl,tr]=bounds(master,550,'pants');const ps=(tr-tl)/(pr-pl),pd=tl-pl*ps;
 const [al,ar]=bounds(a,620,'skin'),[bl,br]=bounds(master,620,'skin',job.two?null:front);const as=(br-bl)/(ar-al);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(x<680&&y>=550||x>700&&y>=620)continue;
  const i=(y*W+x)*4;let pix=sample(a,x,y);const mat=pix&&material(...pix.subarray(0,3));if(job.name.startsWith('thoracic')&&x<680&&(mat==='pants'||hips[i+3]))continue;
  if(!job.name.startsWith('thoracic')&&x<680&&y>=480){const t=(y-480)/70,scale=1+t*(ps-1),shift=t*pd;const warped=sample(a,(x-shift)/scale,y);if(warped&&material(...warped.subarray(0,3))==='pants')pix=warped;else if(mat==='pants')pix=null;}
  if(x>700&&y>=420){const t=(y-420)/200,spread=Math.max(0,(y-580)/40),scale=1+spread*(as-1),shift=t*((bl+br-al-ar)/2)+(1-scale)*(al+ar)/2;const warped=sample(a,(x-shift)/scale,y);if(warped&&warped[3]&&material(...warped.subarray(0,3))!=='shirt')pix=warped;else if(pix&&pix[3]&&mat!=='shirt')pix=null;}
  if(pix&&pix[3])pix.copy(upper,i);
 }
 const b=Buffer.from(lower);if(job.name.startsWith('thoracic')){over(b,hips);over(b,waist);}over(b,upper);if(job.two)over(b,rear);over(b,front);write(path.join(root,`media/${job.name}-v5.png`),b);
}
console.log('Built 5 exercise poses with shared contact pixels and a fixed palette.');
