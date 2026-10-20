import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./createLucideIcon-BXqG86fR.js";import{n as i,t as a}from"./file-text-Cy00aP_W.js";import{n as ee,t as o}from"./folder-yfByioMe.js";import{n as s,t as c}from"./image-CP7lwTdb.js";import{n as l,t as u}from"./star-CA5brg6m.js";import{t as d}from"./jsx-runtime-MKhVqBIO.js";import{n as f,t as p}from"./Button-e4ZjaxXL.js";import{n as te,t as ne}from"./IconButton-B63kwQhA.js";import{i as re,n as m,s as ie}from"./Menu-CvHUJ8Bq.js";import{n as ae,t as h}from"./Badge-B8tm3wVn.js";import{n as oe,t as se}from"./EmptyState-c1P9msQ4.js";import{n as g,r as _}from"./Text-CiszJ5rL.js";import{a as v,r as y}from"./text-DgoWQMf9.js";import{i as b,r as x,t as S}from"./ListView-B7YiqAUq.js";import{a as C,i as w}from"./people-0DzGjKZ5.js";import{t as T}from"./virtualizer-Dlk4ddOo.js";import{n as E,r as D,t as ce}from"./listItems-CptBO7Hj.js";var O,k;function A(){return(A=e((()=>{n(),O={name:`inbox`,size:24,node:[[`polyline`,{points:`22 12 16 12 14 15 10 15 8 12 2 12`,key:`o97t9d`}],[`path`,{d:`M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z`,key:`oot6mr`}]]},O.node,k=r(O)})))()}var j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{i(),ee(),s(),A(),l(),j=t(),ce(),w(),ae(),f(),oe(),te(),ie(),_(),y(),x(),M=d(),N=[{tone:`success`,label:`Online`},{tone:`neutral`,label:`Away`},{tone:`warning`,label:`Busy`}],P=C.map((e,t)=>{let n=N[t%N.length]??N[0];return{id:e.name.toLowerCase().replace(/\W+/g,`-`),label:e.name,description:[`Astronomer`,`Engineer`,`Archivist`,`Analyst`][t%4],avatar:{name:e.name,src:`src`in e?e.src:void 0},meta:(0,M.jsx)(h,{variant:`soft`,tone:n.tone,size:`sm`,children:n.label})}}),F=[{id:`notes`,label:`Night log, Oct 12`,description:`Edited 2 hours ago`,icon:a,meta:`12 KB`},{id:`images`,label:`Survey images`,description:`1,204 files`,icon:o,meta:`3.1 GB`},{id:`nebula`,label:`nebula-ha.png`,description:`Edited yesterday`,icon:c,meta:`8.4 MB`},{id:`budget`,label:`Budget 2027`,description:`Shared with Archive`,icon:a,meta:`44 KB`}],I={title:`Display/ListView`,component:S,args:{"aria-label":`People`,items:P},beforeEach:T},L={render:()=>(0,M.jsx)(`div`,{className:`max-w-xl`,children:(0,M.jsx)(S,{"aria-label":`People`,items:P,rowActions:()=>(0,M.jsxs)(M.Fragment,{children:[(0,M.jsx)(m,{id:`message`,children:`Message`}),(0,M.jsx)(m,{id:`profile`,children:`View profile`}),(0,M.jsx)(re,{}),(0,M.jsx)(m,{id:`remove`,tone:`danger`,children:`Remove`})]})})})},R={render:function(){let[e,t]=(0,j.useState)(new Set([`grace-hopper`,`vera-rubin`]));return(0,M.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-3`,children:[(0,M.jsxs)(`div`,{className:`flex min-h-hit items-center justify-between gap-2`,children:[(0,M.jsxs)(g,{variant:`small`,children:[e.size,` selected`]}),(0,M.jsx)(p,{variant:`outline`,size:`sm`,isDisabled:e.size===0,onPress:()=>{t(new Set)},children:`Clear`})]}),(0,M.jsx)(S,{"aria-label":`People`,items:P,selectionMode:`multiple`,selectedKeys:e,onSelectionChange:t})]})}},z={tags:[`!visual`],render:function(){let[e,t]=(0,j.useState)(new Set([`nebula`]));return(0,M.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-3`,children:[(0,M.jsx)(S,{"aria-label":`Files`,items:F,selectionMode:`single`,selectedKeys:e,onSelectionChange:t}),(0,M.jsxs)(g,{variant:`small`,children:[`Chosen: `,[...e].join(`, `)||`nothing`]})]})}},B={tags:[`!visual`],render:function(){let[e,t]=(0,j.useState)(`nothing yet`),[n,r]=(0,j.useState)(new Set([`images`]));return(0,M.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-3`,children:[(0,M.jsx)(S,{"aria-label":`Files`,items:F,onAction:e=>{t(e)},renderActions:e=>(0,M.jsx)(ne,{icon:u,size:`sm`,variant:`ghost`,tone:n.has(e.id)?`warning`:`neutral`,"aria-label":`Star ${v(e)}`,isSelected:n.has(e.id),onChange:t=>{r(n=>{let r=new Set(n);return t?r.add(e.id):r.delete(e.id),r})}})}),(0,M.jsxs)(g,{variant:`small`,children:[`Opened: `,e]})]})}},V=E(80),H=D.map(e=>({id:e,title:e,items:V.filter(t=>t.team===e).map(e=>({...e,avatar:{name:e.label,src:e.src}}))})),U={render:()=>(0,M.jsx)(`div`,{className:`max-w-xl`,children:(0,M.jsx)(S,{"aria-label":`People by team`,sections:H,maxHeight:`24rem`})})},W=E(1e4),G=D.map(e=>({id:e,title:e,items:W.filter(t=>t.team===e)})),K={tags:[`!visual`],render:function(){let[e,t]=(0,j.useState)(new Set);return(0,M.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-3`,children:[(0,M.jsxs)(g,{variant:`small`,children:[W.length.toLocaleString(),` people, `,e.size.toLocaleString(),` selected`]}),(0,M.jsx)(S,{"aria-label":`Everyone`,sections:G,selectionMode:`multiple`,selectedKeys:e,onSelectionChange:t,isVirtualized:!0,maxHeight:`28rem`,density:`compact`})]})}},q={tags:[`!visual`],render:function(){let[e,t]=(0,j.useState)(30),[n,r]=(0,j.useState)(!1);return(0,M.jsx)(`div`,{className:`max-w-xl`,children:(0,M.jsx)(S,{"aria-label":`People`,items:E(e),isVirtualized:!0,maxHeight:`24rem`,hasMore:e<300,isLoadingMore:n,onLoadMore:()=>{r(!0),setTimeout(()=>{t(e=>e+30),r(!1)},800)}})})}},J={render:()=>(0,M.jsx)(`div`,{className:`max-w-xl`,children:(0,M.jsx)(S,{"aria-label":`People`,items:E(5),hasMore:!0,shouldLoadOnScroll:!1,onLoadMore:()=>void 0})})},Y={render:function(){let[e,t]=(0,j.useState)(F);return(0,M.jsx)(`div`,{className:`max-w-xl`,children:(0,M.jsx)(S,{"aria-label":`Files`,items:e,isReorderable:!0,onMove:e=>{t(t=>b(t,e))}})})}},X={render:()=>(0,M.jsx)(`div`,{className:`max-w-xl`,children:(0,M.jsx)(S,{"aria-label":`Files`,items:F,density:`compact`,selectionMode:`multiple`})})},Z={render:()=>(0,M.jsxs)(`div`,{className:`grid max-w-3xl gap-4 sm:grid-cols-3`,children:[(0,M.jsx)(S,{"aria-label":`Loading`,items:[],isLoading:!0}),(0,M.jsx)(S,{"aria-label":`No people`,items:[]}),(0,M.jsx)(S,{"aria-label":`Inbox`,items:[],emptyState:(0,M.jsx)(se,{icon:k,title:`Inbox zero`,hint:`Nothing needs you.`})})]})},Q=[`RichRows`,`MultipleSelection`,`SingleSelection`,`RowActions`,`Grouped`,`Virtualized`,`LoadMore`,`LoadMoreButton`,`Reorderable`,`Compact`,`LoadingAndEmpty`],L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <ListView aria-label="People" items={crew} rowActions={() => <>
            <MenuItem id="message">Message</MenuItem>
            <MenuItem id="profile">View profile</MenuItem>
            <MenuSeparator />
            <MenuItem id="remove" tone="danger">
              Remove
            </MenuItem>
          </>} />
    </div>
}`,...L.parameters?.docs?.source},description:{story:`Rich rows: a picture, a title and description, a status badge, and an actions menu at the end.`,...L.parameters?.docs?.description}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: function MultipleSelectionStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set(['grace-hopper', 'vera-rubin']));
    return <div className="flex max-w-xl flex-col gap-3">
        <div className="flex min-h-hit items-center justify-between gap-2">
          <Text variant="small">{selected.size} selected</Text>
          <Button variant="outline" size="sm" isDisabled={selected.size === 0} onPress={() => {
          setSelected(new Set());
        }}>
            Clear
          </Button>
        </div>
        <ListView aria-label="People" items={crew} selectionMode="multiple" selectedKeys={selected} onSelectionChange={setSelected} />
      </div>;
  }
}`,...R.parameters?.docs?.source},description:{story:`Many rows chosen with checkboxes (Space toggles the focused row), controlled, with a bar of bulk actions.`,...R.parameters?.docs?.description}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function SingleSelectionStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set(['nebula']));
    return <div className="flex max-w-xl flex-col gap-3">
        <ListView aria-label="Files" items={files} selectionMode="single" selectedKeys={selected} onSelectionChange={setSelected} />
        <Text variant="small">Chosen: {[...selected].join(', ') || 'nothing'}</Text>
      </div>;
  }
}`,...z.parameters?.docs?.source},description:{story:`One row at a time: choosing another row replaces the choice.`,...z.parameters?.docs?.description}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function RowActionsStory() {
    const [opened, setOpened] = useState('nothing yet');
    const [starred, setStarred] = useState<Set<string>>(new Set(['images']));
    return <div className="flex max-w-xl flex-col gap-3">
        <ListView aria-label="Files" items={files} onAction={id => {
        setOpened(id);
      }} renderActions={item => <IconButton icon={Star} size="sm" variant="ghost" tone={starred.has(item.id) ? 'warning' : 'neutral'} aria-label={\`Star \${itemText(item)}\`} isSelected={starred.has(item.id)} onChange={isSelected => {
        setStarred(current => {
          const next = new Set(current);
          if (isSelected) {
            next.add(item.id);
          } else {
            next.delete(item.id);
          }
          return next;
        });
      }} />} />
        <Text variant="small">Opened: {opened}</Text>
      </div>;
  }
}`,...B.parameters?.docs?.source},description:{story:`Rows that open something: press a row (or Enter) to activate it; the star is its own button.`,...B.parameters?.docs?.description}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <ListView aria-label="People by team" sections={sections} maxHeight="24rem" />
    </div>
}`,...U.parameters?.docs?.source},description:{story:`Rows grouped by team. Each heading sticks to the top while its rows scroll past.`,...U.parameters?.docs?.description}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function VirtualizedStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    return <div className="flex max-w-xl flex-col gap-3">
        <Text variant="small">
          {thousands.length.toLocaleString()} people, {selected.size.toLocaleString()} selected
        </Text>
        <ListView aria-label="Everyone" sections={thousandsBySection} selectionMode="multiple" selectedKeys={selected} onSelectionChange={setSelected} isVirtualized maxHeight="28rem" density="compact" />
      </div>;
  }
}`,...K.parameters?.docs?.source},description:{story:`10,000 rows, grouped, choosable: only the rows in view are drawn.`,...K.parameters?.docs?.description}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function LoadMoreStory() {
    const [count, setCount] = useState(30);
    const [isLoadingMore, setLoadingMore] = useState(false);
    return <div className="max-w-xl">
        <ListView aria-label="People" items={listPeople(count)} isVirtualized maxHeight="24rem" hasMore={count < 300} isLoadingMore={isLoadingMore} onLoadMore={() => {
        setLoadingMore(true);
        setTimeout(() => {
          setCount(current => current + 30);
          setLoadingMore(false);
        }, 800);
      }} />
      </div>;
  }
}`,...q.parameters?.docs?.source},description:{story:`Pages of rows load as the end scrolls into view, with a spinner row meanwhile.`,...q.parameters?.docs?.description}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <ListView aria-label="People" items={listPeople(5)} hasMore shouldLoadOnScroll={false} onLoadMore={() => undefined} />
    </div>
}`,...J.parameters?.docs?.source},description:{story:'`shouldLoadOnScroll={false}`: a "Load more" button asks for the next page instead.',...J.parameters?.docs?.description}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: function ReorderableStory() {
    const [items, setItems] = useState(files);
    return <div className="max-w-xl">
        <ListView aria-label="Files" items={items} isReorderable onMove={move => {
        setItems(current => moveListItems(current, move));
      }} />
      </div>;
  }
}`,...Y.parameters?.docs?.source},description:{story:`Drag a row by its handle (or focus the handle and press Enter, then the arrows) to reorder; the app applies it.`,...Y.parameters?.docs?.description}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <ListView aria-label="Files" items={files} density="compact" selectionMode="multiple" />
    </div>
}`,...X.parameters?.docs?.source},description:{story:`Compact rows for dense data.`,...X.parameters?.docs?.description}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
      <ListView aria-label="Loading" items={[]} isLoading />
      <ListView aria-label="No people" items={[]} />
      <ListView aria-label="Inbox" items={[]} emptyState={<EmptyState icon={Inbox} title="Inbox zero" hint="Nothing needs you." />} />
    </div>
}`,...Z.parameters?.docs?.source},description:{story:`The first load shows placeholder rows; with nothing to show, the default empty state or the app's own.`,...Z.parameters?.docs?.description}}}})))()}$();export{X as Compact,U as Grouped,q as LoadMore,J as LoadMoreButton,Z as LoadingAndEmpty,R as MultipleSelection,Y as Reorderable,L as RichRows,B as RowActions,z as SingleSelection,K as Virtualized,Q as __namedExportsOrder,I as default};