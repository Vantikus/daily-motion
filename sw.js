const CACHE_NAME='daily-motion-v84';
const APP_SHELL=[
  '/',
  '/index.html',
  '/session.html',
  '/progress.html',
  '/styles.css?v=84',
  '/program.js?v=84',
  '/state.js?v=84',
  '/audio.js?v=84',
  '/gsap.min.js?v=84',
  '/pwa.js?v=84',
  '/app.js?v=84',
  '/session.js?v=84',
  '/progress.js?v=84',
  '/manifest.webmanifest',
  '/icons/daily-motion-32-v1.png',
  '/icons/daily-motion-180-v1.png',
  '/icons/daily-motion-192-v1.png',
  '/icons/daily-motion-512-v1.png'
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

