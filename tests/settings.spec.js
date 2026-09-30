import { test, expect } from './helpers/runtime.js';

test('theme preference is applied and shared across pages',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await page.locator('#themeSetting [data-theme-value="dark"]').click();

  await expect(page.locator('#themeSetting [data-theme-value="dark"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#101612');
  expect(await page.evaluate(()=>DailyMotionState.getSettings().theme)).toBe('dark');

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('system theme follows the operating-system preference',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference','system');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');

  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('settings dialogs keep keyboard focus trapped',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#settingsClose')).toBeFocused({timeout:1200});

  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#resetTodayBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#settingsClose')).toBeFocused();

  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1200});

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#routineSettingsClose')).toBeFocused({timeout:1200});

  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#routineResetBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#routineSettingsClose')).toBeFocused();

  await page.locator('#routineResetBtn').click();
  await expect(page.locator('#routineResetBlock')).toHaveClass(/is-confirming/);
  await expect(page.locator('#routineResetAccept')).toBeFocused({timeout:1000});
  await page.keyboard.press('Escape');
  await expect(page.locator('#routineResetBlock')).not.toHaveClass(/is-confirming/);
  await expect(page.locator('#routineResetBtn')).toBeFocused({timeout:1000});
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
});

test('desktop settings use modal motion instead of bottom-sheet travel',async({page})=>{
  await page.setViewportSize({width:1024,height:800});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});

  const closed=await page.evaluate(()=>{
    const overlay=document.querySelector('#settingsOverlay');
    const sheet=overlay.querySelector('.settings-sheet');
    const handle=overlay.querySelector('.settings-sheet__handle');
    const matrix=new DOMMatrix(getComputedStyle(sheet).transform);
    return {
      align:getComputedStyle(overlay).alignItems,
      opacity:getComputedStyle(overlay).opacity,
      handle:getComputedStyle(handle).display,
      scale:matrix.a,
      y:matrix.m42
    };
  });
  expect(closed.align).toBe('center');
  expect(closed.opacity).toBe('0');
  expect(closed.handle).toBe('none');
  expect(closed.scale).toBeCloseTo(.985,3);
  expect(closed.y).toBeCloseTo(10,1);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#settingsOverlay')).toHaveClass(/is-visible/);
  await expect(page.locator('#settingsOverlay')).toHaveCSS('opacity','1',{timeout:1500});
  await expect(page.locator('#settingsOverlay .settings-sheet')).toHaveCSS('opacity','1',{timeout:1500});

  const opened=await page.evaluate(()=>{
    const sheet=document.querySelector('#settingsOverlay .settings-sheet');
    const matrix=new DOMMatrix(getComputedStyle(sheet).transform);
    return {
      overlayOpacity:getComputedStyle(document.querySelector('#settingsOverlay')).opacity,
      sheetOpacity:getComputedStyle(sheet).opacity,
      scale:matrix.a,
      y:matrix.m42
    };
  });
  expect(opened.overlayOpacity).toBe('1');
  expect(opened.sheetOpacity).toBe('1');
  expect(opened.scale).toBeCloseTo(1,3);
  expect(opened.y).toBeCloseTo(0,1);

  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1200});
});

