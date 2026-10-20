import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{i as n,n as r,r as i,t as a}from"./CidrList-CQBy_Qqs.js";import{t as o}from"./jsx-runtime-MKhVqBIO.js";var s;function c(){return(c=e((()=>{s=[`10.0.0.0/8`,`10.20.0.0/16`,`192.168.1.0/25`,`192.168.1.128/25`,`172.16.0.0/12`,`203.0.113.7`,`198.51.100.0/24`,`2001:db8::/32`,`2001:db8:1::/48`,`2400:cb00::/32`,`fd00::/8`,`2606:4700::/32`,`100.64.0.0/10`,`999.1.1.1/24`,`169.254.0.0/16`,`2a00:1450::/32`,`192.0.2.0/24`,`2001:4860::/32`,`8.8.4.0/24`,`2620:fe::fe`],s.join(`
`)})))()}var l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{l=t(),c(),n(),r(),u=o(),d={title:`Inputs/CidrField`,component:i,args:{label:`Origin range`}},f={tags:[`!visual`]},p={render:()=>(0,u.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,u.jsx)(i,{label:`Office network`,defaultValue:`10.0.0.0/8`}),(0,u.jsx)(i,{label:`Observatory prefix`,defaultValue:`2001:db8:4f::/48`}),(0,u.jsx)(i,{label:`Single host`,defaultValue:`203.0.113.7/32`}),(0,u.jsx)(i,{label:`Invalid`,defaultValue:`10.0.0.0/33`}),(0,u.jsx)(i,{label:`IPv4 only`,family:`ipv4`,defaultValue:`2001:db8::/32`}),(0,u.jsx)(i,{label:`With a warning`,defaultValue:`0.0.0.0/0`,warningMessage:`This allows every IPv4 address.`}),(0,u.jsx)(i,{label:`Disabled`,isDisabled:!0,defaultValue:`192.0.2.0/24`})]})},m={tags:[`!visual`],render:function(){let[e,t]=(0,l.useState)(`10.0.0.5/8`);return(0,u.jsxs)(`div`,{className:`flex max-w-md flex-col gap-2`,children:[(0,u.jsx)(i,{label:`Range`,value:e,onChange:t}),(0,u.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Value: `,e]})]})}},h={render:()=>(0,u.jsx)(`div`,{className:`max-w-xl`,children:(0,u.jsx)(a,{label:`Allowlist`,description:`Requests from these ranges skip the challenge.`,defaultValue:[...s.slice(0,4),`2001:db8::/32`,`2001:db8:1::/48`,`bad`]})})},g={render:()=>(0,u.jsx)(`div`,{className:`max-w-xl`,children:(0,u.jsx)(a,{label:`Blocked ranges`,family:`ipv4`,maxItems:50})})},_={tags:[`!visual`],render:()=>(0,u.jsx)(`div`,{className:`max-w-xl`,children:(0,u.jsx)(a,{label:`Allowlist`,defaultValue:[...s],hasRangeInfo:!1})})},v=[`Playground`,`States`,`Normalisation`,`List`,`EmptyList`,`LongList`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <CidrField label="Office network" defaultValue="10.0.0.0/8" />
      <CidrField label="Observatory prefix" defaultValue="2001:db8:4f::/48" />
      <CidrField label="Single host" defaultValue="203.0.113.7/32" />
      <CidrField label="Invalid" defaultValue="10.0.0.0/33" />
      <CidrField label="IPv4 only" family="ipv4" defaultValue="2001:db8::/32" />
      <CidrField label="With a warning" defaultValue="0.0.0.0/0" warningMessage="This allows every IPv4 address." />
      <CidrField label="Disabled" isDisabled defaultValue="192.0.2.0/24" />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Valid blocks show their range and address count (exact for IPv6); invalid ones explain why.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function NormalisationStory() {
    const [value, setValue] = useState('10.0.0.5/8');
    return <div className="flex max-w-md flex-col gap-2">
        <CidrField label="Range" value={value} onChange={setValue} />
        <p className="text-sm text-fg-muted">Value: {value}</p>
      </div>;
  }
}`,...m.parameters?.docs?.source},description:{story:"Type `10.0.0.5/8` and leave the field: the host bits are cleared, with a note. Bare addresses become /32 or /128.",...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <CidrList label="Allowlist" description="Requests from these ranges skip the challenge." defaultValue={[...mixedCidrEntries.slice(0, 4), '2001:db8::/32', '2001:db8:1::/48', 'bad']} />
    </div>
}`,...h.parameters?.docs?.source},description:{story:`A list with overlaps, an invalid entry and two adjacent /25s that merge into a /24.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <CidrList label="Blocked ranges" family="ipv4" maxItems={50} />
    </div>
}`,...g.parameters?.docs?.source},description:{story:`Paste many lines into the add field to add them all.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-xl">
      <CidrList label="Allowlist" defaultValue={[...mixedCidrEntries]} hasRangeInfo={false} />
    </div>
}`,..._.parameters?.docs?.source},description:{story:`The 20 mixed entries from the acceptance criteria.`,..._.parameters?.docs?.description}}}})))()}y();export{g as EmptyList,h as List,_ as LongList,m as Normalisation,f as Playground,p as States,v as __namedExportsOrder,d as default};