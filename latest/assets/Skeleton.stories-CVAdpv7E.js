import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Button-e4ZjaxXL.js";import{n as i,t as a}from"./Skeleton-B0m7buPA.js";import{n as o,t as s}from"./Card-BKrFQ2m4.js";var c,l,u,d,f;function p(){return(p=e((()=>{n(),o(),i(),c=t(),l={title:`Feedback/Skeleton`,component:a},u={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-4`,children:[(0,c.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,c.jsx)(a,{shape:`circle`,width:40}),(0,c.jsx)(a,{lineCount:2})]}),(0,c.jsx)(a,{shape:`rect`,height:120}),(0,c.jsx)(a,{lineCount:4})]})},d={render:()=>(0,c.jsx)(`div`,{"aria-busy":`true`,className:`max-w-md`,children:(0,c.jsx)(a,{isLoading:!0,children:(0,c.jsxs)(s,{title:`Customer details`,footer:(0,c.jsx)(r,{size:`sm`,children:`Edit`}),children:[(0,c.jsx)(`p`,{className:`text-sm`,children:`Acme Corporation`}),(0,c.jsx)(`p`,{className:`text-sm`,children:`Joined March 2024`})]})})})},f=[`Shapes`,`ShapedFromContent`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" width={40} />
        <Skeleton lineCount={2} />
      </div>
      <Skeleton shape="rect" height={120} />
      <Skeleton lineCount={4} />
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div aria-busy="true" className="max-w-md">
      <Skeleton isLoading>
        <Card title="Customer details" footer={<Button size="sm">Edit</Button>}>
          <p className="text-sm">Acme Corporation</p>
          <p className="text-sm">Joined March 2024</p>
        </Card>
      </Skeleton>
    </div>
}`,...d.parameters?.docs?.source},description:{story:`Wrapping real content draws placeholders shaped like its text and controls.`,...d.parameters?.docs?.description}}}})))()}p();export{d as ShapedFromContent,u as Shapes,f as __namedExportsOrder,l as default};