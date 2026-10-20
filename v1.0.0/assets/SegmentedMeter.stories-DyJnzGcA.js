import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./cn-BnE6eITj.js";import{r,t as i}from"./I18nProvider-CHhkoz8A.js";import{n as a,r as o}from"./Label-Bw-poHpv.js";import{n as s,t as c}from"./Meter-C8ra_uJA.js";import{n as l,t as u}from"./triangle-alert-DhdZMCX-.js";import{t as d}from"./jsx-runtime-MKhVqBIO.js";import{a as f,s as p}from"./context-BPba8fk9.js";import{n as m,t as h}from"./toneClasses-CZefSKJz.js";import{a as g,n as _,r as v}from"./intl-DmPaWkhT.js";import{t as y}from"./math-CJ-pjqGV.js";var b;function x(){return(x=e((()=>{b={segmentedMeterQuantity:({value:e,unit:t})=>`${e} ${t}`,segmentedMeterTotal:({value:e,max:t})=>`${e} of ${t}`,segmentedMeterPart:({label:e,value:t})=>`${e} ${t}`,segmentedMeterSummary:({parts:e,max:t})=>e===``?`of ${t}`:`${e}, of ${t}`,segmentedMeterFree:`Free`,segmentedMeterLegend:({label:e})=>`${e}, breakdown`,segmentedMeterOverMarker:({label:e,value:t})=>`Over ${e} (${t})`,segmentedMeterOverCapacity:({amount:e})=>`Over capacity by ${e}`}})))()}function S(e,t){return e.color??D[t%D.length]??`chart-1`}function C(e){return e<30?``:e>70?`-translate-x-full rtl:translate-x-full`:`-translate-x-1/2 rtl:translate-x-1/2`}function w({label:e,segments:t,maxValue:r,markers:o=[],unit:s,formatOptions:l,hasLegend:d=!0,hasFree:f=!0,size:m=`md`,className:h,ref:_}){let x=p(b),{locale:w}=i(),D=g(w,l),k=e=>{let t=D.format(e);return s===void 0?t:x.segmentedMeterQuantity({value:t,unit:s})},A=t.map(e=>({...e,value:Math.max(0,e.value)})),j=A.reduce((e,t)=>e+t.value,0),M=Math.max(0,r),N=Math.max(M,j)||1,P=e=>y(e/N*100,0,100),F=j>M,I=o.filter(e=>j>e.value),L=[...F?[x.segmentedMeterOverCapacity({amount:k(j-M)})]:[],...I.map(e=>x.segmentedMeterOverMarker({label:e.label,value:k(e.value)}))],R=[x.segmentedMeterSummary({parts:v(w,{type:`unit`,style:`short`}).format(A.map(e=>x.segmentedMeterPart({label:e.label,value:k(e.value)}))),max:k(M)}),...L].join(`. `),z=A.map((e,t)=>{let n=A.slice(0,t).reduce((e,t)=>e+t.value,0);return{segment:e,color:S(e,t),from:P(n),to:P(n+e.value)}});return(0,T.jsxs)(`div`,{ref:_,className:n(`flex min-w-0 flex-col gap-2 text-sm text-fg`,h),children:[(0,T.jsxs)(c,{value:Math.min(j,M),minValue:0,maxValue:M||1,valueLabel:R,"data-over-capacity":F||void 0,"data-warning":I.length>0||void 0,className:`flex min-w-0 flex-col gap-1.5`,children:[(0,T.jsxs)(`div`,{className:`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5`,children:[(0,T.jsx)(a,{className:`font-medium`,children:e}),(0,T.jsx)(`span`,{className:n(`tabular-nums`,F?`font-medium text-danger-fg`:I.length>0?`font-medium text-warning-fg`:`text-fg-muted`),children:x.segmentedMeterTotal({value:D.format(j),max:k(M)})})]}),o.length>0&&(0,T.jsx)(`div`,{"aria-hidden":`true`,className:`relative h-4 text-xs leading-4 text-fg-muted`,children:o.map(e=>{let t=P(e.value);return(0,T.jsx)(`span`,{className:n(`absolute top-0 whitespace-nowrap`,C(t),j>e.value&&`font-medium text-warning-fg`),style:{insetInlineStart:`${String(t)}%`},children:e.label},`${e.label}-${String(e.value)}`)})}),(0,T.jsxs)(`div`,{className:`relative`,children:[(0,T.jsxs)(`div`,{className:n(`relative w-full overflow-hidden rounded-full bg-surface-4`,O[m]),children:[z.map(({segment:e,color:t,from:r,to:i})=>i>r?(0,T.jsx)(`div`,{"data-segment":e.id,className:n(`absolute inset-y-0`,E[t],i<100&&`border-e-2 border-surface-1`),style:{insetInlineStart:`${String(r)}%`,width:`${String(i-r)}%`}},e.id):null),F&&(0,T.jsx)(`div`,{"data-overflow":``,className:`absolute inset-y-0 end-0 bg-[repeating-linear-gradient(135deg,var(--color-danger-solid)_0_3px,var(--color-surface-1)_3px_6px)]`,style:{width:`${String(100-P(M))}%`}})]}),F&&(0,T.jsx)(`span`,{"aria-hidden":`true`,className:`absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-fg rtl:translate-x-1/2`,style:{insetInlineStart:`${String(P(M))}%`}}),o.map(e=>(0,T.jsx)(`span`,{"aria-hidden":`true`,"data-marker":e.label,className:n(`absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full rtl:translate-x-1/2`,j>e.value?`bg-warning-solid`:`bg-fg`),style:{insetInlineStart:`${String(P(e.value))}%`}},`${e.label}-${String(e.value)}`))]})]}),L.length>0&&(0,T.jsx)(`ul`,{className:`flex flex-col gap-0.5`,children:L.map((e,t)=>(0,T.jsxs)(`li`,{className:n(`flex items-center gap-1.5 text-xs font-medium`,F&&t===0?`text-danger-fg`:`text-warning-fg`),children:[(0,T.jsx)(u,{"aria-hidden":`true`,className:`size-3.5 shrink-0`}),e]},e))}),d&&(0,T.jsxs)(`ul`,{"aria-label":x.segmentedMeterLegend({label:e}),className:`flex flex-wrap gap-x-4 gap-y-1 text-xs`,children:[z.map(({segment:e,color:t})=>(0,T.jsxs)(`li`,{className:`flex items-center gap-1.5`,children:[(0,T.jsx)(`span`,{"aria-hidden":`true`,className:n(`size-2.5 shrink-0 rounded-sm`,E[t])}),(0,T.jsx)(`span`,{className:`text-fg-muted`,children:e.label}),(0,T.jsx)(`span`,{className:`font-medium tabular-nums`,children:k(e.value)})]},e.id)),f&&!F&&(0,T.jsxs)(`li`,{className:`flex items-center gap-1.5`,children:[(0,T.jsx)(`span`,{"aria-hidden":`true`,className:`size-2.5 shrink-0 rounded-sm border border-border-strong bg-surface-4`}),(0,T.jsx)(`span`,{className:`text-fg-muted`,children:x.segmentedMeterFree}),(0,T.jsx)(`span`,{className:`font-medium tabular-nums`,children:k(M-j)})]}),o.map(e=>(0,T.jsxs)(`li`,{className:`flex items-center gap-1.5`,children:[(0,T.jsx)(`span`,{"aria-hidden":`true`,className:n(`h-3 w-0.5 shrink-0 rounded-full`,j>e.value?`bg-warning-solid`:`bg-fg`)}),(0,T.jsx)(`span`,{className:`text-fg-muted`,children:e.label}),(0,T.jsx)(`span`,{className:`font-medium tabular-nums`,children:k(e.value)})]},`${e.label}-${String(e.value)}`))]})]})}var T,E,D,O;function k(){return(k=e((()=>{l(),o(),s(),r(),f(),t(),_(),h(),x(),T=d(),E={"chart-1":`bg-chart-1`,"chart-2":`bg-chart-2`,"chart-3":`bg-chart-3`,"chart-4":`bg-chart-4`,"chart-5":`bg-chart-5`,"chart-6":`bg-chart-6`,"chart-7":`bg-chart-7`,"chart-8":`bg-chart-8`,"chart-9":`bg-chart-9`,"chart-10":`bg-chart-10`,...m},D=[`chart-1`,`chart-2`,`chart-3`,`chart-4`,`chart-5`,`chart-6`,`chart-7`,`chart-8`,`chart-9`,`chart-10`],O={sm:`h-2`,md:`h-3`,lg:`h-4`},w.__docgenInfo={description:"A bar of stacked parts against a maximum, with limit markers, overflow hatching and a legend. It's a `meter` whose\nvalue text names every part.",methods:[],displayName:`SegmentedMeter`,props:{label:{required:!0,tsType:{name:`string`},description:`Names the meter, such as "Storage quota".`},segments:{required:!0,tsType:{name:`unknown`},description:"The stacked parts, in order from the start of the bar. What's left of `maxValue` shows as free."},maxValue:{required:!0,tsType:{name:`number`},description:`The capacity. A total above it shows as hatched overflow.`},markers:{required:!1,tsType:{name:`unknown`},description:`Marks a limit inside the bar, such as a soft quota. Passing one turns it to a warning.`,defaultValue:{value:`[]`,computed:!1}},unit:{required:!1,tsType:{name:`string`},description:'A unit shown after each number, such as "GiB". Leave it out when `formatOptions` has a style that adds one.'},formatOptions:{required:!1,tsType:{name:`Intl.NumberFormatOptions`},description:``},hasLegend:{required:!1,tsType:{name:`boolean`},description:`Shows a legend with each segment's value. Defaults to true.`,defaultValue:{value:`true`,computed:!1}},hasFree:{required:!1,tsType:{name:`boolean`},description:`Adds what's left (the maximum minus the total) to the legend. Defaults to true.`,defaultValue:{value:`true`,computed:!1}},size:{required:!1,tsType:{name:`union`,raw:`'sm' | 'md' | 'lg'`,elements:[{name:`literal`,value:`'sm'`},{name:`literal`,value:`'md'`},{name:`literal`,value:`'lg'`}]},description:"The bar's thickness. Defaults to `md`.",defaultValue:{value:`'md'`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``}}}})))()}var A,j,M,N,P,F,I,L;function R(){return(R=e((()=>{k(),A=d(),j={title:`Display/SegmentedMeter`,component:w,args:{label:`Archive storage`,unit:`GiB`,maxValue:100,segments:[{id:`used`,label:`Used`,value:62},{id:`reserved`,label:`Reserved`,value:10}],markers:[{value:80,label:`Soft limit`}]},decorators:[e=>(0,A.jsx)(`div`,{className:`max-w-xl`,children:(0,A.jsx)(e,{})})]},M={},N={args:{segments:[{id:`used`,label:`Used`,value:74},{id:`reserved`,label:`Reserved`,value:12}]}},P={args:{segments:[{id:`used`,label:`Used`,value:96},{id:`reserved`,label:`Reserved`,value:16}]}},F={args:{label:`Telescope time this semester`,unit:`h`,maxValue:400,segments:[{id:`observed`,label:`Observed`,value:182,color:`chart-3`},{id:`scheduled`,label:`Scheduled`,value:96,color:`chart-6`},{id:`lost`,label:`Lost to weather`,value:41,color:`neutral`}],markers:[{value:200,label:`Mid-semester`},{value:360,label:`Allocation`}]}},I={render:()=>(0,A.jsxs)(`div`,{className:`flex flex-col gap-6`,children:[[`sm`,`md`,`lg`].map(e=>(0,A.jsx)(w,{size:e,label:`Lab freezer capacity`,unit:`racks`,maxValue:24,segments:[{id:`samples`,label:`Samples`,value:14},{id:`reagents`,label:`Reagents`,value:5}],hasLegend:e!==`sm`},e)),(0,A.jsx)(w,{label:`Outreach budget`,maxValue:12e3,formatOptions:{style:`currency`,currency:`USD`,maximumFractionDigits:0},segments:[{id:`spent`,label:`Spent`,value:7400},{id:`committed`,label:`Committed`,value:2100}]})]})},L=[`Quota`,`OverSoftLimit`,`OverCapacity`,`Budget`,`Variants`],M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{}`,...M.parameters?.docs?.source},description:{story:`Used, reserved and free of a 100 GiB quota, with an 80 GiB soft-limit marker.`,...M.parameters?.docs?.description}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    segments: [{
      id: 'used',
      label: 'Used',
      value: 74
    }, {
      id: 'reserved',
      label: 'Reserved',
      value: 12
    }]
  }
}`,...N.parameters?.docs?.source},description:{story:`The total has passed the soft limit: the marker and the total turn to a warning.`,...N.parameters?.docs?.description}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    segments: [{
      id: 'used',
      label: 'Used',
      value: 96
    }, {
      id: 'reserved',
      label: 'Reserved',
      value: 16
    }]
  }
}`,...P.parameters?.docs?.source},description:{story:`Past capacity: the scale stretches to the total and the share past the maximum is hatched.`,...P.parameters?.docs?.description}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Telescope time this semester',
    unit: 'h',
    maxValue: 400,
    segments: [{
      id: 'observed',
      label: 'Observed',
      value: 182,
      color: 'chart-3'
    }, {
      id: 'scheduled',
      label: 'Scheduled',
      value: 96,
      color: 'chart-6'
    }, {
      id: 'lost',
      label: 'Lost to weather',
      value: 41,
      color: 'neutral'
    }],
    markers: [{
      value: 200,
      label: 'Mid-semester'
    }, {
      value: 360,
      label: 'Allocation'
    }]
  }
}`,...F.parameters?.docs?.source},description:{story:`An observing-time budget in hours, with tone colours and two markers.`,...F.parameters?.docs?.description}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map(size => <SegmentedMeter key={size} size={size} label="Lab freezer capacity" unit="racks" maxValue={24} segments={[{
      id: 'samples',
      label: 'Samples',
      value: 14
    }, {
      id: 'reagents',
      label: 'Reagents',
      value: 5
    }]} hasLegend={size !== 'sm'} />)}
      <SegmentedMeter label="Outreach budget" maxValue={12000} formatOptions={{
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }} segments={[{
      id: 'spent',
      label: 'Spent',
      value: 7400
    }, {
      id: 'committed',
      label: 'Committed',
      value: 2100
    }]} />
    </div>
}`,...I.parameters?.docs?.source},description:{story:`Sizes, without a legend, and with currency formatting (no unit).`,...I.parameters?.docs?.description}}}})))()}R();export{F as Budget,P as OverCapacity,N as OverSoftLimit,M as Quota,I as Variants,L as __namedExportsOrder,j as default};