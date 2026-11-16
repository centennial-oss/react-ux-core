import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./TagField-DM_3kCPN.js";function a(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?void 0:`Not an email address`}function o(){let[e,t]=(0,s.useState)([`north`,`south`]);return(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-3`,children:[(0,c.jsx)(i,{label:`Regions`,value:e,onChange:t,isReorderable:!0}),(0,c.jsx)(`output`,{className:`text-sm text-fg-muted`,children:JSON.stringify(e)})]})}var s,c,l,u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{s=t(),r(),c=n(),l=[`C`,`C#`,`C++`,`Elixir`,`Go`,`Haskell`,`Java`,`JavaScript`,`Kotlin`,`Python`,`Ruby`,`Rust`,`Swift`,`TypeScript`],u={title:`Inputs/TagField`,component:i,args:{label:`Tags`,placeholder:`Add tags`}},d={tags:[`!visual`],args:{description:`Press Enter or type a comma after each tag.`}},f={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Keywords`,placeholder:`Add keywords`,description:`Press Enter or type a comma after each one.`}),(0,c.jsx)(i,{label:`Keywords`,defaultValue:[`solar`,`battery`,`grid-tied`]}),(0,c.jsx)(i,{label:`Recipients`,defaultValue:[`ada@example.com`,`grace@example`,`katherine@example.com`],validateTag:a}),(0,c.jsx)(i,{label:`Keywords`,isRequired:!0,isInvalid:!0,errorMessage:`Add at least one keyword`,placeholder:`Add keywords`}),(0,c.jsx)(i,{label:`Keywords`,defaultValue:[`solar`,`battery`],isReadOnly:!0}),(0,c.jsx)(i,{label:`Keywords`,defaultValue:[`solar`,`battery`],isDisabled:!0}),(0,c.jsx)(i,{label:`Keywords`,size:`sm`,defaultValue:[`solar`,`battery`]}),(0,c.jsx)(i,{label:`Keywords`,labelPosition:`side`,infoTip:`Used for search.`,defaultValue:[`solar`]})]})},p={render:()=>(0,c.jsx)(`div`,{className:`max-w-md`,children:(0,c.jsx)(i,{label:`Languages`,suggestions:l,defaultValue:[`TypeScript`,`Go`],placeholder:`Add languages`})})},m={render:()=>(0,c.jsx)(`div`,{className:`max-w-md`,children:(0,c.jsx)(i,{label:`Languages`,description:`Up to three, from the list.`,suggestions:l,allowsCustomValue:!1,maxItems:3,defaultValue:[`Rust`]})})},h={render:()=>(0,c.jsx)(`div`,{className:`max-w-md`,children:(0,c.jsx)(i,{label:`Priority order`,description:`Drag to reorder; the first is the most important.`,isReorderable:!0,defaultValue:[`Security`,`Performance`,`Accessibility`,`Cost`]})})},g={tags:[`!visual`],render:()=>(0,c.jsx)(`div`,{className:`max-w-md`,children:(0,c.jsx)(i,{label:`Recipients`,description:`Paste a list of addresses, separated by commas, semicolons or lines.`,delimiters:[`,`,`;`],validateTag:a})})},_={tags:[`!visual`],render:()=>(0,c.jsx)(o,{})},v={render:()=>(0,c.jsx)(`div`,{className:`max-w-xs`,children:(0,c.jsx)(i,{label:`Paths`,defaultValue:[`src/components/TagField/TagField.stories.tsx`,`docs`,`a-very-long-tag-without-any-spaces-that-would-otherwise-overflow`]})})},y=[`Playground`,`States`,`Suggestions`,`FromListOnly`,`Reorderable`,`PasteAList`,`Controlled`,`LongTags`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    description: 'Press Enter or type a comma after each tag.'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <TagField label="Keywords" placeholder="Add keywords" description="Press Enter or type a comma after each one." />
      <TagField label="Keywords" defaultValue={['solar', 'battery', 'grid-tied']} />
      <TagField label="Recipients" defaultValue={['ada@example.com', 'grace@example', 'katherine@example.com']} validateTag={emailProblem} />
      <TagField label="Keywords" isRequired isInvalid errorMessage="Add at least one keyword" placeholder="Add keywords" />
      <TagField label="Keywords" defaultValue={['solar', 'battery']} isReadOnly />
      <TagField label="Keywords" defaultValue={['solar', 'battery']} isDisabled />
      <TagField label="Keywords" size="sm" defaultValue={['solar', 'battery']} />
      <TagField label="Keywords" labelPosition="side" infoTip="Used for search." defaultValue={['solar']} />
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <TagField label="Languages" suggestions={languages} defaultValue={['TypeScript', 'Go']} placeholder="Add languages" />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Suggestions filter as you type; anything else can still be added.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <TagField label="Languages" description="Up to three, from the list." suggestions={languages} allowsCustomValue={false} maxItems={3} defaultValue={['Rust']} />
    </div>
}`,...m.parameters?.docs?.source},description:{story:"`allowsCustomValue={false}` accepts only tags from the list, and `maxItems` caps how many.",...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <TagField label="Priority order" description="Drag to reorder; the first is the most important." isReorderable defaultValue={['Security', 'Performance', 'Accessibility', 'Cost']} />
    </div>
}`,...h.parameters?.docs?.source},description:{story:`Drag tags into order, or focus a tag, press Tab to its handle, and use Enter and the arrow keys.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-md">
      <TagField label="Recipients" description="Paste a list of addresses, separated by commas, semicolons or lines." delimiters={[',', ';']} validateTag={emailProblem} />
    </div>
}`,...g.parameters?.docs?.source},description:{story:`Paste a list such as "a, b, c" or one item per line: it splits into tags.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <ControlledExample />
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xs">
      <TagField label="Paths" defaultValue={['src/components/TagField/TagField.stories.tsx', 'docs', 'a-very-long-tag-without-any-spaces-that-would-otherwise-overflow']} />
    </div>
}`,...v.parameters?.docs?.source},description:{story:`Long tags truncate inside the field instead of widening the page.`,...v.parameters?.docs?.description}}}})))()}b();export{_ as Controlled,m as FromListOnly,v as LongTags,g as PasteAList,d as Playground,h as Reorderable,f as States,p as Suggestions,y as __namedExportsOrder,u as default};