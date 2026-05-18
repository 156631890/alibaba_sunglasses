# Sunglasses Listing MVP Design

Date: 2026-05-18

## Goal

Build a local MVP web tool for creating SEO-ready sunglasses product listings for an international website. The first version must help a non-technical user move from product information to a usable listing package without needing to chat with an agent.

The MVP deliberately does not scrape 1688, Amazon, or TikTok, and it does not call an AI API. It uses form inputs, deterministic scoring rules, risk-word checks, and listing templates. This makes the first version fast, stable, cheap to run, and easy to verify.

## Product Shape

The approved interface is a three-column workbench:

1. Input panel
2. Analysis panel
3. Generated listing panel

This is preferred over a step-by-step wizard because the target user will repeatedly review, edit, copy, and export listing content. A workbench keeps inputs, risk signals, and outputs visible at the same time.

## MVP Scope

In scope:

- Product input form
- Product recognition summary from supplied fields
- Product scoring
- IP and wording risk check
- Keyword suggestions
- SEO title, B2B title, slug, meta fields
- HTML product description
- FAQ
- Image prompts
- Image alt text
- JSON-LD Product schema
- One-row CSV export
- Copy buttons for key generated fields
- Responsive layout for desktop and mobile

Out of scope:

- Live scraping
- Login and accounts
- Database persistence
- Batch processing
- Real AI generation
- Image upload processing
- Shopify or WooCommerce-specific full import mapping

## Inputs

The left panel contains:

- Source platform: 1688, Amazon, TikTok, image/manual, other
- Product URL
- Product name
- Frame shape: square, aviator, cat eye, round, wraparound, rectangle
- Lens type: UV400, polarized, gradient, mirrored, photochromic, clear
- Material: PC, TR90, acetate, metal, mixed
- Target market: US, UK, EU, Australia, Middle East, global
- Business model: retail, wholesale, OEM, ODM
- MOQ
- Customization options: logo, packaging, frame color, lens color
- Product notes and selling points

## Analysis Rules

The scoring model is deterministic.

Market demand starts from a neutral baseline and increases for broadly marketable shapes and common use cases. Supply chain score increases when MOQ and customization options support B2B use. Profit potential increases for OEM, ODM, and wholesale models. Content potential increases when notes contain use scenes, colors, or styling cues. SEO potential increases when product name and notes include useful generic keywords. IP risk reduces the final recommendation.

Risk checks look for risky terms including:

- Third-party brand names commonly associated with eyewear
- Replica, dupe, counterfeit, fake, same style, inspired
- Celebrity or movie references
- Logo or watermark warnings in notes

The tool reports the matched risky words and safer generic replacements. High-risk results are still shown, but the listing output must avoid repeating the risky wording.

## Generated Output

The right panel generates:

- SEO title
- B2B title
- URL slug
- Meta title
- Meta description
- HTML description
- FAQ
- Image alt text
- Keyword list
- GEO summary
- JSON-LD Product schema
- Image prompts for white background, lifestyle, detail, customization, and short video

Generated copy must use safe, generic, unbranded wording. It must not use brand names, "dupe", "replica", "designer inspired", or similar phrases.

## Workflow

1. User enters product information.
2. User clicks `Analyze Product`.
3. Analysis panel shows recognition, scores, risk level, matched terms, and keyword suggestions.
4. User clicks `Generate Listing`.
5. Generated listing panel fills with ready-to-copy content.
6. User can copy fields or click `Export CSV`.

## UI Direction

The interface should feel like a practical internal ecommerce operations tool, not a marketing landing page.

Desktop layout:

- Header with product name and primary actions
- Three columns across the viewport
- Left input column around 30%
- Middle analysis column around 30%
- Right output column around 40%

Mobile layout:

- Columns stack vertically
- Input appears first, analysis second, generated output third
- Buttons and text areas remain usable without horizontal scrolling

Visual style:

- Neutral background
- White or very light panels
- Clear borders
- Compact controls
- Small radius, no decorative card nesting
- Green/yellow/red risk states
- Icons only where they clarify actions

## Technical Design

Use React + Vite for a new local app.

Recommended modules:

- `src/domain/listingEngine.ts`: pure functions for analysis, risk checks, generation, CSV creation
- `src/domain/listingEngine.test.ts`: tests for the deterministic behavior
- `src/App.tsx`: screen composition and UI state
- `src/App.css`: app-level styling
- `src/main.tsx`: React entry

The domain engine should be testable without the browser. UI code should call the pure functions and display their results.

## Testing

Automated tests:

- Risk words are detected and assigned the expected level.
- Safe titles do not include risky source words.
- Scores and recommendation are generated from product inputs.
- CSV export includes generated listing fields and escapes commas/quotes correctly.

Manual/browser verification:

- Fill a product and analyze it.
- Generate listing output.
- Copy one generated field.
- Export CSV.
- Verify high-risk words are flagged.
- Check desktop and mobile layouts.

## Acceptance Criteria

- The app runs locally.
- A user can complete the full MVP workflow without external services.
- Risk detection is visible and affects the recommendation.
- Generated listing content is safe, generic, and usable for a sunglasses international site.
- CSV export downloads a valid single-row CSV.
- Desktop shows the approved three-column workbench.
- Mobile stacks cleanly with no horizontal overflow.
