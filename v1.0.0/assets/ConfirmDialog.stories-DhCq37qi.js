import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Button-e4ZjaxXL.js";import{n as i,r as a}from"./Dialog-DWPS_dsB.js";import{n as o,t as s}from"./ConfirmDialog-CmT9bm9b.js";var c,l,u,d,f;function p(){return(p=e((()=>{n(),a(),o(),c=t(),l={title:`Overlays/ConfirmDialog`,component:s,args:{title:`Confirm`,onConfirm:()=>void 0}},u={tags:[`visual-page`],render:()=>(0,c.jsxs)(i,{defaultOpen:!0,children:[(0,c.jsx)(r,{tone:`danger`,variant:`soft`,children:`Delete meter`}),(0,c.jsx)(s,{title:`Delete meter M-1042?`,body:`Its readings will be removed from every report.`,consequence:`This can't be undone.`,tone:`danger`,confirmLabel:`Delete meter`,confirmPhrase:`M-1042`,onConfirm:()=>new Promise(e=>setTimeout(e,1200))})]})},d={tags:[`!visual`],render:()=>(0,c.jsxs)(i,{children:[(0,c.jsx)(r,{children:`Publish tariff`}),(0,c.jsx)(s,{title:`Publish tariff?`,body:`Customers on this tariff will be billed at the new rates from the next period.`,confirmLabel:`Publish`,onConfirm:()=>new Promise((e,t)=>setTimeout(()=>{t(Error(`The tariff overlaps an existing one.`))},800))})]})},f=[`TypeToConfirm`,`FailingConfirm`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <DialogTrigger defaultOpen>
      <Button tone="danger" variant="soft">
        Delete meter
      </Button>
      <ConfirmDialog title="Delete meter M-1042?" body="Its readings will be removed from every report." consequence="This can't be undone." tone="danger" confirmLabel="Delete meter" confirmPhrase="M-1042" onConfirm={() => new Promise(resolve => setTimeout(resolve, 1200))} />
    </DialogTrigger>
}`,...u.parameters?.docs?.source},description:{story:`A destructive action that requires typing the meter's name.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <DialogTrigger>
      <Button>Publish tariff</Button>
      <ConfirmDialog title="Publish tariff?" body="Customers on this tariff will be billed at the new rates from the next period." confirmLabel="Publish" onConfirm={() => new Promise((_, reject) => setTimeout(() => {
      reject(new Error('The tariff overlaps an existing one.'));
    }, 800))} />
    </DialogTrigger>
}`,...d.parameters?.docs?.source},description:{story:`onConfirm rejects: the error shows inline and the dialog stays open.`,...d.parameters?.docs?.description}}}})))()}p();export{d as FailingConfirm,u as TypeToConfirm,f as __namedExportsOrder,l as default};