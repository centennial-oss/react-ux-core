import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./createLucideIcon-BXqG86fR.js";import{n as i,t as a}from"./archive-BJ-Ge5up.js";import{n as o,t as s}from"./DataTable-DGuamtNt.js";import{n as c,t as l}from"./download-C_8cVRQ1.js";import{n as u,t as d}from"./tag-0mms0y8E.js";import{n as f,t as p}from"./trash-FTNL_zRp.js";import{t as m}from"./jsx-runtime-MKhVqBIO.js";import{n as h,t as g}from"./Button-e4ZjaxXL.js";import{r as _,t as v}from"./ActionBar-D8oxJKQH.js";import{n as y}from"./columns-DEGfLg1q.js";var b,x;function S(){return(S=e((()=>{n(),b={name:`folder-input`,size:24,node:[[`path`,{d:`M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1`,key:`fm4g5t`}],[`path`,{d:`M2 13h10`,key:`pgb2dq`}],[`path`,{d:`m9 16 3-3-3-3`,key:`6m91ic`}]]},b.node,x=r(b)})))()}var C,w;function T(){return(T=e((()=>{n(),C={name:`user-plus`,size:24,node:[[`path`,{d:`M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`,key:`1yyitq`}],[`circle`,{cx:`9`,cy:`7`,r:`4`,key:`nufk8`}],[`line`,{x1:`19`,x2:`19`,y1:`8`,y2:`14`,key:`1bvyxn`}],[`line`,{x1:`22`,x2:`16`,y1:`11`,y2:`11`,key:`1shjgl`}]]},C.node,w=r(C)})))()}var E,D,O,k,A,j,M,N,P,F,I,L,R;function z(){return(z=e((()=>{i(),c(),S(),u(),f(),T(),E=t(),o(),h(),_(),D=m(),O=[{id:`archive`,label:`Archive`,icon:a,priority:2},{id:`move`,label:`Move`,icon:x,priority:1},{id:`label`,label:`Label`,icon:d},{id:`assign`,label:`Assign`,icon:w},{id:`export`,label:`Export`,icon:l},{id:`delete`,label:`Delete`,icon:p,tone:`danger`,priority:2,group:`Delete`}],k={title:`Actions/ActionBar`,component:v,args:{selectedCount:3,onClearSelection:()=>void 0,items:O}},A={},j={render:e=>(0,D.jsx)(`div`,{className:`max-w-full`,style:{width:340},children:(0,D.jsx)(v,{...e,selectedCount:12})})},M={args:{items:O.slice(0,3)},render:e=>(0,D.jsx)(v,{...e,children:(0,D.jsx)(g,{size:`md`,variant:`soft`,tone:`accent`,children:`Select all 240`})})},N=[`Acme Corp`,`Globex`,`Initech`,`Umbrella`,`Hooli`,`Stark Industries`],P=Array.from({length:12},(e,t)=>({id:`INV-${String(1040+t)}`,customer:N[t%N.length]??``,amount:t*7919%9e5/100+50,status:[`Draft`,`Sent`,`Paid`,`Overdue`][t%4]??``})),F=y(),I=[F.field(`id`,{header:`Invoice`,isRowHeader:!0}),F.field(`customer`,{header:`Customer`,mobile:`subtitle`}),F.field(`status`,{header:`Status`,mobile:!0}),F.field(`amount`,{header:`Amount`,align:`end`})],L={tags:[`!visual`],render:function(){let[e,t]=(0,E.useState)(P),[n,r]=(0,E.useState)(new Set([`INV-1041`,`INV-1043`])),[i,a]=(0,E.useState)(``);return(0,D.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,D.jsx)(s,{"aria-label":`Invoices`,rows:e,columns:I,getRowId:e=>e.id,selectionMode:`multiple`,selectedKeys:n,onSelectionChange:r}),(0,D.jsx)(`p`,{className:`text-sm text-fg-muted`,"aria-live":`polite`,children:i}),(0,D.jsx)(v,{selectedCount:n.size,onClearSelection:()=>{r(new Set)},items:O,onAction:i=>{i===`delete`&&(t(e.filter(e=>!n.has(e.id))),r(new Set)),a(`${String(i)}: ${[...n].join(`, `)}`)}})]})}},R=[`Basic`,`Narrow`,`WithChildren`,`WithDataTable`],A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{}`,...A.parameters?.docs?.source},description:{story:`The count, the clear button and the actions. Actions that don't fit move into "More actions".`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: args => <div className="max-w-full" style={{
    width: 340
  }}>
      <ActionBar {...args} selectedCount={12} />
    </div>
}`,...j.parameters?.docs?.source},description:{story:`On a narrow screen most actions move into the menu; the highest priorities (Archive, Delete) stay longest.`,...j.parameters?.docs?.description}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    items: ITEMS.slice(0, 3)
  },
  render: args => <ActionBar {...args}>
      <Button size="md" variant="soft" tone="accent">
        Select all 240
      </Button>
    </ActionBar>
}`,...M.parameters?.docs?.source},description:{story:"Extra controls in `children` stay in the bar beside the overflowing items.",...M.parameters?.docs?.description}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function WithDataTableStory() {
    const [rows, setRows] = useState(invoices);
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(['INV-1041', 'INV-1043']));
    const [log, setLog] = useState('');
    return <div className="flex flex-col gap-3">
        <DataTable<Invoice> aria-label="Invoices" rows={rows} columns={columns} getRowId={row => row.id} selectionMode="multiple" selectedKeys={selected} onSelectionChange={setSelected} />
        <p className="text-sm text-fg-muted" aria-live="polite">
          {log}
        </p>
        <ActionBar selectedCount={selected.size} onClearSelection={() => {
        setSelected(new Set());
      }} items={ITEMS} onAction={key => {
        if (key === 'delete') {
          setRows(rows.filter(row => !selected.has(row.id)));
          setSelected(new Set());
        }
        setLog(\`\${String(key)}: \${[...selected].join(', ')}\`);
      }} />
      </div>;
  }
}`,...L.parameters?.docs?.source},description:{story:`With DataTable selection: select rows and the bar slides in below the table, sticking to the bottom of the view
while the table scrolls past. Escape in the bar, or its clear button, clears the selection; actions run on the
selected rows.`,...L.parameters?.docs?.description}}}})))()}z();export{A as Basic,j as Narrow,M as WithChildren,L as WithDataTable,R as __namedExportsOrder,k as default};