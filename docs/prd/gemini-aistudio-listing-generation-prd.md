# Gemini AI Studio Listing Generation PRD

Date: 2026-05-19

## 1. Product Name

太阳镜国际站 Gemini 英文上架内容生成器

## 2. Background

当前太阳镜国际站上品工具已经可以通过表单、产品链接抓取、风险词检查和模板规则生成英文上架内容。下一步需要在 Google AI Studio 中使用 Gemini 3.1 生成更自然、更完整、更适合国际站的英文产品内容，同时保持现有工具的安全约束：

- 页面标题、按钮、状态提示保持中文。
- 生成出来的上架内容必须是英文。
- 不出现第三方品牌、仿牌、复刻、同款、明星同款、平台来源词等高风险表达。
- 输出必须是结构化 JSON，方便前端直接替换现有 `ListingPackage`。

## 3. Goal

在 Google AI Studio 中配置一个 Gemini 生成任务，输入太阳镜产品信息、风险分析和模板兜底内容，输出一份完整、英文、安全、可直接用于独立站或国际站的上架内容包。

成功后，输出结果可以直接用于：

- SEO 标题
- B2B 标题
- Meta 描述
- HTML 产品描述
- FAQ
- 图片 Alt
- SEO 关键词
- GEO 摘要
- JSON-LD Product schema
- 图片生成提示词
- 短视频脚本

## 4. Target User

主要用户：

- 国际站运营
- 外贸独立站运营
- 太阳镜工厂业务员
- B2B 产品上架人员

用户特点：

- 需要快速把 1688、Amazon、TikTok、图片或手动资料转成英文上架内容。
- 不希望手动写 SEO 文案。
- 不希望生成内容带有侵权、仿牌或平台痕迹。
- 需要结果可以复制、导出 CSV、交给网站后台使用。

## 5. Recommended Model

优先使用：

```text
gemini-3.1-flash-lite
```

原因：

- 适合高频、轻量、结构化生成任务。
- 成本和延迟更适合批量产品上架。
- 支持结构化输出。

可选高质量模型：

```text
gemini-3.1-pro-preview
```

适合：

- 高价值产品
- 更复杂的产品资料
- 需要更强推理和更高质量文案时

不建议默认使用 Pro Preview 处理所有普通 SKU，因为成本、延迟和 preview 稳定性都不如轻量模型适合批量运营。

## 6. API Key Requirement

必须使用 Google AI Studio / Gemini API 的有效 API key。

环境变量：

```text
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-3.1-flash-lite
```

注意：

- `GEMINI_API_KEY` 应来自 Google AI Studio。
- key 通常以 `AIza` 开头。
- Gemini Advanced 订阅、第三方中转 key、OpenRouter key、Vertex AI OAuth 凭证不能直接当作这个接口的 `GEMINI_API_KEY` 使用。
- API key 只能放后端环境变量，不能写进前端代码，不能提交到 Git。

## 7. Input Data

Google AI Studio 中的输入应包含 3 部分：

### 7.1 Product Input

```json
{
  "sourcePlatform": "1688",
  "sourceUrl": "https://example.com/product",
  "productName": "Square UV400 Sunglasses",
  "frameShape": "square",
  "lensType": "UV400",
  "material": "PC",
  "targetMarket": "US",
  "businessModel": "wholesale",
  "moq": 200,
  "customization": ["logo", "packaging"],
  "notes": "For beach, driving, travel, and daily outdoor use."
}
```

### 7.2 Product Analysis

```json
{
  "recognition": {
    "productType": "sunglasses",
    "frameShape": "square",
    "lensType": "UV400",
    "material": "PC",
    "targetBuyer": "Wholesaler",
    "useScenes": ["beach", "driving", "travel"],
    "customizationPotential": ["logo", "packaging"]
  },
  "scores": {
    "marketDemand": 80,
    "supplyChain": 82,
    "profitPotential": 78,
    "contentPotential": 76,
    "seoPotential": 75,
    "b2bInquiryPotential": 83
  },
  "risk": {
    "level": "Low",
    "matches": [],
    "summary": "No risky brand, replica, or lookalike wording detected."
  },
  "keywords": [
    "square sunglasses",
    "UV400 sunglasses",
    "PC sunglasses",
    "wholesale eyewear",
    "unbranded sunglasses",
    "private label eyewear"
  ],
  "recommendation": "Test Listing"
}
```

