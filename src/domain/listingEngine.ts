export type SourcePlatform = '1688' | 'Amazon' | 'TikTok' | 'image/manual' | 'other';
export type FrameShape = 'square' | 'aviator' | 'cat eye' | 'round' | 'wraparound' | 'rectangle';
export type LensType = 'UV400' | 'polarized' | 'gradient' | 'mirrored' | 'photochromic' | 'clear';
export type Material = 'PC' | 'TR90' | 'acetate' | 'metal' | 'mixed';
export type TargetMarket = 'US' | 'UK' | 'EU' | 'Australia' | 'Middle East' | 'global';
export type BusinessModel = 'retail' | 'wholesale' | 'OEM' | 'ODM';
export type CustomizationOption = 'logo' | 'packaging' | 'frame color' | 'lens color';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Recommendation = 'Reject' | 'Observe' | 'Test Listing' | 'Priority Listing';

export type ProductInput = {
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  productName: string;
  frameShape: FrameShape;
  lensType: LensType;
  material: Material;
  targetMarket: TargetMarket;
  businessModel: BusinessModel;
  moq: number;
  customization: CustomizationOption[];
  notes: string;
};

export type RiskMatch = {
  word: string;
  type: 'brand' | 'replica' | 'lookalike' | 'celebrity' | 'image';
  replacement: string;
  level: RiskLevel;
};

export type ProductAnalysis = {
  recognition: {
    productType: string;
    frameShape: FrameShape;
    lensType: LensType;
    material: Material;
    targetBuyer: string;
    useScenes: string[];
    customizationPotential: string[];
  };
  scores: {
    marketDemand: number;
    supplyChain: number;
    profitPotential: number;
    contentPotential: number;
    seoPotential: number;
    b2bInquiryPotential: number;
  };
  risk: {
    level: RiskLevel;
    matches: RiskMatch[];
    summary: string;
  };
  keywords: string[];
  recommendation: Recommendation;
};

export type ListingPackage = {
  productTitle: string;
  b2bTitle: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  htmlDescription: string;
  faq: string[];
  imageAltText: string[];
  seoKeywords: string[];
  geoSummary: string;
  schemaJson: string;
  imagePrompts: {
    whiteBackground: string;
    lifestyle: string;
    detail: string;
    customization: string;
    shortVideo: string;
  };
};

const RISK_RULES: Array<RiskMatch & { pattern: RegExp }> = [
  {
    word: 'Ray-Ban',
    pattern: /\bray[-\s]?ban\b/i,
    type: 'brand',
    replacement: 'unbranded eyewear',
    level: 'High',
  },
  {
    word: 'Oakley',
    pattern: /\boakley\b/i,
    type: 'brand',
    replacement: 'sports eyewear',
    level: 'High',
  },
  {
    word: 'Prada',
    pattern: /\bprada\b/i,
    type: 'brand',
    replacement: 'fashion eyewear',
    level: 'High',
  },
  {
    word: 'Gucci',
    pattern: /\bgucci\b/i,
    type: 'brand',
    replacement: 'fashion eyewear',
    level: 'High',
  },
  {
    word: 'replica',
    pattern: /\breplica\b/i,
    type: 'replica',
    replacement: 'original unbranded',
    level: 'High',
  },
  {
    word: 'dupe',
    pattern: /\bdupe\b/i,
    type: 'replica',
    replacement: 'value-focused',
    level: 'High',
  },
  {
    word: 'counterfeit',
    pattern: /\bcounterfeit\b/i,
    type: 'replica',
    replacement: 'generic',
    level: 'High',
  },
  {
    word: 'designer inspired',
    pattern: /\bdesigner[\s-]+inspired\b/i,
    type: 'lookalike',
    replacement: 'trend-led',
    level: 'High',
  },
  {
    word: 'same style',
    pattern: /\bsame[\s-]+style\b/i,
    type: 'lookalike',
    replacement: 'similar use case',
    level: 'Medium',
  },
  {
    word: 'celebrity',
    pattern: /\bcelebrity\b/i,
    type: 'celebrity',
    replacement: 'lifestyle',
    level: 'Medium',
  },
  {
    word: 'watermark',
    pattern: /\bwatermark\b/i,
    type: 'image',
    replacement: 'clean product image',
    level: 'Medium',
  },
];

