import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./check-BVgxPuWM.js";import{n as r,t as i}from"./clock-2_ljEJyt.js";import{t as a}from"./jsx-runtime-MKhVqBIO.js";import{n as o,t as s}from"./Badge-B8tm3wVn.js";var c,l,u,d,f,p,m,h;function g(){return(g=e((()=>{t(),r(),o(),c=a(),l=[`neutral`,`accent`,`success`,`warning`,`danger`],u=[`solid`,`soft`,`outline`],d={title:`Display/Badge`,component:s,args:{children:`Badge`,variant:`soft`,tone:`neutral`,size:`sm`}},f={tags:[`!visual`]},p={render:e=>(0,c.jsx)(`div`,{className:`grid gap-3`,children:u.map(t=>(0,c.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:l.map(n=>(0,c.jsx)(s,{...e,variant:t,tone:n,children:`${t} ${n}`},n))},t))})},m={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,c.jsx)(s,{tone:`success`,icon:n,children:`Paid`}),(0,c.jsx)(s,{tone:`warning`,icon:i,size:`md`,children:`Pending`}),(0,c.jsx)(s,{variant:`solid`,tone:`danger`,children:`12`})]})},h=[`Playground`,`VariantsAndTones`,`WithIconAndSizes`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: args => <div className="grid gap-3">
      {VARIANTS.map(variant => <div key={variant} className="flex flex-wrap gap-2">
          {TONES.map(tone => <Badge key={tone} {...args} variant={variant} tone={tone}>
              {\`\${variant} \${tone}\`}
            </Badge>)}
        </div>)}
    </div>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-2">
      <Badge tone="success" icon={Check}>
        Paid
      </Badge>
      <Badge tone="warning" icon={Clock} size="md">
        Pending
      </Badge>
      <Badge variant="solid" tone="danger">
        12
      </Badge>
    </div>
}`,...m.parameters?.docs?.source}}}})))()}g();export{f as Playground,p as VariantsAndTones,m as WithIconAndSizes,h as __namedExportsOrder,d as default};