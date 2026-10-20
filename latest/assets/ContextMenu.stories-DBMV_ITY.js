import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./copy-CaNKB9WL.js";import{n as i,t as a}from"./pencil--phcQLUl.js";import{n as o,t as s}from"./trash-FTNL_zRp.js";import{t as c}from"./jsx-runtime-MKhVqBIO.js";import{i as l,n as u,s as d,t as f}from"./Menu-CvHUJ8Bq.js";import{n as p,t as m}from"./ContextMenu-C5COImtw.js";var h,g,_,v,y;function b(){return(b=e((()=>{n(),i(),o(),h=t(),d(),p(),g=c(),_={title:`Overlays/ContextMenu`,component:m,args:{children:[(0,g.jsx)(`div`,{},`target`),(0,g.jsx)(f,{},`menu`)]},parameters:{a11y:{config:{rules:[{id:`label-content-name-mismatch`,enabled:!1}]}}}},v={render:function(){let[e,t]=(0,h.useState)(`none yet`);return(0,g.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,g.jsxs)(m,{children:[(0,g.jsxs)(`div`,{role:`group`,"aria-label":`Quarterly report`,tabIndex:0,className:`flex h-40 w-full max-w-md flex-col gap-2 rounded-card border border-dashed border-border-strong bg-surface-2 p-4 text-sm text-fg outline-none focus-visible:focus-ring`,children:[(0,g.jsx)(`span`,{className:`font-semibold`,children:`Quarterly report`}),(0,g.jsx)(`span`,{className:`text-fg-muted`,children:`Right-click anywhere in this card.`}),(0,g.jsx)(`input`,{"aria-label":`Notes`,placeholder:`Text fields keep the browser menu`,className:`mt-auto rounded-control border border-border bg-surface-1 px-2 py-1`})]}),(0,g.jsxs)(f,{"aria-label":`Report actions`,onAction:e=>{t(String(e))},children:[(0,g.jsx)(u,{id:`edit`,icon:a,shortcut:`⌘E`,children:`Edit`}),(0,g.jsx)(u,{id:`duplicate`,icon:r,children:`Duplicate`}),(0,g.jsx)(l,{}),(0,g.jsx)(u,{id:`delete`,icon:s,tone:`danger`,children:`Delete`})]})]}),(0,g.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Last action: `,e]})]})}},y=[`Basic`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: function BasicStory() {
    const [last, setLast] = useState('none yet');
    return <div className="flex flex-col gap-3">
        <ContextMenuTrigger>
          <div role="group" aria-label="Quarterly report"
        // The area is focusable so keyboard users can open its menu with Shift+F10.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a focusable group, per the comment above.
        tabIndex={0} className="flex h-40 w-full max-w-md flex-col gap-2 rounded-card border border-dashed border-border-strong bg-surface-2 p-4 text-sm text-fg outline-none focus-visible:focus-ring">
            <span className="font-semibold">Quarterly report</span>
            <span className="text-fg-muted">Right-click anywhere in this card.</span>
            <input aria-label="Notes" placeholder="Text fields keep the browser menu" className="mt-auto rounded-control border border-border bg-surface-1 px-2 py-1" />
          </div>
          <Menu aria-label="Report actions" onAction={key => {
          setLast(String(key));
        }}>
            <MenuItem id="edit" icon={Pencil} shortcut="⌘E">
              Edit
            </MenuItem>
            <MenuItem id="duplicate" icon={Copy}>
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem id="delete" icon={Trash2} tone="danger">
              Delete
            </MenuItem>
          </Menu>
        </ContextMenuTrigger>
        <p className="text-sm text-fg-muted">Last action: {last}</p>
      </div>;
  }
}`,...v.parameters?.docs?.source},description:{story:`Right-click the card (or long-press it on a touch screen, or focus it and press Shift+F10) to open its menu where
you asked. The text field inside keeps the browser's own menu.`,...v.parameters?.docs?.description}}}})))()}b();export{v as Basic,y as __namedExportsOrder,_ as default};