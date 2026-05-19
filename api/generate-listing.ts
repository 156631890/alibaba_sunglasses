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
