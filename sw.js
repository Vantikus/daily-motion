const CACHE_NAME='daily-motion-v154';
const SWUP_VENDOR_URL='https://unpkg.com/swup@4.10.0/dist/Swup.umd.js';
const APP_SHELL=[
  '/',
  '/index.html',
  '/session.html',
  '/progress.html',
  '/heroicons.css?v=154',
  '/vendor/heroicons/adjustments-horizontal.svg',
  '/vendor/heroicons/queue-list.svg',
  '/vendor/heroicons/chart-bar.svg',
  '/vendor/heroicons/x-mark.svg',
  '/vendor/heroicons/speaker-wave.svg',
  '/vendor/heroicons/arrow-right.svg',
  '/vendor/heroicons/clock.svg',
  '/vendor/heroicons/pause-circle.svg',
  '/vendor/heroicons/sun.svg',
  '/vendor/heroicons/moon.svg',
  '/vendor/heroicons/chevron-left.svg',
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
  '/styles.css?v=154',
  '/theme.js?v=154',
  '/program.js?v=154',
  '/state.js?v=154',
  '/audio.js?v=154',
  '/gsap.min.js?v=154',
  '/pwa.js?v=154',
  '/app.js?v=154',
  '/session.js?v=154',
  '/progress.js?v=154',
  '/navigation.js?v=154',
  '/manifest.webmanifest',
  '/icons/daily-motion-favicon-32-v97.png',
  '/icons/daily-motion-app-180-v97.png',
  '/icons/daily-motion-app-192-v97.png',
  '/icons/daily-motion-app-512-v97.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache=>{
      await cache.addAll(APP_SHELL);
      await cache.add(SWUP_VENDOR_URL).catch(()=>{});
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
  if(request.url===SWUP_VENDOR_URL){
    event.respondWith(cacheStatic(request).catch(()=>fetch(request)));
    return;
  }
  if(url.origin!==self.location.origin)return;

  if(request.headers.get('X-Requested-With')==='swup'){
    event.respondWith(swupNavigation(request));
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith(networkNavigation(request));
    return;
  }

  event.respondWith(cacheStatic(request).catch(()=>caches.match(request)));
});
