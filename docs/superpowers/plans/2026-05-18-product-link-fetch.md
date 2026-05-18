# Product Link Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a best-effort URL fetch step that reads 1688, Amazon, TikTok, and generic product pages, then auto-fills the MVP form before analysis.

**Architecture:** Put HTML parsing and URL validation in pure TypeScript under `src/domain/productFetch.ts` so it can be tested without network. Add `api/fetch-product.ts` as the Vercel serverless boundary that fetches HTML and calls the pure parser. Update `src/App.tsx` only for UI state, the fetch button, status messages, and form auto-fill.

**Tech Stack:** React, Vite, TypeScript, Vitest, Vercel Serverless Functions.

---

## File Structure

- Create `src/domain/productFetch.ts`: pure URL validation, metadata extraction, blocked-page detection, and response normalization.
- Create `src/domain/productFetch.test.ts`: tests for parser behavior and validation.
- Create `api/fetch-product.ts`: Vercel POST endpoint.
- Modify `src/App.tsx`: add fetch state, button, API call, success/error message, and auto-fill.
- Modify `src/App.css`: style fetch status and button row.
- Modify `vite.config.ts`: exclude `.worktrees` from Vitest discovery.
- Modify `vercel.json`: ensure `/api/*` is not rewritten to `/`.

## Task 1: Pure Product Fetch Parser

**Files:**
- Create: `src/domain/productFetch.test.ts`
- Create: `src/domain/productFetch.ts`

- [ ] **Step 1: Write failing parser tests**

Add tests that define the pure parser API:

```ts
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
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cmd /c npm test -- --run src/domain/productFetch.test.ts`

Expected: FAIL because `src/domain/productFetch.ts` does not exist.

- [ ] **Step 3: Implement parser**

Implement:

```ts
export type FetchErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'FETCH_FAILED'
  | 'FETCH_BLOCKED'
  | 'NO_PRODUCT_DATA';

export type FetchProductData = {
  title: string;
  description: string;
  image: string;
  platform: SourcePlatform;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
};

export function validateProductUrl(url: string): FetchProductResult;
export function extractProductDataFromHtml(input: {
  html: string;
  url: string;
  sourcePlatform: SourcePlatform;
}): FetchProductResult;
```

Use regex-based metadata extraction for meta tags, title, h1, image URLs, and visible text. Keep it conservative and dependency-free.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `cmd /c npm test -- --run src/domain/productFetch.test.ts`

Expected: parser tests pass.

- [ ] **Step 5: Commit parser**

Run:

```bash
git add src/domain/productFetch.ts src/domain/productFetch.test.ts
git commit -m "Add product link metadata parser"
```

## Task 2: Vercel Fetch API

**Files:**
- Create: `api/fetch-product.ts`

- [ ] **Step 1: Create API endpoint**

Add a default Vercel handler that accepts only POST, validates `{ url, sourcePlatform }`, fetches the page with a browser-like user agent and 12 second timeout, then returns the parser result.

Core behavior:

```ts
const response = await fetch(url, {
  headers: {
    'user-agent': 'Mozilla/5.0 ProductListingBot/1.0',
    accept: 'text/html,application/xhtml+xml',
  },
  signal: controller.signal,
});
```

Use structured JSON responses only.

- [ ] **Step 2: Verify TypeScript build**

Run: `cmd /c npm run build`

Expected: build succeeds. If Vite does not compile `api`, also run `cmd /c npx tsc --noEmit --moduleResolution Node --module ESNext --target ES2020 api/fetch-product.ts`.

- [ ] **Step 3: Commit API endpoint**

Run:

```bash
git add api/fetch-product.ts
git commit -m "Add product fetch API endpoint"
```

## Task 3: Frontend Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Add fetch state**

Add state for:

```ts
type FetchState =
  | { status: 'idle'; message: string }
  | { status: 'loading'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };
```

- [ ] **Step 2: Add `抓取链接信息` handler**

The handler posts to `/api/fetch-product`, auto-fills `productName` and `notes` on success, and keeps existing values on failure.

Expected behavior:

```ts
const response = await fetch('/api/fetch-product', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: input.sourceUrl, sourcePlatform: input.sourcePlatform }),
});
```

- [ ] **Step 3: Add button and status UI**

Place the button next to or directly below the product URL input. Disable it while loading. Show Chinese status text.

- [ ] **Step 4: Run tests and build**

Run:

```bash
cmd /c npm test -- --run
cmd /c npm run build
```

Expected: all tests and build pass.

- [ ] **Step 5: Commit frontend integration**

Run:

```bash
git add src/App.tsx src/App.css
git commit -m "Add product link fetch UI"
```

## Task 4: Deployment Routing and Final Verification

**Files:**
- Modify: `vite.config.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Exclude worktrees from Vitest**

Update `vite.config.ts`:

```ts
test: {
  environment: 'node',
  globals: true,
  exclude: ['node_modules', 'dist', '.worktrees', '.worktrees/**'],
},
```

- [ ] **Step 2: Preserve API routes in Vercel**

Ensure `vercel.json` rewrites only non-API paths:

```json
{
  "source": "/((?!api/).*)",
  "destination": "/"
}
```

- [ ] **Step 3: Final local verification**

Run:

```bash
cmd /c npm test -- --run
cmd /c npm run build
```

Expected: all tests and build pass.

- [ ] **Step 4: Commit routing and verification config**

Run:

```bash
git add vite.config.ts vercel.json
git commit -m "Keep API routes available on Vercel"
```

- [ ] **Step 5: Merge and push**

Merge the feature branch into `main`, then push `main` to `origin`.

## Self-Review

Spec coverage:

- URL fetch button and status UI: Task 3.
- Vercel API endpoint: Task 2.
- Metadata extraction and platform cleanup: Task 1.
- Preserve manual workflow and English generated output: Task 3 uses auto-fill only and leaves listing engine unchanged.
- Vercel API routing: Task 4.

Placeholder scan:

- No task contains unresolved placeholders.

Type consistency:

- `FetchProductData`, `FetchProductResult`, `validateProductUrl`, and `extractProductDataFromHtml` are the shared parser API names used by tests and endpoint.
