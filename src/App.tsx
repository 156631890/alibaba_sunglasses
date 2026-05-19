import { useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  Download,
  FileText,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  analyzeProduct,
  exportListingCsv,
  generateListingPackage,
  type BusinessModel,
  type CustomizationOption,
  type FrameShape,
  type LensType,
  type ListingPackage,
  type Material,
  type ProductAnalysis,
  type ProductInput,
  type SourcePlatform,
  type TargetMarket,
} from './domain/listingEngine';
import type { FetchProductData, FetchProductResult } from './domain/productFetch';

const sourcePlatforms: SourcePlatform[] = ['1688', 'Amazon', 'TikTok', 'image/manual', 'other'];
const frameShapes: FrameShape[] = ['square', 'aviator', 'cat eye', 'round', 'wraparound', 'rectangle'];
const lensTypes: LensType[] = ['UV400', 'polarized', 'gradient', 'mirrored', 'photochromic', 'clear'];
const materials: Material[] = ['PC', 'TR90', 'acetate', 'metal', 'mixed'];
const markets: TargetMarket[] = ['US', 'UK', 'EU', 'Australia', 'Middle East', 'global'];
const businessModels: BusinessModel[] = ['retail', 'wholesale', 'OEM', 'ODM'];
const customizationOptions: CustomizationOption[] = ['logo', 'packaging', 'frame color', 'lens color'];

const sourceLabels: Record<SourcePlatform, string> = {
  '1688': '1688',
  Amazon: 'Amazon',
  TikTok: 'TikTok',
  'image/manual': '图片/手动输入',
  other: '其他',
};

const frameShapeLabels: Record<FrameShape, string> = {
  square: '方框',
  aviator: '飞行员',
  'cat eye': '猫眼',
  round: '圆框',
  wraparound: '包覆式',
  rectangle: '矩形',
};

const lensTypeLabels: Record<LensType, string> = {
  UV400: 'UV400',
  polarized: '偏光',
  gradient: '渐变',
  mirrored: '镜面',
  photochromic: '变色',
  clear: '透明',
};

const materialLabels: Record<Material, string> = {
  PC: 'PC',
  TR90: 'TR90',
  acetate: '醋酸板材',
  metal: '金属',
  mixed: '混合材质',
};

const marketLabels: Record<TargetMarket, string> = {
  US: '美国',
  UK: '英国',
  EU: '欧盟',
  Australia: '澳大利亚',
  'Middle East': '中东',
  global: '全球',
};

const businessModelLabels: Record<BusinessModel, string> = {
  retail: '零售',
  wholesale: '批发',
  OEM: 'OEM',
  ODM: 'ODM',
};

const customizationLabels: Record<CustomizationOption, string> = {
  logo: 'Logo 定制',
  packaging: '包装定制',
  'frame color': '镜框颜色',
  'lens color': '镜片颜色',
};

const starterInput: ProductInput = {
  sourcePlatform: '1688',
  sourceUrl: 'https://example.com/1688-square-sunglasses',
  productName: 'Oversized Square UV400 Sunglasses',
  frameShape: 'square',
  lensType: 'UV400',
  material: 'TR90',
  targetMarket: 'US',
  businessModel: 'wholesale',
  moq: 120,
  customization: ['logo', 'packaging'],
  notes:
    'Lightweight sunglasses for beach, travel, driving, and private label eyewear buyers. Suitable for summer catalog launches and wholesale fashion accessories.',
};