test('P3 desktop timing controls replace native dropdowns without changing mobile controls',async({page,browserName})=>{
  test.skip(browserName!=='chromium','desktop timing control geometry is verified once in Chromium');

  await page.setViewportSize({width:1024,height:800});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();

  await expect(page.locator('#countdownSetting')).toBeHidden();
  await expect(page.locator('#restSetting')).toBeHidden();
  await expect(page.locator('#countdownSettingDesktop')).toBeVisible();
  await expect(page.locator('#restSettingDesktop')).toBeVisible();

  const homeTargets=await page.locator('#countdownSettingDesktop button').evaluateAll(buttons=>
    buttons.map(button=>Math.round(button.getBoundingClientRect().height))
  );
  expect(homeTargets.every(height=>height>=44)).toBe(true);

  await page.locator('#countdownSettingDesktop [data-value="5"]').click();
  await page.locator('#restSettingDesktop [data-value="30"]').click();
  expect(await page.evaluate(()=>DailyMotionState.getSettings().countdownSeconds)).toBe(5);
  expect(await page.evaluate(()=>DailyMotionState.getSettings().restSeconds)).toBe(30);
  expect(await page.locator('#countdownSetting').inputValue()).toBe('5');
  expect(await page.locator('#restSetting').inputValue()).toBe('30');
  await expect(page.locator('#countdownSettingDesktop [data-value="5"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#restSettingDesktop [data-value="30"]')).toHaveAttribute('aria-pressed','true');

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#workoutCountdownSetting')).toBeHidden();
  await expect(page.locator('#workoutRestSetting')).toBeHidden();
  await expect(page.locator('#workoutCountdownSettingDesktop')).toBeVisible();
  await expect(page.locator('#workoutRestSettingDesktop')).toBeVisible();

  await page.locator('#workoutCountdownSettingDesktop [data-value="3"]').click();
  await page.locator('#workoutRestSettingDesktop [data-value="45"]').click();
  expect(await page.evaluate(()=>DailyMotionState.getSettings().countdownSeconds)).toBe(3);
  expect(await page.evaluate(()=>DailyMotionState.getSettings().restSeconds)).toBe(45);

  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#countdownSetting')).toBeVisible();
  await expect(page.locator('#restSetting')).toBeVisible();
  await expect(page.locator('#countdownSettingDesktop')).toBeHidden();
  await expect(page.locator('#restSettingDesktop')).toBeHidden();
});

test('workout timing settings apply to the next countdown and rest only',async({page})=>{
  await page.addInitScript(()=>{
    const raw=JSON.parse(localStorage.getItem('dailyMotionState.v3')||'null')||{version:3,settings:{},days:{},programVersions:{}};
    raw.settings={...(raw.settings||{}),countdownSeconds:0,restSeconds:15,sound:false,autoNext:false,theme:'system'};
    localStorage.setItem('dailyMotionState.v3',JSON.stringify(raw));
  });
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();

  await page.locator('#workoutCountdownSetting').selectOption('5');
  await page.locator('#workoutRestSetting').selectOption('30');
  expect(await page.evaluate(()=>DailyMotionState.getSettings().countdownSeconds)).toBe(5);
  expect(await page.evaluate(()=>DailyMotionState.getSettings().restSeconds)).toBe(30);

  await page.locator('#routineSettingsClose').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1200});
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#executionOverlay')).toHaveAttribute('data-stage','countdown');
  await expect(page.locator('#countdownValue')).toHaveText('5');
});

