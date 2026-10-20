import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{i as n,n as r}from"./ListBoxParts-CV4y54sA.js";import{n as i,t as a}from"./ComboBox-ClwSgpBb.js";async function o(e,t){return await new Promise((e,n)=>{let r=setTimeout(e,400);t.addEventListener(`abort`,()=>{clearTimeout(r),n(new DOMException(`Aborted`,`AbortError`))})}),c.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()))}var s,c,l,u,d,f;function p(){return(p=e((()=>{n(),i(),s=t(),c=[{id:`acme`,name:`Acme Corporation`},{id:`globex`,name:`Globex`},{id:`initech`,name:`Initech`},{id:`umbrella`,name:`Umbrella`},{id:`hooli`,name:`Hooli`}],l={title:`Inputs/ComboBox`,component:a,args:{label:`Customer`,children:null}},u={render:()=>(0,s.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,s.jsx)(a,{label:`Customer`,items:c,description:`Type to filter`,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})}),(0,s.jsx)(a,{label:`Customer`,items:c,defaultValue:`globex`,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})}),(0,s.jsx)(a,{label:`Customer`,items:c,isInvalid:!0,errorMessage:`Choose a customer`,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})})]})},d={tags:[`!visual`],render:()=>(0,s.jsx)(`div`,{className:`max-w-md`,children:(0,s.jsx)(a,{label:`Customer`,loadItems:o,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})})})},f=[`Static`,`Async`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <ComboBox label="Customer" items={customers} description="Type to filter">
        {customer => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
      <ComboBox label="Customer" items={customers} defaultValue="globex">
        {customer => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
      <ComboBox label="Customer" items={customers} isInvalid errorMessage="Choose a customer">
        {customer => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-md">
      <ComboBox label="Customer" loadItems={searchCustomers}>
        {customer => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
    </div>
}`,...d.parameters?.docs?.source},description:{story:`Results load as you type (debounced; stale requests are aborted).`,...d.parameters?.docs?.description}}}})))()}p();export{d as Async,u as Static,f as __namedExportsOrder,l as default};