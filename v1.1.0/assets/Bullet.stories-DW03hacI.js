import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./cn-BnE6eITj.js";import{r,t as i}from"./I18nProvider-CHhkoz8A.js";import{n as a,r as o}from"./Label-Bw-poHpv.js";import{n as s,t as c}from"./Meter-C8ra_uJA.js";import{t as l}from"./jsx-runtime-MKhVqBIO.js";import{a as u,n as d}from"./intl-DmPaWkhT.js";import{t as f}from"./math-CJ-pjqGV.js";import{n as p,t as m}from"./messages-C7trWVFY.js";import{a as h,n as g}from"./plotStrings-pVgM28R_.js";function _(e,t){let n=Math.min(x.length-1,t-1-e);return x[x.length-1-n]??`bg-heat-neutral-1`}function v(e,t,n=5){let r=t-e;if(!(r>0)||!Number.isFinite(r))return[e];let i=r/Math.max(1,n-1),a=10**Math.floor(Math.log10(i)),o=[1,2,2.5,5,10].map(e=>e*a).find(e=>e>=i)??10*a,s=[];for(let n=Math.ceil(e/o)*o;n<=t+o*1e-9;n+=o)s.push(Math.round(n/o)*o);return s[0]!==e&&s.unshift(e),s.at(-1)!==t&&s.push(t),s.filter((n,r)=>r===0||r===s.length-1||n-e>=o*.4&&t-n>=o*.4)}function y({label:e,value:t,target:r,ranges:o=[],minValue:s=0,maxValue:l,formatOptions:d,unit:m,hasScale:h=!0,className:y,ref:x}){let S=p(g),{locale:C}=i(),w=l??o.at(-1)?.to??Math.max(t,r??-1/0),T=w-s,E=e=>T<=0?0:f((e-s)/T*100,0,100),D=u(C,d),O=e=>{let t=D.format(e);return m===void 0?t:`${t} ${m}`},k=O(t),A=r===void 0?void 0:O(r),j=(o.find(e=>t<=e.to)??o.at(-1))?.label,M=h?v(s,w):[];return(0,b.jsxs)(c,{ref:x,value:t,minValue:s,maxValue:w,valueLabel:S.bulletValue({value:k,target:A,range:j}),className:n(`flex min-w-0 flex-col gap-1.5 text-sm text-fg`,y),children:[(0,b.jsxs)(`div`,{className:`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5`,children:[(0,b.jsx)(a,{className:`font-medium`,children:e}),(0,b.jsxs)(`span`,{className:`flex flex-wrap items-baseline gap-x-2`,children:[(0,b.jsx)(`span`,{className:`text-lg font-semibold tabular-nums`,children:k}),A!==void 0&&(0,b.jsx)(`span`,{className:`text-fg-muted tabular-nums`,children:S.bulletTarget({target:A})}),j!==void 0&&(0,b.jsx)(`span`,{className:`text-fg-muted`,children:j})]})]}),(0,b.jsxs)(`div`,{"aria-hidden":`true`,className:`flex flex-col gap-0.5`,children:[(0,b.jsxs)(`div`,{className:n(`relative h-6 w-full overflow-hidden rounded-sm`,o.length===0&&`bg-surface-3`),children:[o.map((e,t)=>{let r=t===0?s:o[t-1]?.to??s;return(0,b.jsx)(`span`,{className:n(`absolute inset-y-0`,_(t,o.length)),style:{insetInlineStart:`${String(E(r))}%`,width:`${String(E(e.to)-E(r))}%`}},`${String(t)}-${e.label}`)}),(0,b.jsx)(`span`,{className:`absolute inset-y-[35%] start-0 rounded-e-sm bg-fg`,style:{width:`${String(E(t))}%`}}),r!==void 0&&(0,b.jsx)(`span`,{className:`absolute inset-y-1 -ms-0.5 w-1 rounded-full bg-fg`,style:{insetInlineStart:`${String(E(r))}%`}})]}),M.length>1&&(0,b.jsx)(`div`,{className:`relative h-4 text-xs text-fg-muted tabular-nums`,children:M.map((e,t)=>(0,b.jsx)(`span`,{className:n(`absolute top-0 whitespace-nowrap`,t===0?``:t===M.length-1?`-translate-x-full rtl:translate-x-full`:`-translate-x-1/2 rtl:translate-x-1/2`),style:{insetInlineStart:`${String(E(e))}%`},children:D.format(e)},e))})]})]})}var b,x;function S(){return(S=e((()=>{o(),s(),r(),t(),d(),m(),h(),b=l(),x=[`bg-heat-neutral-4`,`bg-heat-neutral-3`,`bg-heat-neutral-2`,`bg-heat-neutral-1`],y.__docgenInfo={description:"A measure against a target over qualitative ranges: a `meter` whose text gives the value, the target and the\nrange the value is in.",methods:[],displayName:`BulletChart`,props:{label:{required:!0,tsType:{name:`string`},description:`Names the chart (visible).`},value:{required:!0,tsType:{name:`number`},description:``},target:{required:!1,tsType:{name:`number`},description:`The target, drawn as a line across the bar.`},ranges:{required:!1,tsType:{name:`unknown`},description:`Qualitative ranges in ascending order, the first drawn darkest.`,defaultValue:{value:`[]`,computed:!1}},minValue:{required:!1,tsType:{name:`number`},description:`Defaults to 0.`,defaultValue:{value:`0`,computed:!1}},maxValue:{required:!1,tsType:{name:`number`},description:`Defaults to the last range's end, or the larger of the value and the target.`},formatOptions:{required:!1,tsType:{name:`Intl.NumberFormatOptions`},description:"`Intl.NumberFormat` options for the value, the target and the scale."},unit:{required:!1,tsType:{name:`string`},description:`The values' unit ("kW").`},hasScale:{required:!1,tsType:{name:`boolean`},description:`Shows the scale's numbers under the bar. Defaults to true.`,defaultValue:{value:`true`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``}}}})))()}var C,w,T,E,D,O;function k(){return(k=e((()=>{S(),C=l(),w={title:`Chart/Bullet`,component:y,parameters:{layout:`padded`},args:{label:`Observing hours`,value:1840,target:2e3,ranges:[{to:1500,label:`Behind`},{to:1900,label:`On track`},{to:2400,label:`Ahead`}],unit:`h`}},T={},E={render:()=>(0,C.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-5`,children:[(0,C.jsx)(y,{label:`Dome uptime`,value:.915,target:.95,ranges:[{to:.8,label:`Poor`},{to:.92,label:`Satisfactory`},{to:1,label:`Good`}],formatOptions:{style:`percent`,maximumFractionDigits:1}}),(0,C.jsx)(y,{label:`Observing hours`,value:1840,target:2e3,ranges:[{to:1500,label:`Behind`},{to:1900,label:`On track`},{to:2400,label:`Ahead`}],unit:`h`}),(0,C.jsx)(y,{label:`Archive requests served`,value:1.42,target:1.2,ranges:[{to:.8,label:`Low`},{to:1.4,label:`Expected`},{to:2,label:`High`}],formatOptions:{maximumFractionDigits:2},unit:`M`})]})},D={args:{label:`Storage used`,value:61,maxValue:100,unit:`TB`,ranges:[],target:void 0}},O=[`Default`,`KpiList`,`Plain`],T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{}`,...T.parameters?.docs?.source},description:{story:`A measure against its target over poor, satisfactory and good ranges; the range's name shows by the value.`,...T.parameters?.docs?.description}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-xl flex-col gap-5">
      <BulletChart label="Dome uptime" value={0.915} target={0.95} ranges={[{
      to: 0.8,
      label: 'Poor'
    }, {
      to: 0.92,
      label: 'Satisfactory'
    }, {
      to: 1,
      label: 'Good'
    }]} formatOptions={{
      style: 'percent',
      maximumFractionDigits: 1
    }} />
      <BulletChart label="Observing hours" value={1_840} target={2_000} ranges={[{
      to: 1_500,
      label: 'Behind'
    }, {
      to: 1_900,
      label: 'On track'
    }, {
      to: 2_400,
      label: 'Ahead'
    }]} unit="h" />
      <BulletChart label="Archive requests served" value={1.42} target={1.2} ranges={[{
      to: 0.8,
      label: 'Low'
    }, {
      to: 1.4,
      label: 'Expected'
    }, {
      to: 2,
      label: 'High'
    }]} formatOptions={{
      maximumFractionDigits: 2
    }} unit="M" />
    </div>
}`,...E.parameters?.docs?.source},description:{story:`Several bullets as a KPI list, each on its own scale.`,...E.parameters?.docs?.description}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Storage used',
    value: 61,
    maxValue: 100,
    unit: 'TB',
    ranges: [],
    target: undefined
  }
}`,...D.parameters?.docs?.source},description:{story:`No ranges or target: a plain bar on a scale.`,...D.parameters?.docs?.description}}}})))()}k();export{T as Default,E as KpiList,D as Plain,O as __namedExportsOrder,w as default};