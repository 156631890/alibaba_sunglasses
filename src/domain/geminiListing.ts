import {
  findRiskMatchesInText,
  type ListingPackage,
  type ProductAnalysis,
  type ProductInput,
} from './listingEngine';

export type GeminiErrorCode =
  | 'GEMINI_NOT_CONFIGURED'
  | 'GEMINI_REQUEST_FAILED'
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_INVALID_RESPONSE'
  | 'METHOD_NOT_ALLOWED';

export type GeminiListingResult =
  | { ok: true; data: ListingPackage }
  | { ok: false; error: { code: GeminiErrorCode; message: string } };

export type GenerateListingRequestBody = {
  input: ProductInput;
  analysis: ProductAnalysis;
  fallbackListing: ListingPackage;
};

export type GeminiServerResponse = {
  status: number;
  result: GeminiListingResult;
};

type FetchImpl = (
  url: string,
  init: RequestInit,
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

const ERROR_MESSAGES: Record<GeminiErrorCode, string> = {
  GEMINI_NOT_CONFIGURED: 'Gemini API Key 未配置。请在 Vercel 环境变量中添加 GEMINI_API_KEY。',
  GEMINI_REQUEST_FAILED: 'Gemini 生成失败，请稍后重试或继续使用模板内容。',
  GEMINI_TIMEOUT: 'Gemini 生成超时，请稍后重试。',
  GEMINI_INVALID_RESPONSE: 'Gemini 返回内容格式不正确，已保留当前模板内容。',
  METHOD_NOT_ALLOWED: '只支持 POST 请求。',
};

const requiredStringFields: Array<keyof ListingPackage> = [
  'productTitle',
  'b2bTitle',
  'slug',
  'metaTitle',
  'metaDescription',
  'htmlDescription',
  'geoSummary',
  'schemaJson',
];

const requiredArrayFields: Array<keyof ListingPackage> = ['faq', 'imageAltText', 'seoKeywords'];
const requiredPromptFields: Array<keyof ListingPackage['imagePrompts']> = [
  'whiteBackground',
  'lifestyle',
  'detail',
  'customization',
  'shortVideo',
];
const forbiddenGeneratedTerms = [/\b1688\b/i, /\bamazon\b/i, /\btiktok\b/i];

export async function generateListingWithGemini({
  body,
  apiKey,
  model = 'gemini-2.5-flash',
  fetchImpl = fetch,
}: {
  body: unknown;
  apiKey?: string;
  model?: string;
  fetchImpl?: FetchImpl;
}): Promise<GeminiServerResponse> {
  const requestBody = readGenerateListingRequestBody(body);

  if (!requestBody) {
    return { status: 400, result: geminiError('GEMINI_INVALID_RESPONSE') };
  }

  if (!apiKey) {
    return { status: 500, result: geminiError('GEMINI_NOT_CONFIGURED') };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiRequestBody(requestBody)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { status: 502, result: geminiError('GEMINI_REQUEST_FAILED') };
    }

    const geminiResponse = await response.json();
    const text = extractGeminiText(geminiResponse);
    const parsed = JSON.parse(text) as unknown;
    const normalized = normalizeGeminiListing(parsed, requestBody.fallbackListing);

    if (!normalized.ok) {
      return { status: 502, result: normalized };
    }

    return { status: 200, result: normalized };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return { status: 502, result: geminiError(isAbort ? 'GEMINI_TIMEOUT' : 'GEMINI_INVALID_RESPONSE') };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildGeminiRequestBody(body: GenerateListingRequestBody) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(body) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.6,
    },
  };
}

