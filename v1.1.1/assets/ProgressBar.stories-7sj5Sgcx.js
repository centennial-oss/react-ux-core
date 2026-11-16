import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./ProgressBar-jisu1Tps.js";var i,a,o,s,c;function l(){return(l=e((()=>{n(),i=t(),a={title:`Feedback/ProgressBar`,component:r,args:{label:`Uploading invoices.csv`,value:45}},o={tags:[`!visual`]},s={render:()=>(0,i.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,i.jsx)(r,{label:`Uploading invoices.csv`,value:45}),(0,i.jsx)(r,{label:`Storage used`,value:9.2,maxValue:10,tone:`warning`,formatOptions:{style:`unit`,unit:`gigabyte`}}),(0,i.jsx)(r,{label:`Quota`,value:100,tone:`danger`}),(0,i.jsx)(r,{label:`Importing meters`,isIndeterminate:!0}),(0,i.jsx)(r,{"aria-label":`Sync progress`,value:70,size:`sm`,tone:`success`})]})},c=[`Playground`,`States`],o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <ProgressBar label="Uploading invoices.csv" value={45} />
      <ProgressBar label="Storage used" value={9.2} maxValue={10} tone="warning" formatOptions={{
      style: 'unit',
      unit: 'gigabyte'
    }} />
      <ProgressBar label="Quota" value={100} tone="danger" />
      <ProgressBar label="Importing meters" isIndeterminate />
      <ProgressBar aria-label="Sync progress" value={70} size="sm" tone="success" />
    </div>
}`,...s.parameters?.docs?.source}}}})))()}l();export{o as Playground,s as States,c as __namedExportsOrder,a as default};