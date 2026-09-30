import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { test, expect } from './helpers/runtime.js';

const capture=process.env.DM_CAPTURE_BASELINES==='1';
if(capture&&!process.env.DM_BASELINE_URL)throw new Error('Baseline capture requires an explicit reference server');
const cases=[
  {name:'home-compact-light',page:'home',width:360,height:640},
  {name:'home-wide-light',page:'home',width:1280,height:900},
  {name:'home-dark',page:'home',theme:'dark'},
  {name:'progress-dark',page:'progress',theme:'dark'},
  {name:'workout-compact-light',page:'session',width:360,height:640},
  {name:'workout-wide-light',page:'session',width:1280,height:900},
  {name:'home-settings',page:'home',state:'settings'},
  {name:'workout-paused',page:'session',state:'paused'},
  {name:'workout-rest-dark',page:'session',state:'rest',theme:'dark'},
  {name:'workout-completion',page:'session',state:'completion'}
];

test.use({serviceWorkers:'block',reducedMotion:'reduce',deviceScaleFactor:1});
for(const scenario of cases){
  test(`visual matrix · ${scenario.name}`,async({page,baseURL},testInfo)=>{
    const time=new Date('2026-09-22T08:00:00+05:00');
    await page.clock.install({time});
    await page.clock.pauseAt(new Date(time.getTime()+1000));
    await page.setViewportSize({width:scenario.width||390,height:scenario.height||844});
    await page.addInitScript(scenario=>{
      const routine=scenario.state==='completion'?{step:8,completedUntil:9,activeSeconds:120}
        :scenario.state==='rest'?{completedUntil:1,activeSeconds:40}
        :scenario.state==='paused'?{timers:{'cat-cow':{duration:40,remaining:17,paused:true}}}:{};
      localStorage.setItem('dailyMotionState.v3',JSON.stringify({version:3,settings:{countdownSeconds:0,restSeconds:15,sound:false,autoNext:false,theme:scenario.theme||'light'},programVersions:{morning:'morning-v3-active-2026-09-19'},days:{'2026-09-22':{routines:{morning:routine}}}}));
    },scenario);
    const path=scenario.page==='home'?'/index.html':scenario.page==='progress'?'/progress.html':'/session.html?routine=morning';
    await page.goto(new URL(path,capture?process.env.DM_BASELINE_URL:baseURL).href,{waitUntil:'domcontentloaded'});
    await page.clock.runFor(32);
    if(scenario.state==='settings')await page.locator('#settingsBtn').click({force:true});
    if(['paused','rest','completion'].includes(scenario.state)){
      await page.locator('#nextButton').click({force:true});
      if(scenario.state==='paused'){
        await expect(page.locator('#timerToggle')).toHaveText('Пауза');
        await page.locator('#timerToggle').click({force:true});
      }
    }
    await page.clock.runFor(500);
    await page.evaluate(()=>document.querySelector('#toast')?.classList.remove('show'));
    const image=await page.screenshot({fullPage:true,animations:'disabled',caret:'hide',scale:'css'});
    const name=`${scenario.name}.png`;
    if(capture){
      const path=testInfo.snapshotPath(name);
      await mkdir(dirname(path),{recursive:true});
      await writeFile(path,image);
      const file=relative(process.cwd(),path);
      const content=image.toString('base64');
      console.log('DM_BASELINE_META '+JSON.stringify({path:file,length:content.length}));
      for(let offset=0;offset<content.length;offset+=4000)console.log('DM_BASELINE_DATA '+JSON.stringify({path:file,index:offset/4000,data:content.slice(offset,offset+4000)}));
    }else{
      expect(image).toMatchSnapshot(name,{maxDiffPixels:0});
    }
  });
}
