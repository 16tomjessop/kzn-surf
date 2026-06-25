'use strict';

const ENDPOINT = '__CAPTURE_ENDPOINT__';
const TOKEN = '__CAPTURE_TOKEN__';
const MIN_NATURAL_WIDTH = 260;
const MIN_NATURAL_HEIGHT = 160;
const MIN_DISPLAY_WIDTH = 120;
const MIN_DISPLAY_HEIGHT = 90;

function cleanText(value, limit = 600) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .slice(0, limit);
}

function absoluteUrl(value) {
  try {
    return new URL(value, window.location.href).href;
  } catch (e) {
    return '';
  }
}

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width >= MIN_DISPLAY_WIDTH &&
    rect.height >= MIN_DISPLAY_HEIGHT &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0.05
  );
}

function isLikelyPhoto(img) {
  const src = absoluteUrl(img.currentSrc || img.src || '');
  const alt = (img.alt || '').toLowerCase();
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (/emoji|profile picture|avatar|icon|sticker|reaction/i.test(alt)) return false;
  if (!/fbcdn|scontent|facebook|fbsbx/i.test(src)) return false;
  if ((img.naturalWidth || 0) < MIN_NATURAL_WIDTH) return false;
  if ((img.naturalHeight || 0) < MIN_NATURAL_HEIGHT) return false;
  return isVisible(img);
}

function nearestContainer(el) {
  return (
    el.closest('[role="article"]') ||
    el.closest('[data-pagelet^="FeedUnit_"]') ||
    el.closest('[aria-posinset]') ||
    el.closest('[role="dialog"]') ||
    el.closest('[role="main"]') ||
    el.parentElement
  );
}

function normalizeFacebookUrl(href) {
  const url = absoluteUrl(href);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    [
      '__cft__',
      '__tn__',
      'comment_id',
      'reply_comment_id',
      'notif_id',
      'notif_t',
      'ref',
      'refid',
      'mibextid',
      'paipv',
      'locale',
    ].forEach(param => parsed.searchParams.delete(param));
    parsed.hash = '';
    return parsed.href;
  } catch (e) {
    return url;
  }
}

function bestLink(container) {
  const links = Array.from(container.querySelectorAll('a[href]'))
    .map(a => ({
      href: normalizeFacebookUrl(a.href),
      text: cleanText(a.innerText || a.getAttribute('aria-label') || '', 160),
    }))
    .filter(link => /facebook\.com|fb\.watch/i.test(link.href));

  const priority = [
    /\/groups\/[^/]+\/permalink\//i,
    /\/groups\/[^/]+\/posts\//i,
    /\/photo(?:\.php|\/\?)/i,
    /story_fbid|fbid=/i,
    /\/posts\//i,
    /\/videos\//i,
  ];

  for (const pattern of priority) {
    const match = links.find(link => pattern.test(link.href));
    if (match) return match.href;
  }

  return links[0]?.href || normalizeFacebookUrl(window.location.href);
}

function timeHint(container) {
  const candidates = Array.from(container.querySelectorAll('a, span, abbr, time'))
    .map(el => cleanText([
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('datetime'),
      el.innerText,
    ].filter(Boolean).join(' | '), 220))
    .filter(Boolean);

  const monthPattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i;
  const relativePattern = /\b(?:just now|today|yesterday|\d+\s*(?:s|m|h|d|w|mo|yr|sec|secs|min|mins|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years))\b/i;
  const clockPattern = /\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/i;

  return candidates.find(text => monthPattern.test(text) || relativePattern.test(text) || clockPattern.test(text)) || '';
}

function groupHint() {
  const title = cleanText(document.title, 180);
  const heading = cleanText(document.querySelector('h1, h2')?.innerText, 180);
  return heading || title;
}

function captureCandidates(includeContextText) {
  const seen = new Set();
  return Array.from(document.images)
    .filter(isLikelyPhoto)
    .map(img => {
      const container = nearestContainer(img);
      const imageUrl = absoluteUrl(img.currentSrc || img.src || '');
      const key = imageUrl.split('?')[0] + '|' + img.naturalWidth + 'x' + img.naturalHeight;
      if (seen.has(key)) return null;
      seen.add(key);
      const rect = img.getBoundingClientRect();
      return {
        imageUrl,
        imageAlt: cleanText(img.alt, 300),
        imageWidth: img.naturalWidth || null,
        imageHeight: img.naturalHeight || null,
        displayWidth: Math.round(rect.width),
        displayHeight: Math.round(rect.height),
        postUrl: bestLink(container || document.body),
        rawTimeText: timeHint(container || document.body),
        contextText: includeContextText ? cleanText((container || document.body).innerText, 700) : '',
      };
    })
    .filter(Boolean);
}

async function copyPayload(payload) {
  const text = JSON.stringify(payload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    window.prompt('Copy this capture batch, then paste it into the local capture dashboard:', text);
    return false;
  }
}

async function postPayload(payload) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Capture-Token': TOKEN,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Local capture server returned HTTP ${response.status}`);
  }
  return response.json();
}

async function run() {
  const noteDefault = window.localStorage.getItem('kznSurfCaptureNote') || 'North Beach';
  const batchNote = window.prompt(
    'Optional note for this capture batch, for example "North Beach, morning posts".',
    noteDefault
  );
  if (batchNote === null) return;
  window.localStorage.setItem('kznSurfCaptureNote', batchNote);

  const includeContextText = window.confirm(
    'Include short visible post text snippets? Choose OK only if the group rules and posters permit saving captions.'
  );

  const items = captureCandidates(includeContextText);
  if (!items.length) {
    window.alert('No large visible Facebook photo candidates found. Open a photo, or scroll the group/media page until the surf photos are visible, then run this again.');
    return;
  }

  const confirmed = window.confirm(
    `Capture ${items.length} visible photo candidate(s)? Only continue for photos you are allowed to save for this project.`
  );
  if (!confirmed) return;

  const payload = {
    token: TOKEN,
    schema: 'kzn-surf-facebook-capture-v1',
    capturedAt: new Date().toISOString(),
    pageUrl: normalizeFacebookUrl(window.location.href),
    pageTitle: cleanText(document.title, 220),
    groupHint: groupHint(),
    batchNote: cleanText(batchNote, 300),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    items,
  };

  try {
    const result = await postPayload(payload);
    window.alert(`Saved ${result.saved || 0} new photo record(s). Downloaded ${result.downloaded || 0}. Duplicates skipped: ${result.duplicates || 0}.`);
  } catch (e) {
    await copyPayload(payload);
    const dashboard = ENDPOINT.replace(/\/capture$/, '/#paste');
    window.alert(`Direct local save was blocked, so the capture batch was copied. Open ${dashboard} and paste it into the import box.`);
    try { window.open(dashboard, '_blank', 'noopener,noreferrer'); } catch (ignored) {}
  }
}

run().catch(err => window.alert(`KZN Surf capture failed: ${err.message || err}`));
