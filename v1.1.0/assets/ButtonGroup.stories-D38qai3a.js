import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Button-e4ZjaxXL.js";import{n as i,t as a}from"./ButtonGroup-DQOwtNCj.js";var o,s,c,l,u;function d(){return(d=e((()=>{n(),i(),o=t(),s={title:`Actions/ButtonGroup`,component:a,args:{layout:`end`,children:null}},c={render:()=>(0,o.jsx)(`div`,{className:`flex max-w-xl flex-col gap-6`,children:[`start`,`end`,`between`,`stretch`].map(e=>(0,o.jsxs)(a,{layout:e,"aria-label":`${e} layout`,children:[(0,o.jsx)(r,{variant:`outline`,children:`Cancel`}),(0,o.jsx)(r,{tone:`accent`,children:`Save`})]},e))})},l={render:()=>(0,o.jsx)(`div`,{className:`w-72 rounded-card border border-border p-4`,children:(0,o.jsxs)(a,{children:[(0,o.jsx)(r,{variant:`outline`,children:`Cancel`}),(0,o.jsx)(r,{tone:`accent`,children:`Save changes`})]})})},u=[`Layouts`,`NarrowContainer`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-xl flex-col gap-6">
      {(['start', 'end', 'between', 'stretch'] as const).map(layout => <ButtonGroup key={layout} layout={layout} aria-label={\`\${layout} layout\`}>
          <Button variant="outline">Cancel</Button>
          <Button tone="accent">Save</Button>
        </ButtonGroup>)}
    </div>
}`,...c.parameters?.docs?.source},description:{story:`Each layout in a wide container. Narrow containers (under 24rem) stack the buttons.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-72 rounded-card border border-border p-4">
      <ButtonGroup>
        <Button variant="outline">Cancel</Button>
        <Button tone="accent">Save changes</Button>
      </ButtonGroup>
    </div>
}`,...l.parameters?.docs?.source}}}})))()}d();export{c as Layouts,l as NarrowContainer,u as __namedExportsOrder,s as default};