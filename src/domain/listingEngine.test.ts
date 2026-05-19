import {
  analyzeProduct,
  exportListingCsv,
  findRiskMatchesInText,
  generateListingPackage,
  type ProductInput,
} from './listingEngine';

const baseInput: ProductInput = {
  sourcePlatform: '1688',
  sourceUrl: 'https://example.com/product',
  productName: 'Oversized Square UV400 Sunglasses',
  frameShape: 'square',
  lensType: 'UV400',
  material: 'TR90',
  targetMarket: 'US',
  businessModel: 'wholesale',
  moq: 120,
  customization: ['logo', 'packaging'],
  notes: 'Lightweight sunglasses for beach, travel, driving, and private label eyewear buyers.',
};

test('detects risky brand and replica wording', () => {
  const analysis = analyzeProduct({
    ...baseInput,
    productName: 'Ray-Ban style replica sunglasses',
    notes: 'designer inspired dupe with logo look',
  });

  expect(analysis.risk.level).toBe('High');
  expect(analysis.risk.matches.map((match) => match.word)).toEqual(
    expect.arrayContaining(['Ray-Ban', 'replica', 'dupe', 'designer inspired']),
  );
});

test('finds risky terms in arbitrary generated text', () => {
  const matches = findRiskMatchesInText('Ray-Ban replica sunglasses with a watermark image');

  expect(matches.map((match) => match.word)).toEqual(['Ray-Ban', 'replica', 'watermark']);
  expect(matches.every((match) => match.level === 'High' || match.level === 'Medium')).toBe(true);
});

test('generates safe listing copy without risky source terms', () => {
  const input = {
    ...baseInput,
    productName: 'Ray-Ban style replica sunglasses',
    notes: 'designer inspired dupe with logo look',
  };
  const listing = generateListingPackage({
    input,
    analysis: analyzeProduct(input),
  });

  const combined = JSON.stringify(listing).toLowerCase();
  expect(combined).not.toContain('ray-ban');
  expect(combined).not.toContain('replica');
  expect(combined).not.toContain('dupe');
  expect(combined).not.toContain('designer inspired');
});

test('produces scores and a test-listing recommendation for a strong wholesale product', () => {
  const analysis = analyzeProduct(baseInput);

  expect(analysis.scores.marketDemand).toBeGreaterThanOrEqual(70);
  expect(analysis.scores.supplyChain).toBeGreaterThanOrEqual(70);
  expect(analysis.recommendation).toMatch(/Priority Listing|Test Listing/);
});

test('exports a valid csv row with escaped commas and quotes', () => {
  const input = { ...baseInput, productName: 'Square "UV400", Sunglasses' };
  const analysis = analyzeProduct(input);
  const listing = generateListingPackage({ input, analysis });
  const csv = exportListingCsv(listing);

  expect(csv.split('\n')).toHaveLength(2);
  expect(csv).toContain('"Square ""UV400"" Sunglasses for Wholesale Eyewear Buyers"');
});
