import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{i as n,n as r,r as i,t as a}from"./italic-BWWK3tz1.js";import{n as o,t as s}from"./minus-CYbuFZoR.js";import{n as c,t as l}from"./plus-DAwTrFAj.js";import{n as u,t as d}from"./settings-DZjF4reU.js";import{n as f,t as p}from"./trash-FTNL_zRp.js";import{t as m}from"./jsx-runtime-MKhVqBIO.js";import{n as h,t as g}from"./IconButton-B63kwQhA.js";var _,v,y,b,x,S,C,w,T;function E(){return(E=e((()=>{n(),r(),o(),c(),u(),f(),_=t(),h(),v=m(),y={title:`Actions/IconButton`,component:g,args:{icon:d,"aria-label":`Settings`,variant:`ghost`,tone:`neutral`,size:`md`},argTypes:{icon:{control:!1}}},b={tags:[`!visual`]},x={render:()=>(0,v.jsx)(`div`,{className:`grid gap-3`,children:[`ghost`,`soft`,`outline`,`solid`].map(e=>(0,v.jsxs)(`div`,{className:`flex items-center gap-2`,children:[[`sm`,`md`,`lg`].map(t=>(0,v.jsx)(g,{icon:d,"aria-label":`Settings ${t}`,variant:e,size:t},t)),(0,v.jsx)(g,{icon:p,"aria-label":`Delete`,variant:e,tone:`danger`}),(0,v.jsx)(g,{icon:l,"aria-label":`Add`,variant:e,tone:`accent`}),(0,v.jsx)(g,{icon:l,"aria-label":`Add (disabled)`,variant:e,isDisabled:!0})]},e))})},S={render:()=>(0,v.jsxs)(`div`,{className:`flex gap-1`,children:[(0,v.jsx)(g,{icon:i,"aria-label":`Bold`,defaultSelected:!0}),(0,v.jsx)(g,{icon:a,"aria-label":`Italic`,defaultSelected:!1,variant:`outline`})]})},C={tags:[`!visual`],render:function(){let[e,t]=(0,_.useState)(10);return(0,v.jsxs)(`div`,{className:`flex items-center gap-2 text-fg`,children:[(0,v.jsx)(g,{icon:s,"aria-label":`Decrease`,variant:`outline`,onRepeat:()=>{t(e=>e-1)}}),(0,v.jsx)(`output`,{className:`w-12 text-center tabular-nums`,"aria-live":`polite`,children:e}),(0,v.jsx)(g,{icon:l,"aria-label":`Increase`,variant:`outline`,onRepeat:()=>{t(e=>e+1)}})]})}},w={args:{isPending:!0,variant:`soft`}},T=[`Playground`,`VariantsAndSizes`,`Toggle`,`PressAndHold`,`Pending`],b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-3">
      {(['ghost', 'soft', 'outline', 'solid'] as const).map(variant => <div key={variant} className="flex items-center gap-2">
          {(['sm', 'md', 'lg'] as const).map(size => <IconButton key={size} icon={Settings} aria-label={\`Settings \${size}\`} variant={variant} size={size} />)}
          <IconButton icon={Trash2} aria-label="Delete" variant={variant} tone="danger" />
          <IconButton icon={Plus} aria-label="Add" variant={variant} tone="accent" />
          <IconButton icon={Plus} aria-label="Add (disabled)" variant={variant} isDisabled />
        </div>)}
    </div>
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-1">
      <IconButton icon={Bold} aria-label="Bold" defaultSelected />
      <IconButton icon={Italic} aria-label="Italic" defaultSelected={false} variant="outline" />
    </div>
}`,...S.parameters?.docs?.source},description:{story:"`isSelected` makes a toggle button (aria-pressed).",...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function PressAndHoldStory() {
    const [value, setValue] = useState(10);
    return <div className="flex items-center gap-2 text-fg">
        <IconButton icon={Minus} aria-label="Decrease" variant="outline" onRepeat={() => {
        setValue(v => v - 1);
      }} />
        <output className="w-12 text-center tabular-nums" aria-live="polite">
          {value}
        </output>
        <IconButton icon={Plus} aria-label="Increase" variant="outline" onRepeat={() => {
        setValue(v => v + 1);
      }} />
      </div>;
  }
}`,...C.parameters?.docs?.source},description:{story:`Hold a button (mouse, touch, or Space/Enter) to repeat.`,...C.parameters?.docs?.description}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    isPending: true,
    variant: 'soft'
  }
}`,...w.parameters?.docs?.source}}}})))()}E();export{w as Pending,b as Playground,C as PressAndHold,S as Toggle,x as VariantsAndSizes,T as __namedExportsOrder,y as default};