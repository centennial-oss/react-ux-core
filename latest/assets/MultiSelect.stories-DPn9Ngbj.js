import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{i as n,n as r}from"./ListBoxParts-CV4y54sA.js";import{n as i,t as a}from"./MultiSelect-DqfQfFwB.js";var o,s,c,l,u;function d(){return(d=e((()=>{n(),i(),o=t(),s=[{id:`north`,name:`North`},{id:`south`,name:`South`},{id:`east`,name:`East`},{id:`west`,name:`West`},{id:`central`,name:`Central`}],c={title:`Inputs/MultiSelect`,component:a,args:{label:`Regions`,children:()=>(0,o.jsx)(`span`,{})}},l={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,o.jsx)(a,{label:`Regions`,items:s,placeholder:`Add regions`,children:e=>(0,o.jsx)(r,{id:e.id,children:e.name})}),(0,o.jsx)(a,{label:`Regions`,items:s,defaultValue:[`north`,`east`,`central`],children:e=>(0,o.jsx)(r,{id:e.id,children:e.name})}),(0,o.jsx)(a,{label:`Regions`,items:s,isRequired:!0,isInvalid:!0,errorMessage:`Choose at least one region`,children:e=>(0,o.jsx)(r,{id:e.id,children:e.name})})]})},u=[`States`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <MultiSelect label="Regions" items={regions} placeholder="Add regions">
        {region => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>
      <MultiSelect label="Regions" items={regions} defaultValue={['north', 'east', 'central']}>
        {region => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>
      <MultiSelect label="Regions" items={regions} isRequired isInvalid errorMessage="Choose at least one region">
        {region => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>
    </div>
}`,...l.parameters?.docs?.source}}}})))()}d();export{l as States,u as __namedExportsOrder,c as default};