### 7.3 Fallback Listing

```json
{
  "productTitle": "Square UV400 Sunglasses for Wholesale Eyewear Buyers",
  "b2bTitle": "Custom Square UV400 Sunglasses for Private Label Eyewear Programs",
  "slug": "square-uv400-sunglasses-for-wholesale-eyewear-buyers",
  "metaTitle": "Square UV400 Sunglasses for Wholesale Buyers",
  "metaDescription": "Square UV400 sunglasses made for wholesale buyers, travel, and international catalogs.",
  "htmlDescription": "<h2>Product Overview</h2><p>Unbranded square UV400 sunglasses for wholesale eyewear buyers.</p>",
  "faq": [
    "Can these sunglasses support customization? Yes, logo and packaging customization are available."
  ],
  "imageAltText": [
    "square UV400 sunglasses on white background"
  ],
  "seoKeywords": [
    "square sunglasses",
    "UV400 sunglasses",
    "wholesale eyewear"
  ],
  "geoSummary": "Square UV400 sunglasses for international eyewear buyers and wholesale sunglasses catalogs.",
  "schemaJson": "{\"@context\":\"https://schema.org\",\"@type\":\"Product\",\"name\":\"Square UV400 Sunglasses for Wholesale Eyewear Buyers\"}",
  "imagePrompts": {
    "whiteBackground": "Create a clean e-commerce product image of unbranded square UV400 sunglasses on a pure white background. No logo, no brand name, no text, no watermark.",
    "lifestyle": "Create a realistic lifestyle image of unbranded square UV400 sunglasses used for beach and driving scenes. No logo, no brand name, no text, no watermark.",
    "detail": "Create a close-up product detail image showing the PC frame and UV400 lenses of unbranded square sunglasses. No logo, no brand name, no text, no watermark.",
    "customization": "Create a B2B customization concept image for unbranded sunglasses showing logo placement and packaging options. No third-party brands, no logo imitation, no watermark.",
    "shortVideo": "Produce a 12-second product video script: white background hero shot, lens detail, frame detail, lifestyle scene, customization options, final clean product lineup. Keep all wording unbranded."
  }
}
```

## 8. Output Requirements

Gemini 必须只输出 JSON，不输出 Markdown，不输出解释。

输出结构必须完全匹配：

```json
{
  "productTitle": "",
  "b2bTitle": "",
  "slug": "",
  "metaTitle": "",
  "metaDescription": "",
  "htmlDescription": "",
  "faq": [],
  "imageAltText": [],
  "seoKeywords": [],
  "geoSummary": "",
  "schemaJson": "",
  "imagePrompts": {
    "whiteBackground": "",
    "lifestyle": "",
    "detail": "",
    "customization": "",
    "shortVideo": ""
  }
}
```

字段要求：

- `productTitle`: 英文 SEO 产品标题，适合网页 H1 或产品标题。
- `b2bTitle`: 英文 B2B 采购导向标题，强调批发、OEM、ODM、private label 等安全表达。
- `slug`: 小写英文 URL slug，只能包含字母、数字和连字符。
- `metaTitle`: 60 字符以内。
- `metaDescription`: 156 字符以内。
- `htmlDescription`: 英文 HTML，允许 `<h2>`, `<p>`, `<ul>`, `<li>`, `<strong>`。
- `faq`: 3 到 5 条英文 FAQ。
- `imageAltText`: 3 到 5 条英文图片 Alt。
- `seoKeywords`: 6 到 12 个英文关键词。
- `geoSummary`: 一段适合生成式搜索引用的英文摘要。
- `schemaJson`: 合法 JSON 字符串，内容为 Schema.org Product。
- `imagePrompts`: 5 条英文图片/视频提示词。

