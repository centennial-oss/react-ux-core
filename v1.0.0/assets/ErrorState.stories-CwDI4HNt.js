import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./createLucideIcon-BXqG86fR.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{n as a,t as o}from"./ErrorState-DB9_bSbB.js";import{n as s,t as c}from"./Card-BKrFQ2m4.js";var l,u;function d(){return(d=e((()=>{n(),l={name:`wifi-off`,size:24,node:[[`path`,{d:`M12 20h.01`,key:`zekei9`}],[`path`,{d:`M8.5 16.429a5 5 0 0 1 7 0`,key:`1bycff`}],[`path`,{d:`M5 12.859a10 10 0 0 1 5.17-2.69`,key:`1dl1wf`}],[`path`,{d:`M19 12.859a10 10 0 0 0-2.007-1.523`,key:`4k23kn`}],[`path`,{d:`M2 8.82a15 15 0 0 1 4.177-2.643`,key:`1grhjp`}],[`path`,{d:`M22 8.82a15 15 0 0 0-11.288-3.764`,key:`z3jwby`}],[`path`,{d:`m2 2 20 20`,key:`1ooewy`}]]},l.node,u=r(l)})))()}var f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{d(),f=t(),s(),a(),p=i(),m={title:`Feedback/ErrorState`,component:o,args:{title:`Couldn't load customers`,description:`Check your connection and try again. If it keeps happening, contact support.`,onRetry:()=>void 0,details:`Error 503 Service Unavailable
GET /api/customers?page=2
Request id: 8f2c1d9e`}},h={tags:[`!visual`]},g={},_={tags:[`!visual`],args:{isRetrying:!0}},v={tags:[`!visual`],render:function(e){let[t,n]=(0,f.useState)(!1);return(0,p.jsx)(o,{...e,isRetrying:t,onRetry:()=>{n(!0),new Promise(e=>setTimeout(e,1500)).then(()=>{n(!1)})}})}},y={args:{description:void 0,onRetry:void 0,details:void 0}},b={args:{icon:u,title:`You're offline`,description:`Readings will refresh when you reconnect.`,details:void 0},render:e=>(0,p.jsx)(c,{title:`Meter readings`,className:`max-w-sm`,children:(0,p.jsx)(o,{...e,headingLevel:4,className:`py-6`})})},x=[`Playground`,`Default`,`Retrying`,`RetryFlow`,`Minimal`,`InCard`],h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{}`,...g.parameters?.docs?.source},description:{story:`Message, description, retry and a collapsed details disclosure.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    isRetrying: true
  }
}`,..._.parameters?.docs?.source},description:{story:`While a retry is in flight the button shows a spinner and blocks presses.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function RetryFlowStory(args) {
    const [isRetrying, setRetrying] = useState(false);
    return <ErrorState {...args} isRetrying={isRetrying} onRetry={() => {
      setRetrying(true);
      void new Promise(resolve => setTimeout(resolve, 1500)).then(() => {
        setRetrying(false);
      });
    }} />;
  }
}`,...v.parameters?.docs?.source},description:{story:`Pressing Retry shows the pending state for a moment, then the error again.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    description: undefined,
    onRetry: undefined,
    details: undefined
  }
}`,...y.parameters?.docs?.source},description:{story:`Just the message: no description, retry or details.`,...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    icon: WifiOff,
    title: "You're offline",
    description: 'Readings will refresh when you reconnect.',
    details: undefined
  },
  render: args => <Card title="Meter readings" className="max-w-sm">
      <ErrorState {...args} headingLevel={4} className="py-6" />
    </Card>
}`,...b.parameters?.docs?.source},description:{story:`A custom icon, inside a card in a narrow column.`,...b.parameters?.docs?.description}}}})))()}S();export{g as Default,b as InCard,y as Minimal,h as Playground,v as RetryFlow,_ as Retrying,x as __namedExportsOrder,m as default};