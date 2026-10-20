import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./DashboardGrid-CPs4SugE.js";function a({item:e,env:t}){return(0,c.jsxs)(`section`,{"aria-label":e.label,className:`flex size-full min-h-0 flex-col gap-1 overflow-hidden rounded-card border border-border bg-surface-2 p-3 ps-12 text-fg shadow-raised`,children:[(0,c.jsx)(`h3`,{className:`truncate text-sm font-semibold`,children:e.label}),(0,c.jsx)(`p`,{className:`text-xs text-fg-muted tabular-nums`,children:`${String(t.cell.w)} × ${String(t.cell.h)}`})]})}function o(){return(0,s.useCallback)((e,t)=>(0,c.jsx)(a,{item:e,env:t}),[])}var s,c,l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{s=t(),r(),c=n(),l={title:`Dashboard/DashboardGrid`,parameters:{layout:`fullscreen`}},u=[{id:`load`,label:`Grid load`,kind:`Panel`,layout:{x:0,y:0,w:8,h:4}},{id:`alerts`,label:`Alerts`,kind:`Panel`,layout:{x:8,y:0,w:4,h:2}},{id:`crews`,label:`Crews`,kind:`Panel`,layout:{x:8,y:2,w:4,h:2}},{id:`feeders`,label:`Feeders`,kind:`Panel`,layout:{x:0,y:4,w:6,h:3},minSize:{w:3,h:2}},{id:`outages`,label:`Outages`,kind:`Panel`,layout:{x:6,y:4,w:6,h:3}}],d={render:function(){return(0,c.jsx)(i,{"aria-label":`Operations`,items:u,renderItem:o(),height:`36rem`})}},f={render:function(){return(0,c.jsx)(i,{"aria-label":`Operations`,items:u,renderItem:o(),isEditable:!0,height:`36rem`})}},p={tags:[`!visual`],render:function(){let[e,t]=(0,s.useState)();return(0,c.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,c.jsx)(i,{"aria-label":`Operations`,items:u,renderItem:o(),isEditable:!0,layout:e,onLayoutChange:t,height:`30rem`}),(0,c.jsx)(`pre`,{className:`max-h-40 overflow-auto px-3 text-xs`,children:JSON.stringify(e??`not changed yet`)})]})}},m={render:function(){let e=u.map(e=>e.id===`alerts`?{...e,isLocked:!0}:e);return(0,c.jsx)(i,{"aria-label":`Operations`,items:e,renderItem:o(),isEditable:!0,height:`36rem`})}},h={render:function(){return(0,c.jsx)(i,{"aria-label":`Operations`,items:u.map(e=>({...e,layout:{...e.layout,x:(e.layout.x??0)*2,w:e.layout.w*2}})),renderItem:o(),grid:{columns:24,rowSizing:`fixed`,rowHeight:`3rem`,density:`compact`,compaction:`none`},height:`36rem`})}},g={render:function(){return(0,c.jsx)(i,{"aria-label":`Operations`,items:u,renderItem:o(),grid:{contentScale:1.5},height:`36rem`})}},_=[`Basic`,`Editable`,`ControlledLayout`,`Locked`,`GridSettings`,`LargeDisplayScale`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    return <DashboardGrid aria-label="Operations" items={panels} renderItem={usePanelRenderer()} height="36rem" />;
  }
}`,...d.parameters?.docs?.source},description:{story:`Panels on the default 12-column grid. Phones stack them; tablets halve the columns.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    return <DashboardGrid aria-label="Operations" items={panels} renderItem={usePanelRenderer()} isEditable height="36rem" />;
  }
}`,...f.parameters?.docs?.source},description:{story:`Edit mode: drag a panel by its handle, or resize it from its edges and corners, with a live preview. Keyboard:
focus a handle, press Enter, then the arrow keys move it and Shift with the arrow keys resizes it; Enter places it
and Escape puts it back. Every step is announced.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function Render() {
    const [layout, setLayout] = useState<LayoutEntry[]>();
    return <div className="flex flex-col gap-2">
        <DashboardGrid aria-label="Operations" items={panels} renderItem={usePanelRenderer()} isEditable layout={layout} onLayoutChange={setLayout} height="30rem" />
        <pre className="max-h-40 overflow-auto px-3 text-xs">
          {JSON.stringify(layout ?? 'not changed yet')}
        </pre>
      </div>;
  }
}`,...p.parameters?.docs?.source},description:{story:`The layout controlled by the app, which keeps it (here, shown below the grid).`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const items = panels.map(panel => panel.id === 'alerts' ? {
      ...panel,
      isLocked: true
    } : panel);
    return <DashboardGrid aria-label="Operations" items={items} renderItem={usePanelRenderer()} isEditable height="36rem" />;
  }
}`,...m.parameters?.docs?.source},description:{story:`A locked panel stays put; the others move around it (EDIT-15).`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    return <DashboardGrid aria-label="Operations" items={panels.map(panel => ({
      ...panel,
      layout: {
        ...panel.layout,
        x: (panel.layout.x ?? 0) * 2,
        w: panel.layout.w * 2
      }
    }))} renderItem={usePanelRenderer()} grid={{
      columns: 24,
      rowSizing: 'fixed',
      rowHeight: '3rem',
      density: 'compact',
      compaction: 'none'
    }} height="36rem" />;
  }
}`,...h.parameters?.docs?.source},description:{story:`Rows of a fixed height, 24 columns, compact spacing and no compaction: settings come from props (GRID-01).`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    return <DashboardGrid aria-label="Operations" items={panels} renderItem={usePanelRenderer()} grid={{
      contentScale: 1.5
    }} height="36rem" />;
  }
}`,...g.parameters?.docs?.source},description:{story:"Scaled up as on a large display (RESP-07): the gaps, padding and `--dashboard-scale` grow with it.",...g.parameters?.docs?.description}}}})))()}v();export{d as Basic,p as ControlledLayout,f as Editable,h as GridSettings,g as LargeDisplayScale,m as Locked,_ as __namedExportsOrder,l as default};