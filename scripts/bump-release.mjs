import { readFileSync, writeFileSync } from 'node:fs';

const path='sw.js';
const source=readFileSync(path,'utf8');
const match=source.match(/const RELEASE_VERSION=(\d+);/);
if(!match)throw new Error('sw.js RELEASE_VERSION missing');
const previous=Number(match[1]);
const next=previous+1;
writeFileSync(path,source.replace(match[0],`const RELEASE_VERSION=${next};`));
console.log(`Daily Motion release v${previous} -> v${next}`);
