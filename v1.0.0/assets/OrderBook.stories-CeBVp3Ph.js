import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{c as r,o as i,r as a,s as o}from"./messages-C-NqTIx4.js";import{n as s,t as c}from"./OrderBook-C9hDF4YU.js";var l,u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{l=t(),i(),s(),u=n(),d=r(12),f={title:`Finance/OrderBook`,component:c,args:{bids:d.bids,asks:d.asks,currency:`USD`,depth:8},decorators:[e=>(0,u.jsx)(`div`,{className:`max-w-md`,children:(0,u.jsx)(e,{})})]},p={},m={render:function(e){let[t,n]=(0,l.useState)(`0.1`);return(0,u.jsx)(c,{...e,grouping:t,groupingOptions:[`0.05`,`0.1`,`0.5`,`1`],onGroupingChange:n})}},h={render:function(e){let[t,n]=(0,l.useState)(null);return(0,u.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,u.jsx)(c,{...e,onLevelPress:(e,t)=>{n(`${e} ${t}`)}}),(0,u.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Picked: `,t??`—`]})]})}},g={args:{...a(6),priceFormat:`probability`,currency:void 0}},_={args:{...o(20),depth:20}},v={args:{bids:d.bids.slice(0,4),asks:[]}},y=[`StarUsd`,`Grouped`,`PressableLevels`,`Probability`,`DeepBook`,`OneSided`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{}`,...p.parameters?.docs?.source},description:{story:`A fictional STAR/USD book: asks above, bids below, the spread and mid price between them, size bars behind each
row, and dots on the levels holding the user's own orders.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: function Render(args) {
    const [grouping, setGrouping] = useState('0.1');
    return <OrderBook {...args} grouping={grouping} groupingOptions={['0.05', '0.1', '0.5', '1']} onGroupingChange={setGrouping} />;
  }
}`,...m.parameters?.docs?.source},description:{story:`Price grouping (tick aggregation): bids round down and asks up to the chosen tick, with their sizes summed.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: function Render(args) {
    const [picked, setPicked] = useState<string | null>(null);
    return <div className="flex flex-col gap-2">
        <OrderBook {...args} onLevelPress={(side, price) => {
        setPicked(\`\${side} \${price}\`);
      }} />
        <p className="text-sm text-fg-muted">Picked: {picked ?? '—'}</p>
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:`Pressing a level reports its side and price, for filling an order ticket.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    ...cometBook(6),
    priceFormat: 'probability',
    currency: undefined
  }
}`,...g.parameters?.docs?.source},description:{story:`A prediction market's YES book for "Will the comet be visible to the naked eye by June?", with 0–1 prices shown
as percentages.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    ...starBook(20),
    depth: 20
  }
}`,..._.parameters?.docs?.source},description:{story:`Twenty levels a side, as a busy market shows them.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    bids: star.bids.slice(0, 4),
    asks: []
  }
}`,...v.parameters?.docs?.source},description:{story:`One side empty: the spread can't be worked out.`,...v.parameters?.docs?.description}}}})))()}b();export{_ as DeepBook,m as Grouped,v as OneSided,h as PressableLevels,g as Probability,p as StarUsd,y as __namedExportsOrder,f as default};