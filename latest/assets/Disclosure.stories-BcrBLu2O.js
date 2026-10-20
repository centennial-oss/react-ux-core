import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./gauge-IV5NkPH7.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{n as i,t as a}from"./Button-e4ZjaxXL.js";import{i as o,n as s,r as c,t as l}from"./Disclosure-Bnvz0xN5.js";var u,d,f,p,m,h;function g(){return(g=e((()=>{t(),i(),o(),u=r(),d={title:`Display/Disclosure`,component:c,args:{title:`Advanced settings`,children:`Settings most people never need to change.`}},f={render:e=>(0,u.jsxs)(`div`,{className:`max-w-md`,children:[(0,u.jsx)(c,{...e}),(0,u.jsx)(c,{title:`Expanded by default`,defaultExpanded:!0,children:`This one starts open.`})]})},p={name:`Accordion`,render:()=>(0,u.jsxs)(l,{defaultExpandedKeys:[`billing`],className:`max-w-md`,children:[(0,u.jsx)(c,{id:`billing`,title:`How is billing calculated?`,children:`Usage is metered hourly and billed monthly.`}),(0,u.jsx)(c,{id:`tariffs`,title:`Can I change tariffs?`,children:`Yes, from the start of the next billing period.`}),(0,u.jsx)(c,{id:`export`,title:`Can I export my data?`,isDisabled:!0,children:`Export is coming soon.`})]})},m={name:`CollapsibleCard`,render:()=>(0,u.jsx)(s,{title:`Meter M-1042`,description:`Commercial tariff · Plant 12`,icon:n,defaultExpanded:!0,actions:(0,u.jsx)(a,{size:`sm`,variant:`outline`,children:`Edit`}),className:`max-w-md`,children:(0,u.jsx)(`p`,{className:`text-sm`,children:`Last reading 1,284 kWh at 09:30.`})})},h=[`Single`,`AccordionGroup`,`Collapsible`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: args => <div className="max-w-md">
      <Disclosure {...args} />
      <Disclosure title="Expanded by default" defaultExpanded>
        This one starts open.
      </Disclosure>
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: 'Accordion',
  render: () => <Accordion defaultExpandedKeys={['billing']} className="max-w-md">
      <Disclosure id="billing" title="How is billing calculated?">
        Usage is metered hourly and billed monthly.
      </Disclosure>
      <Disclosure id="tariffs" title="Can I change tariffs?">
        Yes, from the start of the next billing period.
      </Disclosure>
      <Disclosure id="export" title="Can I export my data?" isDisabled>
        Export is coming soon.
      </Disclosure>
    </Accordion>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: 'CollapsibleCard',
  render: () => <CollapsibleCard title="Meter M-1042" description="Commercial tariff · Plant 12" icon={Gauge} defaultExpanded actions={<Button size="sm" variant="outline">
          Edit
        </Button>} className="max-w-md">
      <p className="text-sm">Last reading 1,284 kWh at 09:30.</p>
    </CollapsibleCard>
}`,...m.parameters?.docs?.source}}}})))()}g();export{p as AccordionGroup,m as Collapsible,f as Single,h as __namedExportsOrder,d as default};