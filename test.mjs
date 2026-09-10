import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const base=process.env.BASE_URL || pathToFileURL(path.join(root,'docs/index.html')).href;
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox'],downloadsPath:path.join(root,'artifacts')});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],checks=[],violations=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const navigate=async hash=>{await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(100);};
const overflow=async()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
async function axe(label){
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  violations.push(...result.violations.map(v=>({view:label,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
  checks.push(`Accessibility scan: ${label}`);
}
try{
  await page.goto(base);
  await page.waitForSelector('body[data-view=home]');
  check('Home has no horizontal overflow',await overflow());
  await page.screenshot({path:'artifacts/home-desktop.png'});
  await axe('desktop home');
  const chapters=await page.evaluate(()=>JSON.parse(document.querySelector('#guide-data').textContent).chapters);
  check('Thirty complete chapters',chapters.length===30);
  for(const c of chapters){await navigate(c.id);check(`Route ${c.id}`,await page.locator('.chapter.active').getAttribute('id')===c.id);check(`No overflow ${c.id}`,await overflow());}
  await navigate('chapter-08');await page.screenshot({path:'artifacts/reader-desktop.png'});await axe('desktop reader');
  await page.locator('#mark-read').check();
  await page.reload();check('Read progress survives reload',await page.locator('#mark-read').isChecked());
  await page.locator('#font-up').click();check('Reading size control',await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--reader-size').trim())==='19px');
  await page.locator('#theme-toggle').click();check('Dark theme works',await page.locator('html').getAttribute('data-theme')==='dark');await axe('dark reader');
  await page.reload();check('Theme persists',await page.locator('html').getAttribute('data-theme')==='dark');
  await page.locator('#theme-toggle').click();
  await page.locator('.search-trigger').click();await page.locator('#search-input').fill('CUDA');
  check('Full text search returns results',await page.locator('#search-results a').count()>0);
  check('Search safely highlights text',await page.locator('#search-results mark').count()>0);
  await axe('search dialog');
  await page.locator('#search-input').fill('<img src=x onerror=alert(1)>');check('Search rejects unmatched markup as text',await page.locator('#search-results img').count()===0);
  await page.locator('#search-input').fill('zzzznotfoundzzzz');check('Empty search state',await page.locator('#search-status').textContent().then(t=>t.includes('No matching')));
  await page.locator('#search-input').fill('battery');const destination=await page.locator('#search-results a').first().getAttribute('href');await page.locator('#search-results a').first().click();await page.waitForTimeout(150);check('Search deep link navigates',new URL(page.url()).hash===destination);check('Search closes',!await page.locator('#search-dialog').isVisible());
  await navigate('s15');check('Citation opens source register',await page.locator('.chapter.active').getAttribute('id')==='chapter-30');
  await navigate('tools');
  await page.locator('#brief-form [name=apple]').check();await page.locator('#brief-form [name=x86]').check();await page.locator('#brief-form button[type=submit]').click();check('Brief detects conflicting hard requirements',(await page.locator('#brief-output').textContent()).includes('platform conflict'));
  await page.locator('#brief-form [name=apple]').uncheck();await page.locator('#brief-form [name=cuda]').check();await page.locator('#brief-form button[type=submit]').click();check('CUDA requires NVIDIA',(await page.locator('#brief-output').textContent()).includes('supported NVIDIA'));
  await page.locator('#cost-form button[type=submit]').click();check('Cost arithmetic defaults',(await page.locator('#cost-output').textContent()).includes('1,100.00 total'));
  await page.locator('#cost-form [name=monthly]').fill('10');await page.locator('#cost-form button[type=submit]').click();check('Recurring costs included',(await page.locator('#cost-output').textContent()).includes('1,580.00 total'));
  await page.locator('#cost-form [name=resale]').fill('9000');await page.locator('#cost-form button[type=submit]').click();check('Implausible negative cost warning',(await page.locator('#cost-output').textContent()).includes('exceeds'));
  await page.setViewportSize({width:390,height:844});await navigate('home');check('Mobile home fits',await overflow());await page.screenshot({path:'artifacts/home-mobile.png'});await axe('mobile home');
  await navigate('chapter-17');check('Mobile reader fits',await overflow());await page.screenshot({path:'artifacts/reader-mobile.png'});await axe('mobile reader');
  await page.locator('#mobile-contents').click();check('Mobile contents opens',await page.locator('body').evaluate(el=>el.classList.contains('nav-open')));await page.locator('#chapter-nav a[href="#chapter-03"]').click();await page.waitForTimeout(100);check('Mobile contents routes',await page.locator('.chapter.active').getAttribute('id')==='chapter-03');check('Mobile contents closes',!await page.locator('body').evaluate(el=>el.classList.contains('nav-open')));
  for(const width of [320,360,768,1024,1920]){await page.setViewportSize({width,height:900});await navigate('home');check(`Homepage fits ${width}px`,await overflow());await navigate('chapter-01');check(`Reader fits ${width}px`,await overflow());}
  await page.emulateMedia({media:'print'});check('Print includes all chapters',await page.locator('.chapter:visible').count()===30);await page.emulateMedia({media:'screen'});
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const np=await nojs.newPage();await np.goto(base);check('No JavaScript retains all chapters',await np.locator('.chapter:visible').count()===30);check('No-JS reader has no page overflow',await np.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await nojs.close();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});});const bp=await blocked.newPage();const be=[];bp.on('pageerror',e=>be.push(e.message));await bp.goto(base+'#chapter-06');check('Blocked storage does not break reading',await bp.locator('.chapter.active').getAttribute('id')==='chapter-06');check('Blocked storage throws no page errors',be.length===0);await blocked.close();
  const canonical=fs.readFileSync('laptop-buying-guide.md');check('Download exactly matches canonical Markdown',canonical.equals(fs.readFileSync('docs/laptop-buying-guide.md')));
  check('No browser errors',errors.length===0);
  fs.writeFileSync('artifacts/qa-results.json',JSON.stringify({checks:checks.length,passed:checks,violations,errors},null,2));
  console.log(JSON.stringify({checks:checks.length,violations,errors},null,2));
  assert.equal(violations.length,0,'Accessibility violations must be resolved');
}finally{await browser.close();}
