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
  const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => ({
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
  const [, requestInit] = fetchImpl.mock.calls[0]!;
  const headers = requestInit.headers as Record<string, string>;
  expect(headers['x-goog-api-key']).toBe('test-key');
});

test('rejects invalid Gemini JSON', async () => {
  const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => ({
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

test('rejects source platform terms in generated output', () => {
  const result = normalizeGeminiListing(
    {
      ...validListing,
      productTitle: 'TikTok viral sunglasses for Amazon shops',
    },
    fallbackListing,
  );

  expect(result.ok).toBe(false);
  expect(!result.ok && result.error.code).toBe('GEMINI_INVALID_RESPONSE');
});
