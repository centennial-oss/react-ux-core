import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{d as r,f as i,n as a,t as o}from"./Canvas-DpfmffTa.js";import{n as s,t as c}from"./CanvasItem-Acbr79lT.js";function l({room:e}){return(0,p.jsx)(`div`,{className:`flex size-full items-start rounded-control border border-border-strong bg-surface-2 p-2 text-sm text-fg`,children:e.label})}function u({hasRulers:e=!0}){let[t,n]=(0,f.useState)(h);return(0,p.jsx)(o,{"aria-label":`Observatory floor plan`,height:`26rem`,defaultViewport:{x:-8,y:-8,zoom:1},defaultSelection:[`control`],grid:{size:20},rulers:e?{unit:`m`}:void 0,onDelete:e=>{n(t=>t.filter(t=>!e.includes(t.id)))},children:t.map(e=>(0,p.jsx)(c,{id:e.id,x:e.x,y:e.y,width:e.width,height:e.height,"aria-label":e.label,onMoveEnd:t=>{n(n=>n.map(n=>n.id===e.id?{...n,...t}:n))},children:(0,p.jsx)(l,{room:e})},e.id))})}function d(){let{viewport:e,selection:t}=i();return(0,p.jsxs)(`p`,{className:`absolute top-2 right-2 z-10 rounded-control border border-border bg-surface-1 px-2 py-1 text-xs text-fg-muted tabular-nums`,children:[`x `,Math.round(e.x),` · y `,Math.round(e.y),` · `,t.length,` selected`]})}var f,p,m,h,g,_,v,y,b,x,S;function C(){return(C=e((()=>{f=t(),a(),s(),r(),p=n(),m={title:`Canvas/Canvas`,component:o,parameters:{layout:`padded`}},h=[{id:`dome`,label:`Telescope dome`,x:40,y:40,width:200,height:160},{id:`control`,label:`Control room`,x:280,y:40,width:160,height:100},{id:`lab`,label:`Optics lab`,x:280,y:160,width:160,height:80},{id:`archive`,label:`Plate archive`,x:40,y:240,width:120,height:80},{id:`visitor`,label:`Visitor centre`,x:200,y:280,width:240,height:100}],g={render:()=>(0,p.jsx)(u,{})},_={render:()=>(0,p.jsx)(u,{hasRulers:!1})},v={args:{"aria-label":`Empty sketch`,grid:{size:24},height:`16rem`}},y=2e3,b={render:function(){let[e,t]=(0,f.useState)(()=>Array.from({length:y},(e,t)=>({x:t%50*40+t*7%13,y:Math.floor(t/50)*40+t*11%17}))),n=(0,f.useMemo)(()=>e.map((e,n)=>(0,p.jsx)(c,{id:String(n),x:e.x,y:e.y,width:24,height:16,"aria-label":`Star ${String(n+1)}`,onMoveEnd:e=>{t(t=>t.map((t,r)=>r===n?e:t))},children:(0,p.jsx)(`div`,{className:`size-full rounded-sm bg-accent-solid`})},n)),[e]);return(0,p.jsx)(o,{"aria-label":`Star catalogue`,height:`28rem`,defaultViewport:{x:0,y:0,zoom:.5},grid:{size:20,isVisible:!1},hasMinimap:!0,children:n})}},x={render:()=>(0,p.jsx)(o,{"aria-label":`Observatory floor plan`,height:`22rem`,defaultViewport:{x:0,y:0,zoom:.75},selectionMode:`single`,defaultSelection:[`dome`],overlay:(0,p.jsx)(d,{}),children:h.map(e=>(0,p.jsx)(c,{id:e.id,x:e.x,y:e.y,width:e.width,height:e.height,"aria-label":e.label,isMovable:!1,children:(0,p.jsx)(l,{room:e})},e.id))})},S=[`FloorPlan`,`WithoutRulers`,`Empty`,`TwoThousandShapes`,`SingleSelectionWithReadout`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <FloorPlanDemo />
}`,...g.parameters?.docs?.source},description:{story:`A floor plan on a 20-unit grid with rulers in metres. Drags snap to the grid (hold Alt to place freely).`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <FloorPlanDemo hasRulers={false} />
}`,..._.parameters?.docs?.source},description:{story:`The same plan without rulers.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-label': 'Empty sketch',
    grid: {
      size: 24
    },
    height: '16rem'
  }
}`,...v.parameters?.docs?.source},description:{story:`An empty canvas: the grid, the controls and nothing else.`,...v.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [positions, setPositions] = useState(() => Array.from({
      length: STAR_COUNT
    }, (_, index) => ({
      x: index % 50 * 40 + index * 7 % 13,
      y: Math.floor(index / 50) * 40 + index * 11 % 17
    })));
    // Memoized, so the canvas's own frames never rebuild 2,000 elements.
    const items = useMemo(() => positions.map((position, index) => <CanvasItem key={index} id={String(index)} x={position.x} y={position.y} width={24} height={16} aria-label={\`Star \${String(index + 1)}\`} onMoveEnd={next => {
      setPositions(current => current.map((other, otherIndex) => otherIndex === index ? next : other));
    }}>
            <div className="size-full rounded-sm bg-accent-solid" />
          </CanvasItem>), [positions]);
    return <Canvas aria-label="Star catalogue" height="28rem" defaultViewport={{
      x: 0,
      y: 0,
      zoom: 0.5
    }} grid={{
      size: 20,
      isVisible: false
    }} hasMinimap>
        {items}
      </Canvas>;
  }
}`,...b.parameters?.docs?.source},description:{story:`2,000 rectangles (a star chart's catalogue) with a minimap. Panning and zooming move one layer, so no item
re-renders; marquee selection and grid-snapped drags still work.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <Canvas aria-label="Observatory floor plan" height="22rem" defaultViewport={{
    x: 0,
    y: 0,
    zoom: 0.75
  }} selectionMode="single" defaultSelection={['dome']} overlay={<Readout />}>
      {observatory.map(room => <CanvasItem key={room.id} id={room.id} x={room.x} y={room.y} width={room.width} height={room.height} aria-label={room.label} isMovable={false}>
          <RoomShape room={room} />
        </CanvasItem>)}
    </Canvas>
}`,...x.parameters?.docs?.source},description:{story:"Single selection with no marquee: a drag on empty space pans. The overlay reads the canvas with `useCanvas()`.",...x.parameters?.docs?.description}}}})))()}C();export{v as Empty,g as FloorPlan,x as SingleSelectionWithReadout,b as TwoThousandShapes,_ as WithoutRulers,S as __namedExportsOrder,m as default};