export function scopedPropstackKey(variable) {
  if (process.env[variable]) return process.env[variable];
  if (process.env.NODE_ENV === 'production' || ['production','preview'].includes(process.env.VERCEL_ENV)) return undefined;
  return process.env.PROPSTACK_API_KEY;
}
