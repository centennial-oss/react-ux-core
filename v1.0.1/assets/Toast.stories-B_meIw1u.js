import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,t as o}from"./toastStore-DwXWHurP.js";import{n as s,t as c}from"./ToastRegion-Ba8YR5Qj.js";var l,u,d,f,p,m;function h(){return(h=e((()=>{l=t(),r(),s(),o(),u=n(),d={title:`Feedback/Toast`,component:c},f={tags:[`!visual`],render:()=>(0,u.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,u.jsx)(i,{onPress:()=>a.info({title:`Report queued`,description:`We’ll email you when it’s ready.`}),children:`Info`}),(0,u.jsx)(i,{onPress:()=>a.success(`Tariff saved`),children:`Success`}),(0,u.jsx)(i,{onPress:()=>a.warning({title:`Quota nearly used`,description:`92% of this month’s API quota.`}),children:`Warning`}),(0,u.jsx)(i,{onPress:()=>a.error({title:`Sync failed`,action:{label:`Retry`,onPress:()=>a.success(`Sync restarted`)}}),children:`Error`}),(0,u.jsx)(i,{variant:`outline`,onPress:()=>{a.clear()},children:`Clear`})]})},p={tags:[`visual-page`],render:function(){return(0,l.useEffect)(()=>(a({id:`story-info`,tone:`info`,title:`Report queued`,description:`We’ll email you when it’s ready.`,timeout:null}),a({id:`story-success`,tone:`success`,title:`Tariff saved`,timeout:null}),a({id:`story-warning`,tone:`warning`,title:`Quota nearly used`,description:`92% of this month’s API quota.`}),a({id:`story-error`,tone:`danger`,title:`Sync failed`,action:{label:`Retry`,onPress:()=>void 0}}),()=>{a.clear()}),[]),(0,u.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Toasts appear in the corner (at the bottom on phones).`})}},m=[`Playground`,`Stack`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex flex-wrap gap-2">
      <Button onPress={() => toast.info({
      title: 'Report queued',
      description: 'We’ll email you when it’s ready.'
    })}>
        Info
      </Button>
      <Button onPress={() => toast.success('Tariff saved')}>Success</Button>
      <Button onPress={() => toast.warning({
      title: 'Quota nearly used',
      description: '92% of this month’s API quota.'
    })}>
        Warning
      </Button>
      <Button onPress={() => toast.error({
      title: 'Sync failed',
      action: {
        label: 'Retry',
        onPress: () => toast.success('Sync restarted')
      }
    })}>
        Error
      </Button>
      <Button variant="outline" onPress={() => {
      toast.clear();
    }}>
        Clear
      </Button>
    </div>
}`,...f.parameters?.docs?.source},description:{story:`Press a button to show a toast. Info and success dismiss themselves after 5 seconds; hover to pause.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: function StackStory() {
    useEffect(() => {
      toast({
        id: 'story-info',
        tone: 'info',
        title: 'Report queued',
        description: 'We’ll email you when it’s ready.',
        timeout: null
      });
      toast({
        id: 'story-success',
        tone: 'success',
        title: 'Tariff saved',
        timeout: null
      });
      toast({
        id: 'story-warning',
        tone: 'warning',
        title: 'Quota nearly used',
        description: '92% of this month’s API quota.'
      });
      toast({
        id: 'story-error',
        tone: 'danger',
        title: 'Sync failed',
        action: {
          label: 'Retry',
          onPress: () => undefined
        }
      });
      return () => {
        toast.clear();
      };
    }, []);
    return <p className="text-sm text-fg-muted">
        Toasts appear in the corner (at the bottom on phones).
      </p>;
  }
}`,...p.parameters?.docs?.source},description:{story:`Every tone, an action and "Clear all".`,...p.parameters?.docs?.description}}}})))()}h();export{f as Playground,p as Stack,m as __namedExportsOrder,d as default};