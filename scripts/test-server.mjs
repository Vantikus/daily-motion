import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root=resolve(process.env.DM_TEST_ROOT||'.');
const port=Number(process.env.DM_TEST_PORT||4173);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
createServer(async(request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1');
  try{
    if(url.pathname==='/__test__/sw.js'){
      const build=url.searchParams.get('build');
      if(!['one','two'].includes(build))throw new Error('Invalid test build');
      const source=(await readFile(resolve(root,'sw.js'),'utf8')).replace(/const CACHE_NAME=`daily-motion-v\$\{RELEASE_VERSION\}`;/,`const CACHE_NAME='daily-motion-test-${build}';`);
      response.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store','Service-Worker-Allowed':'/'});
      response.end(source);
      return;
    }
    const path=resolve(root,`.${decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)}`);
    if(!path.startsWith(root+sep)||url.pathname.includes('node_modules')||url.pathname.includes('/.'))throw new Error('Invalid path');
    const body=await readFile(path);
    response.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(body);
  }catch{
    response.writeHead(404);response.end('Not found');
  }
}).listen(port,'127.0.0.1',()=>console.log(`Daily Motion test server · ${port}`));
