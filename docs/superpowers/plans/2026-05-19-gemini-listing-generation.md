# Gemini Listing Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gemini-backed generation path that produces English `ListingPackage` output while keeping the existing deterministic generator as a fallback.

**Architecture:** Keep all Gemini request construction, response parsing, output validation, and risky-term rejection in pure TypeScript under `src/domain/geminiListing.ts`. Add thin API adapters for Vercel and local Vite dev that read `GEMINI_API_KEY`, call the shared helper, and return structured JSON. Update `src/App.tsx` only for the new button, AI status state, and replacing the displayed listing on success.

**Tech Stack:** React, Vite, TypeScript, Vitest, Vercel serverless functions, Gemini REST `generateContent`.

---

## File Structure

- Modify `src/domain/listingEngine.ts`: export a reusable risky-text matcher so Gemini output validation uses the same risk rules as the deterministic engine.
- Modify `src/domain/listingEngine.test.ts`: cover the new exported matcher.
- Create `src/domain/geminiListing.ts`: pure server-side helper with request normalization, prompt generation, Gemini REST body construction, response parsing, and `ListingPackage` validation.
- Create `src/domain/geminiListing.test.ts`: tests for missing API key, valid request body, valid response parsing, invalid JSON, missing fields, and risky output rejection.
- Create `api/generate-listing.ts`: Vercel POST endpoint.
- Modify `vite.config.ts`: mount `/api/generate-listing` for local dev.
- Modify `src/App.tsx`: add `Gemini 生成英文内容` action and status message; keep current listing on failure.
- Modify `src/App.css`: style the Gemini action/status row.

---

## Task 1: Reuse Risk Detection For Gemini Validation

**Files:**
- Modify: `src/domain/listingEngine.ts`
- Modify: `src/domain/listingEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `src/domain/listingEngine.test.ts`:

```ts
test('finds risky terms in arbitrary generated text', () => {
  const matches = findRiskMatchesInText('Ray-Ban replica sunglasses with a watermark image');

  expect(matches.map((match) => match.word)).toEqual(['Ray-Ban', 'replica', 'watermark']);
  expect(matches.every((match) => match.level === 'High' || match.level === 'Medium')).toBe(true);
});
```

Update the import at the top:

```ts
import {
  analyzeProduct,
  exportListingCsv,
  findRiskMatchesInText,
  generateListingPackage,
  type ProductInput,
} from './listingEngine';
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cmd /c npm test -- --run src/domain/listingEngine.test.ts
```

Expected: FAIL because `findRiskMatchesInText` is not exported.

- [ ] **Step 3: Export the matcher**

In `src/domain/listingEngine.ts`, add this function after `generateListingPackage`:

```ts
export function findRiskMatchesInText(text: string): RiskMatch[] {
  return RISK_RULES.filter((rule) => rule.pattern.test(text)).map(({ pattern: _pattern, ...match }) => match);
}
```

Then change `checkRisk` to call the new helper:

```ts
function checkRisk(input: ProductInput): ProductAnalysis['risk'] {
  const text = `${input.productName} ${input.notes}`;
  const matches = findRiskMatchesInText(text);
  const hasHigh = matches.some((match) => match.level === 'High');
  const level: RiskLevel = hasHigh || matches.length >= 3 ? 'High' : matches.length ? 'Medium' : 'Low';

  return {
    level,
    matches,
    summary:
      level === 'Low'
        ? 'No risky brand, replica, or lookalike wording detected.'
        : `Detected ${matches.length} risky wording signal${matches.length > 1 ? 's' : ''}. Replace them with generic product language before publishing.`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cmd /c npm test -- --run src/domain/listingEngine.test.ts
```

Expected: PASS.

---

## Task 2: Build Pure Gemini Listing Helper

**Files:**
- Create: `src/domain/geminiListing.ts`
- Create: `src/domain/geminiListing.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/geminiListing.test.ts`:

```ts
import { analyzeProduct, generateListingPackage, type ProductInput } from './listingEngine';
import {
  buildGeminiRequestBody,
  generateListingWithGemini,
  normalizeGeminiListing,
  type GenerateListingRequestBody,
} from './geminiListing';

const input: ProductInput = {
  sourcePlatform: '1688',
  sourceUrl: 'https://example.com/product',
  productName: 'Square UV400 Sunglasses',
  frameShape: 'square',
  lensType: 'UV400',
  material: 'PC',
  targetMarket: 'US',
  businessModel: 'wholesale',
  moq: 200,
  customization: ['logo', 'packaging'],
  notes: 'For beach, driving, travel, and daily outdoor use.',
};

const analysis = analyzeProduct(input);
const fallbackListing = generateListingPackage({ input, analysis });
const body: GenerateListingRequestBody = { input, analysis, fallbackListing };

const validListing = {
  ...fallbackListing,
  productTitle: 'AI Square UV400 Sunglasses for Wholesale Eyewear Buyers',
  faq: ['Can these sunglasses support logo customization? Yes, logo customization is available.'],
};

test('returns not configured when api key is missing', async () => {
  const result = await generateListingWithGemini({ body, apiKey: '', fetchImpl: vi.fn() });

  expect(result).toEqual({
    status: 500,
    result: {
      ok: false,
      error: {
        code: 'GEMINI_NOT_CONFIGURED',
        message: 'Gemini API Key 未配置。请在 Vercel 环境变量中添加 GEMINI_API_KEY。',
      },
    },
  });
});

test('builds a JSON-only Gemini request body', () => {
  const requestBody = buildGeminiRequestBody(body);

  expect(requestBody.generationConfig.responseMimeType).toBe('application/json');
  expect(requestBody.contents[0].parts[0].text).toContain('Return valid JSON only');
  expect(requestBody.contents[0].parts[0].text).toContain('Square UV400 Sunglasses');
});

test('parses valid Gemini JSON into a listing package', async () => {
  const fetchImpl = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(validListing) }],
          },
        },
      ],
    }),
  }));

  const result = await generateListingWithGemini({ body, apiKey: 'test-key', fetchImpl });

  expect(result.status).toBe(200);
  expect(result.result.ok).toBe(true);
  expect(result.result.ok && result.result.data.productTitle).toBe(validListing.productTitle);
  expect(fetchImpl.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key');
});

