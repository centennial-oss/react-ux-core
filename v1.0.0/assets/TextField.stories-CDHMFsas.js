import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./TextField-57e0_XUI.js";var i,a,o,s,c,l,u;function d(){return(d=e((()=>{n(),i=t(),a={title:`Inputs/TextField`,component:r,args:{label:`Company name`,placeholder:`Acme Corporation`}},o={tags:[`!visual`]},s={render:()=>(0,i.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,i.jsx)(r,{label:`Company name`,description:`As shown on invoices`,isRequired:!0}),(0,i.jsx)(r,{label:`Email`,type:`email`,defaultValue:`not-an-email`,isInvalid:!0,errorMessage:`Enter a valid email address`}),(0,i.jsx)(r,{label:`Password`,type:`password`,defaultValue:`hunter2`}),(0,i.jsx)(r,{label:`Rate`,prefix:`USD`,suffix:`/ kWh`,defaultValue:`0.18`,isClearable:!0}),(0,i.jsx)(r,{label:`Account ID`,defaultValue:`ACC-10422`,isReadOnly:!0}),(0,i.jsx)(r,{label:`Region`,defaultValue:`North`,isDisabled:!0}),(0,i.jsx)(r,{label:`Small`,size:`sm`})]})},c={render:()=>(0,i.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-4`,children:[(0,i.jsx)(r,{label:`Company name`,labelPosition:`side`,description:`As shown on invoices`}),(0,i.jsx)(r,{label:`Billing email`,type:`email`,labelPosition:`side`,isRequired:!0})]})},l={render:()=>(0,i.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,i.jsx)(r,{label:`Telescope code`,maxLength:12,hasCharacterCount:!0,defaultValue:`NR-1`}),(0,i.jsx)(r,{label:`Page title`,description:`Search engines show about 60 characters.`,recommendedLength:60,hasCharacterCount:!0,defaultValue:`Observing the moons of Jupiter`}),(0,i.jsx)(r,{label:`Page title (too long)`,recommendedLength:60,hasCharacterCount:!0,defaultValue:`Observing the Galilean moons of Jupiter from a backyard telescope in autumn`})]})},u=[`Playground`,`States`,`SideLabels`,`CharacterCount`],o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <TextField label="Company name" description="As shown on invoices" isRequired />
      <TextField label="Email" type="email" defaultValue="not-an-email" isInvalid errorMessage="Enter a valid email address" />
      <TextField label="Password" type="password" defaultValue="hunter2" />
      <TextField label="Rate" prefix="USD" suffix="/ kWh" defaultValue="0.18" isClearable />
      <TextField label="Account ID" defaultValue="ACC-10422" isReadOnly />
      <TextField label="Region" defaultValue="North" isDisabled />
      <TextField label="Small" size="sm" />
    </div>
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-xl flex-col gap-4">
      <TextField label="Company name" labelPosition="side" description="As shown on invoices" />
      <TextField label="Billing email" type="email" labelPosition="side" isRequired />
    </div>
}`,...c.parameters?.docs?.source},description:{story:`Side labels sit beside the input in wide containers and move on top in narrow ones.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <TextField label="Telescope code" maxLength={12} hasCharacterCount defaultValue="NR-1" />
      <TextField label="Page title" description="Search engines show about 60 characters." recommendedLength={60} hasCharacterCount defaultValue="Observing the moons of Jupiter" />
      <TextField label="Page title (too long)" recommendedLength={60} hasCharacterCount defaultValue="Observing the Galilean moons of Jupiter from a backyard telescope in autumn" />
    </div>
}`,...l.parameters?.docs?.source},description:{story:"`hasCharacterCount` shows a counter; past `recommendedLength` it turns to the warning tone, but stays valid.",...l.parameters?.docs?.description}}}})))()}d();export{l as CharacterCount,o as Playground,c as SideLabels,s as States,u as __namedExportsOrder,a as default};