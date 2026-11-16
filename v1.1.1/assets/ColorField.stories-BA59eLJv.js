import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./ColorField-DPsrPkCB.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";var a,o,s,c,l;function u(){return(u=e((()=>{a=t(),n(),o=i(),s={title:`Inputs/ColorField`,component:r},c={render:()=>{let[e,t]=(0,a.useState)(`chart-3`);return(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,o.jsx)(r,{label:`Series colour`,value:e,onChange:t,description:`Value: ${e}`}),(0,o.jsx)(r,{label:`Custom colour`,defaultValue:`#7a3df0`}),(0,o.jsx)(r,{label:`Palette only`,swatches:[`chart-1`,`chart-2`,`chart-3`,`chart-4`],allowsCustom:!1,isRequired:!0,isInvalid:!0,errorMessage:`Choose a colour.`}),(0,o.jsx)(r,{label:`Disabled`,defaultValue:`chart-5`,isDisabled:!0})]})}},l=[`States`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = useState<ColorValue>('chart-3');
    return <div className="flex max-w-md flex-col gap-6">
        <ColorField label="Series colour" value={value} onChange={setValue} description={\`Value: \${value}\`} />
        <ColorField label="Custom colour" defaultValue="#7a3df0" />
        <ColorField label="Palette only" swatches={['chart-1', 'chart-2', 'chart-3', 'chart-4']} allowsCustom={false} isRequired isInvalid errorMessage="Choose a colour." />
        <ColorField label="Disabled" defaultValue="chart-5" isDisabled />
      </div>;
  }
}`,...c.parameters?.docs?.source},description:{story:`The chart palette (which follows the theme) plus a custom colour.`,...c.parameters?.docs?.description}}}})))()}u();export{c as States,l as __namedExportsOrder,s as default};