## 9. Safety Rules

Gemini 输出中禁止出现：

- 第三方品牌名，例如 Ray-Ban、Oakley、Prada、Gucci。
- 仿牌词，例如 replica、dupe、counterfeit、fake。
- 高相似表达，例如 designer inspired、same style、lookalike。
- 明星或名人背书，例如 celebrity、KOL 同款。
- 平台来源词，例如 1688、Amazon、TikTok。
- 水印、盗图、logo imitation 等风险表达。

允许用于负向约束的安全表达：

- No logo
- No brand name
- No watermark
- No third-party brands
- Keep wording unbranded

## 10. Google AI Studio Prompt

把下面内容复制到 Google AI Studio。把 `{{PRODUCT_INPUT}}`、`{{ANALYSIS}}`、`{{FALLBACK_LISTING}}` 替换成真实 JSON。

```text
You are generating English ecommerce and B2B listing content for an international sunglasses website.

Return valid JSON only.
Do not wrap the response in Markdown fences.
Do not add explanations.
Do not output Chinese in any listing field.

The user interface is Chinese, but every generated listing field must be English.

You must preserve safe facts from the input:
- product type
- frame shape
- lens type
- material
- target market
- business model
- MOQ
- customization options
- use scenes
- safe SEO keywords

You must avoid:
- third-party brand names
- replica, dupe, counterfeit, fake, designer inspired, same style, lookalike wording
- celebrity references
- platform names such as 1688, Amazon, TikTok
- unsupported claims
- trademark-sensitive wording

Safe negative constraints are allowed in image prompts:
- No logo
- No brand name
- No watermark
- No third-party brands

Use this exact JSON structure:
{
  "productTitle": "",
  "b2bTitle": "",
  "slug": "",
  "metaTitle": "",
  "metaDescription": "",
  "htmlDescription": "",
  "faq": [],
  "imageAltText": [],
  "seoKeywords": [],
  "geoSummary": "",
  "schemaJson": "",
  "imagePrompts": {
    "whiteBackground": "",
    "lifestyle": "",
    "detail": "",
    "customization": "",
    "shortVideo": ""
  }
}

Hard limits:
- metaTitle must be 60 characters or fewer.
- metaDescription must be 156 characters or fewer.
- faq must contain 3 to 5 English questions with answers.
- imageAltText must contain 3 to 5 English alt text strings.
- seoKeywords must contain 6 to 12 English keyword phrases.
- schemaJson must be a valid JSON string for Schema.org Product.
- slug must be lowercase and use hyphens only.

PRODUCT_INPUT:
{{PRODUCT_INPUT}}

ANALYSIS:
{{ANALYSIS}}

FALLBACK_LISTING:
{{FALLBACK_LISTING}}
```

## 11. Example Expected Output

