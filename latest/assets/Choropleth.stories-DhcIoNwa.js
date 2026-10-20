import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{i as n,n as r,r as i,t as a}from"./MapView-C-4CAtej.js";import{t as o}from"./jsx-runtime-MKhVqBIO.js";import{n as s,t as c}from"./maplibre-DCeitm03.js";var l,u,d,f,p,m,h;function g(){return(g=e((()=>{l=[`Alpha`,`Beta`,`Gamma`,`Delta`,`Epsilon`,`Zeta`,`Eta`,`Theta`,`Iota`,`Kappa`,`Lambda`,`Mu`,`Nu`,`Xi`,`Omicron`],u=5,d=20,f=-50,p=30,m={type:`FeatureCollection`,features:l.map((e,t)=>{let n=f+t%u*d,r=p-Math.floor(t/u)*d,i=n+d,a=r-d;return{type:`Feature`,id:e.toLowerCase(),properties:{name:e},geometry:{type:`Polygon`,coordinates:[[[n,a],[i,a],[i,r],[n,r],[n,a]]]}}})},h=Object.fromEntries(l.map((e,t)=>[e.toLowerCase(),e===`Kappa`?null:(t*37+11)%97*12+40]))})))()}function _(e){let t=7;for(let n=0;n<e.length;n+=1)t=(t*31+e.charCodeAt(n))%10007;return t*3}function v(e){let t=e.properties??{},n=t.ISO_A3??t.iso_a3??t.ADM0_A3;return typeof n==`string`?n:i(e)}var y,b,x,S,C,w,T,E;function D(){return(D=e((()=>{y=t(),c(),g(),n(),r(),b=o(),x={title:`Map/Choropleth`,parameters:{layout:`padded`}},S={render:()=>(0,b.jsx)(a,{"aria-label":`Requests by region`,styleUrl:s,choropleth:{shapes:m,values:h,scale:{steps:5},unit:`req/s`},markers:[{id:`north`,label:`North observatory`,position:[-30,15],tone:`success`},{id:`south`,label:`South observatory`,position:[25,-18],tone:`warning`}]})},C={render:()=>(0,b.jsx)(a,{"aria-label":`Change by region`,styleUrl:s,choropleth:{shapes:m,values:Object.fromEntries(Object.entries(h).map(([e,t])=>[e,t===null?null:Math.round((t-600)/10)])),scale:{type:`diverging`,midpoint:0,steps:6},unit:`%`}})},w={render:()=>(0,b.jsx)(a,{"aria-label":`Requests by region`,styleUrl:`/missing-style.json`,height:`16rem`,choropleth:{shapes:m,values:h,scale:{steps:5},unit:`req/s`}})},T={tags:[`!visual`],render:function(){let[e,t]=(0,y.useState)(m);(0,y.useEffect)(()=>{let e=!0;return fetch(`media/countries.geojson`).then(e=>e.ok?e.json():null).then(n=>{e&&n?.type===`FeatureCollection`&&t(n)}).catch(()=>void 0),()=>{e=!1}},[]);let n=Object.fromEntries(e.features.map(e=>{let t=v(e);return[t,_(t)]}));return(0,b.jsx)(a,{"aria-label":`Requests by country`,styleUrl:s,height:`28rem`,choropleth:{shapes:e,values:n,getId:v,scale:{steps:5},unit:`req/s`}})}},E=[`RequestsByRegion`,`Diverging`,`Unavailable`,`Countries`],S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <MapView aria-label="Requests by region" styleUrl={offlineStyle} choropleth={{
    shapes: gridRegions,
    values: gridValues,
    scale: {
      steps: 5
    },
    unit: 'req/s'
  }} markers={[{
    id: 'north',
    label: 'North observatory',
    position: [-30, 15],
    tone: 'success'
  }, {
    id: 'south',
    label: 'South observatory',
    position: [25, -18],
    tone: 'warning'
  }]} />
}`,...S.parameters?.docs?.source},description:{story:`Requests per second by region on a 5-step scale, with a legend, a summary naming the highest and lowest, and the
regions listed by value below (focus one to highlight it on the map). Hover or tap a region for its tooltip.
Markers sit on top. The regions are a synthetic grid, so the story works offline.`,...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <MapView aria-label="Change by region" styleUrl={offlineStyle} choropleth={{
    shapes: gridRegions,
    values: Object.fromEntries(Object.entries(gridValues).map(([id, value]) => [id, value === null ? null : Math.round((value - 600) / 10)])),
    scale: {
      type: 'diverging',
      midpoint: 0,
      steps: 6
    },
    unit: '%'
  }} />
}`,...C.parameters?.docs?.source},description:{story:`A diverging scale around a target: change in error rate, red below and green above zero.`,...C.parameters?.docs?.description}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <MapView aria-label="Requests by region" styleUrl="/missing-style.json" height="16rem" choropleth={{
    shapes: gridRegions,
    values: gridValues,
    scale: {
      steps: 5
    },
    unit: 'req/s'
  }} />
}`,...w.parameters?.docs?.source},description:{story:`When the map can't load, the legend, summary and the list of regions by value still work.`,...w.parameters?.docs?.description}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function Render() {
    const [shapes, setShapes] = useState<FeatureCollection>(gridRegions);
    useEffect(() => {
      let isCurrent = true;
      fetch('media/countries.geojson').then(response => response.ok ? response.json() as Promise<FeatureCollection> : null).then(data => {
        if (isCurrent && data?.type === 'FeatureCollection') {
          setShapes(data);
        }
      }).catch(() => undefined);
      return () => {
        isCurrent = false;
      };
    }, []);
    const values = Object.fromEntries(shapes.features.map(feature => {
      const id = countryId(feature);
      return [id, valueFor(id)];
    }));
    return <MapView aria-label="Requests by country" styleUrl={offlineStyle} height="28rem" choropleth={{
      shapes,
      values,
      getId: countryId,
      scale: {
        steps: 5
      },
      unit: 'req/s'
    }} />;
  }
}`,...T.parameters?.docs?.source},description:{story:"Requests by country for every country in `.storybook/public/media/countries.geojson` (for example Natural Earth's\nadmin-0 countries), when that file is present; otherwise the synthetic regions.",...T.parameters?.docs?.description}}}})))()}D();export{T as Countries,C as Diverging,S as RequestsByRegion,w as Unavailable,E as __namedExportsOrder,x as default};