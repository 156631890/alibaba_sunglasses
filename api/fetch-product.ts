import {
  extractProductDataFromHtml,
  fetchError,
  validateProductUrl,
  type FetchProductResult,
} from '../src/domain/productFetch';
import type { SourcePlatform } from '../src/domain/listingEngine';

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: FetchProductResult | { ok: false; error: { code: string; message: string } }) => void;
  setHeader: (name: string, value: string) => void;
};

type FetchRequestBody = {
  url?: string;
  sourcePlatform?: SourcePlatform;
};

const allowedPlatforms = new Set<SourcePlatform>(['1688', 'Amazon', 'TikTok', 'image/manual', 'other']);

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

  const body = readBody(req.body);
  const url = body.url?.trim() ?? '';
  const sourcePlatform = normalizePlatform(body.sourcePlatform);
  const validation = validateProductUrl(url);

  if (!validation.ok) {
    res.status(400).json(validation);
    return;
  }

  try {
    const html = await fetchHtml(url);
    const result = extractProductDataFromHtml({
      html,
      url,
      sourcePlatform,
    });
    res.status(result.ok ? 200 : 422).json(result);
  } catch {
    res.status(502).json(fetchError('FETCH_FAILED'));
  }
}

function readBody(body: unknown): FetchRequestBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as FetchRequestBody;
    } catch {
      return {};
    }
  }
  return body as FetchRequestBody;
}

function normalizePlatform(platform: unknown): SourcePlatform {
  if (typeof platform === 'string' && allowedPlatforms.has(platform as SourcePlatform)) {
    return platform as SourcePlatform;
  }
  return 'other';
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ProductListingBot/1.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.8,zh-CN;q=0.6',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
