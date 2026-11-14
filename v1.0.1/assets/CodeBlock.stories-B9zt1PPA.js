import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./CodeBlock-ne8fyY-z.js";import{a as i,i as a,n as o,o as s,s as c}from"./code-BIOoyb5p.js";var l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{o(),n(),l=t(),u={title:`Display/CodeBlock`,component:r,args:{code:c,language:`json`}},d={args:{title:`planets.json`}},f={args:{code:i,title:`mars.json`,hasLineNumbers:!0,highlightedLines:[5,6,7]}},p={name:`HCL`,args:{code:s,language:`hcl`,title:`observation.hcl`}},m={render:()=>(0,l.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,l.jsx)(r,{code:a,language:`bash`,"aria-label":`Run the projectile simulation`}),(0,l.jsx)(r,{code:a,language:`bash`,"aria-label":`Run the projectile simulation`,defaultWrapped:!0})]})},h={args:{code:i,title:`mars.json`,maxHeight:`12rem`,hasLineNumbers:!0}},g=[`PlanetData`,`HighlightedLines`,`Hcl`,`LongLine`,`MaxHeight`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'planets.json'
  }
}`,...d.parameters?.docs?.source},description:{story:`Planet data in JSON, with a title, copy and wrap buttons.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    code: marsOrbitJson,
    title: 'mars.json',
    hasLineNumbers: true,
    highlightedLines: [5, 6, 7]
  }
}`,...f.parameters?.docs?.source},description:{story:`Mars's orbit with the values Kepler's third law needs highlighted (background and a left border, not colour alone),
and line numbers.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: 'HCL',
  args: {
    code: observationHcl,
    language: 'hcl',
    title: 'observation.hcl'
  }
}`,...p.parameters?.docs?.source},description:{story:`A configuration file in HCL.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <CodeBlock code={longLine} language="bash" aria-label="Run the projectile simulation" />
      <CodeBlock code={longLine} language="bash" aria-label="Run the projectile simulation" defaultWrapped />
    </div>
}`,...m.parameters?.docs?.source},description:{story:`A long single line scrolls inside the block (focusable so it can be scrolled), or wraps.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    code: marsOrbitJson,
    title: 'mars.json',
    maxHeight: '12rem',
    hasLineNumbers: true
  }
}`,...h.parameters?.docs?.source},description:{story:"Scrolls inside past `maxHeight`.",...h.parameters?.docs?.description}}}})))()}_();export{p as Hcl,f as HighlightedLines,m as LongLine,h as MaxHeight,d as PlanetData,g as __namedExportsOrder,u as default};