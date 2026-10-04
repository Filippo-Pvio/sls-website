import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DAILY_LIMIT = 10;
const cookieName = '__Host-sls-sia';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
export function quotaDay(now = Date.now()) {
  const day = dayFormat.format(now);
  let lo = Math.floor(now / 1000), hi = lo + 36 * 3600;
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (dayFormat.format(mid * 1000) === day) lo = mid; else hi = mid; }
  return { day, resetAt: hi * 1000 };
}
export function quotaConfigured(env = process.env) {
  return !!(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN);
}
// All counter changes are atomic, including concurrent requests on different Functions.
export const reserveScript = `
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[1])
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
local pending = redis.call('ZCARD', KEYS[2])
if used >= tonumber(ARGV[3]) then return {0, used} end
if used + pending >= tonumber(ARGV[3]) then return {-1, used} end
redis.call('ZADD', KEYS[2], tonumber(ARGV[1]) + 90, ARGV[2])
redis.call('EXPIREAT', KEYS[2], ARGV[4])
return {1, used}`;
export const settleScript = `
local removed = redis.call('ZREM', KEYS[2], ARGV[1])
if removed == 1 and ARGV[2] == '1' then
 redis.call('INCR', KEYS[1])
 redis.call('EXPIREAT', KEYS[1], ARGV[3])
end
return tonumber(redis.call('GET', KEYS[1]) or '0')`;
const abuseScript = `
local attempts = redis.call('INCR', KEYS[1])
if attempts == 1 then redis.call('EXPIRE', KEYS[1], 600) end
return attempts`;
export async function reserveQuota(req, res, { now = Date.now(), env = process.env, fetcher = fetch } = {}) {
  if (!quotaConfigured(env)) return null;
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Quota configuration');
  if (new URL(url).protocol !== 'https:') throw new Error('Quota configuration');
  const hash = value => createHmac('sha256', token).update(value).digest('hex');
  async function command(args) {
    const response = await fetcher(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(3000), redirect: 'error' });
    if (!response.ok) throw new Error('Quota store unavailable');
    const data = await response.json();
    if (data.error || data.result === undefined) throw new Error('Quota store response');
    return data.result;
  }
  const raw = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
  const [candidate, signature] = raw.split('.');
  const expected = candidate && hash(`cookie:${candidate}`);
  const valid = /^[a-f0-9]{32}$/.test(candidate || '') && /^[a-f0-9]{64}$/.test(signature || '') && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  const id = valid ? candidate : randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `${cookieName}=${id}.${hash(`cookie:${id}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);
  const { day, resetAt } = quotaDay(now);
  const key = `sia:quota:${day}:${hash(`browser:${id}`)}`;
  const metadata = used => ({ limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used), resetAt: new Date(resetAt).toISOString() });
  // High shared-network threshold: this is an abuse brake, not the visitor quota.
  const ip = req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim();
  const abuseKeys = [`sia:attempts:${hash(`browser:${id}`)}`];
  if (ip) abuseKeys.push(`sia:network:${hash(`network:${ip}`)}`);
  for (const [i, abuseKey] of abuseKeys.entries()) {
    const attempts = Number(await command(['EVAL', abuseScript, 1, abuseKey]));
    if (!Number.isFinite(attempts)) throw new Error('Quota store response');
    if (attempts > (i === 0 ? 60 : 1000)) return { blocked: 'slow_down', retryAfter: 600 };
  }
  const reservation = randomBytes(16).toString('hex');
  const expires = Math.floor(resetAt / 1000) + 120;
  const result = await command(['EVAL', reserveScript, 2, key, `${key}:pending`, Math.floor(now / 1000), reservation, DAILY_LIMIT, expires]);
  if (!Array.isArray(result) || ![0, -1, 1].includes(result[0]) || !Number.isInteger(result[1])) throw new Error('Quota store response');
  if (result[0] !== 1) return { blocked: result[0] === 0 ? 'daily_limit' : 'pending_limit', quota: metadata(result[1]), retryAfter: result[0] === 0 ? Math.max(1, Math.ceil((resetAt - now) / 1000)) : 90 };
  return {
    async settle(answered) {
      const used = Number(await command(['EVAL', settleScript, 2, key, `${key}:pending`, reservation, answered ? '1' : '0', expires]));
      if (!Number.isInteger(used) || used < 0) throw new Error('Quota store response');
      return metadata(used);
    }
  };
}
