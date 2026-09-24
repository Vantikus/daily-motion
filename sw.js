const CACHE_NAME='daily-motion-v157';
const SWUP_VENDOR_URLS=[
  'https://unpkg.com/swup@4.10.0/dist/Swup.umd.js',
  'https://unpkg.com/@swup/preload-plugin@3.2.12/dist/index.umd.js',
  'https://unpkg.com/@swup/head-plugin@2.3.1/dist/index.umd.js',
  'https://unpkg.com/@swup/body-class-plugin@3.3.0/dist/index.umd.js',
  'https://unpkg.com/@swup/a11y-plugin@5.2.1/dist/index.umd.js',
  'https://unpkg.com/@swup/js-plugin@3.2.0/dist/index.umd.js',
  'https://unpkg.com/@swup/scroll-plugin@4.0.0/dist/index.umd.js'
];
const APP_SHELL=[
  '/',
  '/index.html',
  '/session.html',
  '/progress.html',
  '/heroicons.css?v=157',
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
  '/styles.css?v=157',
  '/theme.js?v=157',
  '/program.js?v=157',
  '/state.js?v=157',
  '/audio.js?v=157',
  '/gsap.min.js?v=157',
  '/pwa.js?v=157',
  '/app.js?v=157',
  '/session.js?v=157',
  '/progress.js?v=157',
  '/navigation.js?v=157',
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
      await Promise.allSettled(SWUP_VENDOR_URLS.map(url=>cache.add(url)));
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
  if(SWUP_VENDOR_URLS.includes(request.url)){
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
