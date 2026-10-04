const RELEASE_VERSION=288;
const CACHE_NAME=`daily-motion-v${RELEASE_VERSION}`;
const SWUP_VENDOR_URLS=[
  '/vendor/swup/swup-4.10.0.js',
  '/vendor/swup/preload-3.2.12.js',
  '/vendor/swup/head-2.3.1.js',
  '/vendor/swup/body-class-3.3.0.js',
  '/vendor/swup/a11y-5.2.1.js',
  '/vendor/swup/js-3.2.0.js',
  '/vendor/swup/scroll-4.0.0.js'
];
const APP_SHELL=[
  '/',
  '/index.html',
  '/session.html',
  '/v226.css',
  '/v226.js',
  '/progress.html',
  '/heroicons.css',
  '/fonts/onest-variable.ttf',
  '/vendor/heroicons/adjustments-horizontal.svg',
  '/vendor/heroicons/queue-list.svg',
  '/vendor/heroicons/chart-bar.svg',
  '/vendor/heroicons/x-mark.svg',
  '/vendor/heroicons/speaker-wave.svg',
  '/vendor/heroicons/arrow-right.svg',
  '/vendor/heroicons/arrow-uturn-left.svg',
  '/vendor/heroicons/clock.svg',
  '/vendor/heroicons/pause-circle.svg',
  '/vendor/heroicons/sun.svg',
  '/vendor/heroicons/moon.svg',
  '/vendor/heroicons/chevron-left.svg',
  '/vendor/heroicons/chevron-down.svg',
  '/vendor/heroicons/chevron-right.svg',
  '/vendor/heroicons/ellipsis-horizontal.svg',
  '/vendor/heroicons/arrows-up-down.svg',
  '/vendor/heroicons/key.svg',
  '/vendor/heroicons/list-bullet.svg',
  '/vendor/heroicons/signal.svg',
  '/vendor/heroicons/bolt.svg',
  '/vendor/heroicons/exclamation-triangle.svg',
  '/vendor/heroicons/sparkles.svg',
  '/vendor/heroicons/arrow-trending-up.svg',
  '/vendor/heroicons/plus.svg',
  '/vendor/heroicons/arrow-path.svg',
  '/vendor/heroicons/check-circle.svg',
  '/vendor/heroicons/fire.svg',
  '/vendor/heroicons/trophy.svg',
  '/vendor/heroicons/calendar-days.svg',
  '/vendor/heroicons/circle-stack.svg',
  '/vendor/heroicons/arrow-down-tray.svg',
  '/vendor/heroicons/arrow-up-tray.svg',
  '/styles.css',
  '/theme.js',
  '/program.js',
  '/state.js',
  '/audio.js',
  '/gsap.min.js',
  '/motion.js',
  '/ui.js',
  '/session-view.js',
  '/pwa.js',
  '/app.js',
  '/session.js',
  '/progress.js',
  '/navigation.js',
  '/manifest.webmanifest',
  '/icons/daily-motion-favicon-32-v97.png',
  '/icons/daily-motion-app-180-v97.png',
  '/icons/daily-motion-app-192-v97.png',
  '/icons/daily-motion-app-512-v97.svg'
];


const MUTABLE_STATIC_URLS=new Set([
  '/styles.css',
  '/heroicons.css',
  '/v226.css',
  '/theme.js',
  '/program.js',
  '/state.js',
  '/audio.js',
  '/gsap.min.js',
  '/motion.js',
  '/ui.js',
  '/session-view.js',
  '/pwa.js',
  '/app.js',
  '/session.js',
  '/progress.js',
  '/navigation.js',
  '/v226.js',
  '/manifest.webmanifest'
]);


self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache=>{
      await cache.addAll([...APP_SHELL,...SWUP_VENDOR_URLS]);
    })
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

const cacheStatic=async request=>{
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
  return response;
};

const networkFreshStatic=async request=>{
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request,{cache:'no-cache'});
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch{
    return (await cache.match(request))||Response.error();
  }
};

const navigationFallback=pathname=>{
  if(pathname.endsWith('/session.html'))return '/session.html';
  if(pathname.endsWith('/progress.html'))return '/progress.html';
  return '/index.html';
};

const networkNavigation=async request=>{
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch{
    const url=new URL(request.url);
    const direct=(await cache.match(request))||(await cache.match(url.pathname));
    if(direct)return direct;
    return (await cache.match(navigationFallback(url.pathname)))||(await cache.match('/'));
  }
};

const swupNavigation=async request=>{
  const cache=await caches.open(CACHE_NAME);
  const url=new URL(request.url);
  const cached=(await cache.match(request))||(await cache.match(url.pathname));
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch{
    return (await cache.match(navigationFallback(url.pathname)))||(await cache.match('/'));
  }
};

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.headers.get('X-Requested-With')==='swup'){
    event.respondWith(swupNavigation(request));
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith(networkNavigation(request));
    return;
  }

  if(MUTABLE_STATIC_URLS.has(url.pathname)){
    event.respondWith(networkFreshStatic(request));
    return;
  }

  event.respondWith(cacheStatic(request).catch(()=>caches.match(request)));
});
