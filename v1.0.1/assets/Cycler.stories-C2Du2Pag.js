import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Cycler-x9AKhqj5.js";var a,o,s,c,l,u,d,f,p,m,h;function g(){return(g=e((()=>{a=t(),r(),o=n(),s=[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`].map((e,t)=>({id:t+1,label:e})),c=Array.from({length:101},(e,t)=>{let n=1925+t,r=n-n%10;return{id:n,label:String(n),group:`${String(Math.max(r,1925))} – ${String(Math.min(r+9,2025))}`}}),l={title:`Inputs/Cycler`,component:i,args:{"aria-label":`Month`,options:s,defaultValue:3}},u={render:function(){let[e,t]=(0,a.useState)(3);return(0,o.jsx)(i,{"aria-label":`Month`,options:s,value:e,onChange:t})}},d={render:()=>(0,o.jsx)(i,{"aria-label":`Year`,options:c,defaultValue:1987,isLooping:!1,pickerColumns:5})},f=[{id:`xs`,label:`XS`},{id:`s`,label:`S`},{id:`m`,label:`M`},{id:`l`,label:`L`,isDisabled:!0},{id:`xl`,label:`XL`}],p={render:()=>(0,o.jsxs)(`div`,{className:`flex flex-col items-start gap-4`,children:[(0,o.jsx)(i,{"aria-label":`Month`,options:s,defaultValue:9,size:`sm`}),(0,o.jsx)(i,{"aria-label":`Shirt size`,options:f,defaultValue:`m`,pickerColumns:5}),(0,o.jsx)(i,{"aria-label":`Month`,options:s,defaultValue:1,hasPicker:!1}),(0,o.jsx)(i,{"aria-label":`Month`,options:s,defaultValue:6,isDisabled:!0})]})},m={tags:[`visual-page`],render:()=>(0,o.jsx)(i,{"aria-label":`Month`,options:s,defaultValue:3}),play:async({canvas:e,userEvent:t})=>{await t.click(e.getByRole(`button`,{name:`Month March`}))}},h=[`Months`,`Years`,`Variants`,`OpenPicker`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: function MonthsStory() {
    const [month, setMonth] = useState(3);
    return <Cycler aria-label="Month" options={months} value={month} onChange={setMonth} />;
  }
}`,...u.parameters?.docs?.source},description:{story:`Arrows step (hold one to keep going) and wrap from December to January. Press the month to jump to any.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Cycler aria-label="Year" options={years} defaultValue={1987} isLooping={false} pickerColumns={5} />
}`,...d.parameters?.docs?.source},description:{story:"A long list pages through the picker by `group`: a decade at a time, opening on the current one.",...d.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col items-start gap-4">
      <Cycler aria-label="Month" options={months} defaultValue={9} size="sm" />
      <Cycler aria-label="Shirt size" options={shirtSizes} defaultValue="m" pickerColumns={5} />
      <Cycler aria-label="Month" options={months} defaultValue={1} hasPicker={false} />
      <Cycler aria-label="Month" options={months} defaultValue={6} isDisabled />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Sizes, a sold-out option the arrows skip, an arrows-only cycler and a disabled one.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <Cycler aria-label="Month" options={months} defaultValue={3} />,
  play: async ({
    canvas,
    userEvent
  }) => {
    await userEvent.click(canvas.getByRole('button', {
      name: 'Month March'
    }));
  }
}`,...m.parameters?.docs?.source},description:{story:`The picker open, on the month grid.`,...m.parameters?.docs?.description}}}})))()}g();export{u as Months,m as OpenPicker,p as Variants,d as Years,h as __namedExportsOrder,l as default};