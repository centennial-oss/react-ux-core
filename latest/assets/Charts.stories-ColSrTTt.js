import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{r as n,t as r}from"./I18nProvider-CHhkoz8A.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{n as a,t as o}from"./intl-DmPaWkhT.js";import{a as s,r as c}from"./schedule-DEUl0GKc.js";import{r as l,t as u}from"./TimeSeriesChart-Debm0rcZ.js";import{n as d,t as f}from"./CategoryChart-DKmcwa1u.js";import{n as p,r as m,t as h}from"./Gauge-CjIM2EOn.js";function g(e){return`schedule`in e}function _(e){return Number(e)}function v({series:e,unit:t,isStacked:n=!1,...i}){let{locale:a}=r(),c=(0,y.useMemo)(()=>{let e=o(a,{hour:`numeric`,timeZone:`UTC`});return Array.from({length:24},(t,n)=>e.format(Date.UTC(2e3,0,1,n)))},[a]),l=(0,y.useMemo)(()=>e.map(e=>({id:e.id,label:e.label,color:e.color,data:g(e)?s(e.schedule,e.toNumber??_):Array.from({length:24},(t,n)=>e.data[n]??null)})),[e]);return(0,b.jsx)(f,{...i,categories:c,series:l,type:n?`stackedBar`:`bar`,unit:t})}var y,b;function x(){return(x=e((()=>{y=t(),n(),c(),a(),d(),b=i(),v.__docgenInfo={description:`Values by hour of the day (24 buckets, 0–23), for daily profiles and schedules. A series can be 24 numbers or a
ScheduleEditor value, which is shown as each hour's time-weighted value.`,methods:[],displayName:`HourOfDayChart`,props:{title:{required:!0,tsType:{name:`string`},description:`Names the chart (its heading and the canvas's accessible name).`},description:{required:!1,tsType:{name:`ReactNode`},description:``},headingLevel:{required:!1,tsType:{name:`union`,raw:`2 | 3 | 4 | 5 | 6`,elements:[{name:`literal`,value:`2`},{name:`literal`,value:`3`},{name:`literal`,value:`4`},{name:`literal`,value:`5`},{name:`literal`,value:`6`}]},description:`Defaults to 3.`},isTitleHidden:{required:!1,tsType:{name:`boolean`},description:`Keeps the title for screen readers only (when the surrounding card already shows it).`},isLoading:{required:!1,tsType:{name:`boolean`},description:``},error:{required:!1,tsType:{name:`ReactNode`},description:"Loading failed: an error state, with Retry when `onRetry` is given."},onRetry:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},emptyState:{required:!1,tsType:{name:`ReactNode`},description:`Shown when there's no data. Defaults to "No data".`},hasTableToggle:{required:!1,tsType:{name:`boolean`},description:`Offers "View as table". Defaults to true.`},exportFileName:{required:!1,tsType:{name:`string`},description:`Offers PNG and CSV export, saved under this name.`},hasFullScreen:{required:!1,tsType:{name:`boolean`},description:`Offers full screen. Defaults to true.`},height:{required:!1,tsType:{name:`string`},description:"The plot's height on tablets and desktops (CSS), such as `18rem`. Phones use a 4:3 box. `100%` fills the\ncontainer's height on every device instead (a dashboard widget's frame). Defaults to `18rem`."},hasLegend:{required:!1,tsType:{name:`boolean`},description:`Shows the legend of series (when there's more than one). Turn it off when a legend outside the chart drives it,
such as a dashboard's consolidated legend; the summary stays. Defaults to true.`},hasToolbar:{required:!1,tsType:{name:`boolean`},description:"Shows the toolbar: Reset zoom, View as table, Export and Full screen. Defaults to true. Turn it off when a host\nshows the actions in its own menu (`onActionsChange`); the title stays for screen readers."},onActionsChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(actions: readonly ChartFrameAction[]) => void`,signature:{arguments:[{type:{name:`unknown`},name:`actions`}],return:{name:`void`}}},description:`Called with the toolbar's actions whenever they change (Reset zoom while zoomed, the table toggle, the exports), so
a host can offer them in its single action menu, such as a dashboard widget's (WID-08).`},className:{required:!1,tsType:{name:`string`},description:``},series:{required:!0,tsType:{name:`unknown`},description:``},unit:{required:!1,tsType:{name:`string`},description:`The values' unit ("kW").`},isStacked:{required:!1,tsType:{name:`boolean`},description:`Stacks the series instead of grouping them.`,defaultValue:{value:`false`,computed:!1}}}}})))()}function S(e,t){return Array.from({length:e},(e,n)=>({t:T+n*E,v:Math.round(t(n)*10)/10}))}var C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q;function J(){return(J=e((()=>{d(),m(),x(),l(),C=i(),w={title:`Chart/Charts`,parameters:{layout:`padded`}},T=Date.UTC(2026,9,12,6),E=36e5,D={id:`usage`,label:`Usage`,unit:`kW`,type:`area`,color:`chart-1`,data:S(72,e=>40+25*Math.sin((e%24-6)*(Math.PI/12))+e%5),segments:[{from:T+60*E,to:T+72*E,style:`dashed`}]},O={id:`temperature`,label:`Temperature`,unit:`°C`,axis:`right`,color:`chart-2`,dash:[4,3],data:S(72,e=>12+8*Math.sin((e%24-9)*(Math.PI/12)))},k={id:`solar`,label:`Solar`,unit:`kW`,type:`bar`,color:`chart-3`,data:S(72,e=>Math.max(0,30*Math.sin((e%24-1)*(Math.PI/12))))},A={render:()=>(0,C.jsx)(u,{title:`North substation load`,description:`Last 3 days, hourly, Denver time`,series:[D,k,O],timeZone:`America/Denver`,thresholds:[{value:70,label:`Contract limit`,tone:`danger`}],bands:[{from:20,to:55,tone:`success`}],onRangeSelect:()=>void 0,exportFileName:`north-substation-load`})},j={render:()=>(0,C.jsxs)(`div`,{className:`flex flex-col gap-8`,children:[(0,C.jsx)(u,{title:`Loading`,series:[],isLoading:!0,height:`10rem`}),(0,C.jsx)(u,{title:`No readings`,series:[{...D,data:[]}],height:`10rem`}),(0,C.jsx)(u,{title:`Failed`,series:[],error:`The meter service didn’t respond.`,onRetry:()=>void 0,height:`10rem`})]})},M=[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`],N={render:()=>(0,C.jsx)(f,{title:`Energy by month`,type:`bar`,unit:`MWh`,categories:M,series:[{id:`grid`,label:`Grid`,data:[42,38,35,30,28,33]},{id:`solar`,label:`Solar`,data:[8,12,18,24,29,31]}],exportFileName:`energy-by-month`})},P={render:()=>(0,C.jsx)(f,{title:`Energy mix`,type:`stackedBar`,unit:`MWh`,categories:M,series:[{id:`grid`,label:`Grid`,data:[42,38,35,30,28,33]},{id:`solar`,label:`Solar`,data:[8,12,18,24,29,31]},{id:`battery`,label:`Battery`,data:[2,3,3,5,6,6]}]})},F={render:()=>(0,C.jsx)(f,{title:`Usage by site`,type:`horizontalBar`,unit:`kWh`,categories:[`North substation`,`South depot`,`East campus`,`West warehouse`],series:[{id:`usage`,label:`Usage`,data:[1840,920,1310,560]}]})},I={render:()=>(0,C.jsx)(f,{title:`Tariff mix`,type:`donut`,unit:`sites`,categories:[`Flat`,`Time of use`,`Demand`,`EV`],series:[{id:`sites`,label:`Sites`,data:[120,64,31,18]}]})},L=[12,11,10,10,11,14,22,35,48,52,55,57,56,55,54,53,50,46,40,32,25,19,15,13],R={render:()=>(0,C.jsx)(v,{title:`Typical weekday`,description:`Average load by hour, against the demand limit schedule`,unit:`kW`,series:[{id:`load`,label:`Average load`,data:L},{id:`limit`,label:`Demand limit`,color:`chart-4`,schedule:[{start:`00:00`,end:`06:00`,value:40},{start:`06:00`,end:`18:30`,value:60},{start:`18:30`,end:`24:00`,value:45}]}]})},z={render:()=>(0,C.jsxs)(`div`,{className:`grid grid-cols-1 gap-6 sm:grid-cols-3`,children:[(0,C.jsx)(h,{label:`Demand`,value:142,maxValue:250,unit:`kW`,thresholds:{warning:180,danger:220}}),(0,C.jsx)(h,{label:`Transformer load`,value:.86,maxValue:1,formatOptions:{style:`percent`},thresholds:{warning:.75,danger:.9}}),(0,C.jsx)(h,{label:`Battery`,value:12,maxValue:100,unit:`%`,badWhen:`low`,thresholds:{warning:30,danger:15}}),(0,C.jsx)(p,{label:`Monthly budget`,value:8200,maxValue:1e4,formatOptions:{style:`currency`,currency:`USD`,maximumFractionDigits:0},thresholds:{warning:8e3,danger:9500}}),(0,C.jsx)(p,{label:`Storage`,value:410,maxValue:500,unit:`GB`,thresholds:{warning:400,danger:475}}),(0,C.jsx)(p,{label:`Uptime`,value:99.2,minValue:95,maxValue:100,unit:`%`,badWhen:`low`,thresholds:{warning:99,danger:98}})]})},B=24*E,V={id:`practice`,label:`Quiz score`,unit:`%`,data:[48,51,55,53,58,62].map((e,t)=>({t:T+t*B,v:e}))},H={id:`hours`,label:`Study hours`,unit:`h`,type:`bar`,axis:`right`,color:`chart-3`,data:[1.5,2,.5,3,2.5,1].map((e,t)=>({t:T+t*B,v:e}))},U={value:80,label:`A grade`,tone:`success`},W={render:()=>(0,C.jsxs)(`div`,{className:`grid grid-cols-1 gap-6 lg:grid-cols-2`,children:[(0,C.jsx)(u,{title:`Threshold above the data`,series:[V],thresholds:[U],timeZone:`UTC`,height:`14rem`}),(0,C.jsx)(u,{title:`References left out`,series:[V],thresholds:[U],axes:{left:{shouldIncludeReferences:!1}},timeZone:`UTC`,height:`14rem`}),(0,C.jsx)(u,{title:`Pinned to 0–100`,series:[V],thresholds:[U],axes:{left:{min:0,max:100,title:`Score`}},timeZone:`UTC`,height:`14rem`}),(0,C.jsx)(u,{title:`Two axes, two ranges`,series:[V,H],axes:{left:{min:0,max:100,title:`Score`},right:{min:0,max:4,title:`Hours`}},timeZone:`UTC`,height:`14rem`}),(0,C.jsx)(f,{title:`Score by topic`,type:`horizontalBar`,categories:[`Mechanics`,`Waves and sound`,`Light and optics`,`Astronomy`],series:[{id:`score`,label:`Score`,data:[71,58,64,49]}],unit:`%`,valueAxis:{min:0,max:100},height:`14rem`})]})},G={render:()=>(0,C.jsxs)(`div`,{className:`grid grid-cols-1 gap-6 sm:grid-cols-3`,children:[(0,C.jsx)(p,{label:`Course progress`,value:64,maxValue:100,unit:`%`,badWhen:`low`,thresholds:{warning:70,danger:50},statusLabels:{normal:`On track`,warning:`Behind`,danger:`At risk`}}),(0,C.jsx)(p,{label:`Labs completed`,value:4,maxValue:6,hasStatus:!1}),(0,C.jsx)(p,{label:`Lab reports`,value:0,maxValue:6,badWhen:`low`,thresholds:{danger:2},status:{tone:`neutral`,label:`Not started`}})]})},K={render:()=>(0,C.jsx)(`div`,{className:`flex flex-col gap-6`,children:[{fade:0,shadeOpacity:.2,color:`chart-1`},{fade:50,shadeOpacity:.35,color:`chart-3`},{fade:100,shadeOpacity:.5,color:`chart-2`}].map(({fade:e,shadeOpacity:t,color:n})=>(0,C.jsx)(u,{title:`Fade ${String(e)}, shade opacity ${String(t)}`,height:`10rem`,series:[{...D,segments:void 0,color:n,fade:e,shadeOpacity:t}],timeZone:`America/Denver`},e))})},q=[`TimeSeriesOverview`,`TimeSeriesStates`,`Bars`,`StackedBars`,`HorizontalBars`,`Donut`,`HourOfDay`,`Gauges`,`ValueAxisRanges`,`GaugeStatuses`,`FadedAreas`],A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <TimeSeriesChart title="North substation load" description="Last 3 days, hourly, Denver time" series={[usage, solar, temperature]} timeZone="America/Denver" thresholds={[{
    value: 70,
    label: 'Contract limit',
    tone: 'danger'
  }]} bands={[{
    from: 20,
    to: 55,
    tone: 'success'
  }]} onRangeSelect={() => undefined} exportFileName="north-substation-load" />
}`,...A.parameters?.docs?.source},description:{story:`Usage (area, with a dashed forecast), solar (bars) and temperature (on a right axis), in Denver time, with a
contract limit and a normal band. Hover or tap for every series at that time; click the legend to hide or
highlight; drag across the chart to select a range (pinch and pan on touch).`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-8">
      <TimeSeriesChart title="Loading" series={[]} isLoading height="10rem" />
      <TimeSeriesChart title="No readings" series={[{
      ...usage,
      data: []
    }]} height="10rem" />
      <TimeSeriesChart title="Failed" series={[]} error="The meter service didn’t respond." onRetry={() => undefined} height="10rem" />
    </div>
}`,...j.parameters?.docs?.source},description:{story:`Loading, empty and error states.`,...j.parameters?.docs?.description}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart title="Energy by month" type="bar" unit="MWh" categories={months} series={[{
    id: 'grid',
    label: 'Grid',
    data: [42, 38, 35, 30, 28, 33]
  }, {
    id: 'solar',
    label: 'Solar',
    data: [8, 12, 18, 24, 29, 31]
  }]} exportFileName="energy-by-month" />
}`,...N.parameters?.docs?.source},description:{story:`Grouped bars by month, with export.`,...N.parameters?.docs?.description}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart title="Energy mix" type="stackedBar" unit="MWh" categories={months} series={[{
    id: 'grid',
    label: 'Grid',
    data: [42, 38, 35, 30, 28, 33]
  }, {
    id: 'solar',
    label: 'Solar',
    data: [8, 12, 18, 24, 29, 31]
  }, {
    id: 'battery',
    label: 'Battery',
    data: [2, 3, 3, 5, 6, 6]
  }]} />
}`,...P.parameters?.docs?.source},description:{story:`Stacked bars.`,...P.parameters?.docs?.description}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart title="Usage by site" type="horizontalBar" unit="kWh" categories={['North substation', 'South depot', 'East campus', 'West warehouse']} series={[{
    id: 'usage',
    label: 'Usage',
    data: [1840, 920, 1310, 560]
  }]} />
}`,...F.parameters?.docs?.source},description:{story:`Horizontal bars suit long category names.`,...F.parameters?.docs?.description}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart title="Tariff mix" type="donut" unit="sites" categories={['Flat', 'Time of use', 'Demand', 'EV']} series={[{
    id: 'sites',
    label: 'Sites',
    data: [120, 64, 31, 18]
  }]} />
}`,...I.parameters?.docs?.source},description:{story:`A donut of shares, with categories in the legend.`,...I.parameters?.docs?.description}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: () => <HourOfDayChart title="Typical weekday" description="Average load by hour, against the demand limit schedule" unit="kW" series={[{
    id: 'load',
    label: 'Average load',
    data: weekdayProfile
  }, {
    id: 'limit',
    label: 'Demand limit',
    color: 'chart-4',
    schedule: [{
      start: '00:00',
      end: '06:00',
      value: 40
    }, {
      start: '06:00',
      end: '18:30',
      value: 60
    }, {
      start: '18:30',
      end: '24:00',
      value: 45
    }]
  }]} />
}`,...R.parameters?.docs?.source},description:{story:`An hourly profile next to a schedule (a ScheduleEditor value, shown as each hour's average).`,...R.parameters?.docs?.description}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <Gauge label="Demand" value={142} maxValue={250} unit="kW" thresholds={{
      warning: 180,
      danger: 220
    }} />
      <Gauge label="Transformer load" value={0.86} maxValue={1} formatOptions={{
      style: 'percent'
    }} thresholds={{
      warning: 0.75,
      danger: 0.9
    }} />
      <Gauge label="Battery" value={12} maxValue={100} unit="%" badWhen="low" thresholds={{
      warning: 30,
      danger: 15
    }} />
      <MeterBar label="Monthly budget" value={8200} maxValue={10000} formatOptions={{
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }} thresholds={{
      warning: 8000,
      danger: 9500
    }} />
      <MeterBar label="Storage" value={410} maxValue={500} unit="GB" thresholds={{
      warning: 400,
      danger: 475
    }} />
      <MeterBar label="Uptime" value={99.2} minValue={95} maxValue={100} unit="%" badWhen="low" thresholds={{
      warning: 99,
      danger: 98
    }} />
    </div>
}`,...z.parameters?.docs?.source},description:{story:`Gauges as arcs and bars, in each state. Status shows as a shaped dot and a word, not only colour.`,...z.parameters?.docs?.description}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <TimeSeriesChart title="Threshold above the data" series={[practice]} thresholds={[gate]} timeZone="UTC" height="14rem" />
      <TimeSeriesChart title="References left out" series={[practice]} thresholds={[gate]} axes={{
      left: {
        shouldIncludeReferences: false
      }
    }} timeZone="UTC" height="14rem" />
      <TimeSeriesChart title="Pinned to 0–100" series={[practice]} thresholds={[gate]} axes={{
      left: {
        min: 0,
        max: 100,
        title: 'Score'
      }
    }} timeZone="UTC" height="14rem" />
      <TimeSeriesChart title="Two axes, two ranges" series={[practice, studyHours]} axes={{
      left: {
        min: 0,
        max: 100,
        title: 'Score'
      },
      right: {
        min: 0,
        max: 4,
        title: 'Hours'
      }
    }} timeZone="UTC" height="14rem" />
      <CategoryChart title="Score by topic" type="horizontalBar" categories={['Mechanics', 'Waves and sound', 'Light and optics', 'Astronomy']} series={[{
      id: 'score',
      label: 'Score',
      data: [71, 58, 64, 49]
    }]} unit="%" valueAxis={{
      min: 0,
      max: 100
    }} height="14rem" />
    </div>
}`,...W.parameters?.docs?.source},description:{story:"Value axes. A threshold above the data stretches its axis so it shows (the default); `shouldIncludeReferences:\nfalse` fits the data only; `min`/`max` pin a percent axis to 0–100; and dual axes take their own ranges.",...W.parameters?.docs?.description}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <MeterBar label="Course progress" value={64} maxValue={100} unit="%" badWhen="low" thresholds={{
      warning: 70,
      danger: 50
    }} statusLabels={{
      normal: 'On track',
      warning: 'Behind',
      danger: 'At risk'
    }} />
      <MeterBar label="Labs completed" value={4} maxValue={6} hasStatus={false} />
      <MeterBar label="Lab reports" value={0} maxValue={6} badWhen="low" thresholds={{
      danger: 2
    }} status={{
      tone: 'neutral',
      label: 'Not started'
    }} />
    </div>
}`,...G.parameters?.docs?.source},description:{story:"A gauge's status in the app's own words (`statusLabels`), left out (`hasStatus={false}`), or replaced outright\n(`status`), here a neutral \"Not started\" for a lab with no checks run.",...G.parameters?.docs?.description}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-6">
      {[{
      fade: 0,
      shadeOpacity: 0.2,
      color: 'chart-1' as const
    }, {
      fade: 50,
      shadeOpacity: 0.35,
      color: 'chart-3' as const
    }, {
      fade: 100,
      shadeOpacity: 0.5,
      color: 'chart-2' as const
    }].map(({
      fade,
      shadeOpacity,
      color
    }) => <TimeSeriesChart key={fade} title={\`Fade \${String(fade)}, shade opacity \${String(shadeOpacity)}\`} height="10rem" series={[{
      ...usage,
      segments: undefined,
      color,
      fade,
      shadeOpacity
    }]} timeZone="America/Denver" />)}
    </div>
}`,...K.parameters?.docs?.source},description:{story:"Area shades that fade toward the x-axis: `fade` 0 (no fade), 50, and 100 (transparent at the axis).",...K.parameters?.docs?.description}}}})))()}J();export{N as Bars,I as Donut,K as FadedAreas,G as GaugeStatuses,z as Gauges,F as HorizontalBars,R as HourOfDay,P as StackedBars,A as TimeSeriesOverview,j as TimeSeriesStates,W as ValueAxisRanges,q as __namedExportsOrder,w as default};