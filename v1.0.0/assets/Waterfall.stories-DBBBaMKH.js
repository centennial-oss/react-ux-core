import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./plotCharts-CwQDX---.js";import{n as i,t as a}from"./CategoryChart-DKmcwa1u.js";var o,s,c,l,u,d;function f(){return(f=e((()=>{n(),i(),o=t(),s={title:`Chart/Waterfall`,parameters:{layout:`padded`}},c={render:()=>(0,o.jsx)(a,{type:`waterfall`,title:`Observatory budget`,description:`September to October`,steps:r,unit:`USD`,exportFileName:`observatory-budget`})},l={render:()=>(0,o.jsx)(a,{type:`waterfall`,title:`Observatory budget`,steps:r,unit:`USD`,orientation:`horizontal`,height:`20rem`})},u={render:()=>(0,o.jsx)(a,{type:`waterfall`,title:`Observatory budget`,steps:[...r.slice(0,4),{label:`Running costs`,value:51170,kind:`total`},...r.slice(4)],unit:`USD`,orientation:`vertical`,valueAxis:{title:`US dollars`}})},d=[`BudgetBridge`,`Horizontal`,`VerticalWithSubtotal`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart type="waterfall" title="Observatory budget" description="September to October" steps={budgetBridge} unit="USD" exportFileName="observatory-budget" />
}`,...c.parameters?.docs?.source},description:{story:`An observatory's budget bridge from September to October: increases in green and decreases in red, each labelled
with its sign, totals in neutral, and dashed connectors at the running total. On a phone the steps run down the
page. The summary names the start, the end and the largest increase and decrease; the table lists running totals.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart type="waterfall" title="Observatory budget" steps={budgetBridge} unit="USD" orientation="horizontal" height="20rem" />
}`,...l.parameters?.docs?.source},description:{story:`Always horizontal, one row per step.`,...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart type="waterfall" title="Observatory budget" steps={[...budgetBridge.slice(0, 4), {
    label: 'Running costs',
    value: 51_170,
    kind: 'total'
  }, ...budgetBridge.slice(4)]} unit="USD" orientation="vertical" valueAxis={{
    title: 'US dollars'
  }} />
}`,...u.parameters?.docs?.source},description:{story:`Always vertical, with a subtotal and an axis title.`,...u.parameters?.docs?.description}}}})))()}f();export{c as BudgetBridge,l as Horizontal,u as VerticalWithSubtotal,d as __namedExportsOrder,s as default};