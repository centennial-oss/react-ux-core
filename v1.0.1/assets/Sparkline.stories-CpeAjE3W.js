import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Sparkline-DTwV1RV0.js";var i,a,o,s,c,l,u,d;function f(){return(f=e((()=>{n(),i=t(),a=[12,15,11,18,22,19,25,21,28,24,30,27],o={title:`Display/Sparkline`,component:r,args:{data:a}},s={tags:[`!visual`]},c={render:()=>(0,i.jsxs)(`div`,{className:`grid max-w-sm gap-6`,children:[(0,i.jsx)(r,{data:a}),(0,i.jsx)(r,{data:a,hasMinMaxMarkers:!0,tone:`success`}),(0,i.jsx)(r,{data:a,type:`bar`,tone:`neutral`}),(0,i.jsx)(r,{data:a,baseline:20,threshold:{value:26},tone:`warning`,height:48}),(0,i.jsx)(r,{data:[]})]})},l=[12,18,15,22,30,26,34,31,40,37,45,42],u={render:()=>(0,i.jsxs)(`div`,{className:`flex w-48 flex-col gap-4`,children:[(0,i.jsx)(r,{data:l,type:`area`,"aria-label":`No fade`}),(0,i.jsx)(r,{data:l,type:`area`,fade:50,shadeOpacity:.35,tone:`success`,"aria-label":`Fade 50`}),(0,i.jsx)(r,{data:l,type:`area`,fade:100,shadeOpacity:.5,tone:`warning`,"aria-label":`Fade 100`})]})},d=[`Playground`,`Variants`,`Areas`],s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid max-w-sm gap-6">
      <Sparkline data={SERIES} />
      <Sparkline data={SERIES} hasMinMaxMarkers tone="success" />
      <Sparkline data={SERIES} type="bar" tone="neutral" />
      <Sparkline data={SERIES} baseline={20} threshold={{
      value: 26
    }} tone="warning" height={48} />
      <Sparkline data={[]} />
    </div>
}`,...c.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex w-48 flex-col gap-4">
      <Sparkline data={trend} type="area" aria-label="No fade" />
      <Sparkline data={trend} type="area" fade={50} shadeOpacity={0.35} tone="success" aria-label="Fade 50" />
      <Sparkline data={trend} type="area" fade={100} shadeOpacity={0.5} tone="warning" aria-label="Fade 100" />
    </div>
}`,...u.parameters?.docs?.source},description:{story:"Areas: a shade below the line, which can fade toward the bottom (`fade` 0, 50 and 100).",...u.parameters?.docs?.description}}}})))()}f();export{u as Areas,s as Playground,c as Variants,d as __namedExportsOrder,o as default};