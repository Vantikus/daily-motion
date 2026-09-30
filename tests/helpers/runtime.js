import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';

// Serve the real pinned UMD packages in tests; CDN outages must not turn
// a Swup regression into an unnoticed native document navigation.
const assets=new Map();
export const test=base.extend({
  context:async({context},use)=>{
    await context.route('https://unpkg.com/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      const match=path.match(/^\/(.+)@[^/]+\/(dist\/.+)$/);
      if(!match)throw new Error(`Unexpected runtime URL: ${path}`);
      if(!assets.has(path))assets.set(path,await readFile(join(process.cwd(),'node_modules',match[1],match[2])));
      await route.fulfill({status:200,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:assets.get(path)});
    });
    await use(context);
  }
});
export { expect };

export const expectSwup=async page=>{
  await expect.poll(()=>page.evaluate(()=>history.state?.source)).toBe('swup');
};
