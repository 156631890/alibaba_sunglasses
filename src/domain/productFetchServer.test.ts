import { fetchProductFromUrl, normalizeFetchPlatform, readFetchRequestBody } from './productFetchServer';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('parses request body strings', () => {
  expect(readFetchRequestBody('{"url":"https://example.com/item","sourcePlatform":"Amazon"}')).toEqual({
    url: 'https://example.com/item',
    sourcePlatform: 'Amazon',
  });
  expect(readFetchRequestBody('not-json')).toEqual({});
});

test('normalizes unknown platforms to other', () => {
  expect(normalizeFetchPlatform('Amazon')).toBe('Amazon');
  expect(normalizeFetchPlatform('unknown')).toBe('other');
});

test('rejects invalid product urls before fetching', async () => {
  const result = await fetchProductFromUrl({ url: 'not-a-url', sourcePlatform: 'Amazon' });

  expect(result).toEqual({
    status: 400,
    result: {
      ok: false,
      error: {
        code: 'INVALID_URL',
        message: '请输入有效的产品链接。',
      },
    },
  });
});

test('fetches html and extracts product data', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      text: async () =>
        '<html><head><meta property="og:title" content="Polarized Square Sunglasses"></head><body></body></html>',
    })),
  );

  const result = await fetchProductFromUrl({
    url: 'https://example.com/item',
    sourcePlatform: 'Amazon',
  });

  expect(result.status).toBe(200);
  expect(result.result.ok).toBe(true);
  expect(result.result.ok && result.result.data.title).toBe('Polarized Square Sunglasses');
});
