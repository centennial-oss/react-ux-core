import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./JsonEditor-B3LK_dAo.js";function a({initial:e}){let[t,n]=(0,o.useState)(e);return(0,s.jsx)(i,{label:`Driver configuration`,description:`Saved to the driver's config file.`,value:t,onChange:n})}var o,s,c,l,u,d;function f(){return(f=e((()=>{o=t(),r(),s=n(),c={title:`Inputs/JsonEditor`,component:i},l={args:{label:``,value:``,onChange:()=>void 0},render:()=>(0,s.jsx)(a,{initial:`{
  "gateway": { "type": "firefly", "channel": 14 },
  "heartbeatSeconds": 900
}`})},u={args:{label:``,value:``,onChange:()=>void 0},render:()=>(0,s.jsx)(a,{initial:`{
  "gateway": { "type": "firefly" "channel": 14 }
}`})},d=[`Valid`,`WithAProblem`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    label: '',
    value: '',
    onChange: () => undefined
  },
  render: () => <Editor initial={'{\\n  "gateway": { "type": "firefly", "channel": 14 },\\n  "heartbeatSeconds": 900\\n}'} />
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    label: '',
    value: '',
    onChange: () => undefined
  },
  render: () => <Editor initial={'{\\n  "gateway": { "type": "firefly" "channel": 14 }\\n}'} />
}`,...u.parameters?.docs?.source}}}})))()}f();export{l as Valid,u as WithAProblem,d as __namedExportsOrder,c as default};