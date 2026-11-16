import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./StatusDot-CkmPgM6I.js";var i,a,o,s,c;function l(){return(l=e((()=>{n(),i=t(),a={title:`Display/StatusDot`,component:r,args:{label:`Online`,tone:`success`}},o={tags:[`!visual`]},s={render:()=>(0,i.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,i.jsx)(r,{tone:`neutral`,label:`Unknown`}),(0,i.jsx)(r,{tone:`accent`,label:`Syncing`}),(0,i.jsx)(r,{tone:`success`,label:`Online`}),(0,i.jsx)(r,{tone:`warning`,label:`Degraded`}),(0,i.jsx)(r,{tone:`danger`,label:`Offline`}),(0,i.jsx)(r,{tone:`success`,label:`Online`,size:`sm`})]})},c=[`Playground`,`Tones`],o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-2">
      <StatusDot tone="neutral" label="Unknown" />
      <StatusDot tone="accent" label="Syncing" />
      <StatusDot tone="success" label="Online" />
      <StatusDot tone="warning" label="Degraded" />
      <StatusDot tone="danger" label="Offline" />
      <StatusDot tone="success" label="Online" size="sm" />
    </div>
}`,...s.parameters?.docs?.source},description:{story:`Every tone has its own shape as well as colour, and always a label (visible or hidden).`,...s.parameters?.docs?.description}}}})))()}l();export{o as Playground,s as Tones,c as __namedExportsOrder,a as default};