const CACHE_NAME='daily-motion-v87';
const APP_SHELL=[
  '/',
  '/index.html',
  '/session.html',
  '/progress.html',
  '/phosphor.css?v=87',
  '/styles.css?v=87',
  '/program.js?v=87',
  '/state.js?v=87',
  '/audio.js?v=87',
  '/gsap.min.js?v=87',
  '/pwa.js?v=87',
  '/app.js?v=87',
  '/session.js?v=87',
  '/progress.js?v=87',
  '/manifest.webmanifest',
  '/icons/flow-symbol-v3.svg',
  '/icons/daily-motion-32-v3.png',
  '/icons/daily-motion-180-v3.png',
  '/icons/daily-motion-192-v3.png',
  '/icons/flow-app-v3.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
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

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(networkNavigation(request));
    return;
  }

  event.respondWith(cacheStatic(request).catch(()=>caches.match(request)));
});

