import {readFileSync} from 'node:fs';
import {createLegacyMediaHandler} from '../lib/legacy-media.mjs';

const manifest=JSON.parse(readFileSync(new URL('../content/seo/legacy-media-paths.json',import.meta.url),'utf8'));
// Only previously public, successfully archived uploads. No CMS routes,
// incoming cookies, credentials, browser IPs, or arbitrary upstream targets.
export default createLegacyMediaHandler(manifest.paths);
