import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{r as n,t as r}from"./I18nProvider-CHhkoz8A.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{i as a,n as o}from"./useMediaQuery-i3TlItxV.js";import{a as s,n as c}from"./intl-DmPaWkhT.js";import{r as l}from"./math-CJ-pjqGV.js";import{l as u,r as d,u as f}from"./moreCharts-DDtQOmLd.js";import{n as p,t as m}from"./messages-C7trWVFY.js";import{n as h,t as ee}from"./ChartFrame-Cgg-LCeq.js";import{_ as g,a as te,c as _,g as v,h as y,i as b,l as x,m as S,n as ne,p as C,r as w,t as T}from"./useChart-DBhP0VHh.js";import{c as E,i as D,l as O,n as k,o as A,s as j,u as M}from"./chartOptions-A6AmcH98.js";import{i as N,l as P,n as F,u as I}from"./tableColumns-BpFcTQNg.js";import{a as L,c as R}from"./plotStrings-pVgM28R_.js";function z(){G||(G=!0,x.register(_))}function B(e){let t=e.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.y));if(t.length<3)return;let n=t.reduce((e,t)=>e+t.x,0)/t.length,r=t.reduce((e,t)=>e+t.y,0)/t.length,i=0,a=0,o=0;for(let e of t)i+=(e.x-n)*(e.y-r),a+=(e.x-n)**2,o+=(e.y-r)**2;return a===0||o===0?void 0:i/Math.sqrt(a*o)}function V(e,t,n,r){return!(t>0)||!(e>0)?n:n+(r-n)*Math.sqrt(Math.min(e,t)/t)}function H({series:e,xAxis:t,yAxis:n,sizeLabel:i,sizeUnit:o,isZoomable:c=!0,...u}){z();let d=p(R),{locale:f}=r(),{palette:m,isReducedMotion:h}=w(),_=a(),{hidden:y,isDimmed:x,legendProps:C}=te(),T=b(),D=e.some(e=>e.data.some(e=>e.size!==void 0)),O=t?.title??d.scatterX,I=n?.title??d.scatterY,L=i??d.scatterSize,H=e.every(e=>e.data.length===0),G=(0,U.useMemo)(()=>v(e,m),[e,m]),K=(0,U.useMemo)(()=>{let r=Math.max(0,l(e.flatMap(e=>e.data.map(e=>e.size??0)))?.[1]??0),i=_?16:26,a=(e,t)=>{let n=e?.scale===`log`;return{...j(m,{maxTicksLimit:_?4:t?7:8,format:M(n,t=>P(t,f,e?.unit)),axis:e,isLog:n}),grace:D&&!n?`6%`:0}};return{type:D?`bubble`:`scatter`,data:{datasets:e.map((e,t)=>{let n=m.series(e.color,t),a=x(e.id);return{label:e.label,data:e.data.map(e=>({x:e.x,y:e.y,r:D?V(e.size??0,r,3,i):4})),hidden:y.has(e.id),pointStyle:S[t%S.length],backgroundColor:g(n,a?.12:D?.45:.75),borderColor:g(n,a?.25:1),borderWidth:1.5,pointRadius:4,pointHoverRadius:6,hoverRadius:2}})},options:{...k(h,{tooltip:A(m,{title:t=>{let n=t[0];return n?e[n.datasetIndex]?.data[n.dataIndex]?.label??n.dataset.label??``:``},label:r=>{let i=e[r.datasetIndex],a=i?.data[r.dataIndex];return!i||!a?``:[...a.label===void 0||e.length<2?[]:[i.label],`${O}: ${P(a.x,f,t?.unit)}`,`${I}: ${P(a.y,f,n?.unit)}`,...a.size===void 0?[]:[`${L}: ${P(a.size,f,o)}`]]}}),zoom:E({control:T.control,palette:m,mode:`xy`,isZoomable:c,hasDrag:!0,limits:{x:{min:t?.min??`original`,max:t?.max??`original`},y:{min:n?.min??`original`,max:n?.max??`original`}}})}),layout:{autoPadding:!0},interaction:{mode:`nearest`,intersect:!1,axis:`xy`},scales:{x:a(t,!1),y:a(n,!0)}}}},[e,D,y,x,m,h,_,T.control,c,f,t,n,O,I,L,o]),{canvasRef:q,chart:J}=ne(K),Y=(0,U.useMemo)(()=>{let r=e.reduce((e,t)=>e+t.data.length,0),i=[d.scatterSummary({points:r,series:e.length})];for(let r of e){let e=l(r.data.map(e=>e.x)),a=l(r.data.map(e=>e.y));if(!e||!a)continue;i.push(d.scatterSeriesRange({label:r.label,xName:O,xMin:P(e[0],f,t?.unit),xMax:P(e[1],f,t?.unit),yName:I,yMin:P(a[0],f,n?.unit),yMax:P(a[1],f,n?.unit)}));let o=B(r.data);o!==void 0&&i.push(d.scatterCorrelation({r:o,value:s(f,{maximumFractionDigits:2}).format(o)}))}return i.join(` `)},[d,e,f,t,n,O,I]),X=()=>{let r=e.some(e=>e.data.some(e=>e.label!==void 0)),i=e.length>1||!r,a=(e,t)=>F(e,t,e=>P(e,f),{isSortable:!0,mobile:!0});return{columns:[...i?[{id:`series`,header:d.chartSeries,isRowHeader:!r,isSortable:!0,value:e=>e.series}]:[],...r?[{id:`label`,header:d.scatterPoint,isRowHeader:!0,isSortable:!0,value:e=>e.label}]:[],a(`x`,N(O,t?.unit)),a(`y`,N(I,n?.unit)),...D?[a(`size`,N(L,o))]:[]],rows:e.flatMap(e=>e.data.map((t,n)=>({__key:`${e.id}:${String(n)}`,series:e.label,label:t.label??``,x:t.x,y:t.y,size:t.size??null})))}};return(0,W.jsx)(ee,{...u,summary:Y,isEmpty:H,...C(G),table:X,chart:J,zoom:T,canvasRef:q})}var U,W,G;function K(){return(K=e((()=>{C(),U=t(),n(),o(),c(),h(),D(),y(),I(),m(),L(),T(),O(),W=i(),G=!1,H.__docgenInfo={description:`A scatter or bubble chart: points on two numeric axes, in one or more series. The legend shows, hides and
highlights series; it has a title, a generated summary (ranges and correlation), "View as table", PNG and CSV
export, zoom and full screen.`,methods:[],displayName:`ScatterChart`,props:{title:{required:!0,tsType:{name:`string`},description:`Names the chart (its heading and the canvas's accessible name).`},description:{required:!1,tsType:{name:`ReactNode`},description:``},headingLevel:{required:!1,tsType:{name:`union`,raw:`2 | 3 | 4 | 5 | 6`,elements:[{name:`literal`,value:`2`},{name:`literal`,value:`3`},{name:`literal`,value:`4`},{name:`literal`,value:`5`},{name:`literal`,value:`6`}]},description:`Defaults to 3.`},isTitleHidden:{required:!1,tsType:{name:`boolean`},description:`Keeps the title for screen readers only (when the surrounding card already shows it).`},isLoading:{required:!1,tsType:{name:`boolean`},description:``},error:{required:!1,tsType:{name:`ReactNode`},description:"Loading failed: an error state, with Retry when `onRetry` is given."},onRetry:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},emptyState:{required:!1,tsType:{name:`ReactNode`},description:`Shown when there's no data. Defaults to "No data".`},hasTableToggle:{required:!1,tsType:{name:`boolean`},description:`Offers "View as table". Defaults to true.`},exportFileName:{required:!1,tsType:{name:`string`},description:`Offers PNG and CSV export, saved under this name.`},hasFullScreen:{required:!1,tsType:{name:`boolean`},description:`Offers full screen. Defaults to true.`},height:{required:!1,tsType:{name:`string`},description:"The plot's height on tablets and desktops (CSS), such as `18rem`. Phones use a 4:3 box. `100%` fills the\ncontainer's height on every device instead (a dashboard widget's frame). Defaults to `18rem`."},hasLegend:{required:!1,tsType:{name:`boolean`},description:`Shows the legend of series (when there's more than one). Turn it off when a legend outside the chart drives it,
such as a dashboard's consolidated legend; the summary stays. Defaults to true.`},hasToolbar:{required:!1,tsType:{name:`boolean`},description:"Shows the toolbar: Reset zoom, View as table, Export and Full screen. Defaults to true. Turn it off when a host\nshows the actions in its own menu (`onActionsChange`); the title stays for screen readers."},onActionsChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(actions: readonly ChartFrameAction[]) => void`,signature:{arguments:[{type:{name:`unknown`},name:`actions`}],return:{name:`void`}}},description:`Called with the toolbar's actions whenever they change (Reset zoom while zoomed, the table toggle, the exports), so
a host can offer them in its single action menu, such as a dashboard widget's (WID-08).`},className:{required:!1,tsType:{name:`string`},description:``},series:{required:!0,tsType:{name:`unknown`},description:``},xAxis:{required:!1,tsType:{name:`ScatterAxisOptions`},description:"The horizontal axis. Its `title` names the x values in tooltips, the summary and the table."},yAxis:{required:!1,tsType:{name:`ScatterAxisOptions`},description:"The vertical axis. Its `title` names the y values in tooltips, the summary and the table."},sizeLabel:{required:!1,tsType:{name:`string`},description:`Names the bubbles' size ("Population"), in tooltips and the table.`},sizeUnit:{required:!1,tsType:{name:`string`},description:`The sizes' unit.`},isZoomable:{required:!1,tsType:{name:`boolean`},description:`Allows zooming (pinch and pan on touch, Ctrl+wheel or drag with a mouse). Defaults to true.`,defaultValue:{value:`true`,computed:!1}}}}})))()}var q,J,Y,X,Z,Q;function $(){return($=e((()=>{d(),K(),q=i(),J={title:`Chart/Scatter`,parameters:{layout:`padded`}},Y={render:()=>(0,q.jsx)(H,{title:`Candidate sites`,description:`Altitude against clear nights`,series:f,xAxis:{title:`Altitude`,unit:`m`},yAxis:{title:`Clear nights`,suggestedMin:100},exportFileName:`candidate-sites`})},X={render:()=>(0,q.jsx)(H,{title:`Candidate sites`,description:`Bubble size: largest mirror the site could host`,series:u,xAxis:{title:`Altitude`,unit:`m`},yAxis:{title:`Clear nights`},sizeLabel:`Mirror`,sizeUnit:`m`,height:`22rem`})},Z={render:()=>(0,q.jsx)(H,{title:`Survey targets`,series:[{id:`targets`,label:`Targets`,data:[{x:3,y:12},{x:18,y:20},{x:45,y:26},{x:120,y:31},{x:600,y:41},{x:2400,y:47},{x:9e3,y:58},{x:4e4,y:66}]}],xAxis:{title:`Distance`,unit:`pc`,scale:`log`},yAxis:{title:`Exposure`,unit:`min`}})},Q=[`Scatter`,`Bubble`,`LogAxis`],Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: () => <ScatterChart title="Candidate sites" description="Altitude against clear nights" series={sitesScatter} xAxis={{
    title: 'Altitude',
    unit: 'm'
  }} yAxis={{
    title: 'Clear nights',
    suggestedMin: 100
  }} exportFileName="candidate-sites" />
}`,...Y.parameters?.docs?.source},description:{story:`Candidate telescope sites: altitude against clear nights a year, in two series with their own colours and point
shapes. The tooltip names each site; the summary gives each series' ranges and how strongly the two move together;
the table lists every point. Drag (with a mouse) or pinch to zoom.`,...Y.parameters?.docs?.description}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: () => <ScatterChart title="Candidate sites" description="Bubble size: largest mirror the site could host" series={sites} xAxis={{
    title: 'Altitude',
    unit: 'm'
  }} yAxis={{
    title: 'Clear nights'
  }} sizeLabel="Mirror" sizeUnit="m" height="22rem" />
}`,...X.parameters?.docs?.source},description:{story:`The same sites as bubbles, each as large as the mirror the site could host.`,...X.parameters?.docs?.description}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  render: () => <ScatterChart title="Survey targets" series={[{
    id: 'targets',
    label: 'Targets',
    data: [{
      x: 3,
      y: 12
    }, {
      x: 18,
      y: 20
    }, {
      x: 45,
      y: 26
    }, {
      x: 120,
      y: 31
    }, {
      x: 600,
      y: 41
    }, {
      x: 2_400,
      y: 47
    }, {
      x: 9_000,
      y: 58
    }, {
      x: 40_000,
      y: 66
    }]
  }]} xAxis={{
    title: 'Distance',
    unit: 'pc',
    scale: 'log'
  }} yAxis={{
    title: 'Exposure',
    unit: 'min'
  }} />
}`,...Z.parameters?.docs?.source},description:{story:`A logarithmic x-axis, for values that span orders of magnitude.`,...Z.parameters?.docs?.description}}}})))()}$();export{X as Bubble,Z as LogAxis,Y as Scatter,Q as __namedExportsOrder,J as default};