test('rejects invalid Gemini JSON', async () => {
  const fetchImpl = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'not-json' }] } }],
    }),
  }));

  const result = await generateListingWithGemini({ body, apiKey: 'test-key', fetchImpl });

  expect(result.status).toBe(502);
  expect(result.result.ok).toBe(false);
  expect(!result.result.ok && result.result.error.code).toBe('GEMINI_INVALID_RESPONSE');
});

test('rejects missing listing fields', () => {
  const result = normalizeGeminiListing({ productTitle: 'Missing Fields' }, fallbackListing);

  expect(result.ok).toBe(false);
  expect(!result.ok && result.error.code).toBe('GEMINI_INVALID_RESPONSE');
});

test('rejects risky terms in generated output', () => {
  const result = normalizeGeminiListing(
    {
      ...validListing,
      productTitle: 'Ray-Ban replica sunglasses',
    },
    fallbackListing,
  );

  expect(result.ok).toBe(false);
  expect(!result.ok && result.error.code).toBe('GEMINI_INVALID_RESPONSE');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cmd /c npm test -- --run src/domain/geminiListing.test.ts
```

Expected: FAIL because `src/domain/geminiListing.ts` does not exist.

- [ ] **Step 3: Implement `src/domain/geminiListing.ts`**

Create `src/domain/geminiListing.ts` with these exports:

```ts
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

type FetchImpl = (url: string, init: RequestInit) => Promise<{
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

  if (findRiskMatchesInText(riskyText).length) {
    return geminiError('GEMINI_INVALID_RESPONSE');
  }

  return { ok: true, data: listing };
}
```

In the same file, add the private helpers used above:

```ts
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

function geminiError(code: GeminiErrorCode): GeminiListingResult {
  return { ok: false, error: { code, message: ERROR_MESSAGES[code] } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
cmd /c npm test -- --run src/domain/geminiListing.test.ts
```

Expected: PASS.

---

## Task 3: Add Vercel And Local API Routes

**Files:**
- Create: `api/generate-listing.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create the Vercel endpoint**

Create `api/generate-listing.ts`:

```ts
import { generateListingWithGemini, type GeminiListingResult } from '../src/domain/geminiListing';

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: GeminiListingResult) => void;
  setHeader: (name: string, value: string) => void;
};

type ServerEnv = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({
      ok: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 POST 请求。',
      },
    });
    return;
  }

  const env = (globalThis as ServerEnv).process?.env ?? {};
  const { status, result } = await generateListingWithGemini({
    body: req.body,
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || 'gemini-2.5-flash',
  });

  res.status(status).json(result);
}
```

- [ ] **Step 2: Add the local Vite middleware**

In `vite.config.ts`, import the helper:

```ts
import { generateListingWithGemini } from './src/domain/geminiListing';
```

Add `localGeminiListingApi()` to the plugin list:

```ts
plugins: [react(), localProductFetchApi(), localGeminiListingApi()],
```

Add this plugin below `localProductFetchApi()`:

```ts
function localGeminiListingApi(): Plugin {
  return {
    name: 'local-gemini-listing-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-listing', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'METHOD_NOT_ALLOWED',
                message: '只支持 POST 请求。',
              },
            }),
          );
          return;
        }

        try {
          const rawBody = await readLocalRequestBody(req);
          const { status, result } = await generateListingWithGemini({
            body: rawBody,
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          });
          res.statusCode = status;
          res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'GEMINI_REQUEST_FAILED',
                message: 'Gemini 本地接口异常，请重启 npm run dev 后重试。',
              },
            }),
          );
        }
      });
    },
  };
}
```

- [ ] **Step 3: Type-check the Vercel endpoint**

Run:

```bash
cmd /c npx tsc --noEmit --moduleResolution Node --module ESNext --target ES2020 --lib ES2020,DOM --skipLibCheck api/generate-listing.ts
```

Expected: PASS.

---

## Task 4: Add Frontend Gemini Action

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Add types and state**

In `src/App.tsx`, import `GeminiListingResult`:

```ts
import type { GeminiListingResult } from './domain/geminiListing';
```

Add this state type near `FetchState`:

```ts
type GeminiState =
  | { status: 'idle'; message: string }
  | { status: 'loading'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };
```

Inside `App`, add:

```ts
const [geminiState, setGeminiState] = useState<GeminiState>({
  status: 'idle',
  message: '可选：使用 Gemini 生成更丰富的英文上架内容。',
});
```

- [ ] **Step 2: Add the handler**

Add this function below `handleGenerate`:

```ts
async function handleGenerateWithGemini() {
  const nextAnalysis = analyzeProduct(input);
  const fallbackListing = generateListingPackage({ input, analysis: nextAnalysis });

  setAnalysis(nextAnalysis);
  setGeminiState({ status: 'loading', message: 'Gemini 正在生成英文上架内容...' });

  try {
    const response = await fetch('/api/generate-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        analysis: nextAnalysis,
        fallbackListing,
      }),
    });

    if (!response.headers.get('content-type')?.includes('application/json')) {
      setGeminiState({
        status: 'error',
        message: 'Gemini 接口没有返回 JSON。请确认 /api/generate-listing 已部署。',
      });
      return;
    }

    const result = (await response.json()) as GeminiListingResult;

    if (!result.ok) {
      setGeminiState({ status: 'error', message: result.error.message });
      return;
    }

    setListing(result.data);
    setGeminiState({
      status: 'success',
      message: 'Gemini 已生成英文内容，请检查后再发布。',
    });
  } catch {
    setGeminiState({
      status: 'error',
      message: '无法连接 Gemini 生成接口。请稍后重试或继续使用模板内容。',
    });
  }
}
```

Pass props into `ListingPanel`:

```tsx
<ListingPanel
  listing={listing}
  copiedKey={copiedKey}
  geminiState={geminiState}
  onCopy={copyText}
  onExportCsv={handleExportCsv}
  onGenerateGemini={handleGenerateWithGemini}
/>
```

- [ ] **Step 3: Render the button and status**

Update the `ListingPanel` signature:

```tsx
function ListingPanel({
  listing,
  copiedKey,
  geminiState,
  onCopy,
  onExportCsv,
  onGenerateGemini,
}: {
  listing: ListingPackage;
  copiedKey: string;
  geminiState: GeminiState;
  onCopy: (key: string, value: string) => void;
  onExportCsv: () => void;
  onGenerateGemini: () => void;
}) {
```

After the panel heading, add:

```tsx
<div className="gemini-row">
  <button
    className="gemini-action"
    type="button"
    onClick={onGenerateGemini}
    disabled={geminiState.status === 'loading'}
  >
    <Sparkles size={16} />
    {geminiState.status === 'loading' ? 'Gemini 生成中...' : 'Gemini 生成英文内容'}
  </button>
  <p className={`gemini-status gemini-${geminiState.status}`}>{geminiState.message}</p>
</div>
```

- [ ] **Step 4: Style the Gemini controls**

In `src/App.css`, add styles near the fetch status rules:

```css
.gemini-row {
  display: grid;
  gap: 8px;
  margin: -2px 0 14px;
}

.gemini-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 13px;
  border-radius: 7px;
  color: #fff;
  background: #6f4e9f;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.gemini-action:disabled {
  cursor: wait;
  opacity: 0.72;
}

.gemini-status {
  min-height: 34px;
  padding: 8px 10px;
  margin: 0;
  border: 1px solid #d6dee8;
  border-radius: 7px;
  background: #f8fafc;
  color: #5c6676;
  font-size: 12px;
  line-height: 1.45;
}

.gemini-loading {
  border-color: #d3c1f1;
  background: #f4efff;
  color: #5d4387;
}

.gemini-success {
  border-color: #a8dcc0;
  background: #eaf8ef;
  color: #246146;
}

.gemini-error {
  border-color: #e6a19d;
  background: #ffe9e7;
  color: #8a2f2b;
}
```

- [ ] **Step 5: Build check**

Run:

```bash
cmd /c npm run build
```

Expected: PASS.

---

## Task 5: Full Verification And Commit

**Files:**
- All files changed in Tasks 1-4.

- [ ] **Step 1: Run all tests**

Run:

```bash
cmd /c npm test -- --run
```

Expected: PASS with all test files green.

- [ ] **Step 2: Run production build**

Run:

```bash
cmd /c npm run build
```

Expected: PASS.

- [ ] **Step 3: Type-check Vercel API files**

Run:

```bash
cmd /c npx tsc --noEmit --moduleResolution Node --module ESNext --target ES2020 --lib ES2020,DOM --skipLibCheck api/fetch-product.ts api/generate-listing.ts
```

Expected: PASS.

- [ ] **Step 4: Verify local not-configured API response**

Start local Vite on an unused port:

```powershell
$out = Join-Path (Get-Location) 'vite-gemini-api.out.log'
$err = Join-Path (Get-Location) 'vite-gemini-api.err.log'
$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm.cmd run dev -- --host 127.0.0.1 --port 3002' -WorkingDirectory (Get-Location) -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
$p.Id | Set-Content -Path vite-gemini-api.pid
```

POST a minimal request without setting `GEMINI_API_KEY`:

```powershell
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$body = '{"input":{},"analysis":{},"fallbackListing":{}}'
$content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, 'application/json')
$response = $client.PostAsync('http://127.0.0.1:3002/api/generate-listing', $content).Result
"STATUS $([int]$response.StatusCode)"
$response.Content.ReadAsStringAsync().Result
```

Expected: response includes `GEMINI_NOT_CONFIGURED`.

- [ ] **Step 5: Stop the temporary Vite process**

Use the PID written in Step 4:

```powershell
$pidValue = Get-Content -Path vite-gemini-api.pid
Stop-Process -Id $pidValue -Force
```

- [ ] **Step 6: Commit**

Run:

```bash
git add api/generate-listing.ts src/App.tsx src/App.css src/domain/listingEngine.ts src/domain/listingEngine.test.ts src/domain/geminiListing.ts src/domain/geminiListing.test.ts vite.config.ts
git commit -m "Add Gemini listing generation"
```

- [ ] **Step 7: Push**

Run:

```bash
git push origin main
```

Expected: GitHub `main` receives the new implementation commit. Vercel can then redeploy and use `GEMINI_API_KEY` after the environment variable is configured.

---

## Deployment Checklist

- Add `GEMINI_API_KEY` in Vercel project environment variables.
- Optionally add `GEMINI_MODEL=gemini-2.5-flash`.
- Redeploy after adding the environment variable.
- In the deployed app, use `生成上架内容` first, then `Gemini 生成英文内容`.
- If Gemini is not configured, the app should show the Chinese key-missing message and keep the existing listing unchanged.
