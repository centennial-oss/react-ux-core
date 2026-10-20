import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{i as n,n as r}from"./ListBoxParts-CV4y54sA.js";import{n as i,t as a}from"./NumberField-ufIbOK3w.js";import{n as o,t as s}from"./InlineEdit-D6DgsLyx.js";import{n as c,t as l}from"./Select-jv47-BsW.js";var u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{n(),i(),c(),o(),u=t(),d={title:`Inputs/InlineEdit`,component:s,args:{label:`Project name`,defaultValue:`Apollo guidance computer`}},f={tags:[`!visual`]},p={render:()=>(0,u.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,u.jsx)(s,{"aria-label":`Project name`,headingLevel:2,defaultValue:`Apollo guidance computer`}),(0,u.jsx)(s,{label:`Owner`,defaultValue:`Margaret Hamilton`}),(0,u.jsx)(s,{label:`Description`,placeholder:`Add a description`}),(0,u.jsx)(s,{label:`Notes`,isMultiline:!0,defaultValue:`Flight software for the command module.
Reviewed weekly.`}),(0,u.jsx)(s,{label:`Mission`,defaultValue:`Apollo 11`,isDisabled:!0}),(0,u.jsx)(s,{label:`Project code`,defaultValue:`AGC-1969`,isReadOnly:!0})]})},m={render:()=>(0,u.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,u.jsx)(s,{"aria-label":`Project name`,headingLevel:2,defaultValue:`Apollo guidance computer`,defaultEditing:!0}),(0,u.jsx)(s,{label:`Owner`,description:`Shown on the project page.`,defaultValue:`Margaret Hamilton`,defaultEditing:!0}),(0,u.jsx)(s,{label:`Notes`,isMultiline:!0,minRows:2,defaultValue:`Flight software for the command module.
Reviewed weekly.`,defaultEditing:!0}),(0,u.jsx)(s,{label:`Tag`,size:`sm`,defaultValue:`guidance`,defaultEditing:!0})]})},h={tags:[`!visual`],render:()=>(0,u.jsx)(`div`,{className:`max-w-md`,children:(0,u.jsx)(s,{label:`Project name`,defaultValue:`Apollo guidance computer`,validate:e=>e.trim()===``?`Enter a name.`:null,onSave:async e=>(await new Promise(e=>{setTimeout(e,800)}),e.includes(`taken`)?`That name is already taken.`:void 0)})})},g={tags:[`!visual`],render:()=>(0,u.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,u.jsx)(s,{label:`Saves on blur`,defaultValue:`Apollo`}),(0,u.jsx)(s,{label:`Cancels on blur`,defaultValue:`Gemini`,blurAction:`cancel`}),(0,u.jsx)(s,{label:`Stays open`,defaultValue:`Mercury`,blurAction:`none`}),(0,u.jsx)(s,{label:`No buttons`,defaultValue:`Skylab`,hasActionButtons:!1})]})},_={render:()=>(0,u.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,u.jsx)(s,{label:`Exposure`,defaultValue:30,formatValue:e=>e===null?``:`${e} s`,renderEditor:e=>(0,u.jsx)(a,{...e,minValue:1,suffix:`s`})}),(0,u.jsx)(s,{label:`Status`,defaultValue:`review`,formatValue:e=>v.find(t=>t.id===e)?.label??``,renderEditor:e=>(0,u.jsx)(l,{...e,children:v.map(e=>(0,u.jsx)(r,{id:e.id,children:e.label},e.id))})})]})},v=[{id:`draft`,label:`Draft`},{id:`review`,label:`In review`},{id:`done`,label:`Done`}],y=[`Playground`,`States`,`Editing`,`AsyncSave`,`BlurActions`,`CustomEditors`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <InlineEdit aria-label="Project name" headingLevel={2} defaultValue="Apollo guidance computer" />
      <InlineEdit label="Owner" defaultValue="Margaret Hamilton" />
      <InlineEdit label="Description" placeholder="Add a description" />
      <InlineEdit label="Notes" isMultiline defaultValue={'Flight software for the command module.\\nReviewed weekly.'} />
      <InlineEdit label="Mission" defaultValue="Apollo 11" isDisabled />
      <InlineEdit label="Project code" defaultValue="AGC-1969" isReadOnly />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Text or a heading with its edit button; pressing anywhere on the text edits it.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <InlineEdit aria-label="Project name" headingLevel={2} defaultValue="Apollo guidance computer" defaultEditing />
      <InlineEdit label="Owner" description="Shown on the project page." defaultValue="Margaret Hamilton" defaultEditing />
      <InlineEdit label="Notes" isMultiline minRows={2} defaultValue={'Flight software for the command module.\\nReviewed weekly.'} defaultEditing />
      <InlineEdit label="Tag" size="sm" defaultValue="guidance" defaultEditing />
    </div>
}`,...m.parameters?.docs?.source},description:{story:`The field in place of the text, with Save and Cancel; a heading edits in its own font.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-md">
      <InlineEdit label="Project name" defaultValue="Apollo guidance computer" validate={value => value.trim() === '' ? 'Enter a name.' : null} onSave={async value => {
      await new Promise(resolve => {
        setTimeout(resolve, 800);
      });
      return value.includes('taken') ? 'That name is already taken.' : undefined;
    }} />
    </div>
}`,...h.parameters?.docs?.source},description:{story:'`onSave` returns a promise: the Save button spins and the field is read-only until it settles. Here a name\ncontaining "taken" fails with a message, and an empty one fails `validate` as you type.',...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex max-w-md flex-col gap-5">
      <InlineEdit label="Saves on blur" defaultValue="Apollo" />
      <InlineEdit label="Cancels on blur" defaultValue="Gemini" blurAction="cancel" />
      <InlineEdit label="Stays open" defaultValue="Mercury" blurAction="none" />
      <InlineEdit label="No buttons" defaultValue="Skylab" hasActionButtons={false} />
    </div>
}`,...g.parameters?.docs?.source},description:{story:`What leaving the field does: save (the default), cancel, or keep it open.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <InlineEdit<number | null> label="Exposure" defaultValue={30} formatValue={seconds => seconds === null ? '' : \`\${seconds} s\`} renderEditor={props => <NumberField {...props} minValue={1} suffix="s" />} />
      <InlineEdit label="Status" defaultValue="review" formatValue={id => statuses.find(status => status.id === id)?.label ?? ''} renderEditor={props => <Select<object, string> {...props}>
            {statuses.map(status => <Option key={status.id} id={status.id}>
                {status.label}
              </Option>)}
          </Select>} />
    </div>
}`,..._.parameters?.docs?.source},description:{story:"Any field through `renderEditor`, with `formatValue` for the text: a NumberField and a Select.",..._.parameters?.docs?.description}}}})))()}b();export{h as AsyncSave,g as BlurActions,_ as CustomEditors,m as Editing,f as Playground,p as States,y as __namedExportsOrder,d as default};