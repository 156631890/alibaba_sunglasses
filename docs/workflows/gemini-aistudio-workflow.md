# Google AI Studio Gemini 3.1 工作流

Date: 2026-05-19

## 目标

在 Google AI Studio 里使用 Gemini 3.1，把太阳镜产品资料生成一份可直接用于国际站上架的英文内容包。页面操作和字段理解用中文，最终生成内容必须是英文 JSON。

## 推荐模型

优先使用：

```text
gemini-3.1-flash-lite
```

高质量可选：

```text
gemini-3.1-pro-preview
```

## 工作流总览

```text
1. 准备产品资料
   ↓
2. 在 Google AI Studio 选择 Gemini 3.1 模型
   ↓
3. 粘贴系统任务 Prompt
   ↓
4. 填入 PRODUCT_INPUT / ANALYSIS / FALLBACK_LISTING
   ↓
5. 生成 ListingPackage JSON
   ↓
6. 校验 JSON 格式、英文内容、安全词
   ↓
7. 复制结果到网站工具或 CSV 上架表
   ↓
8. 人工检查后发布
```

## Step 1: 准备产品资料

收集以下资料：

```text
产品来源平台
产品链接
产品名称
镜框形状
镜片类型
材质
目标市场
业务模式
MOQ
定制选项
产品卖点/使用场景/补充信息
```

示例：

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

产出：

```text
PRODUCT_INPUT JSON
```

## Step 2: 生成或准备分析结果

如果使用当前网页工具，先点击：

```text
分析产品
```

得到：

```text
产品识别
评分
风险等级
风险词
关键词
上架建议
```

如果在 AI Studio 里手动跑，可以用下面这个分析结构：

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

产出：

```text
ANALYSIS JSON
```

## Step 3: 准备兜底 Listing

先用当前网页工具点击：

```text
生成上架内容
```

把模板结果作为 Gemini 的安全基线。没有网页工具时，可以用下面的结构：

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

产出：

```text
FALLBACK_LISTING JSON
```

## Step 4: 打开 Google AI Studio

操作：

```text
1. 打开 Google AI Studio
2. 新建 Prompt
3. 选择模型 gemini-3.1-flash-lite
4. 如果要更高质量，切换 gemini-3.1-pro-preview
5. 粘贴 Step 5 的完整 Prompt
```

## Step 5: 粘贴 AI Studio Prompt

把下面整段复制进 Google AI Studio，然后替换三个 JSON 占位：

```text
You are generating English ecommerce and B2B listing content for an international sunglasses website.

Return valid JSON only.
Do not wrap the response in Markdown fences.
Do not add explanations.
Do not output Chinese in any listing field.

The user interface is Chinese, but every generated listing field must be English.

Use PRODUCT_INPUT as the product facts.
Use ANALYSIS as the risk, keyword, buyer, and scoring context.
Use FALLBACK_LISTING as the safe baseline and required output shape.

Preserve safe product facts:
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

Avoid:
- third-party brand names
- replica, dupe, counterfeit, fake, designer inspired, same style, lookalike wording
- celebrity references
- source platform names such as 1688, Amazon, TikTok
- unsupported claims
- trademark-sensitive wording

Safe negative constraints are allowed in image prompts:
- No logo
- No brand name
- No watermark
- No third-party brands
- Keep wording unbranded

Output this exact JSON structure:
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

产出：

```text
Gemini 生成的 ListingPackage JSON
```

## Step 6: 校验 Gemini 输出

检查 8 件事：

```text
1. 是否只返回 JSON
2. 是否没有 Markdown ``` 包裹
3. 是否所有字段齐全
4. 是否所有 listing 内容都是英文
5. metaTitle 是否不超过 60 字符
6. metaDescription 是否不超过 156 字符
7. schemaJson 是否是合法 JSON 字符串
8. 是否没有品牌词、仿牌词、平台词
```

禁止出现：

```text
Ray-Ban
Oakley
Prada
Gucci
replica
dupe
counterfeit
fake
designer inspired
same style
lookalike
celebrity
1688
Amazon
TikTok
```

允许出现在图片提示词里的负向约束：

```text
No logo
No brand name
No watermark
No third-party brands
```

## Step 7: 结果进入上架工具

把 Gemini 输出 JSON 映射到当前网页工具右侧字段：

```text
productTitle -> SEO 标题
b2bTitle -> B2B 标题
metaDescription -> Meta 描述
htmlDescription -> HTML 描述
faq -> FAQ
imagePrompts -> 图片提示词
schemaJson -> JSON-LD 结构化数据
```

然后使用：

```text
复制字段
导出 CSV
人工检查
发布到网站后台
```

## Step 8: 失败处理

如果 AI Studio 输出失败：

### 失败 1: 输出 Markdown

处理：

```text
重新生成，并追加：
Return raw JSON only. Do not use Markdown.
```

### 失败 2: 输出中文

处理：

```text
重新生成，并追加：
All generated listing fields must be English.
```

### 失败 3: 有品牌词或仿牌词

处理：

```text
重新生成，并追加：
Remove all third-party brand names and replica-related wording.
Use generic unbranded product language only.
```

### 失败 4: JSON 不完整

处理：

```text
重新生成，并追加：
Return every required field in the exact JSON structure.
Do not omit any field.
```

### 失败 5: meta 超长

处理：

```text
重新生成，并追加：
metaTitle <= 60 characters.
metaDescription <= 156 characters.
```

## Step 9: 最终验收

这份工作流跑通的标准：

```text
1. Google AI Studio 能生成完整 JSON
2. JSON 字段能直接映射到 ListingPackage
3. 生成内容全英文
4. 没有品牌、仿牌、平台来源词
5. meta 字段长度合规
6. schemaJson 合法
7. 图片提示词安全
8. 内容能复制进网站工具或 CSV
```

## 最短执行版

```text
打开 Google AI Studio
→ 选择 gemini-3.1-flash-lite
→ 粘贴 Step 5 Prompt
→ 替换 PRODUCT_INPUT / ANALYSIS / FALLBACK_LISTING
→ 生成 JSON
→ 按 Step 6 校验
→ 复制进上架工具
→ 导出 CSV
```
