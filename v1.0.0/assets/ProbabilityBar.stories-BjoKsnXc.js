import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{i as n,o as r}from"./messages-C-NqTIx4.js";import{n as i,t as a}from"./ProbabilityBar-CDNTBYuj.js";var o,s,c,l,u,d,f;function p(){return(p=e((()=>{r(),i(),o=t(),s={title:`Finance/ProbabilityBar`,component:a,args:{yes:.62},decorators:[e=>(0,o.jsx)(`div`,{className:`max-w-sm`,children:(0,o.jsx)(e,{})})]},c={},l={args:{size:`sm`}},u={args:{yes:.35,labels:{yes:`Visible`,no:`Not visible`},"aria-label":n}},d={render:()=>(0,o.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,o.jsx)(a,{yes:.97}),(0,o.jsx)(a,{yes:1}),(0,o.jsx)(a,{yes:0,size:`sm`})]})},f=[`Medium`,`Small`,`CustomLabels`,`Extremes`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{}`,...c.parameters?.docs?.source},description:{story:`Both percentages are written out, so the split doesn't rely on colour.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'sm'
  }
}`,...l.parameters?.docs?.source},description:{story:`Labels beside a thin bar, for lists of markets.`,...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    yes: 0.35,
    labels: {
      yes: 'Visible',
      no: 'Not visible'
    },
    'aria-label': cometQuestion
  }
}`,...u.parameters?.docs?.source},description:{story:`Custom labels, and the market's question as the group's name.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <ProbabilityBar yes={0.97} />
      <ProbabilityBar yes={1} />
      <ProbabilityBar yes={0} size="sm" />
    </div>
}`,...d.parameters?.docs?.source},description:{story:`Near-certain and settled markets.`,...d.parameters?.docs?.description}}}})))()}p();export{u as CustomLabels,d as Extremes,c as Medium,l as Small,f as __namedExportsOrder,s as default};