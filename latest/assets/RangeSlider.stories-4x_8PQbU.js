import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{r,t as i}from"./Slider-BKxIWP4B.js";var a,o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{a=t(),r(),o=n(),s={title:`Inputs/RangeSlider`,component:i,args:{label:`Price per night`,defaultValue:[80,240],maxValue:400}},c={tags:[`!visual`]},l={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,o.jsx)(i,{label:`Price per night`,description:`Taxes not included`,maxValue:400,step:10,defaultValue:[80,240],formatOptions:{style:`currency`,currency:`USD`,maximumFractionDigits:0}}),(0,o.jsx)(i,{label:`Charging window`,minValue:0,maxValue:24,defaultValue:[10,11],isInvalid:!0,errorMessage:`Choose a window of at least 3 hours`}),(0,o.jsx)(i,{label:`Disabled`,defaultValue:[30,70],isDisabled:!0})]})},u={render:()=>(0,o.jsx)(`div`,{className:`max-w-md`,children:(0,o.jsx)(i,{label:`Quiet hours`,startLabel:`Start`,endLabel:`End`,minValue:0,maxValue:24,defaultValue:[22,24],ticks:[{value:0,label:`00:00`},{value:6,label:`06:00`},{value:12,label:`12:00`},{value:18,label:`18:00`},{value:24,label:`24:00`}]})})},d={tags:[`!visual`],render:function(){let[e,t]=(0,a.useState)([25,75]);return(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-2`,children:[(0,o.jsx)(i,{label:`Range`,value:e,onChange:t}),(0,o.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`From `,e[0],` to `,e[1]]})]})}},f={render:()=>(0,o.jsxs)(`div`,{className:`flex gap-8`,children:[(0,o.jsx)(i,{label:`Comfort band`,orientation:`vertical`,minValue:10,maxValue:30,defaultValue:[19,23],formatOptions:{style:`unit`,unit:`celsius`},ticks:[{value:10,label:`10°`},{value:20,label:`20°`},{value:30,label:`30°`}]}),(0,o.jsx)(i,{label:`Disabled`,orientation:`vertical`,defaultValue:[20,60],isDisabled:!0})]})},p=[`Playground`,`States`,`Ticks`,`Controlled`,`Vertical`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-6">
      <RangeSlider label="Price per night" description="Taxes not included" maxValue={400} step={10} defaultValue={[80, 240]} formatOptions={{
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }} />
      <RangeSlider label="Charging window" minValue={0} maxValue={24} defaultValue={[10, 11]} isInvalid errorMessage="Choose a window of at least 3 hours" />
      <RangeSlider label="Disabled" defaultValue={[30, 70]} isDisabled />
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <RangeSlider label="Quiet hours" startLabel="Start" endLabel="End" minValue={0} maxValue={24} defaultValue={[22, 24]} ticks={[{
      value: 0,
      label: '00:00'
    }, {
      value: 6,
      label: '06:00'
    }, {
      value: 12,
      label: '12:00'
    }, {
      value: 18,
      label: '18:00'
    }, {
      value: 24,
      label: '24:00'
    }]} />
    </div>
}`,...u.parameters?.docs?.source},description:{story:`Hours of the day with tick labels; each thumb has its own accessible name.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [range, setRange] = useState<[number, number]>([25, 75]);
    return <div className="flex max-w-md flex-col gap-2">
        <RangeSlider label="Range" value={range} onChange={setRange} />
        <p className="text-sm text-fg-muted">
          From {range[0]} to {range[1]}
        </p>
      </div>;
  }
}`,...d.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`, which receives `[start, end]`.",...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-8">
      <RangeSlider label="Comfort band" orientation="vertical" minValue={10} maxValue={30} defaultValue={[19, 23]} formatOptions={{
      style: 'unit',
      unit: 'celsius'
    }} ticks={[{
      value: 10,
      label: '10°'
    }, {
      value: 20,
      label: '20°'
    }, {
      value: 30,
      label: '30°'
    }]} />
      <RangeSlider label="Disabled" orientation="vertical" defaultValue={[20, 60]} isDisabled />
    </div>
}`,...f.parameters?.docs?.source},description:{story:`A vertical range, with the start thumb below the end thumb.`,...f.parameters?.docs?.description}}}})))()}m();export{d as Controlled,c as Playground,l as States,u as Ticks,f as Vertical,p as __namedExportsOrder,s as default};