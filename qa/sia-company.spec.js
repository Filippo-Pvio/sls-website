import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {companyAnswer}=require('../services/frag-sls/lib/company-knowledge.js');
test('SIA shows company answers, internal sources and useful website links on desktop and touch',async({page})=>{
 await page.route('**/api/sia-config',route=>route.fulfill({json:{enabled:true,dailyLimit:10,dialogueEnabled:true}}));
 await page.route('**/api/sia-ask',async route=>{
  const answer=companyAnswer(route.request().postDataJSON().question);
  expect(answer).toBeTruthy();await route.fulfill({json:answer});
 });
 await page.goto('/ueber-uns/');
 const sia=page.locator('sls-sia');await sia.locator('.launch').click();
 for(const [question,text,url] of [
  ['Wie seriös ist SLS?','Google-Kundenbewertungen','https://share.google/qbk6kf2K0Cemc8Zeq'],
  ['Seit wann gibt es SLS?','kein Datum','/ueber-uns/'],
  ['Wie viele Immobilien hat SLS bisher verkauft?','keine verifizierte Gesamtzahl','/referenzen/'],
  ['Wo ist SLS überall vertreten?','Ubierweg 2','/kontakt/'],
  ['Wer ist Mischa Stratmann?','SBW','/team/mischa-stratmann/']
 ]){
  await sia.locator('textarea').fill(question);await sia.locator('.send').click();
  await expect(sia.locator('.answer')).toContainText(text);
  await sia.locator('.sources summary').click();
  await expect(sia.locator(`.source-list a[href="${url}"]`).first()).toBeVisible();
  const source=sia.locator('.source-open').first();await source.click();
  await expect(sia.locator('.source-text')).not.toBeEmpty();
  await expect(sia.locator('.source-meta')).toContainText('Stand der Grundlage');
  await sia.locator('.source-back').click();
  await expect(sia.locator('.answer')).toContainText(text);
  const fits=await sia.locator('dialog').evaluate(element=>element.getBoundingClientRect().width<=innerWidth);
  expect(fits).toBeTruthy();
 }
 await sia.locator('.close').click();await expect(sia.locator('dialog')).not.toBeVisible();
});
