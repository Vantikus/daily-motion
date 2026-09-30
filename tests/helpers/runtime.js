import { test, expect } from '@playwright/test';
export { test, expect };

export const expectSwup=async page=>{
  await expect.poll(()=>page.evaluate(()=>history.state?.source)).toBe('swup');
};
