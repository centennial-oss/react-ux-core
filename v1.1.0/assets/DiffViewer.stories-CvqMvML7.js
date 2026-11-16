import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{c as n,d as r,f as i,g as a,h as o,l as s,n as c,s as l,t as u,u as d}from"./DiffViewer-DlGEiuqX.js";var f,p,m,h,g,_,v,y,b,x,S,C,w;function T(){return(T=e((()=>{l(),c(),f=t(),p={title:`Diff/DiffViewer`,component:u,args:{before:a,after:o,language:`yaml`,beforeLabel:`Live`,afterLabel:`Proposed`}},m={},h={args:{before:d,after:r,language:`json`,maxHeight:`32rem`}},g={args:{layout:`unified`}},_={args:{layout:`split`}},v={args:{before:d,after:i,isStructural:!0,language:`json`,contextLines:1,maxHeight:`24rem`}},y={args:{before:`{ "aperture_mm": 1200 }`,after:`{ "aperture_mm": 1200, }`,isStructural:!0}},b={args:{hasWordDiff:!1}},x={args:{contextLines:0,layout:`unified`}},S={render:e=>(0,f.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,f.jsx)(u,{...e,before:s,after:n,language:`bash`,layout:`unified`}),(0,f.jsx)(u,{...e,before:s,after:n,language:`bash`,layout:`split`})]})},C={args:{after:a}},w=[`Default`,`LargeConfig`,`Unified`,`Split`,`Structural`,`StructuralFallback`,`WithoutWordDiff`,`NoContext`,`LongLines`,`NoDifferences`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{}`,...m.parameters?.docs?.source},description:{story:`A telescope's configuration, live and proposed. Split side by side on wide containers and unified below 48rem, with
changed words underlined and outlined within changed lines.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    before: observatoryLive,
    after: observatoryProposed,
    language: 'json',
    maxHeight: '32rem'
  }
}`,...h.parameters?.docs?.source},description:{story:`An observatory's 400-line JSON configuration with three changes: three hunks, the rest collapsed.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    layout: 'unified'
  }
}`,...g.parameters?.docs?.source},description:{story:`Always unified, with +/− marks and line numbers from both sides.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    layout: 'split'
  }
}`,..._.parameters?.docs?.source},description:{story:`Always split.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    before: observatoryLive,
    after: observatoryReordered,
    isStructural: true,
    language: 'json',
    contextLines: 1,
    maxHeight: '24rem'
  }
}`,...v.parameters?.docs?.source},description:{story:`Structural mode: the proposed JSON has its keys in another order, which isn't a change; only the three real
changes show.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    before: '{ "aperture_mm": 1200 }',
    after: '{ "aperture_mm": 1200, }',
    isStructural: true
  }
}`,...y.parameters?.docs?.source},description:{story:`Structural mode falls back to a text diff, with a note, when a side isn't valid JSON.`,...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    hasWordDiff: false
  }
}`,...b.parameters?.docs?.source},description:{story:`Without word highlights: changed lines only.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    contextLines: 0,
    layout: 'unified'
  }
}`,...x.parameters?.docs?.source},description:{story:`No context: only changed lines, with every unchanged run collapsed.`,...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-col gap-4">
      <DiffViewer {...args} before={longLineBefore} after={longLineAfter} language="bash" layout="unified" />
      <DiffViewer {...args} before={longLineBefore} after={longLineAfter} language="bash" layout="split" />
    </div>
}`,...S.parameters?.docs?.source},description:{story:`Long lines scroll inside the unified view and wrap in the split view; the page never scrolls sideways.`,...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    after: telescopeYamlBefore
  }
}`,...C.parameters?.docs?.source},description:{story:`Both sides the same: the text collapses, with a button to show it.`,...C.parameters?.docs?.description}}}})))()}T();export{m as Default,h as LargeConfig,S as LongLines,x as NoContext,C as NoDifferences,_ as Split,v as Structural,y as StructuralFallback,g as Unified,b as WithoutWordDiff,w as __namedExportsOrder,p as default};