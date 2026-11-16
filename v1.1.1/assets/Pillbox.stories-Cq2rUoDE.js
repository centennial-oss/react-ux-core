import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./createLucideIcon-BXqG86fR.js";import{n as i,t as a}from"./layout-grid-D3yXiKTw.js";import{n as o,t as s}from"./list-C3mCBBHc.js";import{a as c,i as l,n as u,o as d,r as f,t as p}from"./text-align-start-CK1bztmY.js";import{t as m}from"./jsx-runtime-MKhVqBIO.js";import{n as h,t as g}from"./Pillbox-pz_Q4xsr.js";var _,v;function y(){return(y=e((()=>{n(),_={name:`map`,size:24,node:[[`path`,{d:`M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z`,key:`169xi5`}],[`path`,{d:`M15 5.764v15`,key:`1pn4in`}],[`path`,{d:`M9 3.236v15`,key:`1uimfh`}]]},_.node,v=r(_)})))()}var b,x,S,C,w,T,E,D,O,k,A,j,M,N;function P(){return(P=e((()=>{d(),u(),l(),i(),o(),y(),b=t(),h(),x=m(),S=[{id:`list`,label:`List`,icon:s},{id:`grid`,label:`Grid`,icon:a},{id:`map`,label:`Map`,icon:v}],C=[{id:`day`,label:`Day`},{id:`week`,label:`Week`},{id:`month`,label:`Month`},{id:`year`,label:`Year`}],w={title:`Display/Pillbox`,component:g,args:{"aria-label":`Period`,options:C,defaultValue:`week`}},T={tags:[`!visual`]},E={tags:[`!visual`]},D={render:()=>(0,x.jsx)(g,{"aria-label":`View`,options:S,defaultValue:`grid`})},O={render:()=>(0,x.jsxs)(`div`,{className:`flex flex-wrap items-center gap-4`,children:[(0,x.jsx)(g,{"aria-label":`View`,options:S,isIconOnly:!0,defaultValue:`list`}),(0,x.jsx)(g,{"aria-label":`Text alignment`,isIconOnly:!0,size:`sm`,options:[{id:`start`,label:`Align start`,icon:p},{id:`center`,label:`Align centre`,icon:c},{id:`end`,label:`Align end`,icon:f}]})]})},k={render:()=>(0,x.jsxs)(`div`,{className:`flex flex-col items-start gap-3`,children:[(0,x.jsx)(g,{"aria-label":`Small`,size:`sm`,options:C,defaultValue:`day`}),(0,x.jsx)(g,{"aria-label":`Medium`,size:`md`,options:C,defaultValue:`day`})]})},A={render:()=>(0,x.jsxs)(`div`,{className:`flex flex-col items-start gap-3`,children:[(0,x.jsx)(g,{"aria-label":`Period`,defaultValue:`day`,options:[{id:`day`,label:`Day`},{id:`week`,label:`Week`,isDisabled:!0},{id:`month`,label:`Month`}]}),(0,x.jsx)(g,{"aria-label":`View`,options:S,defaultValue:`grid`,isDisabled:!0})]})},j={render:()=>(0,x.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-3`,children:[(0,x.jsx)(g,{"aria-label":`View`,options:S,className:`w-full`}),(0,x.jsx)(g,{"aria-label":`Reporting period`,className:`w-full`,options:[{id:`today`,label:`Today`},{id:`week`,label:`This week`},{id:`month`,label:`This month`},{id:`quarter`,label:`This quarter`}]})]})},M={tags:[`!visual`],render:function(){let[e,t]=(0,b.useState)(`map`);return(0,x.jsxs)(`div`,{className:`flex flex-col items-start gap-2`,children:[(0,x.jsx)(`span`,{id:`controlled-label`,className:`text-sm font-medium text-fg`,children:`Layout`}),(0,x.jsx)(g,{"aria-labelledby":`controlled-label`,options:S,value:e,onChange:t}),(0,x.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Showing the `,e,` view.`]})]})}},N=[`Playground`,`Basic`,`WithIcons`,`IconOnly`,`Sizes`,`Disabled`,`FullWidth`,`Controlled`],T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...E.parameters?.docs?.source},description:{story:`Text options. Arrow keys move between options; Enter or Space chooses.`,...E.parameters?.docs?.description}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <Pillbox aria-label="View" options={VIEWS} defaultValue="grid" />
}`,...D.parameters?.docs?.source},description:{story:`Icons with labels.`,...D.parameters?.docs?.description}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-4">
      <Pillbox aria-label="View" options={VIEWS} isIconOnly defaultValue="list" />
      <Pillbox aria-label="Text alignment" isIconOnly size="sm" options={[{
      id: 'start',
      label: 'Align start',
      icon: AlignLeft
    }, {
      id: 'center',
      label: 'Align centre',
      icon: AlignCenter
    }, {
      id: 'end',
      label: 'Align end',
      icon: AlignRight
    }]} />
    </div>
}`,...O.parameters?.docs?.source},description:{story:`Icon-only: each option's label is its accessible name.`,...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col items-start gap-3">
      <Pillbox aria-label="Small" size="sm" options={PERIODS} defaultValue="day" />
      <Pillbox aria-label="Medium" size="md" options={PERIODS} defaultValue="day" />
    </div>
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col items-start gap-3">
      <Pillbox aria-label="Period" defaultValue="day" options={[{
      id: 'day',
      label: 'Day'
    }, {
      id: 'week',
      label: 'Week',
      isDisabled: true
    }, {
      id: 'month',
      label: 'Month'
    }]} />
      <Pillbox aria-label="View" options={VIEWS} defaultValue="grid" isDisabled />
    </div>
}`,...A.parameters?.docs?.source},description:{story:`A disabled option, and a disabled group.`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-3">
      <Pillbox aria-label="View" options={VIEWS} className="w-full" />
      <Pillbox aria-label="Reporting period" className="w-full" options={[{
      id: 'today',
      label: 'Today'
    }, {
      id: 'week',
      label: 'This week'
    }, {
      id: 'month',
      label: 'This month'
    }, {
      id: 'quarter',
      label: 'This quarter'
    }]} />
    </div>
}`,...j.parameters?.docs?.source},description:{story:`Full width: the pills share the space. Labels truncate rather than widen the page.`,...j.parameters?.docs?.description}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [view, setView] = useState<(typeof VIEWS)[number]['id']>('map');
    return <div className="flex flex-col items-start gap-2">
        <span id="controlled-label" className="text-sm font-medium text-fg">
          Layout
        </span>
        <Pillbox aria-labelledby="controlled-label" options={VIEWS} value={view} onChange={setView} />
        <p className="text-sm text-fg-muted">Showing the {view} view.</p>
      </div>;
  }
}`,...M.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`; `onChange` receives the option id union.",...M.parameters?.docs?.description}}}})))()}P();export{E as Basic,M as Controlled,A as Disabled,j as FullWidth,O as IconOnly,T as Playground,k as Sizes,D as WithIcons,N as __namedExportsOrder,w as default};