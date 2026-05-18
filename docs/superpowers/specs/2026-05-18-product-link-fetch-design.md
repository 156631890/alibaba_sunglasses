# Product Link Fetch Design

Date: 2026-05-18

## Goal

Add a product-link fetch step to the sunglasses listing MVP so users can paste a 1688, Amazon, TikTok, or generic product URL and automatically populate useful form fields before analysis.

The feature is best-effort. It must improve workflow speed without pretending that every commercial platform page can be reliably scraped. When a platform blocks access, requires login, or returns unusable HTML, the app must show a clear Chinese error and keep the manual form usable.

## Scope

In scope:

- Add a `抓取链接信息` button near the product URL field.
- Add a Vercel serverless function at `api/fetch-product.ts`.
- Fetch page HTML from the provided URL.
- Extract title, description, Open Graph/Twitter metadata, image URL candidates, and short visible text.
- Add platform-specific cleanup for 1688, Amazon, and TikTok.
- Auto-fill `productName` and `notes` from fetched data.
- Keep generated listing output in English.
- Show fetch status, source confidence, and failure messages in Chinese.
- Preserve manual editing after fetch.

Out of scope:

- Guaranteed scraping for blocked pages.
- Login/cookie-based scraping.
- Browser automation scraping from Vercel.
- TikTok comment extraction.
- Amazon review/rank extraction.
- 1688 price table extraction.
- Image upload vision analysis.
- Batch URL processing.

## User Flow

1. User selects source platform.
2. User pastes a product URL.
3. User clicks `抓取链接信息`.
4. The app calls `POST /api/fetch-product` with `{ url, sourcePlatform }`.
5. The API returns normalized product data or a structured error.
6. On success, the app fills:
   - Product name
   - Product notes
   - Source URL
   - Source platform
7. User reviews or edits fields.
8. User clicks `分析产品` or `生成上架内容`.

## API Contract

Request:

```json
{
  "url": "https://example.com/product",
  "sourcePlatform": "1688"
}
```

Success response:

```json
{
  "ok": true,
  "data": {
    "title": "Product title",
    "description": "Short product description",
    "image": "https://example.com/image.jpg",
    "platform": "1688",
    "confidence": "medium",
    "notes": "English notes assembled from fetched page metadata."
  }
}
```

Failure response:

```json
{
  "ok": false,
  "error": {
    "code": "FETCH_BLOCKED",
    "message": "这个链接暂时无法自动读取，请手动填写产品名称和补充信息。"
  }
}
```

## Extraction Rules

Generic extraction priority:

1. `og:title`
2. `twitter:title`
3. `<title>`
4. First meaningful `h1`

Description priority:

1. `og:description`
2. `twitter:description`
3. `meta[name="description"]`
4. Short visible body text

Image priority:

1. `og:image`
2. `twitter:image`
3. First absolute image URL in HTML

Platform normalization:

- `1688`: remove repeated seller/store suffixes and Alibaba chrome text when possible.
- `Amazon`: remove marketplace chrome, star-rating fragments, and navigation words when possible.
- `TikTok`: prefer title/description metadata and cover image; do not attempt comments or metrics.
- `other`: use generic metadata only.

## Error Handling

The API should return structured errors:

- `INVALID_URL`: URL is missing or invalid.
- `UNSUPPORTED_PROTOCOL`: URL is not HTTP or HTTPS.
- `FETCH_FAILED`: network or timeout failure.
- `FETCH_BLOCKED`: platform returned a blocked, login, captcha, or empty page.
- `NO_PRODUCT_DATA`: fetch succeeded but no usable product text was found.

The UI should not clear existing manually entered values on failure.

## Deployment Notes

The project is a Vite static app with Vercel functions. `vercel.json` must continue to:

- Build the frontend with `npm run build`.
- Serve static output from `dist`.
- Avoid rewriting `/api/*` requests to `/`.
- Rewrite non-API frontend routes to `/` for SPA behavior.

## Testing

Automated tests:

- URL validation rejects invalid URLs.
- Metadata extraction prefers Open Graph values over document title.
- Fetched data maps into product name and notes without changing generated listing language.
- Fetch failure keeps form state intact.

Manual verification:

- Paste a normal product/article URL and confirm fields populate.
- Paste an invalid URL and confirm Chinese error message appears.
- Paste a blocked commercial platform URL and confirm the app stays usable.
- Run `npm test -- --run`.
- Run `npm run build`.

## Acceptance Criteria

- A user can click `抓取链接信息` after pasting a URL.
- On success, product name and notes are auto-filled.
- On failure, the user sees a clear Chinese message and can continue manually.
- Existing analysis and generation still work.
- Vercel build works with both static Vite output and `/api/fetch-product`.
