import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{a as r,g as i,l as a,m as o,r as s,s as c}from"./money-CoEDG6jo.js";import{n as l,t as u}from"./MoneyField-fbic9RrY.js";import{n as d,r as f}from"./iframe-URYqQxDH.js";var p,m,h,g,_,v,y,b,x,S,C,w;function T(){return(T=e((()=>{p=t(),f(),o(),r(),l(),m=n(),h={title:`Inputs/MoneyField`,component:u,args:{label:`Price`,currency:`USD`,defaultValue:`1234.50`}},g={tags:[`!visual`]},_={render:()=>(0,m.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,m.jsx)(u,{label:`Price (USD)`,currency:`USD`,defaultValue:`1234.50`}),(0,m.jsx)(u,{label:`Price (JPY)`,currency:`JPY`,defaultValue:`150000`}),(0,m.jsx)(u,{label:`Price (BHD)`,currency:`BHD`,defaultValue:`12.345`}),(0,m.jsx)(u,{label:`Price (EUR)`,currency:`EUR`,defaultValue:`99.90`})]})},v={tags:[`!visual`],render:()=>(0,m.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,m.jsx)(d,{locale:`de-DE`,children:(0,m.jsx)(u,{label:`Preis`,currency:`EUR`,defaultValue:`1234.50`})}),(0,m.jsx)(d,{locale:`fr-FR`,children:(0,m.jsx)(u,{label:`Prix`,currency:`EUR`,defaultValue:`1234.50`})}),(0,m.jsx)(d,{locale:`ja-JP`,children:(0,m.jsx)(u,{label:`価格`,currency:`JPY`,defaultValue:`98000`})})]})},y={render:()=>(0,m.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,m.jsx)(u,{label:`Adjustment`,currency:`USD`,allowsNegative:!0,defaultValue:`-1234.50`}),(0,m.jsx)(u,{label:`Adjustment (accounting)`,currency:`USD`,allowsNegative:!0,negativeStyle:`parentheses`,defaultValue:`-1234.50`})]})},b={render:()=>(0,m.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,m.jsx)(u,{label:`Budget`,currency:`USD`,maxValue:`5000`,defaultValue:`7500`,description:`Up to $5,000`}),(0,m.jsx)(u,{label:`Empty`,currency:`USD`,placeholder:`0.00`}),(0,m.jsx)(u,{label:`Disabled`,currency:`USD`,defaultValue:`20.00`,isDisabled:!0}),(0,m.jsx)(u,{label:`Read-only`,currency:`USD`,defaultValue:`20.00`,isReadOnly:!0}),(0,m.jsx)(u,{label:`Side label`,labelPosition:`side`,currency:`USD`,defaultValue:`10.00`})]})},x={render:function(){let[e,t]=(0,p.useState)(`EUR`);return(0,m.jsx)(`div`,{className:`max-w-sm`,children:(0,m.jsx)(u,{label:`Deal value`,currency:e,currencies:[`USD`,`EUR`,`GBP`,`JPY`],onCurrencyChange:t,defaultValue:`2500`})})}},S={render:()=>{let e=c(`0.1`,`0.2`),t=i(a(`19.99`,`3`),2),n=i(a(`59.97`,`0.0825`),2);return(0,m.jsxs)(`dl`,{className:`grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-fg`,children:[(0,m.jsx)(`dt`,{className:`text-fg-muted`,children:`0.1 + 0.2`}),(0,m.jsx)(`dd`,{children:e}),(0,m.jsx)(`dt`,{className:`text-fg-muted`,children:`3 × 19.99`}),(0,m.jsx)(`dd`,{children:s(t,`USD`,{locale:`en-US`})}),(0,m.jsx)(`dt`,{className:`text-fg-muted`,children:`8.25% tax`}),(0,m.jsx)(`dd`,{children:s(n,`USD`,{locale:`en-US`})})]})}},C={tags:[`!visual`],render:function(){let[e,t]=(0,p.useState)(`1234.50`);return(0,m.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-2`,children:[(0,m.jsx)(u,{label:`Amount`,currency:`USD`,value:e,onChange:t}),(0,m.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Value: `,e??`empty`]})]})}},w=[`Playground`,`Currencies`,`Locales`,`Negatives`,`States`,`WithCurrencySelect`,`DecimalHelpers`,`Controlled`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <MoneyField label="Price (USD)" currency="USD" defaultValue="1234.50" />
      <MoneyField label="Price (JPY)" currency="JPY" defaultValue="150000" />
      <MoneyField label="Price (BHD)" currency="BHD" defaultValue="12.345" />
      <MoneyField label="Price (EUR)" currency="EUR" defaultValue="99.90" />
    </div>
}`,..._.parameters?.docs?.source},description:{story:`Each currency's own minor units: two for USD, none for JPY, three for BHD.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <UIProvider locale="de-DE">
        <MoneyField label="Preis" currency="EUR" defaultValue="1234.50" />
      </UIProvider>
      <UIProvider locale="fr-FR">
        <MoneyField label="Prix" currency="EUR" defaultValue="1234.50" />
      </UIProvider>
      <UIProvider locale="ja-JP">
        <MoneyField label="価格" currency="JPY" defaultValue="98000" />
      </UIProvider>
    </div>
}`,...v.parameters?.docs?.source},description:{story:`The symbol's side and the separators follow the locale.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <MoneyField label="Adjustment" currency="USD" allowsNegative defaultValue="-1234.50" />
      <MoneyField label="Adjustment (accounting)" currency="USD" allowsNegative negativeStyle="parentheses" defaultValue="-1234.50" />
    </div>
}`,...y.parameters?.docs?.source},description:{story:"Negative amounts with `allowsNegative`, written with a minus or in accounting parentheses.",...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <MoneyField label="Budget" currency="USD" maxValue="5000" defaultValue="7500" description="Up to $5,000" />
      <MoneyField label="Empty" currency="USD" placeholder="0.00" />
      <MoneyField label="Disabled" currency="USD" defaultValue="20.00" isDisabled />
      <MoneyField label="Read-only" currency="USD" defaultValue="20.00" isReadOnly />
      <MoneyField label="Side label" labelPosition="side" currency="USD" defaultValue="10.00" />
    </div>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: function CurrencyStory() {
    const [currency, setCurrency] = useState('EUR');
    return <div className="max-w-sm">
        <MoneyField label="Deal value" currency={currency} currencies={['USD', 'EUR', 'GBP', 'JPY']} onCurrencyChange={setCurrency} defaultValue="2500" />
      </div>;
  }
}`,...x.parameters?.docs?.source},description:{story:"A currency Select beside the amount when `currencies` is given.",...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => {
    const sum = decimalAdd('0.1', '0.2');
    const line = roundHalfEven(decimalMultiply('19.99', '3'), 2);
    const tax = roundHalfEven(decimalMultiply('59.97', '0.0825'), 2);
    return <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-fg">
        <dt className="text-fg-muted">0.1 + 0.2</dt>
        <dd>{sum}</dd>
        <dt className="text-fg-muted">3 × 19.99</dt>
        <dd>{formatMoney(line, 'USD', {
          locale: 'en-US'
        })}</dd>
        <dt className="text-fg-muted">8.25% tax</dt>
        <dd>{formatMoney(tax, 'USD', {
          locale: 'en-US'
        })}</dd>
      </dl>;
  }
}`,...S.parameters?.docs?.source},description:{story:`The decimal helpers: exact sums and products on strings, rounded half-even.`,...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<string | null>('1234.50');
    return <div className="flex max-w-sm flex-col gap-2">
        <MoneyField label="Amount" currency="USD" value={value} onChange={setValue} />
        <p className="text-sm text-fg-muted">Value: {value ?? 'empty'}</p>
      </div>;
  }
}`,...C.parameters?.docs?.source},description:{story:`Controlled: the value is a decimal string.`,...C.parameters?.docs?.description}}}})))()}T();export{C as Controlled,_ as Currencies,S as DecimalHelpers,v as Locales,y as Negatives,g as Playground,b as States,x as WithCurrencySelect,w as __namedExportsOrder,h as default};