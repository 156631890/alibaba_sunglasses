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

const sourcePlatforms: SourcePlatform[] = ['1688', 'Amazon', 'TikTok', 'image/manual', 'other'];
const frameShapes: FrameShape[] = ['square', 'aviator', 'cat eye', 'round', 'wraparound', 'rectangle'];
const lensTypes: LensType[] = ['UV400', 'polarized', 'gradient', 'mirrored', 'photochromic', 'clear'];
const materials: Material[] = ['PC', 'TR90', 'acetate', 'metal', 'mixed'];
const markets: TargetMarket[] = ['US', 'UK', 'EU', 'Australia', 'Middle East', 'global'];
const businessModels: BusinessModel[] = ['retail', 'wholesale', 'OEM', 'ODM'];
const customizationOptions: CustomizationOption[] = ['logo', 'packaging', 'frame color', 'lens color'];

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

function App() {
  const [input, setInput] = useState<ProductInput>(starterInput);
  const [analysis, setAnalysis] = useState<ProductAnalysis>(() => analyzeProduct(starterInput));
  const [listing, setListing] = useState<ListingPackage>(() =>
    generateListingPackage({ input: starterInput, analysis: analyzeProduct(starterInput) }),
  );
  const [copiedKey, setCopiedKey] = useState<string>('');

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
          <p className="product-mark">Sunglasses Listing Agent</p>
          <h1>太阳镜国际站上品工作台</h1>
          <p className="topbar-copy">输入产品信息，检查风险，生成 SEO/GEO 上架包和 CSV。</p>
        </div>
        <div className="topbar-actions">
          <button className="secondary-action" type="button" onClick={handleAnalyze}>
            <ShieldAlert size={17} />
            Analyze Product
          </button>
          <button className="primary-action" type="button" onClick={handleGenerate}>
            <Sparkles size={17} />
            Generate Listing
          </button>
        </div>
      </header>

      <section className="workbench" aria-label="Sunglasses listing workbench">
        <InputPanel
          input={input}
          onUpdate={updateInput}
          onToggleCustomization={toggleCustomization}
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
  onUpdate,
  onToggleCustomization,
  onAnalyze,
  onGenerate,
}: {
  input: ProductInput;
  onUpdate: <Key extends keyof ProductInput>(key: Key, value: ProductInput[Key]) => void;
  onToggleCustomization: (option: CustomizationOption) => void;
  onAnalyze: () => void;
  onGenerate: () => void;
}) {
  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <span className="panel-index">01</span>
        <div>
          <h2>Product Input</h2>
          <p>手动粘贴产品信息，第一版不抓取平台数据。</p>
        </div>
      </div>

      <div className="field-grid">
        <label>
          Source
          <select
            value={input.sourcePlatform}
            onChange={(event) => onUpdate('sourcePlatform', event.target.value as SourcePlatform)}
          >
            {sourcePlatforms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Target Market
          <select
            value={input.targetMarket}
            onChange={(event) => onUpdate('targetMarket', event.target.value as TargetMarket)}
          >
            {markets.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Product URL
        <input
          value={input.sourceUrl}
          onChange={(event) => onUpdate('sourceUrl', event.target.value)}
          placeholder="https://..."
        />
      </label>

      <label>
        Product Name
        <input
          value={input.productName}
          onChange={(event) => onUpdate('productName', event.target.value)}
          placeholder="Oversized Square UV400 Sunglasses"
        />
      </label>

      <div className="field-grid">
        <label>
          Frame Shape
          <select
            value={input.frameShape}
            onChange={(event) => onUpdate('frameShape', event.target.value as FrameShape)}
          >
            {frameShapes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Lens Type
          <select
            value={input.lensType}
            onChange={(event) => onUpdate('lensType', event.target.value as LensType)}
          >
            {lensTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-grid">
        <label>
          Material
          <select
            value={input.material}
            onChange={(event) => onUpdate('material', event.target.value as Material)}
          >
            {materials.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Business Model
          <select
            value={input.businessModel}
            onChange={(event) => onUpdate('businessModel', event.target.value as BusinessModel)}
          >
            {businessModels.map((item) => (
              <option key={item} value={item}>
                {item}
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
        <legend>Customization</legend>
        <div className="check-grid">
          {customizationOptions.map((option) => (
            <label className="check-option" key={option}>
              <input
                type="checkbox"
                checked={input.customization.includes(option)}
                onChange={() => onToggleCustomization(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Product Notes
        <textarea
          value={input.notes}
          rows={6}
          onChange={(event) => onUpdate('notes', event.target.value)}
          placeholder="Use scenes, target buyers, colors, selling points..."
        />
      </label>

      <div className="panel-actions">
        <button className="secondary-action" type="button" onClick={onAnalyze}>
          <RefreshCw size={16} />
          Analyze
        </button>
        <button className="primary-action" type="button" onClick={onGenerate}>
          <Sparkles size={16} />
          Generate
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
          <h2>Analysis</h2>
          <p>确定性评分和风险词检查。</p>
        </div>
      </div>

      <div className={`risk-banner risk-${analysis.risk.level.toLowerCase()}`}>
        <div>
          <span>IP Risk</span>
          <strong>{analysis.risk.level}</strong>
        </div>
        <p>{analysis.risk.summary}</p>
      </div>

      <div className="score-summary">
        <div>
          <span>Final Score</span>
          <strong>{averageScore}</strong>
        </div>
        <div>
          <span>Recommendation</span>
          <strong>{analysis.recommendation}</strong>
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
        <h3>Recognition</h3>
        <dl className="summary-grid">
          <div>
            <dt>Product</dt>
            <dd>{analysis.recognition.productType}</dd>
          </div>
          <div>
            <dt>Shape</dt>
            <dd>{analysis.recognition.frameShape}</dd>
          </div>
          <div>
            <dt>Lens</dt>
            <dd>{analysis.recognition.lensType}</dd>
          </div>
          <div>
            <dt>Buyer</dt>
            <dd>{analysis.recognition.targetBuyer}</dd>
          </div>
        </dl>
      </section>

      <section className="subsection">
        <h3>Risk Matches</h3>
        {analysis.risk.matches.length ? (
          <div className="match-list">
            {analysis.risk.matches.map((match) => (
              <div className="match-row" key={`${match.word}-${match.type}`}>
                <div>
                  <strong>{match.word}</strong>
                  <span>{match.type}</span>
                </div>
                <p>Use: {match.replacement}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-note">No risky terms detected.</p>
        )}
      </section>

      <section className="subsection">
        <h3>Keyword Suggestions</h3>
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
          <h2>Generated Package</h2>
          <p>可复制的安全上架内容。</p>
        </div>
        <button className="export-action" type="button" onClick={onExportCsv}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <OutputBlock
        id="product-title"
        label="SEO Title"
        value={listing.productTitle}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      <OutputBlock
        id="b2b-title"
        label="B2B Title"
        value={listing.b2bTitle}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      <OutputBlock
        id="meta-description"
        label="Meta Description"
        value={listing.metaDescription}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
      <OutputBlock
        id="html-description"
        label="HTML Description"
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
          <h3>Image Prompts</h3>
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
        label="JSON-LD"
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
        <button type="button" onClick={() => onCopy(id, value)} aria-label={`Copy ${label}`}>
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea className={tall ? 'output-text tall' : 'output-text'} readOnly value={value} />
    </div>
  );
}

function scoreLabel(key: string) {
  const labels: Record<string, string> = {
    marketDemand: 'Market Demand',
    supplyChain: 'Supply Chain',
    profitPotential: 'Profit Potential',
    contentPotential: 'Content Potential',
    seoPotential: 'SEO Potential',
    b2bInquiryPotential: 'B2B Inquiry',
  };
  return labels[key] ?? key;
}

function promptLabel(key: string) {
  const labels: Record<string, string> = {
    whiteBackground: 'White Background',
    lifestyle: 'Lifestyle',
    detail: 'Detail',
    customization: 'Customization',
    shortVideo: 'Short Video',
  };
  return labels[key] ?? key;
}

export default App;
