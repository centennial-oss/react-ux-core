import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./chart-line-BlbSxOH_.js";import{n as r,t as i}from"./pencil--phcQLUl.js";import{n as a,t as o}from"./share-2-CTFSi4sw.js";import{t as s}from"./jsx-runtime-MKhVqBIO.js";import{n as c,t as l}from"./WidgetFrame-CLTThG55.js";var u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{t(),r(),a(),c(),u=s(),d={title:`Dashboard/WidgetFrame`,component:l,args:{title:`Requests`,icon:n},parameters:{layout:`padded`},decorators:[e=>(0,u.jsx)(`div`,{className:`h-64 max-w-xl`,children:(0,u.jsx)(e,{})})]},f=(0,u.jsx)(`p`,{className:`p-3 text-sm text-fg-muted`,children:`Widget content`}),p={args:{children:f,updatedAt:new Date(Date.UTC(2026,9,18,9,30)),actions:[{id:`refresh`,label:`Refresh`,onAction:()=>void 0},{id:`share`,label:`Share`,icon:o,onAction:()=>void 0}]}},m={args:{children:f,isRefreshing:!0}},h={args:{children:f,onRefreshErrorRetry:()=>void 0}},g={args:{children:f,mode:`edit`,isLocked:!0,hasSetupIssue:!0,onConfigure:()=>void 0,actions:[{id:`configure`,label:`Configure`,icon:i,onAction:()=>void 0}]}},_={args:{children:f,isHighlighted:!0,titleNote:`Uses its own time range: Last 7 days`}},v={args:{children:f,isTitleHidden:!0,actions:[{id:`a`,label:`Refresh`,onAction:()=>void 0}]}},y=[`Default`,`Refreshing`,`RefreshFailed`,`Editing`,`Highlighted`,`HiddenTitle`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: body,
    updatedAt: new Date(Date.UTC(2026, 9, 18, 9, 30)),
    actions: [{
      id: 'refresh',
      label: 'Refresh',
      onAction: () => undefined
    }, {
      id: 'share',
      label: 'Share',
      icon: Share2,
      onAction: () => undefined
    }]
  }
}`,...p.parameters?.docs?.source},description:{story:`A titled region with one action menu: the standard actions, the widget type's and the host's.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: body,
    isRefreshing: true
  }
}`,...m.parameters?.docs?.source},description:{story:`Reloading in the background: the data stays, with a subtle indicator (WID-09).`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    children: body,
    onRefreshErrorRetry: () => undefined
  }
}`,...h.parameters?.docs?.source},description:{story:`A refresh failed: the earlier data stays, and the indicator retries (DATA-09).`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    children: body,
    mode: 'edit',
    isLocked: true,
    hasSetupIssue: true,
    onConfigure: () => undefined,
    actions: [{
      id: 'configure',
      label: 'Configure',
      icon: Pencil,
      onAction: () => undefined
    }]
  }
}`,...g.parameters?.docs?.source},description:{story:`Edit mode: the body ignores the pointer, and the lock and setup status show (WID-10, EDIT-21).`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    children: body,
    isHighlighted: true,
    titleNote: 'Uses its own time range: Last 7 days'
  }
}`,..._.parameters?.docs?.source},description:{story:`Accented while the consolidated legend highlights a series it shows (CTX-12), with its own time range.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    children: body,
    isTitleHidden: true,
    actions: [{
      id: 'a',
      label: 'Refresh',
      onAction: () => undefined
    }]
  }
}`,...v.parameters?.docs?.source},description:{story:`The title kept for screen readers only; the region is still named by it (WID-07).`,...v.parameters?.docs?.description}}}})))()}b();export{p as Default,g as Editing,v as HiddenTitle,_ as Highlighted,h as RefreshFailed,m as Refreshing,y as __namedExportsOrder,d as default};