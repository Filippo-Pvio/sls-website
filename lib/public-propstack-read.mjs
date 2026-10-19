import {AsyncLocalStorage} from 'node:async_hooks';
import {setTimeout as delay} from 'node:timers/promises';

const budgets = new AsyncLocalStorage();
const transientStatuses = new Set([429, 502, 503, 504]);
const timeout = () => Object.assign(new Error('read_timeout'), {name: 'TimeoutError'});

// A complete public read, including pagination and a retry, stays below the
// function deadline. Nested catalog reads share their caller's remaining time.
export function withPublicReadBudget(run, milliseconds = 30000) {
  return budgets.getStore() ? run() : budgets.run({deadline: Date.now() + milliseconds}, run);
}

// Only idempotent reads of the fixed provider are retried. Never replay writes,
// follow redirects with credentials, or replace failed reads with empty catalogs.
export async function readPublicPropstack(path, key, {allowMissing = false, timeoutMs = 12000} = {}) {
  if (!budgets.getStore()) return withPublicReadBudget(() => readPublicPropstack(path, key, {allowMissing, timeoutMs}));
  const url = new URL(path, 'https://api.propstack.de/v1/');
  if (url.origin !== 'https://api.propstack.de' || !url.pathname.startsWith('/v1/')) throw new Error('Invalid provider path');
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = budgets.getStore().deadline - Date.now();
    if (remaining <= 0) throw timeout();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, remaining));
    let retry = false, retryDelay = 150;
    try {
      const response = await fetch(url.href, {
        headers: {'X-API-KEY': key}, signal: controller.signal, redirect: 'error'
      });
      if (allowMissing && response.status === 404) return null;
      if (response.ok) return await response.json();
      if (response.body?.cancel) await response.body.cancel();
      retry = transientStatuses.has(response.status);
      const retryAfter = response.headers?.get?.('retry-after');
      if (retryAfter) {
        const milliseconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
        if (Number.isFinite(milliseconds)) retryDelay = Math.max(retryDelay, milliseconds);
      }
      const error = new Error(`Propstack HTTP ${response.status}`);
      error.retryPublicRead = retry;
      throw error;
    } catch (error) {
      retry = error.retryPublicRead === true || ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name);
      if (!retry || attempt === 1 || retryDelay > 2000 || budgets.getStore().deadline - Date.now() <= retryDelay) throw error;
    } finally {
      clearTimeout(timer);
    }
    await delay(retryDelay);
  }
}