type FetchState =
  | { status: 'idle'; message: string }
  | { status: 'loading'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

function App() {
  const [input, setInput] = useState<ProductInput>(starterInput);
  const [analysis, setAnalysis] = useState<ProductAnalysis>(() => analyzeProduct(starterInput));
  const [listing, setListing] = useState<ListingPackage>(() =>
    generateListingPackage({ input: starterInput, analysis: analyzeProduct(starterInput) }),
  );
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [fetchState, setFetchState] = useState<FetchState>({
    status: 'idle',
    message: '粘贴 1688、Amazon、TikTok 或其他产品链接后，可以先抓取页面信息。',
  });

  const averageScore = useMemo(() => {
    const values = Object.values(analysis.scores);
    return Math.round(values.reduce((sum, score) => sum + score, 0) / values.length);
  }, [analysis.scores]);

  function updateInput<Key extends keyof ProductInput>(key: Key, value: ProductInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function toggleCustomization(option: CustomizationOption) {
    setInput((current) => ({
      ...current,
      customization: current.customization.includes(option)
        ? current.customization.filter((item) => item !== option)
        : [...current.customization, option],
    }));
  }

  function handleAnalyze() {
    setAnalysis(analyzeProduct(input));
  }

  function handleGenerate() {
    const nextAnalysis = analyzeProduct(input);
    const nextListing = generateListingPackage({ input, analysis: nextAnalysis });
    setAnalysis(nextAnalysis);
    setListing(nextListing);
  }

  async function handleFetchProduct() {
    if (!input.sourceUrl.trim()) {
      setFetchState({ status: 'error', message: '请先粘贴产品链接。' });
      return;
    }

    setFetchState({ status: 'loading', message: '正在读取链接信息...' });

    try {
      const response = await fetch('/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: input.sourceUrl,
          sourcePlatform: input.sourcePlatform,
        }),
      });

      if (!response.headers.get('content-type')?.includes('application/json')) {
        setFetchState({
          status: 'error',
          message: '抓取接口没有返回 JSON。请确认当前环境支持 /api/fetch-product，或重新部署最新代码。',
        });
        return;
      }

      const result = (await response.json()) as FetchProductResult;

      if (!result.ok) {
        setFetchState({ status: 'error', message: result.error.message });
        return;
      }

      const fetchedInput = applyFetchedProductData(input, result.data);
      const nextAnalysis = analyzeProduct(fetchedInput);

      setInput(fetchedInput);
      setAnalysis(nextAnalysis);
      setListing(generateListingPackage({ input: fetchedInput, analysis: nextAnalysis }));
      setFetchState({
        status: 'success',
        message: `已抓取页面信息，置信度：${confidenceLabel(result.data.confidence)}。请检查后再生成上架内容。`,
      });
    } catch {
      setFetchState({
        status: 'error',
        message: '无法连接抓取接口。请刷新页面或稍后重试；如果是本地预览，请重新启动 npm run dev。',
      });
    }
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1400);
  }

  function handleExportCsv() {
    const csv = exportListingCsv(listing);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listing.slug || 'sunglasses-listing'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="product-mark">太阳镜上品助手</p>
          <h1>太阳镜国际站上品工作台</h1>
          <p className="topbar-copy">输入产品信息，检查风险，生成 SEO/GEO 上架包和 CSV。</p>
        </div>
        <div className="topbar-actions">
          <button className="secondary-action" type="button" onClick={handleAnalyze}>
            <ShieldAlert size={17} />
            分析产品
          </button>
          <button className="primary-action" type="button" onClick={handleGenerate}>
            <Sparkles size={17} />
            生成上架内容
          </button>
        </div>
      </header>

      <section className="workbench" aria-label="Sunglasses listing workbench">
        <InputPanel
          input={input}
          fetchState={fetchState}
          onUpdate={updateInput}
          onToggleCustomization={toggleCustomization}
          onFetchProduct={handleFetchProduct}
          onAnalyze={handleAnalyze}
          onGenerate={handleGenerate}
        />
        <AnalysisPanel analysis={analysis} averageScore={averageScore} />
        <ListingPanel
          listing={listing}
          copiedKey={copiedKey}
          onCopy={copyText}
          onExportCsv={handleExportCsv}
        />
      </section>
    </main>
  );
}