const SCENE_KEYWORDS = ['beach', 'driving', 'travel', 'cycling', 'outdoor', 'streetwear', 'daily'];
const USEFUL_SEO_TERMS = ['uv400', 'polarized', 'wholesale', 'custom', 'private label', 'sunglasses'];

export function analyzeProduct(input: ProductInput): ProductAnalysis {
  const risk = checkRisk(input);
  const useScenes = extractUseScenes(input.notes);
  const scores = {
    marketDemand: scoreMarketDemand(input, useScenes, risk.level),
    supplyChain: scoreSupplyChain(input),
    profitPotential: scoreProfitPotential(input),
    contentPotential: scoreContentPotential(input, useScenes),
    seoPotential: scoreSeoPotential(input),
    b2bInquiryPotential: scoreB2bInquiryPotential(input),
  };

  return {
    recognition: {
      productType: 'sunglasses',
      frameShape: input.frameShape,
      lensType: input.lensType,
      material: input.material,
      targetBuyer: getTargetBuyer(input.businessModel),
      useScenes,
      customizationPotential: input.customization,
    },
    scores,
    risk,
    keywords: buildKeywords(input),
    recommendation: getRecommendation(scores, risk.level),
  };
}

export function generateListingPackage({
  input,
  analysis,
}: {
  input: ProductInput;
  analysis: ProductAnalysis;
}): ListingPackage {
  const titleBase = getSafeProductTitle(input);
  const buyer = getBuyerPhrase(input.businessModel);
  const scene = analysis.recognition.useScenes[0] ?? 'daily outdoor use';
  const customization = input.customization.length
    ? input.customization.join(', ')
    : 'basic product customization';

  const productTitle = `${titleBase} for ${buyer}`;
  const b2bTitle = `Custom ${titleBase} for Private Label Eyewear Programs`;
  const metaDescription = `${titleBase} made for ${buyer.toLowerCase()}, ${scene}, and international sunglasses catalogs. Unbranded, practical, and ready for OEM or wholesale listing workflows.`;
  const htmlDescription = [
    '<h2>Product Overview</h2>',
    `<p>These unbranded ${input.frameShape} ${input.lensType} sunglasses are designed for ${buyer.toLowerCase()} seeking reliable eyewear products for ${scene}.</p>`,
    '<h2>Key Features</h2>',
    '<ul>',
    `<li><strong>${input.lensType} Lens Option:</strong> Suitable for everyday outdoor product assortments.</li>`,
    `<li><strong>${input.material} Frame:</strong> Lightweight construction for comfortable commercial eyewear collections.</li>`,
    `<li><strong>Customization Support:</strong> Available options include ${customization}.</li>`,
    '</ul>',
  ].join('');

  return {
    productTitle,
    b2bTitle,
    slug: slugify(productTitle),
    metaTitle: productTitle.slice(0, 60),
    metaDescription: metaDescription.slice(0, 156),
    htmlDescription,
    faq: [
      `What market is this ${input.frameShape} sunglasses style suitable for? ${marketLabel(input.targetMarket)} buyers looking for unbranded ${input.lensType} eyewear.`,
      `Can this product support customization? Yes. Available options include ${customization}.`,
      `Is this listing safe to use with third-party brands? The generated copy avoids third-party brand names and lookalike wording.`,
    ],
    imageAltText: [
      `${titleBase} on white background`,
      `${input.frameShape} ${input.lensType} sunglasses lifestyle product image`,
      `customizable unbranded sunglasses detail view`,
    ],
    seoKeywords: analysis.keywords,
    geoSummary: `${titleBase} for international eyewear buyers, private label retailers, and wholesale sunglasses catalogs targeting ${marketLabel(input.targetMarket)}.`,
    schemaJson: JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productTitle,
        category: 'Sunglasses',
        material: input.material,
        audience: buyer,
        description: metaDescription,
      },
      null,
      2,
    ),
    imagePrompts: {
      whiteBackground: `Create a clean e-commerce product image of unbranded ${titleBase.toLowerCase()} on a pure white background. No logo, no brand name, no text, no watermark.`,
      lifestyle: `Create a realistic lifestyle image of unbranded ${titleBase.toLowerCase()} used for ${scene}. Keep the frame and lens realistic. No logo, no brand name, no text, no watermark.`,
      detail: `Create a close-up product detail image showing the ${input.material} frame and ${input.lensType} lenses of unbranded ${input.frameShape} sunglasses. No logo, no brand name, no text, no watermark.`,
      customization: `Create a B2B customization concept image for unbranded sunglasses showing ${customization}. No third-party brands, no logo imitation, no watermark.`,
      shortVideo: `Produce a 12-second product video script: white background hero shot, lens detail, frame detail, lifestyle scene, customization options, final clean product lineup. Keep all wording unbranded.`,
    },
  };
}

