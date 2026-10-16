// Site-wide settings the app needs before it can draw anything. Served at /api/meta and
// also embedded in every HTML page, so the first paint doesn't wait on an extra request.
import { config } from './config.js';
import { CATEGORIES, KINDS } from './uploads.js';
import { CATEGORY_INFO } from './categories.js';
import { RULES, LEVELS, BADGES } from './xp.js';
import { RATING_LABELS, COMMENT_MAX, MONTH_RULES } from './community.js';
import { REPORT_REASONS, DETAILS_MAX } from './moderation.js';
import { MIN_AGE, contactEmail } from './legal.js';

let cache = null;
export function metaPayload() {
  return cache ??= {
    siteName: config.siteName, gamesOrigin: config.gamesOrigin, categories: CATEGORIES,
    categoryIntro: Object.fromEntries(CATEGORIES.map(c => [c, CATEGORY_INFO[c].intro])),
    categoryNoun: Object.fromEntries(CATEGORIES.map(c => [c, CATEGORY_INFO[c].noun])), kinds: KINDS,
    rules: RULES, levels: LEVELS, badges: BADGES.map(({ check, ...b }) => b),
    ratingLabels: RATING_LABELS, commentMax: COMMENT_MAX, monthRules: MONTH_RULES,
    reportReasons: REPORT_REASONS, reportDetailsMax: DETAILS_MAX, minAge: MIN_AGE, contactEmail: contactEmail(),
    limits: { zipMB: config.limits.zip / 1048576, htmlMB: config.limits.htmlFile / 1048576 },
  };
}
