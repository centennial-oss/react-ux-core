import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{i as n,n as r,r as i}from"./ListBoxParts-CV4y54sA.js";import{n as a,t as o}from"./Select-jv47-BsW.js";var s,c,l,u,d,f,p;function m(){return(m=e((()=>{n(),a(),s=t(),c=[{id:`north`,name:`North`,description:`412 meters`},{id:`south`,name:`South`,description:`298 meters`},{id:`east`,name:`East`,description:`127 meters`},{id:`west`,name:`West`,description:`336 meters`}],l={title:`Inputs/Select`,component:o,args:{label:`Region`,children:null}},u={render:()=>(0,s.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,s.jsx)(o,{label:`Region`,items:c,description:`Where the meter is installed`,children:e=>(0,s.jsx)(r,{id:e.id,description:e.description,children:e.name})}),(0,s.jsx)(o,{label:`Region`,items:c,defaultValue:`east`,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})}),(0,s.jsx)(o,{label:`Region`,items:c,isRequired:!0,isInvalid:!0,errorMessage:`Choose a region`,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})}),(0,s.jsx)(o,{label:`Region`,items:c,isDisabled:!0,children:e=>(0,s.jsx)(r,{id:e.id,children:e.name})})]})},d={tags:[`visual-page`],render:()=>(0,s.jsx)(`div`,{className:`max-w-md`,children:(0,s.jsxs)(o,{label:`Tariff`,defaultOpen:!0,children:[(0,s.jsxs)(i,{title:`Residential`,children:[(0,s.jsx)(r,{id:`r1`,children:`Standard residential`}),(0,s.jsx)(r,{id:`r2`,children:`Time of use`})]}),(0,s.jsxs)(i,{title:`Commercial`,children:[(0,s.jsx)(r,{id:`c1`,children:`Small commercial`}),(0,s.jsx)(r,{id:`c2`,children:`Demand charge`})]})]})})},f={render:()=>(0,s.jsx)(`div`,{className:`max-w-xs`,children:(0,s.jsxs)(o,{label:`Assignment status`,defaultValue:`submitted`,isClearable:!0,children:[(0,s.jsx)(r,{id:`draft`,children:`Draft`}),(0,s.jsx)(r,{id:`submitted`,children:`Submitted`}),(0,s.jsx)(r,{id:`graded`,children:`Graded`})]})})},p=[`States`,`Open`,`Clearable`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <Select label="Region" items={regions} description="Where the meter is installed">
        {region => <Option id={region.id} description={region.description}>
            {region.name}
          </Option>}
      </Select>
      <Select label="Region" items={regions} defaultValue="east">
        {region => <Option id={region.id}>{region.name}</Option>}
      </Select>
      <Select label="Region" items={regions} isRequired isInvalid errorMessage="Choose a region">
        {region => <Option id={region.id}>{region.name}</Option>}
      </Select>
      <Select label="Region" items={regions} isDisabled>
        {region => <Option id={region.id}>{region.name}</Option>}
      </Select>
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <div className="max-w-md">
      <Select label="Tariff" defaultOpen>
        <OptionSection title="Residential">
          <Option id="r1">Standard residential</Option>
          <Option id="r2">Time of use</Option>
        </OptionSection>
        <OptionSection title="Commercial">
          <Option id="c1">Small commercial</Option>
          <Option id="c2">Demand charge</Option>
        </OptionSection>
      </Select>
    </div>
}`,...d.parameters?.docs?.source},description:{story:`Sections with headings. On phones the list opens as a bottom sheet.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xs">
      <Select label="Assignment status" defaultValue="submitted" isClearable>
        <Option id="draft">Draft</Option>
        <Option id="submitted">Submitted</Option>
        <Option id="graded">Graded</Option>
      </Select>
    </div>
}`,...f.parameters?.docs?.source},description:{story:"`isClearable` adds a clear button while something is chosen; `onChange` may then receive null.",...f.parameters?.docs?.description}}}})))()}m();export{f as Clearable,d as Open,u as States,p as __namedExportsOrder,l as default};