export function exportListingCsv(listing: ListingPackage): string {
  const headers = [
    'Product Title',
    'B2B Title',
    'URL Slug',
    'Meta Title',
    'Meta Description',
    'HTML Description',
    'FAQ',
    'Image Alt Text',
    'SEO Keywords',
    'GEO Summary',
    'JSON-LD',
    'White Background Prompt',
    'Lifestyle Prompt',
    'Detail Prompt',
    'Customization Prompt',
    'Short Video Script',
  ];
  const row = [
    listing.productTitle,
    listing.b2bTitle,
    listing.slug,
    listing.metaTitle,
    listing.metaDescription,
    listing.htmlDescription,
    listing.faq.join(' | '),
    listing.imageAltText.join(' | '),
    listing.seoKeywords.join(', '),
    listing.geoSummary,
    listing.schemaJson,
    listing.imagePrompts.whiteBackground,
    listing.imagePrompts.lifestyle,
    listing.imagePrompts.detail,
    listing.imagePrompts.customization,
    listing.imagePrompts.shortVideo,
  ];

  return `${headers.map(csvEscape).join(',')}\n${row.map(csvEscape).join(',')}`;
}

function checkRisk(input: ProductInput): ProductAnalysis['risk'] {
  const text = `${input.productName} ${input.notes}`;
  const matches = RISK_RULES.filter((rule) => rule.pattern.test(text)).map(({ pattern: _pattern, ...match }) => match);
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

function scoreMarketDemand(input: ProductInput, useScenes: string[], riskLevel: RiskLevel): number {
  let score = 60;
  if (['square', 'aviator', 'cat eye', 'wraparound'].includes(input.frameShape)) score += 8;
  if (['UV400', 'polarized', 'gradient'].includes(input.lensType)) score += 6;
  if (input.productName.toLowerCase().includes('sunglasses')) score += 4;
  score += Math.min(useScenes.length * 3, 12);
  if (riskLevel === 'Medium') score -= 8;
  if (riskLevel === 'High') score -= 18;
  return clamp(score);
}

function scoreSupplyChain(input: ProductInput): number {
  let score = 55;
  if (input.sourcePlatform === '1688') score += 8;
  if (input.moq > 0 && input.moq <= 300) score += 9;
  if (input.moq > 300) score += 5;
  score += Math.min(input.customization.length * 6, 18);
  if (['wholesale', 'OEM', 'ODM'].includes(input.businessModel)) score += 8;
  return clamp(score);
}

function scoreProfitPotential(input: ProductInput): number {
  let score = 58;
  if (['wholesale', 'OEM', 'ODM'].includes(input.businessModel)) score += 12;
  if (input.customization.includes('packaging')) score += 7;
  if (input.customization.includes('logo')) score += 5;
  if (['TR90', 'acetate', 'metal'].includes(input.material)) score += 5;
  return clamp(score);
}

function scoreContentPotential(input: ProductInput, useScenes: string[]): number {
  let score = 56 + Math.min(useScenes.length * 6, 24);
  if (input.notes.length > 80) score += 8;
  if (['mirrored', 'gradient', 'polarized'].includes(input.lensType)) score += 5;
  return clamp(score);
}

function scoreSeoPotential(input: ProductInput): number {
  const text = `${input.productName} ${input.notes}`.toLowerCase();
  const hits = USEFUL_SEO_TERMS.filter((term) => text.includes(term)).length;
  return clamp(58 + hits * 7 + (input.frameShape ? 5 : 0) + (input.lensType ? 5 : 0));
}

function scoreB2bInquiryPotential(input: ProductInput): number {
  let score = 55;
  if (['wholesale', 'OEM', 'ODM'].includes(input.businessModel)) score += 14;
  score += Math.min(input.customization.length * 7, 21);
  if (input.moq > 0) score += 5;
  return clamp(score);
}

function getRecommendation(scores: ProductAnalysis['scores'], riskLevel: RiskLevel): Recommendation {
  if (riskLevel === 'High') return 'Reject';
  const average =
    (scores.marketDemand +
      scores.supplyChain +
      scores.profitPotential +
      scores.contentPotential +
      scores.seoPotential +
      scores.b2bInquiryPotential) /
    6;

  if (average >= 80 && riskLevel === 'Low') return 'Priority Listing';
  if (average >= 65) return 'Test Listing';
  return riskLevel === 'Medium' ? 'Observe' : 'Test Listing';
}

function extractUseScenes(notes: string): string[] {
  const lower = notes.toLowerCase();
  const scenes = SCENE_KEYWORDS.filter((scene) => lower.includes(scene));
  return scenes.length ? scenes : ['daily outdoor use'];
}

function buildKeywords(input: ProductInput): string[] {
  return [
    `${input.frameShape} sunglasses`,
    `${input.lensType} sunglasses`,
    `${input.material} sunglasses`,
    `${input.businessModel} eyewear`,
    'unbranded sunglasses',
    'private label eyewear',
  ];
}

function getSafeProductTitle(input: ProductInput): string {
  const sanitized = sanitizeRiskyText(input.productName)
    .replace(/[,\s]+/g, ' ')
    .replace(/\bstyle\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.toLowerCase().includes('sunglasses')) return toTitleCase(sanitized);
  return toTitleCase(`${input.frameShape} ${input.lensType} Sunglasses`);
}

function sanitizeRiskyText(value: string): string {
  return RISK_RULES.reduce((text, rule) => text.replace(rule.pattern, ''), value);
}

function getTargetBuyer(model: BusinessModel): string {
  if (model === 'retail') return 'Retailer';
  if (model === 'wholesale') return 'Wholesaler';
  if (model === 'OEM') return 'Private Label Brand';
  return 'Eyewear Product Developer';
}

function getBuyerPhrase(model: BusinessModel): string {
  if (model === 'retail') return 'Retail Eyewear Stores';
  if (model === 'wholesale') return 'Wholesale Eyewear Buyers';
  if (model === 'OEM') return 'Private Label Eyewear Buyers';
  return 'ODM Eyewear Development Teams';
}

function marketLabel(market: TargetMarket): string {
  if (market === 'global') return 'global';
  return market;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (upper.includes('UV400')) return part.replace(/uv400/i, 'UV400');
      if (upper.includes('TR90')) return part.replace(/tr90/i, 'TR90');
      if (upper === 'OEM' || upper === 'ODM') return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function csvEscape(value: string): string {
  return `"${String(value).replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
