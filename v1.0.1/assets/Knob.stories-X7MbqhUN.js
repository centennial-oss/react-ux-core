import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{a as r,i,r as a,t as o}from"./mixer-C6AreZnu.js";var s,c,l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{s=t(),a(),r(),c=n(),l={title:`Inputs/Knob`,component:i,args:{label:`Gain`,defaultValue:40}},u={tags:[`!visual`]},d={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-end gap-6`,children:[(0,c.jsx)(i,{label:`Small`,size:`sm`,defaultValue:25}),(0,c.jsx)(i,{label:`Medium`,size:`md`,defaultValue:50}),(0,c.jsx)(i,{label:`Large`,size:`lg`,defaultValue:75})]})},f={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-start gap-6`,children:[(0,c.jsx)(i,{label:`Gain`,unit:`dB`,minValue:-24,maxValue:24,step:.5,defaultValue:-6,isBipolar:!0,formatOptions:{signDisplay:`exceptZero`,maximumFractionDigits:1}}),(0,c.jsx)(i,{label:`Cutoff`,unit:`Hz`,scale:`log`,minValue:20,maxValue:2e4,defaultValue:1e3,ticks:[20,100,1e3,1e4,2e4]}),(0,c.jsx)(i,{label:`Mix`,minValue:0,maxValue:1,step:.01,defaultValue:.35,formatOptions:{style:`percent`}})]})},p={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-start gap-6`,children:[(0,c.jsx)(i,{label:`Pan`,minValue:-100,maxValue:100,isBipolar:!0,defaultValue:-40}),(0,c.jsx)(i,{label:`Centred`,minValue:-100,maxValue:100,isBipolar:!0}),(0,c.jsx)(i,{label:`Treble`,unit:`dB`,minValue:-12,maxValue:12,isBipolar:!0,defaultValue:5})]})},m={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-start gap-6`,children:[(0,c.jsx)(i,{label:`Described`,description:`Double-click to reset`,defaultValue:60,resetValue:50}),(0,c.jsx)(i,{label:`Invalid`,defaultValue:95,isInvalid:!0,errorMessage:`Clipping above 90`}),(0,c.jsx)(i,{label:`Read-only`,defaultValue:30,isReadOnly:!0}),(0,c.jsx)(i,{label:`Disabled`,defaultValue:70,isDisabled:!0}),(0,c.jsx)(i,{label:`Value as text`,defaultValue:45,isValueEditable:!1}),(0,c.jsx)(i,{"aria-label":`Unlabelled`,defaultValue:20,isValueHidden:!0})]})},h={tags:[`!visual`],render:function(){let[e,t]=(0,s.useState)(30),[n,r]=(0,s.useState)(30);return(0,c.jsxs)(`div`,{className:`flex flex-col items-start gap-2`,children:[(0,c.jsx)(i,{label:`Volume`,value:e,onChange:t,onChangeEnd:r}),(0,c.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Live: `,e,`, committed: `,n]})]})}},g={render:()=>(0,c.jsx)(o,{channels:8})},_=[`Playground`,`Sizes`,`Units`,`Bipolar`,`States`,`Controlled`,`InAMixer`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-end gap-6">
      <Knob label="Small" size="sm" defaultValue={25} />
      <Knob label="Medium" size="md" defaultValue={50} />
      <Knob label="Large" size="lg" defaultValue={75} />
    </div>
}`,...d.parameters?.docs?.source},description:{story:"Small, medium and large. Every size keeps a touch target of at least `--hit-size`.",...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-start gap-6">
      <Knob label="Gain" unit="dB" minValue={-24} maxValue={24} step={0.5} defaultValue={-6} isBipolar formatOptions={{
      signDisplay: 'exceptZero',
      maximumFractionDigits: 1
    }} />
      <Knob label="Cutoff" unit="Hz" scale="log" minValue={20} maxValue={20000} defaultValue={1000} ticks={[20, 100, 1000, 10000, 20000]} />
      <Knob label="Mix" minValue={0} maxValue={1} step={0.01} defaultValue={0.35} formatOptions={{
      style: 'percent'
    }} />
    </div>
}`,...f.parameters?.docs?.source},description:{story:"`unit` is shown with the value and announced with it; `formatOptions` formats the number.",...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-start gap-6">
      <Knob label="Pan" minValue={-100} maxValue={100} isBipolar defaultValue={-40} />
      <Knob label="Centred" minValue={-100} maxValue={100} isBipolar />
      <Knob label="Treble" unit="dB" minValue={-12} maxValue={12} isBipolar defaultValue={5} />
    </div>
}`,...p.parameters?.docs?.source},description:{story:"`isBipolar` fills from the centre, with a detent there while dragging (pan, EQ gain).",...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-start gap-6">
      <Knob label="Described" description="Double-click to reset" defaultValue={60} resetValue={50} />
      <Knob label="Invalid" defaultValue={95} isInvalid errorMessage="Clipping above 90" />
      <Knob label="Read-only" defaultValue={30} isReadOnly />
      <Knob label="Disabled" defaultValue={70} isDisabled />
      <Knob label="Value as text" defaultValue={45} isValueEditable={false} />
      <Knob aria-label="Unlabelled" defaultValue={20} isValueHidden />
    </div>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState(30);
    const [committed, setCommitted] = useState(30);
    return <div className="flex flex-col items-start gap-2">
        <Knob label="Volume" value={value} onChange={setValue} onChangeEnd={setCommitted} />
        <p className="text-sm text-fg-muted">
          Live: {value}, committed: {committed}
        </p>
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:"Controlled, with `onChangeEnd` reporting once per drag, key press or typed value.",...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <Mixer channels={8} />
}`,...g.parameters?.docs?.source},description:{story:`Pan knobs over vertical faders: a mixer that scrolls sideways inside its region on narrow screens.`,...g.parameters?.docs?.description}}}})))()}v();export{p as Bipolar,h as Controlled,g as InAMixer,u as Playground,d as Sizes,m as States,f as Units,_ as __namedExportsOrder,l as default};