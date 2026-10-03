import { expect, test, expectSwup } from './helpers/runtime.js';

const capture=process.env.DM_CAPTURE_BASELINES==='1';
if(capture&&!process.env.DM_BASELINE_URL)throw new Error('Baseline capture requires an explicit reference server');
const baseState={
  version:3,
  settings:{countdownSeconds:3,restSeconds:15,sound:true,autoNext:false,theme:'light'},
  programVersions:{morning:'morning-v3-active-2026-09-19'},
  days:{}
};

// PNG expectations expose expected/actual/diff instead of an opaque encoding hash.
// Fonts, clock and application state settle before the first comparison.
test.describe('Daily Motion visual baselines',()=>{
  test.skip(({browserName})=>browserName!=='chromium','390px supplementary baselines are verified in Chromium');
  test.use({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
  for(const [name,path,anchor] of [
    ['home','/index.html','#todayCard'],
    ['workout','/session.html?routine=morning','#exerciseGoal'],
    ['progress','/progress.html','#historyCalendar']
  ]){
    test(`${name} visual baseline`,async({page,baseURL})=>{
      const time=new Date('2026-09-22T08:00:00+05:00');
      await page.clock.install({time});
      await page.clock.pauseAt(new Date(time.getTime()+1000));
      await page.addInitScript(state=>localStorage.setItem('dailyMotionState.v3',JSON.stringify(state)),baseState);
      await page.goto(new URL(path,capture?process.env.DM_BASELINE_URL:baseURL).href,{waitUntil:'domcontentloaded'});
      await expectSwup(page);
      await expect(page.locator(anchor)).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);
      await page.clock.runFor(600);
      await expect(page).toHaveScreenshot(`${name}-390x844.png`,{
        fullPage:true,animations:'disabled',caret:'hide',scale:'css',maxDiffPixels:0
      });
    });
  }
});