```json
{
  "productTitle": "Square UV400 Sunglasses for Wholesale Eyewear Buyers",
  "b2bTitle": "Custom Square UV400 Sunglasses for Private Label Eyewear Programs",
  "slug": "square-uv400-sunglasses-wholesale-eyewear-buyers",
  "metaTitle": "Square UV400 Sunglasses for Wholesale Buyers",
  "metaDescription": "Wholesale square UV400 sunglasses for private label eyewear catalogs, travel collections, and custom packaging programs.",
  "htmlDescription": "<h2>Product Overview</h2><p>These unbranded square UV400 sunglasses are designed for wholesale eyewear buyers building travel, beach, and daily outdoor collections.</p><h2>Key Features</h2><ul><li><strong>UV400 Lens Option:</strong> Suitable for everyday outdoor eyewear assortments.</li><li><strong>Lightweight PC Frame:</strong> Practical for commercial eyewear collections and seasonal launches.</li><li><strong>Customization Support:</strong> Available options include logo placement and packaging programs.</li></ul>",
  "faq": [
    "Can these sunglasses support private label customization? Yes, logo placement and packaging customization can be prepared for wholesale programs.",
    "What market is this square sunglasses style suitable for? It is suitable for US-focused travel, beach, and daily outdoor eyewear collections.",
    "Are these sunglasses intended for branded resale? The content is written for unbranded or private label eyewear programs without third-party brand references."
  ],
  "imageAltText": [
    "square UV400 sunglasses on white background",
    "unbranded square sunglasses for travel and beach collections",
    "customizable PC frame sunglasses with UV400 lenses"
  ],
  "seoKeywords": [
    "square sunglasses",
    "UV400 sunglasses",
    "wholesale eyewear",
    "private label sunglasses",
    "custom sunglasses",
    "PC frame sunglasses",
    "travel sunglasses",
    "beach sunglasses"
  ],
  "geoSummary": "Square UV400 sunglasses for international eyewear buyers, private label retailers, and wholesale catalogs focused on travel, beach, and daily outdoor use.",
  "schemaJson": "{\"@context\":\"https://schema.org\",\"@type\":\"Product\",\"name\":\"Square UV400 Sunglasses for Wholesale Eyewear Buyers\",\"category\":\"Sunglasses\",\"material\":\"PC\",\"audience\":\"Wholesale Eyewear Buyers\",\"description\":\"Wholesale square UV400 sunglasses for private label eyewear catalogs and international outdoor accessory collections.\"}",
  "imagePrompts": {
    "whiteBackground": "Create a clean e-commerce product image of unbranded square UV400 sunglasses on a pure white background. No logo, no brand name, no text, no watermark.",
    "lifestyle": "Create a realistic lifestyle image of unbranded square UV400 sunglasses used in a sunny beach or travel scene. No logo, no brand name, no text, no watermark.",
    "detail": "Create a close-up product detail image showing the PC frame and UV400 lenses of unbranded square sunglasses. No logo, no brand name, no text, no watermark.",
    "customization": "Create a B2B customization concept image for unbranded sunglasses showing safe logo placement and packaging options. No third-party brands, no logo imitation, no watermark.",
    "shortVideo": "Produce a 12-second product video script: white background hero shot, UV400 lens detail, PC frame detail, sunny lifestyle scene, customization options, final clean product lineup. Keep all wording unbranded."
  }
}
```

## 12. Acceptance Criteria

生成结果必须满足：

- 只返回 JSON。
- JSON 可以被 `JSON.parse` 成功解析。
- 字段完整，完全匹配 `ListingPackage`。
- 所有生成内容为英文。
- 没有品牌名、仿牌词、平台词。
- `metaTitle` 不超过 60 字符。
- `metaDescription` 不超过 156 字符。
- `schemaJson` 是合法 JSON 字符串。
- 图片提示词包含安全负向约束。
- 内容适合太阳镜国际站、B2B 批发、OEM、ODM 或 private label 语境。

## 13. Failure Cases

如果模型输出以下内容，应判定失败并重新生成：

- Markdown 代码块。
- JSON 后面附加解释。
- 输出中文 listing 内容。
- 缺少字段。
- `schemaJson` 不是合法 JSON 字符串。
- 使用第三方品牌名。
- 使用 replica、dupe、counterfeit、designer inspired 等词。
- 出现 1688、Amazon、TikTok 等平台词。
- meta 字段超长。

## 14. Integration Notes

应用后端调用 Gemini 时应使用：

```text
POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent
```

请求头：

```text
x-goog-api-key: GEMINI_API_KEY
Content-Type: application/json
```

建议默认模型：

```text
gemini-3.1-flash-lite
```

高质量可选模型：

```text
gemini-3.1-pro-preview
```

如果 key 无效，Google 会返回类似：

```text
API_KEY_INVALID
API key not valid. Please pass a valid API key.
```

这不是模型问题，是 API key 来源或配置问题。
