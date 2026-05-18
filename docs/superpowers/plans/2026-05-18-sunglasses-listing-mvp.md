# Sunglasses Listing MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local React + Vite MVP workbench that analyzes sunglasses product inputs, flags risk wording, generates safe listing content, and exports a one-row CSV.

**Architecture:** Keep deterministic business logic in pure TypeScript functions under `src/domain/listingEngine.ts`, with tests in `src/domain/listingEngine.test.ts`. Keep the React UI in `src/App.tsx`, using the pure engine for analysis, generation, copy, and CSV export.

**Tech Stack:** React, Vite, TypeScript, Vitest, CSS.

---

## File Structure

- Create `package.json`: npm scripts and dependencies.
- Create `index.html`: Vite entry shell.
- Create `tsconfig.json`: TypeScript config.
- Create `vite.config.ts`: Vite + Vitest config.
- Create `src/main.tsx`: React entry.
- Create `src/App.tsx`: three-column workbench UI and browser workflow.
- Create `src/App.css`: responsive internal-tool styling.
- Create `src/domain/listingEngine.ts`: pure domain types, risk detection, scoring, generation, CSV helpers.
- Create `src/domain/listingEngine.test.ts`: deterministic engine tests.

## Task 1: Scaffold React + Vite Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`

- [ ] **Step 1: Create project configuration**

Create the npm scripts and config files manually instead of using `npm create vite`, so the scaffold is deterministic.

- [ ] **Step 2: Install dependencies**

Run: `cmd /c npm install --cache .npm-cache`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Verify scaffold**

Run: `cmd /c npm run build`

Expected: build fails only if `src/App.tsx` is missing. This confirms Vite is wired before adding app code.

## Task 2: Domain Engine via TDD

**Files:**
- Create: `src/domain/listingEngine.test.ts`
- Create: `src/domain/listingEngine.ts`

- [ ] **Step 1: Write failing tests**

Test risk detection, safe generation, scoring, and CSV escaping before implementation.

Expected tests:

```ts
import { analyzeProduct, generateListingPackage, exportListingCsv, type ProductInput } from './listingEngine';

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

test('generates safe listing copy without risky source terms', () => {
  const listing = generateListingPackage({
    input: {
      ...baseInput,
      productName: 'Ray-Ban style replica sunglasses',
      notes: 'designer inspired dupe with logo look',
    },
    analysis: analyzeProduct({
      ...baseInput,
      productName: 'Ray-Ban style replica sunglasses',
      notes: 'designer inspired dupe with logo look',
    }),
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
  const analysis = analyzeProduct({ ...baseInput, productName: 'Square "UV400", Sunglasses' });
  const listing = generateListingPackage({ input: { ...baseInput, productName: 'Square "UV400", Sunglasses' }, analysis });
  const csv = exportListingCsv(listing);

  expect(csv.split('\n')).toHaveLength(2);
  expect(csv).toContain('"Square ""UV400"" Sunglasses for Wholesale Eyewear Buyers"');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cmd /c npm test -- --run`

Expected: fail because `listingEngine.ts` does not exist or exported functions are missing.

- [ ] **Step 3: Implement domain engine**

Implement typed product input, risk detection, scoring, safe phrase generation, listing package generation, and CSV export.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `cmd /c npm test -- --run`

Expected: all tests pass.

## Task 3: Three-Column Workbench UI

**Files:**
- Create: `src/App.tsx`
- Create: `src/App.css`

- [ ] **Step 1: Implement app shell**

Add header, left input panel, center analysis panel, and right output panel.

- [ ] **Step 2: Wire workflow state**

The UI must call:

```ts
const nextAnalysis = analyzeProduct(input);
const nextListing = generateListingPackage({ input, analysis: nextAnalysis });
```

- [ ] **Step 3: Add copy and CSV actions**

Use `navigator.clipboard.writeText()` for copy buttons and a Blob download for CSV export.

- [ ] **Step 4: Add responsive styling**

Desktop uses three columns. Mobile stacks panels vertically with no horizontal overflow.

## Task 4: Verification

**Files:**
- Modify as needed: `src/App.tsx`
- Modify as needed: `src/App.css`
- Modify as needed: `src/domain/listingEngine.ts`

- [ ] **Step 1: Run automated tests**

Run: `cmd /c npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `cmd /c npm run build`

Expected: Vite build succeeds.

- [ ] **Step 3: Run dev server**

Run: `cmd /c npm.cmd run dev -- --host 127.0.0.1 --port 3000`

Expected: app available at `http://127.0.0.1:3000`.

- [ ] **Step 4: Browser workflow check**

Open the app, enter or use sample data, click `Analyze Product`, click `Generate Listing`, verify risk matches appear, copy one field, and export CSV.

- [ ] **Step 5: Responsive check**

Verify desktop three-column layout and mobile stacked layout.

## Self-Review

Spec coverage:

- Inputs are covered by Task 3.
- Deterministic risk, scoring, generation, and CSV are covered by Task 2.
- Three-column UI and responsive behavior are covered by Task 3 and Task 4.
- Browser/manual workflow is covered by Task 4.

Placeholder scan:

- No placeholder steps are intentionally left for the implementer.

Type consistency:

- `ProductInput`, `analyzeProduct`, `generateListingPackage`, and `exportListingCsv` are the domain API names used consistently across tests, engine, and UI.
