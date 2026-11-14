import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./TextArea-BZuvFk6V.js";var a,o,s,c,l,u,d,f,p,m,h;function g(){return(g=e((()=>{a=t(),r(),o=n(),s={title:`Inputs/TextArea`,component:i,args:{label:`Notes`,placeholder:`Anything the installer should know`}},c={tags:[`!visual`]},l={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,o.jsx)(i,{label:`Notes`,description:`Visible to everyone on the project`,isRequired:!0}),(0,o.jsx)(i,{label:`Reason for change`,isInvalid:!0,errorMessage:`Tell us why the tariff changed`,defaultValue:`Because`}),(0,o.jsx)(i,{label:`Read-only`,isReadOnly:!0,defaultValue:`Installed on 4 March by the north team.`}),(0,o.jsx)(i,{label:`Disabled`,isDisabled:!0,defaultValue:`Archived`})]})},u={tags:[`!visual`],render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,o.jsx)(i,{label:`One row to start`,minRows:1,maxRows:4,defaultValue:`Short`}),(0,o.jsx)(i,{label:`Capped at four rows`,minRows:2,maxRows:4,defaultValue:[`Line one`,`Line two`,`Line three`,`Line four`,`Line five`,`Line six`].join(`
`)})]})},d={render:()=>(0,o.jsx)(`div`,{className:`max-w-md`,children:(0,o.jsx)(i,{label:`Site description`,description:`Shown on the public status page`,maxLength:140,hasCharacterCount:!0,defaultValue:`Rooftop array with 42 panels and a battery.`})})},f={render:()=>(0,o.jsx)(`div`,{className:`max-w-md`,children:(0,o.jsx)(i,{label:`Meta description`,description:`Search engines show about 160 characters.`,recommendedLength:160,hasCharacterCount:!0,defaultValue:`A night at the Northern Ridge Observatory: how the team tracks the moons of Jupiter and Saturn, logs every reading, and shares the images with schools across the region each autumn.`})})},p={render:()=>(0,o.jsx)(`div`,{className:`max-w-xl`,children:(0,o.jsx)(i,{label:`Notes`,labelPosition:`side`,description:`Visible to your team`})})},m={tags:[`!visual`],render:function(){let[e,t]=(0,a.useState)(``);return(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-2`,children:[(0,o.jsx)(i,{label:`Message`,value:e,onChange:t,maxLength:280,hasCharacterCount:!0}),(0,o.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[e.split(`
`).length,` line`,e.split(`
`).length===1?``:`s`]})]})}},h=[`Playground`,`States`,`AutoGrow`,`CharacterCount`,`RecommendedLength`,`SideLabel`,`Controlled`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <TextArea label="Notes" description="Visible to everyone on the project" isRequired />
      <TextArea label="Reason for change" isInvalid errorMessage="Tell us why the tariff changed" defaultValue="Because" />
      <TextArea label="Read-only" isReadOnly defaultValue="Installed on 4 March by the north team." />
      <TextArea label="Disabled" isDisabled defaultValue="Archived" />
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex max-w-md flex-col gap-5">
      <TextArea label="One row to start" minRows={1} maxRows={4} defaultValue="Short" />
      <TextArea label="Capped at four rows" minRows={2} maxRows={4} defaultValue={['Line one', 'Line two', 'Line three', 'Line four', 'Line five', 'Line six'].join('\\n')} />
    </div>
}`,...u.parameters?.docs?.source},description:{story:"The area grows with its content from `minRows` up to `maxRows`, then scrolls.",...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <TextArea label="Site description" description="Shown on the public status page" maxLength={140} hasCharacterCount defaultValue="Rooftop array with 42 panels and a battery." />
    </div>
}`,...d.parameters?.docs?.source},description:{story:"With `maxLength` and `hasCharacterCount`, a counter shows how much is left.",...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <TextArea label="Meta description" description="Search engines show about 160 characters." recommendedLength={160} hasCharacterCount defaultValue="A night at the Northern Ridge Observatory: how the team tracks the moons of Jupiter and Saturn, logs every reading, and shares the images with schools across the region each autumn." />
    </div>
}`,...f.parameters?.docs?.source},description:{story:"Past `recommendedLength` the counter turns to the warning tone, but the area stays valid.",...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <TextArea label="Notes" labelPosition="side" description="Visible to your team" />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Side labels sit beside the area in wide containers and move on top in narrow ones.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState('');
    return <div className="flex max-w-md flex-col gap-2">
        <TextArea label="Message" value={value} onChange={setValue} maxLength={280} hasCharacterCount />
        <p className="text-sm text-fg-muted">
          {value.split('\\n').length} line{value.split('\\n').length === 1 ? '' : 's'}
        </p>
      </div>;
  }
}`,...m.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`.",...m.parameters?.docs?.description}}}})))()}g();export{u as AutoGrow,d as CharacterCount,m as Controlled,c as Playground,f as RecommendedLength,p as SideLabel,l as States,h as __namedExportsOrder,s as default};