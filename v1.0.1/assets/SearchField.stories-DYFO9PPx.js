import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./SearchField-DPhtGKyw.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";var a,o,s,c,l,u,d,f,p,m;function h(){return(h=e((()=>{a=t(),n(),o=i(),s=[`North depot`,`South depot`,`Harbour office`,`Hilltop array`,`Riverside battery`],c={title:`Inputs/SearchField`,component:r,args:{label:`Search sites`,placeholder:`Name or ID`}},l={tags:[`!visual`]},u={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,o.jsx)(r,{label:`Search`,placeholder:`Sites, devices or people`}),(0,o.jsx)(r,{label:`With a query`,defaultValue:`battery`}),(0,o.jsx)(r,{label:`Invalid`,defaultValue:`a`,isInvalid:!0,errorMessage:`Enter at least 2 characters`}),(0,o.jsx)(r,{label:`Disabled`,isDisabled:!0,placeholder:`Search`}),(0,o.jsx)(r,{label:`Small`,size:`sm`,placeholder:`Search`}),(0,o.jsx)(r,{"aria-label":`Search the table`,placeholder:`Search without a visible label`})]})},d={tags:[`!visual`],render:()=>(0,o.jsx)(`div`,{className:`max-w-md`,children:(0,o.jsx)(r,{label:`Search`,placeholder:`Press / to jump here`,hasShortcut:!0})})},f={tags:[`!visual`],render:function(){let[e,t]=(0,a.useState)(``),n=s.filter(t=>t.toLowerCase().includes(e.toLowerCase()));return(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-3`,children:[(0,o.jsx)(r,{label:`Search sites`,onSearch:t,hasShortcut:!0}),(0,o.jsx)(`ul`,{className:`flex flex-col gap-1 text-sm text-fg`,children:n.map(e=>(0,o.jsx)(`li`,{children:e},e))})]})}},p={tags:[`!visual`],render:function(){let[e,t]=(0,a.useState)(`depot`);return(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-2`,children:[(0,o.jsx)(r,{label:`Search`,value:e,onChange:t}),(0,o.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Query: `,e||`empty`]})]})}},m=[`Playground`,`States`,`Shortcut`,`LiveResults`,`Controlled`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <SearchField label="Search" placeholder="Sites, devices or people" />
      <SearchField label="With a query" defaultValue="battery" />
      <SearchField label="Invalid" defaultValue="a" isInvalid errorMessage="Enter at least 2 characters" />
      <SearchField label="Disabled" isDisabled placeholder="Search" />
      <SearchField label="Small" size="sm" placeholder="Search" />
      <SearchField aria-label="Search the table" placeholder="Search without a visible label" />
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-md">
      <SearchField label="Search" placeholder="Press / to jump here" hasShortcut />
    </div>
}`,...d.parameters?.docs?.source},description:{story:'With `hasShortcut`, pressing "/" anywhere on the page focuses the field. The hint hides on touch screens.',...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function LiveResultsStory() {
    const [query, setQuery] = useState('');
    const results = SITES.filter(site => site.toLowerCase().includes(query.toLowerCase()));
    return <div className="flex max-w-md flex-col gap-3">
        <SearchField label="Search sites" onSearch={setQuery} hasShortcut />
        <ul className="flex flex-col gap-1 text-sm text-fg">
          {results.map(site => <li key={site}>{site}</li>)}
        </ul>
      </div>;
  }
}`,...f.parameters?.docs?.source},description:{story:"`onSearch` runs once typing pauses (300 ms by default); Enter runs it at once.",...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [query, setQuery] = useState('depot');
    return <div className="flex max-w-md flex-col gap-2">
        <SearchField label="Search" value={query} onChange={setQuery} />
        <p className="text-sm text-fg-muted">Query: {query || 'empty'}</p>
      </div>;
  }
}`,...p.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`, which fires on every keystroke.",...p.parameters?.docs?.description}}}})))()}h();export{p as Controlled,f as LiveResults,l as Playground,d as Shortcut,u as States,m as __namedExportsOrder,c as default};