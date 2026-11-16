import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Button-e4ZjaxXL.js";import{n as i,t as a}from"./ButtonGroup-DQOwtNCj.js";import{n as o,r as s}from"./Dialog-DWPS_dsB.js";import{n as c,t as l}from"./Drawer-CT7_I-yf.js";import{n as u,t as d}from"./TextField-57e0_XUI.js";var f,p,m,h;function g(){return(g=e((()=>{n(),i(),s(),u(),c(),f=t(),p={title:`Overlays/Drawer`,component:l,args:{title:`Drawer`,children:null}},m={tags:[`visual-page`],render:()=>(0,f.jsxs)(o,{defaultOpen:!0,children:[(0,f.jsx)(r,{variant:`outline`,children:`Filters`}),(0,f.jsx)(l,{title:`Filters`,description:`Narrow the customer list.`,footer:(0,f.jsxs)(a,{layout:`stretch`,children:[(0,f.jsx)(r,{slot:`close`,variant:`outline`,children:`Reset`}),(0,f.jsx)(r,{slot:`close`,tone:`accent`,children:`Apply`})]}),children:(0,f.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,f.jsx)(d,{label:`Name contains`}),(0,f.jsx)(d,{label:`Region`})]})})]})},h=[`Filters`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <DialogTrigger defaultOpen>
      <Button variant="outline">Filters</Button>
      <Drawer title="Filters" description="Narrow the customer list." footer={<ButtonGroup layout="stretch">
            <Button slot="close" variant="outline">
              Reset
            </Button>
            <Button slot="close" tone="accent">
              Apply
            </Button>
          </ButtonGroup>}>
        <div className="flex flex-col gap-4">
          <TextField label="Name contains" />
          <TextField label="Region" />
        </div>
      </Drawer>
    </DialogTrigger>
}`,...m.parameters?.docs?.source},description:{story:`A side sheet on tablet and desktop; a bottom sheet on phones.`,...m.parameters?.docs?.description}}}})))()}g();export{m as Filters,h as __namedExportsOrder,p as default};