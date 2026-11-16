import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{o as n,t as r}from"./ListBox-Cn9bkTHg.js";import{n as i,t as a}from"./panel-right-open-BFnJqWqS.js";import{t as o}from"./jsx-runtime-MKhVqBIO.js";import{n as s,t as c}from"./Button-e4ZjaxXL.js";import{n as l,r as u,t as d}from"./Text-CiszJ5rL.js";import{n as f,t as p}from"./DescriptionList-B7nMiWBb.js";import{a as m,i as h,n as g}from"./ListBoxParts-CV4y54sA.js";import{n as _,t as v}from"./SplitView-Bv33Sswp.js";function y({selected:e,onSelect:t}){return(0,S.jsx)(r,{"aria-label":`Planets`,items:w,selectionMode:`single`,disallowEmptySelection:!0,selectedKeys:[e],onSelectionChange:e=>{let[n]=e===`all`?[]:e;n!==void 0&&t(String(n))},className:m,children:e=>(0,S.jsx)(g,{id:e.id,children:e.name})})}function b({id:e}){let t=w.find(t=>t.id===e)??w[0];return t?(0,S.jsxs)(`div`,{className:`flex flex-col gap-3 p-4`,children:[(0,S.jsx)(d,{level:2,children:t.name}),(0,S.jsx)(l,{variant:`muted`,children:t.note}),(0,S.jsx)(p,{columns:1,items:[{id:`order`,label:`Order from the Sun`,value:t.order},{id:`moons`,label:`Moons`,value:t.moons},{id:`day`,label:`Length of a day`,value:t.day}]})]}):null}var x,S,C,w,T,E,D,O;function k(){return(k=e((()=>{i(),x=t(),n(),s(),f(),h(),u(),_(),S=o(),C={title:`Display/SplitView`,component:v,parameters:{layout:`padded`},args:{children:null}},w=[{id:`mercury`,name:`Mercury`,order:1,moons:0,day:`176 days`,note:`The smallest planet.`},{id:`venus`,name:`Venus`,order:2,moons:0,day:`117 days`,note:`The hottest planet.`},{id:`earth`,name:`Earth`,order:3,moons:1,day:`24 hours`,note:`The only one with oceans.`},{id:`mars`,name:`Mars`,order:4,moons:2,day:`24.6 hours`,note:`The red planet.`},{id:`jupiter`,name:`Jupiter`,order:5,moons:95,day:`9.9 hours`,note:`The largest planet.`}],T={render:function(){let[e,t]=(0,x.useState)(`earth`),[n,r]=(0,x.useState)(!1),[i,o]=(0,x.useState)(!1);return(0,S.jsxs)(`div`,{className:`flex h-96 flex-col gap-2`,children:[i&&(0,S.jsx)(c,{variant:`outline`,icon:a,className:`self-start`,onPress:()=>{r(!0)},children:`Show details`}),(0,S.jsx)(`div`,{className:`min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-1`,children:(0,S.jsxs)(v,{paneLabels:[`Planets`,`Planet details`],defaultSizes:[35,65],minSizes:[`10rem`,`16rem`],collapsibleIndexes:[1],isSecondaryOpen:n,onSecondaryOpenChange:r,onStackedChange:o,children:[(0,S.jsx)(y,{selected:e,onSelect:e=>{t(e),r(!0)}}),(0,S.jsx)(b,{id:e})]})})]})}},E={render:function(){let[e,t]=(0,x.useState)([20,35,45]);return(0,S.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,S.jsx)(`div`,{className:`h-80 overflow-hidden rounded-card border border-border bg-surface-1`,children:(0,S.jsxs)(v,{paneLabels:[`Observatories`,`Nights`,`Readings`],sizes:e,onSizesChange:t,minSizes:[15,20,20],collapsibleIndexes:[0],secondaryPresentation:`stack`,children:[(0,S.jsx)(`div`,{className:`p-3 text-sm`,children:`Mauna Kea · La Palma · Paranal`}),(0,S.jsx)(`div`,{className:`p-3 text-sm`,children:`Clear nights this month: 18`}),(0,S.jsx)(`div`,{className:`p-3 text-sm`,children:`Seeing 0.6″ · Humidity 12% · Wind 4 m/s`})]})}),(0,S.jsx)(l,{variant:`small`,children:`Sizes: ${e.map(e=>`${String(Math.round(e))}%`).join(` · `)}`})]})}},D={render:()=>(0,S.jsx)(`div`,{className:`h-96 overflow-hidden rounded-card border border-border bg-surface-1`,children:(0,S.jsxs)(v,{orientation:`vertical`,paneLabels:[`Notes`,`Log`],defaultSizes:[65,35],minSizes:[`6rem`,`4rem`],secondaryPresentation:`stack`,stackBelow:`0px`,children:[(0,S.jsx)(`div`,{className:`p-3 text-sm`,children:`Observation notes for the night of the transit.`}),(0,S.jsx)(`pre`,{className:`p-3 font-mono text-xs text-fg-muted`,children:`21:04 dome open
21:10 focus check passed
21:32 target acquired`})]})})},O=[`ListAndDetail`,`ThreePanes`,`Vertical`],T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [selected, setSelected] = useState('earth');
    const [isOpen, setOpen] = useState(false);
    const [isStacked, setStacked] = useState(false);
    return <div className="flex h-96 flex-col gap-2">
        {isStacked && <Button variant="outline" icon={PanelRightOpen} className="self-start" onPress={() => {
        setOpen(true);
      }}>
            Show details
          </Button>}
        <div className="min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-1">
          <SplitView paneLabels={['Planets', 'Planet details']} defaultSizes={[35, 65]} minSizes={['10rem', '16rem']} collapsibleIndexes={[1]} isSecondaryOpen={isOpen} onSecondaryOpenChange={setOpen} onStackedChange={setStacked}>
            <PlanetList selected={selected} onSelect={id => {
            setSelected(id);
            setOpen(true);
          }} />
            <PlanetDetail id={selected} />
          </SplitView>
        </div>
      </div>;
  }
}`,...T.parameters?.docs?.source},description:{story:`A list and detail view. Drag the handle (mouse or touch), or focus it and use the arrow keys, Home and End; Enter
or a double-click collapses the detail pane. In a container narrower than 48rem (phones), the detail moves into
a drawer that opens when a planet is chosen.`,...T.parameters?.docs?.description}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [sizes, setSizes] = useState([20, 35, 45]);
    return <div className="flex flex-col gap-2">
        <div className="h-80 overflow-hidden rounded-card border border-border bg-surface-1">
          <SplitView paneLabels={['Observatories', 'Nights', 'Readings']} sizes={sizes} onSizesChange={setSizes} minSizes={[15, 20, 20]} collapsibleIndexes={[0]} secondaryPresentation="stack">
            <div className="p-3 text-sm">Mauna Kea · La Palma · Paranal</div>
            <div className="p-3 text-sm">Clear nights this month: 18</div>
            <div className="p-3 text-sm">Seeing 0.6″ · Humidity 12% · Wind 4 m/s</div>
          </SplitView>
        </div>
        <Text variant="small">{\`Sizes: \${sizes.map(size => \`\${String(Math.round(size))}%\`).join(' · ')}\`}</Text>
      </div>;
  }
}`,...E.parameters?.docs?.source},description:{story:`Three panes, the first collapsible; the app keeps the sizes it's told about (shown under the view).`,...E.parameters?.docs?.description}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <div className="h-96 overflow-hidden rounded-card border border-border bg-surface-1">
      <SplitView orientation="vertical" paneLabels={['Notes', 'Log']} defaultSizes={[65, 35]} minSizes={['6rem', '4rem']} secondaryPresentation="stack" stackBelow="0px">
        <div className="p-3 text-sm">Observation notes for the night of the transit.</div>
        <pre className="p-3 font-mono text-xs text-fg-muted">
          {'21:04 dome open\\n21:10 focus check passed\\n21:32 target acquired'}
        </pre>
      </SplitView>
    </div>
}`,...D.parameters?.docs?.source},description:{story:'Top and bottom panes, such as notes over a log. It stays split at every width (`stackBelow="0px"`).',...D.parameters?.docs?.description}}}})))()}k();export{T as ListAndDetail,E as ThreePanes,D as Vertical,O as __namedExportsOrder,C as default};