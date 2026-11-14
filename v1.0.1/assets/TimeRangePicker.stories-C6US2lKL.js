import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{a as r,t as i}from"./resolveTimeRange-C2mFxX3v.js";import{n as a,t as o}from"./TimeRangePicker-DRoGFgXT.js";var s,c,l,u,d,f,p,m,h;function g(){return(g=e((()=>{s=t(),i(),a(),c=n(),l={title:`Inputs/TimeRangePicker`,component:o,args:{label:`Time range`,defaultValue:{kind:`relative`,from:`-24h`,to:`now`},timeZone:`America/Denver`}},u={tags:[`!visual`]},d={kind:`absolute`,start:`2025-03-01T07:00:00.000Z`,end:`2025-03-08T07:00:00.000Z`},f={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-5`,children:[(0,c.jsx)(o,{label:`Preset`,defaultValue:{kind:`relative`,from:`-7d`,to:`now`}}),(0,c.jsx)(o,{label:`Relative`,defaultValue:{kind:`relative`,from:`-3h`,to:`now`}}),(0,c.jsx)(o,{label:`Absolute`,defaultValue:d,timeZone:`America/Denver`}),(0,c.jsx)(o,{label:`Empty`}),(0,c.jsx)(o,{"aria-label":`Disabled range`,isDisabled:!0,size:`sm`})]})},p={tags:[`visual-page`],render:()=>(0,c.jsx)(o,{label:`Time range`,defaultValue:{kind:`relative`,from:`-24h`,to:`now`},defaultOpen:!0,className:`max-w-xs`})},m={tags:[`!visual`],render:function(){let[e,t]=(0,s.useState)({kind:`relative`,from:`-24h`,to:`now`}),{start:n,end:i}=r(e,Date.now(),`America/Denver`);return(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-3 text-sm`,children:[(0,c.jsx)(o,{label:`Time range`,value:e,onChange:t,timeZone:`America/Denver`}),(0,c.jsxs)(`code`,{className:`break-all text-fg-muted`,children:[`?range=`,encodeURIComponent(JSON.stringify(e))]}),(0,c.jsxs)(`span`,{className:`text-fg-muted`,children:[n.toISOString(),` → `,i.toISOString()]})]})}},h=[`Playground`,`States`,`Open`,`InTheUrl`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...u.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-5">
      <TimeRangePicker label="Preset" defaultValue={{
      kind: 'relative',
      from: '-7d',
      to: 'now'
    }} />
      <TimeRangePicker label="Relative" defaultValue={{
      kind: 'relative',
      from: '-3h',
      to: 'now'
    }} />
      <TimeRangePicker label="Absolute" defaultValue={firstWeekOfMarch} timeZone="America/Denver" />
      <TimeRangePicker label="Empty" />
      <TimeRangePicker aria-label="Disabled range" isDisabled size="sm" />
    </div>
}`,...f.parameters?.docs?.source},description:{story:`A preset, a "last N units" range, an absolute range, no range yet, and disabled.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <TimeRangePicker label="Time range" defaultValue={{
    kind: 'relative',
    from: '-24h',
    to: 'now'
  }} defaultOpen className="max-w-xs" />
}`,...p.parameters?.docs?.source},description:{story:`Presets first, then relative and absolute entry. A popover on tablet and desktop, a full-screen sheet on phones.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function InTheUrlStory() {
    const [range, setRange] = useState<TimeRange>({
      kind: 'relative',
      from: '-24h',
      to: 'now'
    });
    const {
      start,
      end
    } = resolveTimeRange(range, Date.now(), 'America/Denver');
    return <div className="flex max-w-md flex-col gap-3 text-sm">
        <TimeRangePicker label="Time range" value={range} onChange={setRange} timeZone="America/Denver" />
        <code className="break-all text-fg-muted">
          ?range={encodeURIComponent(JSON.stringify(range))}
        </code>
        <span className="text-fg-muted">
          {start.toISOString()} → {end.toISOString()}
        </span>
      </div>;
  }
}`,...m.parameters?.docs?.source},description:{story:`Apps keep the value (a plain object, here shown as JSON for a URL) and resolve it to instants when fetching.`,...m.parameters?.docs?.description}}}})))()}g();export{m as InTheUrl,p as Open,u as Playground,f as States,h as __namedExportsOrder,l as default};