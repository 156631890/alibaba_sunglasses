import type { SourcePlatform } from './listingEngine';

export type FetchErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'FETCH_FAILED'
  | 'FETCH_BLOCKED'
  | 'NO_PRODUCT_DATA';

export type FetchProductError = {
  code: FetchErrorCode;
  message: string;
};

export type FetchProductData = {
  title: string;
  description: string;
  image: string;
  platform: SourcePlatform;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
};

export type FetchProductResult =
  | {
      ok: true;
      data: FetchProductData;
    }
  | {
      ok: false;
      error: FetchProductError;
    };

const ERROR_MESSAGES: Record<FetchErrorCode, string> = {
  INVALID_URL: '请输入有效的产品链接。',
  UNSUPPORTED_PROTOCOL: '只支持 http 或 https 链接。',
  FETCH_FAILED: '链接读取失败，请稍后重试或手动填写产品信息。',
  FETCH_BLOCKED: '这个链接暂时无法自动读取，请手动填写产品名称和补充信息。',
  NO_PRODUCT_DATA: '没有从链接中识别到可用的产品信息，请手动填写。',
};

const BLOCKED_PATTERNS = [
  /captcha/i,
  /verify/i,
  /verification required/i,
  /access denied/i,
  /robot check/i,
  /unusual traffic/i,
  /please login/i,
  /sign in to continue/i,
  /enable javascript/i,
  /滑块验证/,
  /验证码/,
  /登录后/,
];

export function validateProductUrl(url: string): FetchProductResult {
  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    return fetchError('INVALID_URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return fetchError('UNSUPPORTED_PROTOCOL');
  }

  return {
    ok: true,
    data: {
      title: '',
      description: '',
      image: '',
      platform: 'other',
      confidence: 'low',
      notes: '',
    },
  };
}

export function extractProductDataFromHtml({
  html,
  url,
  sourcePlatform,
}: {
  html: string;
  url: string;
  sourcePlatform: SourcePlatform;
}): FetchProductResult {
  const validation = validateProductUrl(url);
  if (!validation.ok) return validation;

  if (!html.trim()) return fetchError('NO_PRODUCT_DATA');

  const visibleText = extractVisibleText(html);
  if (isBlockedPage(html, visibleText)) return fetchError('FETCH_BLOCKED');

  const title = normalizePlatformText(
    firstNonEmpty([
      getMetaContent(html, 'property', 'og:title'),
      getMetaContent(html, 'name', 'twitter:title'),
      getTitle(html),
      getFirstTagText(html, 'h1'),
    ]),
    sourcePlatform,
  );
  const description = normalizePlatformText(
    firstNonEmpty([
      getMetaContent(html, 'property', 'og:description'),
      getMetaContent(html, 'name', 'twitter:description'),
      getMetaContent(html, 'name', 'description'),
      visibleText,
    ]),
    sourcePlatform,
  );
  const image = absolutizeUrl(
    firstNonEmpty([
      getMetaContent(html, 'property', 'og:image'),
      getMetaContent(html, 'name', 'twitter:image'),
      getFirstImage(html),
    ]),
    url,
  );

  if (!title && !description) return fetchError('NO_PRODUCT_DATA');

  const notes = buildNotes({
    title,
    description,
    image,
    sourcePlatform,
    url,
  });

  return {
    ok: true,
    data: {
      title: title || 'Fetched product',
      description,
      image,
      platform: sourcePlatform,
      confidence: getConfidence(title, description, image),
      notes,
    },
  };
}

export function fetchError(code: FetchErrorCode): FetchProductResult {
  return {
    ok: false,
    error: {
      code,
      message: ERROR_MESSAGES[code],
    },
  };
}

function getMetaContent(html: string, attributeName: 'name' | 'property', attributeValue: string) {
  const metaTagPattern = /<meta\b[^>]*>/gi;
  const tags = html.match(metaTagPattern) ?? [];

  for (const tag of tags) {
    const attr = getAttributeValue(tag, attributeName);
    if (attr?.toLowerCase() === attributeValue.toLowerCase()) {
      return cleanText(getAttributeValue(tag, 'content') ?? '');
    }
  }

  return '';
}

function getTitle(html: string) {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
}

function getFirstTagText(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return cleanText(stripTags(match?.[1] ?? ''));
}

function getFirstImage(html: string) {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    const src = getAttributeValue(tag, 'src') || getAttributeValue(tag, 'data-src');
    if (src && !src.startsWith('data:')) return src;
  }
  return '';
}

function getAttributeValue(tag: string, attributeName: string) {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  return decodeHtml(match?.[2] ?? match?.[3] ?? match?.[4] ?? '');
}

function extractVisibleText(html: string) {
  const withoutScripts = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
  return cleanText(stripTags(withoutScripts)).slice(0, 600);
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ');
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/\s+/g, ' ')
    .replace(/\|?\s*(Amazon\.com|1688\.com|TikTok)\s*$/i, '')
    .trim();
}

function normalizePlatformText(value: string, platform: SourcePlatform) {
  let text = cleanText(value);
  if (platform === '1688') {
    text = text
      .replace(/-?\s*阿里巴巴.*$/i, '')
      .replace(/-?\s*1688.*$/i, '')
      .replace(/厂家直销|批发采购平台/g, '')
      .trim();
  }
  if (platform === 'Amazon') {
    text = text
      .replace(/\bAmazon\.com\b/gi, '')
      .replace(/\bcustomer reviews?\b/gi, '')
      .replace(/\bstars?\b/gi, '')
      .replace(/\bshop\b/gi, '')
      .trim();
  }
  if (platform === 'TikTok') {
    text = text.replace(/\|?\s*TikTok.*$/i, '').trim();
  }
  return text;
}

function isBlockedPage(html: string, visibleText: string) {
  const combined = `${html.slice(0, 2000)} ${visibleText}`;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(combined));
}

function firstNonEmpty(values: string[]) {
  return values.find((value) => value.trim().length > 0)?.trim() ?? '';
}

function absolutizeUrl(value: string, baseUrl: string) {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

function getConfidence(title: string, description: string, image: string): FetchProductData['confidence'] {
  if (title && description && image) return 'high';
  if (title && description) return 'medium';
  return 'low';
}

function buildNotes({
  title,
  description,
  image,
  sourcePlatform,
  url,
}: {
  title: string;
  description: string;
  image: string;
  sourcePlatform: SourcePlatform;
  url: string;
}) {
  const parts = [
    title ? `Fetched title: ${title}.` : '',
    description ? `Fetched description: ${description}.` : '',
    image ? `Fetched image: ${image}.` : '',
    `Source platform: ${sourcePlatform}.`,
    `Source URL: ${url}.`,
  ];
  return parts.filter(Boolean).join(' ');
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
