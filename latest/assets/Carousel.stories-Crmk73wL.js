import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,t as o}from"./Badge-B8tm3wVn.js";import{a as s,i as c,n as l}from"./Layout-C_4VBnI9.js";import{n as u,r as d}from"./Text-CiszJ5rL.js";import{n as f,t as p}from"./Card-BKrFQ2m4.js";import{n as m,t as h}from"./Carousel-Ru0h-jPs.js";import{a as g,r as _}from"./mediaImages-BJPUk9rJ.js";import{t as v}from"./virtualizer-Dlk4ddOo.js";function y({index:e}){let t=C[e];return t&&(0,S.jsxs)(`figure`,{className:`flex flex-col gap-2`,children:[(0,S.jsx)(`img`,{src:t.src,alt:t.alt,width:t.width,height:t.height,draggable:!1,className:`aspect-[4/3] h-auto w-full rounded-control bg-surface-3 object-cover`}),(0,S.jsx)(`figcaption`,{className:`text-center text-sm text-fg-muted`,children:t.caption})]})}function b({trip:e}){return(0,S.jsx)(p,{title:e.title,description:`${String(e.nights)} nights`,actions:e.isNew&&(0,S.jsx)(o,{tone:`accent`,children:`New`}),footer:(0,S.jsx)(i,{variant:`outline`,size:`sm`,children:`View trip`}),className:`h-full`,children:(0,S.jsx)(u,{children:e.description})})}var x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R;function z(){return(z=e((()=>{x=t(),_(),a(),r(),f(),s(),d(),m(),S=n(),C=g(),w={title:`Display/Carousel`,component:h,args:{"aria-label":`Planets`,children:null}},T={render:()=>(0,S.jsx)(`div`,{className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Planets`,children:C.map((e,t)=>(0,S.jsx)(y,{index:t},e.id))})})},E={render:()=>(0,S.jsx)(`div`,{className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Planets`,isLooping:!0,renderThumbnail:e=>(0,S.jsx)(`img`,{src:C[e]?.src,alt:``,draggable:!1,loading:`lazy`,className:`size-full object-cover`}),children:C.map((e,t)=>(0,S.jsx)(y,{index:t},e.id))})})},D=[{id:`lofoten`,title:`Lofoten Islands`,description:`Fjords, fishing villages and the midnight sun.`,nights:6,isNew:!0},{id:`atacama`,title:`Atacama Desert`,description:`Salt flats, geysers and the clearest night skies.`,nights:5},{id:`kyoto`,title:`Kyoto`,description:`Temples, gardens and a tea ceremony in Gion.`,nights:4},{id:`patagonia`,title:`Patagonia`,description:`Glaciers and granite towers at the end of the world.`,nights:9},{id:`azores`,title:`The Azores`,description:`Crater lakes, hot springs and whale watching.`,nights:5,isNew:!0},{id:`dolomites`,title:`Dolomites`,description:`Hut-to-hut hiking under pale limestone peaks.`,nights:7},{id:`namibia`,title:`Namibia`,description:`Red dunes, desert elephants and the Skeleton Coast.`,nights:8}],O={render:()=>(0,S.jsxs)(c,{gap:`sm`,children:[(0,S.jsx)(`h2`,{id:`trips-heading`,className:`text-lg font-semibold`,children:`Trips`}),(0,S.jsx)(h,{"aria-labelledby":`trips-heading`,items:D,columns:{base:1,sm:2,md:3},moveBy:`page`,children:e=>(0,S.jsx)(b,{trip:e})})]})},k={tags:[`!visual`],render:()=>(0,S.jsx)(`div`,{className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Planets`,shouldAutoPlay:!0,isLooping:!0,autoPlayIntervalMs:3e3,children:C.map((e,t)=>(0,S.jsx)(y,{index:t},e.id))})})},A={render:()=>(0,S.jsx)(`div`,{className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Planets`,isPlaying:!1,isLooping:!0,children:C.map((e,t)=>(0,S.jsx)(y,{index:t},e.id))})})},j={tags:[`!visual`],render:function(){let[e,t]=(0,x.useState)(2);return(0,S.jsxs)(c,{gap:`md`,className:`max-w-2xl`,children:[(0,S.jsx)(l,{children:C.map((n,r)=>(0,S.jsx)(i,{size:`sm`,variant:r===e?`solid`:`outline`,onPress:()=>{t(r)},children:n.caption},n.id))}),(0,S.jsx)(h,{"aria-label":`Planets`,index:e,onIndexChange:t,children:C.map((e,t)=>(0,S.jsx)(y,{index:t},e.id))})]})}},M=Array.from({length:1e4},(e,t)=>t+1),N={render:()=>(0,S.jsx)(h,{"aria-label":`Numbers`,items:M,columns:{base:2,md:4},gap:`sm`,isLooping:!0,children:e=>(0,S.jsx)(`div`,{className:`flex h-24 items-center justify-center rounded-control bg-surface-2 text-2xl font-semibold tabular-nums`,children:e})})},P=Array.from({length:300},(e,t)=>({id:t+1})),F={beforeEach:v,render:()=>(0,S.jsx)(`div`,{className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Frames`,items:P,renderThumbnail:e=>(0,S.jsx)(`span`,{className:`flex size-full items-center justify-center bg-surface-3 text-xs font-semibold tabular-nums`,children:e.id}),children:e=>(0,S.jsx)(`div`,{className:`flex aspect-video items-center justify-center rounded-control bg-surface-2 text-4xl font-semibold tabular-nums`,children:e.id})})})},I={render:()=>(0,S.jsx)(`div`,{className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Planets`,hasPicker:!1,gap:`none`,columns:2,children:C.map(e=>(0,S.jsx)(`img`,{src:e.src,alt:e.alt,draggable:!1,className:`aspect-[4/3] w-full object-cover`},e.id))})})},L={render:()=>(0,S.jsx)(`div`,{dir:`rtl`,className:`max-w-2xl`,children:(0,S.jsx)(h,{"aria-label":`Planets`,defaultIndex:1,children:C.map((e,t)=>(0,S.jsx)(y,{index:t},e.id))})})},R=[`Images`,`Thumbnails`,`Cards`,`Autoplay`,`AutoplayStopped`,`Controlled`,`ManySlides`,`LongThumbnailStrip`,`PlainArrows`,`RightToLeft`],T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-2xl">
      <Carousel aria-label="Planets">
        {planets.map((planet, index) => <PlanetSlide key={planet.id} index={index} />)}
      </Carousel>
    </div>
}`,...T.parameters?.docs?.source},description:{story:`One image at a time: the arrows, the dots, a swipe or drag, or the arrow keys change it.`,...T.parameters?.docs?.description}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-2xl">
      <Carousel aria-label="Planets" isLooping renderThumbnail={index => <img src={planets[index]?.src} alt="" draggable={false} loading="lazy" className="size-full object-cover" />}>
        {planets.map((planet, index) => <PlanetSlide key={planet.id} index={index} />)}
      </Carousel>
    </div>
}`,...E.parameters?.docs?.source},description:{story:`Thumbnails instead of dots, and looping: past Neptune comes Mercury again.`,...E.parameters?.docs?.description}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="sm">
      <h2 id="trips-heading" className="text-lg font-semibold">
        Trips
      </h2>
      <Carousel aria-labelledby="trips-heading" items={trips} columns={{
      base: 1,
      sm: 2,
      md: 3
    }} moveBy="page">
        {trip => <TripCard trip={trip} />}
      </Carousel>
    </Stack>
}`,...O.parameters?.docs?.source},description:{story:"Cards from `items`, as many in view as the carousel's width allows (one, then two from 24rem, then three from\n42rem), moving a page at a time.",...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-2xl">
      <Carousel aria-label="Planets" shouldAutoPlay isLooping autoPlayIntervalMs={3000}>
        {planets.map((planet, index) => <PlanetSlide key={planet.id} index={index} />)}
      </Carousel>
    </div>
}`,...k.parameters?.docs?.source},description:{story:`Moves on every 3 seconds and loops. The button stops and starts it; it also pauses while the pointer is over the
carousel, while focus is inside it and while the page is hidden, and dragging the slides stops it.`,...k.parameters?.docs?.description}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-2xl">
      <Carousel aria-label="Planets" isPlaying={false} isLooping>
        {planets.map((planet, index) => <PlanetSlide key={planet.id} index={index} />)}
      </Carousel>
    </div>
}`,...A.parameters?.docs?.source},description:{story:`The autoplay button, shown stopped: how an autoplay carousel looks for someone who prefers reduced motion.`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [index, setIndex] = useState(2);
    return <Stack gap="md" className="max-w-2xl">
        <Inline>
          {planets.map((planet, at) => <Button key={planet.id} size="sm" variant={at === index ? 'solid' : 'outline'} onPress={() => {
          setIndex(at);
        }}>
              {planet.caption}
            </Button>)}
        </Inline>
        <Carousel aria-label="Planets" index={index} onIndexChange={setIndex}>
          {planets.map((planet, at) => <PlanetSlide key={planet.id} index={at} />)}
        </Carousel>
      </Stack>;
  }
}`,...j.parameters?.docs?.source},description:{story:`The index from the app: buttons outside jump to a planet, and the carousel reports where it is.`,...j.parameters?.docs?.description}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <Carousel aria-label="Numbers" items={numbers} columns={{
    base: 2,
    md: 4
  }} gap="sm" isLooping>
      {number => <div className="flex h-24 items-center justify-center rounded-control bg-surface-2 text-2xl font-semibold tabular-nums">
          {number}
        </div>}
    </Carousel>
}`,...N.parameters?.docs?.source},description:{story:"Ten thousand slides from `items`: only those near the view are rendered, and the picker shows the position\ninstead of dots.",...N.parameters?.docs?.description}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  beforeEach: enableVirtualizer,
  render: () => <div className="max-w-2xl">
      <Carousel aria-label="Frames" items={frames} renderThumbnail={frame => <span className="flex size-full items-center justify-center bg-surface-3 text-xs font-semibold tabular-nums">
            {frame.id}
          </span>}>
        {frame => <div className="flex aspect-video items-center justify-center rounded-control bg-surface-2 text-4xl font-semibold tabular-nums">
            {frame.id}
          </div>}
      </Carousel>
    </div>
}`,...F.parameters?.docs?.source},description:{story:`Three hundred slides with thumbnails: the strip draws only the thumbnails in view as it scrolls, and keeps the
current one in view.`,...F.parameters?.docs?.description}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-2xl">
      <Carousel aria-label="Planets" hasPicker={false} gap="none" columns={2}>
        {planets.map(planet => <img key={planet.id} src={planet.src} alt={planet.alt} draggable={false} className="aspect-[4/3] w-full object-cover" />)}
      </Carousel>
    </div>
}`,...I.parameters?.docs?.source},description:{story:`Without the picker, and without the gap between slides.`,...I.parameters?.docs?.description}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  render: () => <div dir="rtl" className="max-w-2xl">
      <Carousel aria-label="Planets" defaultIndex={1}>
        {planets.map((planet, index) => <PlanetSlide key={planet.id} index={index} />)}
      </Carousel>
    </div>
}`,...L.parameters?.docs?.source},description:{story:`Right to left: the first slide is on the right, the arrows and swipes are mirrored.`,...L.parameters?.docs?.description}}}})))()}z();export{k as Autoplay,A as AutoplayStopped,O as Cards,j as Controlled,T as Images,F as LongThumbnailStrip,N as ManySlides,I as PlainArrows,L as RightToLeft,E as Thumbnails,R as __namedExportsOrder,w as default};