function InputPanel({
  input,
  fetchState,
  onUpdate,
  onToggleCustomization,
  onFetchProduct,
  onAnalyze,
  onGenerate,
}: {
  input: ProductInput;
  fetchState: FetchState;
  onUpdate: <Key extends keyof ProductInput>(key: Key, value: ProductInput[Key]) => void;
  onToggleCustomization: (option: CustomizationOption) => void;
  onFetchProduct: () => void;
  onAnalyze: () => void;
  onGenerate: () => void;
}) {
  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <span className="panel-index">01</span>
        <div>
          <h2>产品输入</h2>
          <p>可先抓取链接信息，也可以手动填写或修改。</p>
        </div>
      </div>

      <div className="field-grid">
        <label>
          产品来源
          <select
            value={input.sourcePlatform}
            onChange={(event) => onUpdate('sourcePlatform', event.target.value as SourcePlatform)}
          >
            {sourcePlatforms.map((item) => (
              <option key={item} value={item}>
                {sourceLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          目标市场
          <select
            value={input.targetMarket}
            onChange={(event) => onUpdate('targetMarket', event.target.value as TargetMarket)}
          >
            {markets.map((item) => (
              <option key={item} value={item}>
                {marketLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        产品链接
        <input
          value={input.sourceUrl}
          onChange={(event) => onUpdate('sourceUrl', event.target.value)}
          placeholder="https://..."
        />
      </label>

      <div className="fetch-row">
        <button
          className="fetch-action"
          type="button"
          onClick={onFetchProduct}
          disabled={fetchState.status === 'loading'}
        >
          <RefreshCw size={16} />
          {fetchState.status === 'loading' ? '正在抓取...' : '抓取链接信息'}
        </button>
        <p className={`fetch-status fetch-${fetchState.status}`}>{fetchState.message}</p>
      </div>

      <label>
        产品名称
        <input
          value={input.productName}
          onChange={(event) => onUpdate('productName', event.target.value)}
          placeholder="例如：Oversized Square UV400 Sunglasses"
        />
      </label>

      <div className="field-grid">
        <label>
          镜框形状
          <select
            value={input.frameShape}
            onChange={(event) => onUpdate('frameShape', event.target.value as FrameShape)}
          >
            {frameShapes.map((item) => (
              <option key={item} value={item}>
                {frameShapeLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          镜片类型
          <select
            value={input.lensType}
            onChange={(event) => onUpdate('lensType', event.target.value as LensType)}
          >
            {lensTypes.map((item) => (
              <option key={item} value={item}>
                {lensTypeLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-grid">
        <label>
          材质
          <select
            value={input.material}
            onChange={(event) => onUpdate('material', event.target.value as Material)}
          >
            {materials.map((item) => (
              <option key={item} value={item}>
                {materialLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          业务类型
          <select
            value={input.businessModel}
            onChange={(event) => onUpdate('businessModel', event.target.value as BusinessModel)}
          >
            {businessModels.map((item) => (
              <option key={item} value={item}>
                {businessModelLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        MOQ
        <input
          type="number"
          min="0"
          value={input.moq}
          onChange={(event) => onUpdate('moq', Number(event.target.value))}
        />
      </label>

      <fieldset>
        <legend>定制选项</legend>
        <div className="check-grid">
          {customizationOptions.map((option) => (
            <label className="check-option" key={option}>
              <input
                type="checkbox"
                checked={input.customization.includes(option)}
                onChange={() => onToggleCustomization(option)}
              />
              <span>{customizationLabels[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        产品补充信息
        <textarea
          value={input.notes}
          rows={6}
          onChange={(event) => onUpdate('notes', event.target.value)}
          placeholder="填写使用场景、目标买家、颜色、卖点等信息..."
        />
      </label>

      <div className="panel-actions">
        <button className="secondary-action" type="button" onClick={onAnalyze}>
          <RefreshCw size={16} />
          分析
        </button>
        <button className="primary-action" type="button" onClick={onGenerate}>
          <Sparkles size={16} />
          生成
        </button>
      </div>
    </section>
  );
}

function AnalysisPanel({
  analysis,
  averageScore,
}: {
  analysis: ProductAnalysis;
  averageScore: number;
}) {
  return (
    <section className="panel analysis-panel">
      <div className="panel-heading">
        <span className="panel-index">02</span>
        <div>
          <h2>分析结果</h2>
          <p>确定性评分和风险词检查。</p>
        </div>
      </div>

      <div className={`risk-banner risk-${analysis.risk.level.toLowerCase()}`}>
        <div>
          <span>侵权风险</span>
          <strong>{riskLevelLabel(analysis.risk.level)}</strong>
        </div>
        <p>{riskSummaryLabel(analysis.risk)}</p>
      </div>

      <div className="score-summary">
        <div>
          <span>综合评分</span>
          <strong>{averageScore}</strong>
        </div>
        <div>
          <span>建议动作</span>
          <strong>{recommendationLabel(analysis.recommendation)}</strong>
        </div>
      </div>

      <div className="score-list">
        {Object.entries(analysis.scores).map(([key, value]) => (
          <div className="score-row" key={key}>
            <span>{scoreLabel(key)}</span>
            <div className="score-track">
              <span style={{ width: `${value}%` }} />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="subsection">
        <h3>产品识别</h3>
        <dl className="summary-grid">
          <div>
            <dt>产品</dt>
            <dd>{productTypeLabel(analysis.recognition.productType)}</dd>
          </div>
          <div>
            <dt>形状</dt>
            <dd>{frameShapeLabels[analysis.recognition.frameShape]}</dd>
          </div>
          <div>
            <dt>镜片</dt>
            <dd>{lensTypeLabels[analysis.recognition.lensType]}</dd>
          </div>
          <div>
            <dt>买家</dt>
            <dd>{targetBuyerLabel(analysis.recognition.targetBuyer)}</dd>
          </div>
        </dl>
      </section>

      <section className="subsection">
        <h3>风险命中</h3>
        {analysis.risk.matches.length ? (
          <div className="match-list">
            {analysis.risk.matches.map((match) => (
              <div className="match-row" key={`${match.word}-${match.type}`}>
                <div>
                  <strong>{match.word}</strong>
                  <span>{riskTypeLabel(match.type)}</span>
                </div>
                <p>建议替换：{match.replacement}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-note">未发现风险词。</p>
        )}
      </section>

      <section className="subsection">
        <h3>关键词建议</h3>
        <div className="keyword-list">
          {analysis.keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      </section>
    </section>
  );
}

function ListingPanel({
  listing,
  copiedKey,
  onCopy,
  onExportCsv,
}: {
  listing: ListingPackage;
  copiedKey: string;
  onCopy: (key: string, value: string) => void;
  onExportCsv: () => void;
}) {
  return (
    <section className="panel listing-panel">
      <div className="panel-heading output-heading">
        <span className="panel-index">03</span>
        <div>
          <h2>生成上架包</h2>
          <p>字段标题为中文，生成内容保持英文。</p>
        </div>
        <button className="export-action" type="button" onClick={onExportCsv}>
          <Download size={16} />
          导出 CSV
        </button>
      </div>

      <OutputBlock
        id="product-title"
        label="SEO 标题"
        value={listing.productTitle}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      <OutputBlock
        id="b2b-title"
        label="B2B 标题"
        value={listing.b2bTitle}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      <OutputBlock
        id="meta-description"
        label="Meta 描述"
        value={listing.metaDescription}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      <OutputBlock
        id="html-description"
        label="HTML 描述"
        value={listing.htmlDescription}
        copiedKey={copiedKey}
        onCopy={onCopy}
        tall
      />
      <OutputBlock
        id="faq"
        label="FAQ"
        value={listing.faq.join('\n\n')}
        copiedKey={copiedKey}
        onCopy={onCopy}
        tall
      />

      <section className="subsection output-section">
        <div className="section-title">
          <FileText size={16} />
          <h3>图片提示词</h3>
        </div>
        {Object.entries(listing.imagePrompts).map(([key, value]) => (
          <OutputBlock
            key={key}
            id={`prompt-${key}`}
            label={promptLabel(key)}
            value={value}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        ))}
      </section>

      <OutputBlock
        id="schema"
        label="JSON-LD 结构化数据"
        value={listing.schemaJson}
        copiedKey={copiedKey}
        onCopy={onCopy}
        tall
      />
    </section>
  );
}

function OutputBlock({
  id,
  label,
  value,
  copiedKey,
  onCopy,
  tall = false,
}: {
  id: string;
  label: string;
  value: string;
  copiedKey: string;
  onCopy: (key: string, value: string) => void;
  tall?: boolean;
}) {
  const copied = copiedKey === id;

  return (
    <div className="output-block">
      <div className="output-label">
        <span>{label}</span>
        <button type="button" onClick={() => onCopy(id, value)} aria-label={`复制${label}`}>
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <textarea className={tall ? 'output-text tall' : 'output-text'} readOnly value={value} />
    </div>
  );
}

function scoreLabel(key: string) {
  const labels: Record<string, string> = {
    marketDemand: '市场需求',
    supplyChain: '供应链',
    profitPotential: '利润潜力',
    contentPotential: '素材潜力',
    seoPotential: 'SEO 潜力',
    b2bInquiryPotential: 'B2B 询盘',
  };
  return labels[key] ?? key;
}

function promptLabel(key: string) {
  const labels: Record<string, string> = {
    whiteBackground: '白底图',
    lifestyle: '生活方式图',
    detail: '细节图',
    customization: '定制展示',
    shortVideo: '短视频脚本',
  };
  return labels[key] ?? key;
}

function confidenceLabel(confidence: FetchProductData['confidence']) {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return labels[confidence];
}

function applyFetchedProductData(input: ProductInput, data: FetchProductData): ProductInput {
  return {
    ...input,
    productName: data.title || input.productName,
    notes: mergeFetchedNotes(input.notes, data.notes),
  };
}

function mergeFetchedNotes(currentNotes: string, fetchedNotes: string) {
  if (!fetchedNotes.trim()) return currentNotes;
  if (!currentNotes.trim()) return fetchedNotes;
  return `${fetchedNotes}\n\nManual notes: ${currentNotes}`;
}

function riskLevelLabel(level: ProductAnalysis['risk']['level']) {
  const labels = {
    Low: '低',
    Medium: '中',
    High: '高',
  };
  return labels[level];
}

function riskSummaryLabel(risk: ProductAnalysis['risk']) {
  if (risk.level === 'Low') return '未发现品牌词、仿牌词或高度相似表达。';
  return `发现 ${risk.matches.length} 个风险表达。发布前请改成通用产品语言。`;
}

function recommendationLabel(recommendation: ProductAnalysis['recommendation']) {
  const labels = {
    Reject: '不建议上架',
    Observe: '先观察',
    'Test Listing': '测试上架',
    'Priority Listing': '优先上架',
  };
  return labels[recommendation];
}

function riskTypeLabel(type: ProductAnalysis['risk']['matches'][number]['type']) {
  const labels = {
    brand: '品牌词',
    replica: '仿牌词',
    lookalike: '相似表达',
    celebrity: '名人/IP',
    image: '图片风险',
  };
  return labels[type];
}

function targetBuyerLabel(buyer: string) {
  const labels: Record<string, string> = {
    Retailer: '零售商',
    Wholesaler: '批发买家',
    'Private Label Brand': '贴牌品牌',
    'Eyewear Product Developer': '眼镜产品开发买家',
  };
  return labels[buyer] ?? buyer;
}

function productTypeLabel(productType: string) {
  return productType === 'sunglasses' ? '太阳镜' : productType;
}

export default App;
