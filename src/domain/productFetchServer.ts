import type { SourcePlatform } from './listingEngine';
import {
  extractProductDataFromHtml,
  fetchError,
  validateProductUrl,
  type FetchProductResult,
} from './productFetch';

export type FetchRequestBody = {
  url?: unknown;
  sourcePlatform?: unknown;
};

export type FetchProductServerResponse = {
  status: number;
  result: FetchProductResult;
};

const allowedPlatforms = new Set<SourcePlatform>(['1688', 'Amazon', 'TikTok', 'image/manual', 'other']);

export async function fetchProductFromUrl(body: unknown): Promise<FetchProductServerResponse> {
  const requestBody = readFetchRequestBody(body);
  const url = typeof requestBody.url === 'string' ? requestBody.url.trim() : '';
  const sourcePlatform = normalizeFetchPlatform(requestBody.sourcePlatform);
  const validation = validateProductUrl(url);

  if (!validation.ok) {
    return { status: 400, result: validation };
  }

  try {
    const html = await fetchHtml(url);
    const result = extractProductDataFromHtml({
      html,
      url,
      sourcePlatform,
    });

    return {
      status: result.ok ? 200 : 422,
      result,
    };
  } catch {
    return {
      status: 502,
      result: fetchError('FETCH_FAILED'),
    };
  }
}

export function readFetchRequestBody(body: unknown): FetchRequestBody {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(body) ? body : {};
}

export function normalizeFetchPlatform(platform: unknown): SourcePlatform {
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

function isRecord(value: unknown): value is FetchRequestBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
