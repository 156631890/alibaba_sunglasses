import { fetchProductFromUrl } from '../src/domain/productFetchServer';
import type { FetchProductResult } from '../src/domain/productFetch';

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: FetchProductResult | { ok: false; error: { code: string; message: string } }) => void;
  setHeader: (name: string, value: string) => void;
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

  const { status, result } = await fetchProductFromUrl(req.body);
  res.status(status).json(result);
}
