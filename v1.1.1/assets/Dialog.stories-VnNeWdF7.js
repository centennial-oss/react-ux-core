import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,t as o}from"./ButtonGroup-DQOwtNCj.js";import{n as s,r as c,t as l}from"./Dialog-DWPS_dsB.js";var u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{u=t(),r(),a(),c(),d=n(),f={title:`Overlays/Dialog`,component:l,args:{title:`Dialog`,children:null}},p=(0,d.jsxs)(o,{children:[(0,d.jsx)(i,{slot:`close`,variant:`outline`,children:`Cancel`}),(0,d.jsx)(i,{slot:`close`,tone:`accent`,children:`Save`})]}),m={tags:[`visual-page`],render:()=>(0,d.jsxs)(s,{defaultOpen:!0,children:[(0,d.jsx)(i,{children:`Edit tariff`}),(0,d.jsx)(l,{title:`Edit tariff`,description:`Changes apply from the next billing period.`,footer:p,children:(0,d.jsx)(`p`,{children:`Tariff details and form fields go here.`})})]})},h={tags:[`!visual`],render:()=>(0,d.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:[`sm`,`md`,`lg`,`xl`].map(e=>(0,d.jsxs)(s,{children:[(0,d.jsx)(i,{variant:`outline`,children:e}),(0,d.jsx)(l,{title:`Size ${e}`,size:e,footer:p,children:(0,d.jsxs)(`p`,{children:[`A `,e,` dialog.`]})})]},e))})},g={tags:[`!visual`],render:function(){let[e,t]=(0,u.useState)(!1);return(0,d.jsxs)(s,{children:[(0,d.jsx)(i,{children:`Import meters`}),(0,d.jsx)(l,{title:`Import meters`,isBusy:e,footer:(0,d.jsxs)(o,{children:[(0,d.jsx)(i,{slot:`close`,variant:`outline`,isDisabled:e,children:`Cancel`}),(0,d.jsx)(i,{tone:`accent`,isPending:e,onPress:()=>{t(!0)},children:`Import`})]}),children:(0,d.jsx)(`p`,{children:`Importing can take a minute. Press Import to see the busy state.`})})]})}},_={tags:[`!visual`],render:()=>(0,d.jsxs)(s,{children:[(0,d.jsx)(i,{children:`Open first`}),(0,d.jsx)(l,{title:`First dialog`,footer:p,children:(0,d.jsxs)(s,{children:[(0,d.jsx)(i,{variant:`outline`,children:`Open second`}),(0,d.jsx)(l,{title:`Second dialog`,size:`sm`,children:(0,d.jsx)(`p`,{children:`Press Escape: only this dialog closes.`})})]})})]})},v=[`Basic`,`Sizes`,`Busy`,`Stacked`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <DialogTrigger defaultOpen>
      <Button>Edit tariff</Button>
      <Dialog title="Edit tariff" description="Changes apply from the next billing period." footer={footer}>
        <p>Tariff details and form fields go here.</p>
      </Dialog>
    </DialogTrigger>
}`,...m.parameters?.docs?.source},description:{story:`Dims the page until dismissed (Escape, the backdrop, Close or Cancel). Full screen on phones.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex flex-wrap gap-2">
      {(['sm', 'md', 'lg', 'xl'] as const).map(size => <DialogTrigger key={size}>
          <Button variant="outline">{size}</Button>
          <Dialog title={\`Size \${size}\`} size={size} footer={footer}>
            <p>A {size} dialog.</p>
          </Dialog>
        </DialogTrigger>)}
    </div>
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function BusyStory() {
    const [isBusy, setBusy] = useState(false);
    return <DialogTrigger>
        <Button>Import meters</Button>
        <Dialog title="Import meters" isBusy={isBusy} footer={<ButtonGroup>
              <Button slot="close" variant="outline" isDisabled={isBusy}>
                Cancel
              </Button>
              <Button tone="accent" isPending={isBusy} onPress={() => {
          setBusy(true);
        }}>
                Import
              </Button>
            </ButtonGroup>}>
          <p>Importing can take a minute. Press Import to see the busy state.</p>
        </Dialog>
      </DialogTrigger>;
  }
}`,...g.parameters?.docs?.source},description:{story:`While busy, the dialog can't be dismissed and reports aria-busy.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <DialogTrigger>
      <Button>Open first</Button>
      <Dialog title="First dialog" footer={footer}>
        <DialogTrigger>
          <Button variant="outline">Open second</Button>
          <Dialog title="Second dialog" size="sm">
            <p>Press Escape: only this dialog closes.</p>
          </Dialog>
        </DialogTrigger>
      </Dialog>
    </DialogTrigger>
}`,..._.parameters?.docs?.source},description:{story:`Escape closes only the top dialog.`,..._.parameters?.docs?.description}}}})))()}y();export{m as Basic,g as Busy,h as Sizes,_ as Stacked,v as __namedExportsOrder,f as default};