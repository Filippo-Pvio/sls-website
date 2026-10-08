import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.GUIDE_QA_URL || 'http://127.0.0.1:4173';
const guides=['VERKAUF','BEWERTUNG','ERBSCHAFT','WOHNEN_IM_ALTER','TRENNUNG','UNTERLAGEN'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  const page=await browser.newPage({viewport});
  const requests=[];
  await page.route('**/api/propstack-guide-request**',async route=>{
   if(new URL(route.request().url()).searchParams.has('formSecurity')) return route.fulfill({json:{securityToken:'fixture-security-only'}});
   if(route.request().method()==='POST') {
    requests.push(route.request().postDataJSON());
    return route.fulfill({json:{ok:true,status:'recorded',message:'Anforderung aufgenommen',newsletterStatus:'not_requested'}});
   }
   return route.fulfill({json:{availableGuides:guides,token:'fixture-only',marketingAvailable:false}});
  });
  for(const guide of guides) {
   await page.goto(base+'/downloads/');
   await page.locator('#guide-form fieldset').waitFor({state:'visible'});
   await page.waitForFunction(()=>!document.querySelector('#guide-form fieldset').disabled);
   assert.equal(await page.locator('[data-guide]').count(),6);
   assert.equal(await page.getByText('In Vorbereitung',{exact:true}).count(),0);
   await page.locator(`[data-guide="${guide}"]`).click();
   assert.equal(await page.locator('#guide-select').inputValue(),guide);
   await page.locator('#guide-salutation').selectOption('mr');
   await page.locator('#guide-first-name').fill('SLS');
   await page.locator('#guide-last-name').fill('Test');
   await page.locator('input[name=email]').fill('fixture@example.org');
   await page.locator('#guide-privacy-ack').check();
   await page.getByRole('button',{name:'Ratgeber anfordern',exact:true}).click();
   await page.getByRole('button',{name:'Anforderung aufgenommen',exact:true}).waitFor({timeout:5000}).catch(async error=>{console.error(await page.locator('#guide-form').innerText());console.error(JSON.stringify(requests));throw error;});
   assert.equal(requests.at(-1).guide,guide);
   assert.equal(requests.at(-1).marketingConsent,false);
   assert.equal(await page.locator('input[name=email]').inputValue(),'');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  }
  console.log(`${viewport.width}px: six selections and submissions passed`);
  await page.close();
 }
} finally {await browser.close();}
