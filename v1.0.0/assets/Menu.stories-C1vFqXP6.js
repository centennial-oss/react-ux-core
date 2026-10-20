import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./copy-CaNKB9WL.js";import{n as i,t as a}from"./download-C_8cVRQ1.js";import{i as o,n as s,r as c,t as l}from"./MenuButtons-CAQTxMN9.js";import{n as u,t as d}from"./mail-DmXKU5Ay.js";import{n as f,t as p}from"./pencil--phcQLUl.js";import{n as m,t as h}from"./share-2-CTFSi4sw.js";import{n as g,t as _}from"./trash-FTNL_zRp.js";import{t as v}from"./jsx-runtime-MKhVqBIO.js";import{n as y,t as b}from"./Button-e4ZjaxXL.js";import{a as x,i as S,n as C,o as w,r as T,s as E,t as D}from"./Menu-CvHUJ8Bq.js";var O,k,A,j,M,N,P,F,I;function L(){return(L=e((()=>{n(),i(),u(),f(),m(),g(),O=t(),y(),E(),o(),k=v(),A={title:`Overlays/Menu`,component:D,args:{children:null},parameters:{a11y:{config:{rules:[{id:`label-content-name-mismatch`,enabled:!1}]}}}},j={tags:[`visual-page`],render:()=>(0,k.jsxs)(x,{defaultOpen:!0,children:[(0,k.jsx)(b,{variant:`outline`,children:`Actions`}),(0,k.jsxs)(D,{children:[(0,k.jsx)(C,{id:`edit`,icon:p,shortcut:`⌘E`,children:`Edit`}),(0,k.jsx)(C,{id:`duplicate`,icon:r,shortcut:`⌘D`,children:`Duplicate`}),(0,k.jsx)(C,{id:`export`,icon:a,description:`CSV of the current view`,children:`Export`}),(0,k.jsx)(C,{id:`archive`,isDisabled:!0,children:`Archive`}),(0,k.jsx)(S,{}),(0,k.jsx)(C,{id:`delete`,icon:_,tone:`danger`,children:`Delete`})]})]})},M={tags:[`visual-page`],render:function(){let[e,t]=(0,O.useState)(new Set([`name`])),[n,r]=(0,O.useState)(new Set([`status`,`owner`]));return(0,k.jsxs)(x,{defaultOpen:!0,children:[(0,k.jsx)(b,{variant:`outline`,children:`View`}),(0,k.jsxs)(D,{children:[(0,k.jsxs)(T,{title:`Sort by`,selectionMode:`single`,selectedKeys:e,onSelectionChange:t,children:[(0,k.jsx)(C,{id:`name`,children:`Name`}),(0,k.jsx)(C,{id:`created`,children:`Date created`})]}),(0,k.jsx)(S,{}),(0,k.jsxs)(T,{title:`Columns`,selectionMode:`multiple`,selectedKeys:n,onSelectionChange:r,children:[(0,k.jsx)(C,{id:`status`,children:`Status`}),(0,k.jsx)(C,{id:`owner`,children:`Owner`}),(0,k.jsx)(C,{id:`updated`,children:`Last updated`})]})]})]})}},N={tags:[`visual-page`],render:function(){let[e,t]=(0,O.useState)(new Set([`system`]));return(0,k.jsxs)(x,{defaultOpen:!0,children:[(0,k.jsx)(b,{variant:`outline`,children:`Settings`}),(0,k.jsxs)(D,{children:[(0,k.jsxs)(T,{title:`Theme`,layout:`choice`,selectedKeys:e,onSelectionChange:t,children:[(0,k.jsx)(C,{id:`system`,children:`System`}),(0,k.jsx)(C,{id:`light`,children:`Light`}),(0,k.jsx)(C,{id:`dark`,children:`Dark`}),(0,k.jsx)(C,{id:`high-contrast`,children:`High contrast`})]}),(0,k.jsx)(S,{}),(0,k.jsx)(C,{id:`shortcuts`,children:`Keyboard shortcuts`}),(0,k.jsx)(C,{id:`help`,children:`Help`})]})]})}},P={tags:[`!visual`],render:()=>(0,k.jsxs)(x,{children:[(0,k.jsx)(b,{variant:`outline`,children:`File`}),(0,k.jsxs)(D,{children:[(0,k.jsx)(C,{id:`new`,children:`New`}),(0,k.jsxs)(w,{children:[(0,k.jsx)(C,{id:`share`,icon:h,children:`Share`}),(0,k.jsxs)(D,{children:[(0,k.jsx)(C,{id:`email`,icon:d,children:`Email`}),(0,k.jsx)(C,{id:`link`,icon:r,children:`Copy link`})]})]})]})]})},F={render:()=>(0,k.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,k.jsxs)(l,{label:`Export`,icon:a,children:[(0,k.jsx)(C,{id:`csv`,children:`CSV`}),(0,k.jsx)(C,{id:`xlsx`,children:`Excel`}),(0,k.jsx)(C,{id:`pdf`,children:`PDF`})]}),(0,k.jsxs)(c,{label:`Save`,onPress:()=>void 0,children:[(0,k.jsx)(C,{id:`draft`,children:`Save as draft`}),(0,k.jsx)(C,{id:`template`,children:`Save as template`})]}),(0,k.jsx)(c,{label:`Publish`,variant:`outline`,tone:`neutral`,onPress:()=>void 0,children:(0,k.jsx)(C,{id:`schedule`,children:`Schedule…`})}),(0,k.jsxs)(s,{children:[(0,k.jsx)(C,{id:`rename`,children:`Rename`}),(0,k.jsx)(C,{id:`delete`,tone:`danger`,children:`Delete`})]})]})},I=[`Actions`,`SelectionSections`,`ChoiceRow`,`Submenu`,`Buttons`],j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <MenuTrigger defaultOpen>
      <Button variant="outline">Actions</Button>
      <Menu>
        <MenuItem id="edit" icon={Pencil} shortcut="⌘E">
          Edit
        </MenuItem>
        <MenuItem id="duplicate" icon={Copy} shortcut="⌘D">
          Duplicate
        </MenuItem>
        <MenuItem id="export" icon={Download} description="CSV of the current view">
          Export
        </MenuItem>
        <MenuItem id="archive" isDisabled>
          Archive
        </MenuItem>
        <MenuSeparator />
        <MenuItem id="delete" icon={Trash2} tone="danger">
          Delete
        </MenuItem>
      </Menu>
    </MenuTrigger>
}`,...j.parameters?.docs?.source},description:{story:`Icons, shortcut hints, a disabled item, a separator and a destructive item. Opens as a sheet on phones.`,...j.parameters?.docs?.description}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: function SelectionStory() {
    const [sort, setSort] = useState<Selection>(new Set(['name']));
    const [columns, setColumns] = useState<Selection>(new Set(['status', 'owner']));
    return <MenuTrigger defaultOpen>
        <Button variant="outline">View</Button>
        <Menu>
          <MenuSection title="Sort by" selectionMode="single" selectedKeys={sort} onSelectionChange={setSort}>
            <MenuItem id="name">Name</MenuItem>
            <MenuItem id="created">Date created</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuSection title="Columns" selectionMode="multiple" selectedKeys={columns} onSelectionChange={setColumns}>
            <MenuItem id="status">Status</MenuItem>
            <MenuItem id="owner">Owner</MenuItem>
            <MenuItem id="updated">Last updated</MenuItem>
          </MenuSection>
        </Menu>
      </MenuTrigger>;
  }
}`,...M.parameters?.docs?.source},description:{story:`Radio (single) and checkbox (multiple) sections with headings.`,...M.parameters?.docs?.description}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: function ChoiceRowStory() {
    const [theme, setTheme] = useState<Selection>(new Set(['system']));
    return <MenuTrigger defaultOpen>
        <Button variant="outline">Settings</Button>
        <Menu>
          <MenuSection title="Theme" layout="choice" selectedKeys={theme} onSelectionChange={setTheme}>
            <MenuItem id="system">System</MenuItem>
            <MenuItem id="light">Light</MenuItem>
            <MenuItem id="dark">Dark</MenuItem>
            <MenuItem id="high-contrast">High contrast</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuItem id="shortcuts">Keyboard shortcuts</MenuItem>
          <MenuItem id="help">Help</MenuItem>
        </Menu>
      </MenuTrigger>;
  }
}`,...N.parameters?.docs?.source},description:{story:`A choice row stays open while the selection changes (for example a theme switcher).`,...N.parameters?.docs?.description}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <MenuTrigger>
      <Button variant="outline">File</Button>
      <Menu>
        <MenuItem id="new">New</MenuItem>
        <SubmenuTrigger>
          <MenuItem id="share" icon={Share2}>
            Share
          </MenuItem>
          <Menu>
            <MenuItem id="email" icon={Mail}>
              Email
            </MenuItem>
            <MenuItem id="link" icon={Copy}>
              Copy link
            </MenuItem>
          </Menu>
        </SubmenuTrigger>
      </Menu>
    </MenuTrigger>
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-3">
      <MenuButton label="Export" icon={Download}>
        <MenuItem id="csv">CSV</MenuItem>
        <MenuItem id="xlsx">Excel</MenuItem>
        <MenuItem id="pdf">PDF</MenuItem>
      </MenuButton>
      <SplitButton label="Save" onPress={() => undefined}>
        <MenuItem id="draft">Save as draft</MenuItem>
        <MenuItem id="template">Save as template</MenuItem>
      </SplitButton>
      <SplitButton label="Publish" variant="outline" tone="neutral" onPress={() => undefined}>
        <MenuItem id="schedule">Schedule…</MenuItem>
      </SplitButton>
      <OverflowMenu>
        <MenuItem id="rename">Rename</MenuItem>
        <MenuItem id="delete" tone="danger">
          Delete
        </MenuItem>
      </OverflowMenu>
    </div>
}`,...F.parameters?.docs?.source},description:{story:`MenuButton, SplitButton and OverflowMenu.`,...F.parameters?.docs?.description}}}})))()}L();export{j as Actions,F as Buttons,N as ChoiceRow,M as SelectionSections,P as Submenu,I as __namedExportsOrder,A as default};