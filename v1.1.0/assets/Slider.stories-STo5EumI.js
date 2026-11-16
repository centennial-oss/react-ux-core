import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,r as i}from"./Slider-BKxIWP4B.js";import{n as a,r as o,t as s}from"./mixer-C6AreZnu.js";var c,l,u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{c=t(),o(),i(),l=n(),u={title:`Inputs/Slider`,component:r,args:{label:`Brightness`,defaultValue:60}},d={tags:[`!visual`]},f={render:()=>(0,l.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,l.jsx)(r,{label:`Volume`,description:`Applies to alarms and alerts`,defaultValue:40}),(0,l.jsx)(r,{label:`Without a value label`,defaultValue:25,isValueHidden:!0}),(0,l.jsx)(r,{label:`Threshold`,defaultValue:5,isInvalid:!0,errorMessage:`Set the threshold to at least 10 for this site`}),(0,l.jsx)(r,{label:`Disabled`,defaultValue:70,isDisabled:!0}),(0,l.jsx)(r,{"aria-label":`Zoom`,defaultValue:50})]})},p={render:()=>(0,l.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,l.jsx)(r,{label:`Battery reserve`,minValue:0,maxValue:1,step:.05,defaultValue:.2,formatOptions:{style:`percent`}}),(0,l.jsx)(r,{label:`Monthly budget`,minValue:0,maxValue:2e3,step:50,defaultValue:650,formatOptions:{style:`currency`,currency:`USD`,maximumFractionDigits:0}}),(0,l.jsx)(r,{label:`Precise (continuous)`,minValue:0,maxValue:1,step:.001,defaultValue:.618})]})},m={render:()=>(0,l.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,l.jsx)(r,{label:`Fan speed`,minValue:0,maxValue:4,step:1,defaultValue:2,ticks:[{value:0,label:`Off`},{value:1,label:`Low`},{value:2,label:`Medium`},{value:3,label:`High`},{value:4,label:`Max`}]}),(0,l.jsx)(r,{label:`Tilt`,maxValue:90,step:15,defaultValue:30,formatOptions:{style:`unit`,unit:`degree`},ticks:[0,15,30,45,60,75,90].map(e=>({value:e}))})]})},h={render:()=>(0,l.jsx)(`div`,{className:`max-w-xl`,children:(0,l.jsx)(r,{label:`Brightness`,labelPosition:`side`,defaultValue:60})})},g={tags:[`!visual`],render:function(){let[e,t]=(0,c.useState)(30),[n,i]=(0,c.useState)(30);return(0,l.jsxs)(`div`,{className:`flex max-w-md flex-col gap-2`,children:[(0,l.jsx)(r,{label:`Volume`,value:e,onChange:t,onChangeEnd:i}),(0,l.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Live: `,e,`, committed: `,n]})]})}},_={render:()=>(0,l.jsxs)(`div`,{className:`flex flex-wrap items-start gap-6`,children:[(0,l.jsx)(r,{label:`Master`,orientation:`vertical`,minValue:-60,maxValue:6,step:.5,defaultValue:-6,ticks:a,formatOptions:{signDisplay:`exceptZero`,maximumFractionDigits:1}}),(0,l.jsx)(r,{label:`Short`,orientation:`vertical`,trackLength:`sm`,defaultValue:40}),(0,l.jsx)(r,{label:`Tall`,orientation:`vertical`,trackLength:`lg`,defaultValue:75,description:`Long track`}),(0,l.jsx)(r,{label:`Invalid`,orientation:`vertical`,defaultValue:95,isInvalid:!0,errorMessage:`Too loud`}),(0,l.jsx)(r,{label:`Disabled`,orientation:`vertical`,defaultValue:30,isDisabled:!0})]})},v={name:`Mixer`,render:()=>(0,l.jsx)(s,{})},y=[`Playground`,`States`,`Formatting`,`Ticks`,`SideLabel`,`Controlled`,`Vertical`,`Mixer16`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-6">
      <Slider label="Volume" description="Applies to alarms and alerts" defaultValue={40} />
      <Slider label="Without a value label" defaultValue={25} isValueHidden />
      <Slider label="Threshold" defaultValue={5} isInvalid errorMessage="Set the threshold to at least 10 for this site" />
      <Slider label="Disabled" defaultValue={70} isDisabled />
      <Slider aria-label="Zoom" defaultValue={50} />
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-6">
      <Slider label="Battery reserve" minValue={0} maxValue={1} step={0.05} defaultValue={0.2} formatOptions={{
      style: 'percent'
    }} />
      <Slider label="Monthly budget" minValue={0} maxValue={2000} step={50} defaultValue={650} formatOptions={{
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }} />
      <Slider label="Precise (continuous)" minValue={0} maxValue={1} step={0.001} defaultValue={0.618} />
    </div>
}`,...p.parameters?.docs?.source},description:{story:"`formatOptions` (`Intl.NumberFormat`) formats the value shown and announced.",...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-6">
      <Slider label="Fan speed" minValue={0} maxValue={4} step={1} defaultValue={2} ticks={[{
      value: 0,
      label: 'Off'
    }, {
      value: 1,
      label: 'Low'
    }, {
      value: 2,
      label: 'Medium'
    }, {
      value: 3,
      label: 'High'
    }, {
      value: 4,
      label: 'Max'
    }]} />
      <Slider label="Tilt" maxValue={90} step={15} defaultValue={30} formatOptions={{
      style: 'unit',
      unit: 'degree'
    }} ticks={[0, 15, 30, 45, 60, 75, 90].map(value => ({
      value
    }))} />
    </div>
}`,...m.parameters?.docs?.source},description:{story:`Discrete steps with labelled ticks.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <Slider label="Brightness" labelPosition="side" defaultValue={60} />
    </div>
}`,...h.parameters?.docs?.source},description:{story:`Side labels put the label and value beside the track in wide containers.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState(30);
    const [committed, setCommitted] = useState(30);
    return <div className="flex max-w-md flex-col gap-2">
        <Slider label="Volume" value={value} onChange={setValue} onChangeEnd={setCommitted} />
        <p className="text-sm text-fg-muted">
          Live: {value}, committed: {committed}
        </p>
      </div>;
  }
}`,...g.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`; `onChangeEnd` fires once when a drag or key press ends.",...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-start gap-6">
      <Slider label="Master" orientation="vertical" minValue={-60} maxValue={6} step={0.5} defaultValue={-6} ticks={faderTicks} formatOptions={{
      signDisplay: 'exceptZero',
      maximumFractionDigits: 1
    }} />
      <Slider label="Short" orientation="vertical" trackLength="sm" defaultValue={40} />
      <Slider label="Tall" orientation="vertical" trackLength="lg" defaultValue={75} description="Long track" />
      <Slider label="Invalid" orientation="vertical" defaultValue={95} isInvalid errorMessage="Too loud" />
      <Slider label="Disabled" orientation="vertical" defaultValue={30} isDisabled />
    </div>
}`,..._.parameters?.docs?.source},description:{story:'`orientation="vertical"` makes a fader: the minimum is at the bottom, and tick labels sit beside the track.',..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: 'Mixer',
  render: () => <Mixer />
}`,...v.parameters?.docs?.source},description:{story:`A 16-channel mixer: a pan Knob over a vertical fader per channel. At phone widths the desk scrolls sideways inside
its own region: swipe sideways on the channel names or the knobs (a knob turns only with a vertical drag).`,...v.parameters?.docs?.description}}}})))()}b();export{g as Controlled,p as Formatting,v as Mixer16,d as Playground,h as SideLabel,f as States,m as Ticks,_ as Vertical,y as __namedExportsOrder,u as default};