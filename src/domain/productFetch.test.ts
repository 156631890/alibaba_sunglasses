import {
  extractProductDataFromHtml,
  validateProductUrl,
  type FetchProductData,
} from './productFetch';

test('rejects invalid product urls', () => {
  expect(validateProductUrl('not-a-url')).toEqual({
    ok: false,
    error: {
      code: 'INVALID_URL',
      message: '请输入有效的产品链接。',
    },
  });
});

test('rejects unsupported protocols', () => {
  expect(validateProductUrl('ftp://example.com/item')).toEqual({
    ok: false,
    error: {
      code: 'UNSUPPORTED_PROTOCOL',
      message: '只支持 http 或 https 链接。',
    },
  });
});

test('prefers open graph metadata over document title', () => {
  const html = `
    <html>
      <head>
        <title>Fallback Title</title>
        <meta property="og:title" content="OG Square Sunglasses">
        <meta property="og:description" content="UV400 sunglasses for wholesale buyers">
        <meta property="og:image" content="https://cdn.example.com/a.jpg">
      </head>
      <body><h1>Body Title</h1></body>
    </html>
  `;

  const result = extractProductDataFromHtml({
    html,
    url: 'https://example.com/product',
    sourcePlatform: 'other',
  });

  expect(result.ok).toBe(true);
  expect((result as { ok: true; data: FetchProductData }).data.title).toBe('OG Square Sunglasses');
  expect((result as { ok: true; data: FetchProductData }).data.notes).toContain('UV400 sunglasses');
});

test('detects blocked platform pages', () => {
  const result = extractProductDataFromHtml({
    html: '<html><body>captcha verification required login</body></html>',
    url: 'https://example.com/product',
    sourcePlatform: 'Amazon',
  });

  expect(result).toEqual({
    ok: false,
    error: {
      code: 'FETCH_BLOCKED',
      message: '这个链接暂时无法自动读取，请手动填写产品名称和补充信息。',
    },
  });
});
