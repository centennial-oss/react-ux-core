import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./Breadcrumbs-gG6UGZ0C.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";var i,a,o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{t(),i=r(),a=[{id:`home`,label:`Home`,href:`#home`},{id:`sites`,label:`Sites`,href:`#sites`},{id:`plant`,label:`Plant 12`}],o=[{id:`org`,label:`Centennial Utilities`,href:`#org`},{id:`region`,label:`Northern region`,href:`#region`},{id:`sites`,label:`Industrial sites`,href:`#sites`},{id:`plant`,label:`Plant 12 (Riverside)`,href:`#plant`},{id:`meters`,label:`Meters`,href:`#meters`},{id:`meter`,label:`Meter M-1042`}],s={title:`Display/Breadcrumbs`,component:n,args:{items:a}},c={tags:[`!visual`]},l={tags:[`!visual`]},u={args:{items:o}},d={args:{items:o},render:e=>(0,i.jsx)(`div`,{className:`max-w-72 rounded-card border border-border bg-surface-2 p-3`,children:(0,i.jsx)(n,{...e})})},f={args:{items:[{id:`org`,label:`Centennial Utilities Holdings International`,href:`#org`},{id:`region`,label:`Northern region`,href:`#region`},{id:`meter`,label:`Meter M-1042 on the main incoming supply at Riverside`}]},render:e=>(0,i.jsx)(`div`,{className:`max-w-60`,children:(0,i.jsx)(n,{...e})})},p=[`Playground`,`Basic`,`LongTrail`,`Collapsed`,`Truncated`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...l.parameters?.docs?.source},description:{story:'Links to each level, with the current page last (`aria-current="page"`, not a link).',...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    items: LONG
  }
}`,...u.parameters?.docs?.source},description:{story:`A long trail at full width. Where it doesn't fit (on phones), the middle items collapse into a menu, keeping the
first item and as many of the items nearest the current page as fit.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    items: LONG
  },
  render: args => <div className="max-w-72 rounded-card border border-border bg-surface-2 p-3">
      <Breadcrumbs {...args} />
    </div>
}`,...d.parameters?.docs?.source},description:{story:`The same trail in a narrow column: collapsed. The menu's items are links too.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    items: [{
      id: 'org',
      label: 'Centennial Utilities Holdings International',
      href: '#org'
    }, {
      id: 'region',
      label: 'Northern region',
      href: '#region'
    }, {
      id: 'meter',
      label: 'Meter M-1042 on the main incoming supply at Riverside'
    }]
  },
  render: args => <div className="max-w-60">
      <Breadcrumbs {...args} />
    </div>
}`,...f.parameters?.docs?.source},description:{story:`When even the first and last items don't fit beside the menu, their labels truncate instead of widening the page.`,...f.parameters?.docs?.description}}}})))()}m();export{l as Basic,d as Collapsed,u as LongTrail,c as Playground,f as Truncated,p as __namedExportsOrder,s as default};