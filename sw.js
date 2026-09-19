const CACHE_NAME='daily-motion-v46';
const APP_SHELL=[
  '/',
  '/index.html',
  '/session.html',
  '/progress.html',
  '/styles.css?v=46',
  '/state.js?v=46',
  '/audio.js?v=46',
  '/pwa.js?v=46',
  '/app.js?v=46',
  '/session.js?v=46',
  '/progress.js?v=46',
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

const networkNavigation=async request=>{
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch{
    const direct=await cache.match(request);
    if(direct)return direct;
    const url=new URL(request.url);
    if(url.pathname.includes('session'))return cache.match('/session.html');
    return (await cache.match('/index.html'))||(await cache.match('/'));
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