test('settings reset keeps copy stable and reveals only confirmation actions',async({page,browserName})=>{
  test.skip(browserName!=='chromium','reset transition is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();

  await expect(page.locator('#resetTodayBtn')).toHaveText('Сбросить прогресс');
  const before=await page.locator('#resetTodayBtn').boundingBox();
  await page.locator('#resetTodayBtn').click();
  await expect(page.locator('#resetTodayBlock')).toHaveClass(/is-confirming/);
  await expect(page.locator('#resetTodayBtn')).toHaveText('Сбросить прогресс');
  await expect(page.locator('#resetTodayConfirm')).toHaveAttribute('aria-hidden','false');

  const during=await page.locator('#resetTodayBtn').boundingBox();
  expect(Math.abs(during.height-before.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(during.width-before.width)).toBeLessThanOrEqual(1);

  await page.locator('#resetCancelBtn').click();
  await expect(page.locator('#resetTodayBlock')).not.toHaveClass(/is-confirming/);
  await expect(page.locator('#resetTodayBtn')).toHaveText('Сбросить прогресс');

  await page.evaluate(()=>{window.__resetNoReloadSentinel='alive';});
  await page.locator('#resetTodayBtn').click();
  await page.locator('#resetConfirmBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true');
  expect(await page.evaluate(()=>window.__resetNoReloadSentinel)).toBe('alive');
  await expect(page.locator('#heroProgressText')).toHaveText('0 из 9 упражнений');
  await expect(page.locator('#dayProgressValue')).toHaveText('0%');
});

test('settings sheet uses intrinsic selectors and progress actions keep rounded feedback',async({page,browserName})=>{
  test.skip(browserName!=='chromium','settings and progress control geometry are verified once in Chromium');

  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    await page.goto('/index.html',{waitUntil:'domcontentloaded'});
    await page.locator('#settingsBtn').click();

    const base=await page.evaluate(()=>{
      const sheet=document.querySelector('.settings-sheet');
      const handle=document.querySelector('.settings-sheet__handle');
      const head=document.querySelector('.settings-sheet__head');
      const reset=document.querySelector('#resetTodayBtn');
      const select=document.querySelector('#countdownSetting');
      const sheetBox=sheet.getBoundingClientRect();
      const handleBox=handle.getBoundingClientRect();
      const headBox=head.getBoundingClientRect();
      const resetBox=reset.getBoundingClientRect();
      const style=getComputedStyle(select);
      return {
        overflow:document.documentElement.scrollWidth-window.innerWidth,
        handleToHead:Math.round(headBox.top-handleBox.top),
        bottomGap:Math.round(sheetBox.bottom-resetBox.bottom),
        height:Math.round(select.getBoundingClientRect().height),
        fieldSizing:style.fieldSizing,
        paddingLeft:style.paddingLeft,
        paddingRight:style.paddingRight,
        textAlign:style.textAlign,
        radius:style.borderTopLeftRadius
      };
    });

    expect(base.overflow).toBeLessThanOrEqual(0);
    expect(base.handleToHead).toBeLessThanOrEqual(38);
    expect(base.bottomGap).toBeLessThanOrEqual(16);
    expect(base.height).toBe(44);
    expect(base.fieldSizing).toBe('content');
    expect(base.textAlign).toBe('left');
    expect(base.radius).toBe('14px');

    await page.locator('#countdownSetting').selectOption('0');
    const noWidth=Math.round((await page.locator('#countdownSetting').boundingBox()).width);
    await page.locator('#countdownSetting').selectOption('5');
    const fiveWidth=Math.round((await page.locator('#countdownSetting').boundingBox()).width);
    expect(noWidth).toBeGreaterThanOrEqual(78);
    expect(noWidth).toBeLessThan(fiveWidth);
    expect(fiveWidth).toBeLessThanOrEqual(122);

    await expect(page.locator('#countdownSetting option[value="0"]')).toHaveText('Нет');
    await expect(page.locator('#restSetting option[value="15"]')).toHaveText('15 секунд');
    await expect(page.locator('#themeSetting [data-theme-value="system"]')).toHaveText('Система');
    await expect(page.locator('#themeSetting [data-theme-value="system"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#themeSetting [data-theme-value="light"]')).toHaveText('Светлая');
    await expect(page.locator('#themeSetting [data-theme-value="dark"]')).toHaveText('Тёмная');
  }

  await page.setViewportSize({width:390,height:844});
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#workoutThemeSetting [data-theme-value="system"]')).toHaveText('Система');
  const routineTheme=await page.locator('#workoutThemeSetting').evaluate(group=>{
    const box=group.getBoundingClientRect();
    const buttons=[...group.querySelectorAll('button')].map(button=>button.getBoundingClientRect());
    return {
      width:Math.round(box.width),
      height:Math.round(box.height),
      buttonHeights:buttons.map(item=>Math.round(item.height)),
      overflow:document.documentElement.scrollWidth-window.innerWidth
    };
  });
  expect(routineTheme.height).toBeGreaterThanOrEqual(50);
  expect(routineTheme.width).toBeLessThanOrEqual(320);
  expect(routineTheme.buttonHeights.every(height=>height>=44)).toBe(true);
  expect(routineTheme.overflow).toBeLessThanOrEqual(0);

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const importButton=page.locator('#importDataBtn');
  await importButton.evaluate(button=>button.classList.add('is-pressing'));
  const pressed=await importButton.evaluate(button=>{
    const style=getComputedStyle(button);
    return {
      radius:style.borderTopLeftRadius,
      overflow:style.overflow,
      background:style.backgroundColor,
      transform:style.transform
    };
  });
  expect(pressed.radius).toBe('14px');
  expect(pressed.overflow).toBe('hidden');
  expect(pressed.transform).toBe('none');

  const actionGap=await page.locator('.data-actions').evaluate(node=>getComputedStyle(node).gap);
  expect(actionGap).toBe('10px');
});