export function normalizeGeminiListing(value: unknown, fallbackListing: ListingPackage): GeminiListingResult {
  if (!isRecord(value)) return geminiError('GEMINI_INVALID_RESPONSE');

  for (const field of requiredStringFields) {
    if (typeof value[field] !== 'string' || !value[field].trim()) {
      return geminiError('GEMINI_INVALID_RESPONSE');
    }
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(value[field]) || !(value[field] as unknown[]).every((item) => typeof item === 'string')) {
      return geminiError('GEMINI_INVALID_RESPONSE');
    }
  }

  const imagePrompts = value.imagePrompts;
  if (!isRecord(imagePrompts)) return geminiError('GEMINI_INVALID_RESPONSE');

  for (const field of requiredPromptFields) {
    if (typeof imagePrompts[field] !== 'string' || !imagePrompts[field].trim()) {
      return geminiError('GEMINI_INVALID_RESPONSE');
    }
  }

  const listing: ListingPackage = {
    productTitle: cleanString(value.productTitle),
    b2bTitle: cleanString(value.b2bTitle),
    slug: safeSlug(cleanString(value.slug), cleanString(value.productTitle)),
    metaTitle: cleanString(value.metaTitle).slice(0, 60),
    metaDescription: cleanString(value.metaDescription).slice(0, 156),
    htmlDescription: cleanString(value.htmlDescription),
    faq: (value.faq as string[]).map(cleanString).filter(Boolean),
    imageAltText: (value.imageAltText as string[]).map(cleanString).filter(Boolean),
    seoKeywords: (value.seoKeywords as string[]).map(cleanString).filter(Boolean),
    geoSummary: cleanString(value.geoSummary),
    schemaJson: normalizeSchemaJson(cleanString(value.schemaJson), fallbackListing.schemaJson),
    imagePrompts: {
      whiteBackground: cleanString(imagePrompts.whiteBackground),
      lifestyle: cleanString(imagePrompts.lifestyle),
      detail: cleanString(imagePrompts.detail),
      customization: cleanString(imagePrompts.customization),
      shortVideo: cleanString(imagePrompts.shortVideo),
    },
  };

  const riskyText = [
    listing.productTitle,
    listing.b2bTitle,
    listing.metaTitle,
    listing.metaDescription,
    listing.htmlDescription,
    listing.geoSummary,
    listing.faq.join(' '),
    listing.imageAltText.join(' '),
    Object.values(listing.imagePrompts).join(' '),
  ].join(' ');

  if (
    findRiskMatchesInText(removeAllowedNegativeRiskPhrases(riskyText)).length ||
    forbiddenGeneratedTerms.some((pattern) => pattern.test(riskyText))
  ) {
    return geminiError('GEMINI_INVALID_RESPONSE');
  }

  return { ok: true, data: listing };
}

function buildPrompt({ input, analysis, fallbackListing }: GenerateListingRequestBody) {
  return [
    'You are generating English ecommerce and B2B listing content for an international sunglasses website.',
    'Return valid JSON only. Do not wrap the response in Markdown fences. Do not add explanations.',
    'Do not use Chinese in any listing field.',
    'Avoid third-party brand names, replica language, lookalike wording, celebrity references, platform names, watermark mentions, and unsupported claims.',
    'Keep the exact JSON shape from fallbackListing. All fields are required.',
    `Product input: ${JSON.stringify(input)}`,
    `Analysis: ${JSON.stringify(analysis)}`,
    `Fallback listing shape and safe baseline: ${JSON.stringify(fallbackListing)}`,
  ].join('\n\n');
}

function readGenerateListingRequestBody(body: unknown): GenerateListingRequestBody | null {
  const parsed = typeof body === 'string' ? parseJson(body) : body;
  if (!isRecord(parsed)) return null;
  if (!isRecord(parsed.input) || !isRecord(parsed.analysis) || !isRecord(parsed.fallbackListing)) return null;
  return parsed as GenerateListingRequestBody;
}

function extractGeminiText(value: unknown) {
  if (!isRecord(value)) throw new Error('Invalid Gemini response');
  const candidates = value.candidates;
  if (!Array.isArray(candidates)) throw new Error('Missing Gemini candidates');
  const first = candidates[0];
  if (!isRecord(first) || !isRecord(first.content)) throw new Error('Missing Gemini content');
  const parts = first.content.parts;
  if (!Array.isArray(parts) || !isRecord(parts[0]) || typeof parts[0].text !== 'string') {
    throw new Error('Missing Gemini text');
  }
  return parts[0].text;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeSchemaJson(value: string, fallback: string) {
  try {
    JSON.parse(value);
    return value;
  } catch {
    return fallback;
  }
}

function safeSlug(value: string, fallbackTitle: string) {
  const slug = value
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug) return slug;
  return fallbackTitle
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanString(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function removeAllowedNegativeRiskPhrases(value: string) {
  return value
    .replace(/\bno\s+watermarks?\b/gi, '')
    .replace(/\bwithout\s+(?:any\s+)?watermarks?\b/gi, '');
}

function geminiError(code: GeminiErrorCode): GeminiListingResult {
  return { ok: false, error: { code, message: ERROR_MESSAGES[code] } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
