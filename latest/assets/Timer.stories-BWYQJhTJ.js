import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{r as n,t as r}from"./Timer-zGg6poRl.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{n as a,t as o}from"./Button-e4ZjaxXL.js";var s,c,l,u,d,f,p,m,h;function g(){return(g=e((()=>{s=t(),a(),n(),c=i(),l=6e4,u={title:`Feedback/Timer`,component:r,args:{label:`Time left`,durationMs:90*l}},d={tags:[`!visual`],render:()=>{let[e]=(0,s.useState)(()=>Date.now()),[t,n]=(0,s.useState)(!1);return(0,c.jsxs)(`div`,{className:`flex flex-col items-start gap-3`,children:[(0,c.jsx)(r,{label:`Time left`,variant:`badge`,startedAt:e,durationMs:90*l,thresholds:{warningMs:10*l,dangerMs:2*l},isPaused:t}),(0,c.jsx)(o,{size:`sm`,onPress:()=>{n(!t)},children:t?`Resume`:`Pause`})]})}},f={tags:[`!visual`],render:()=>(0,c.jsx)(r,{label:`Time on this question`,direction:`up`,thresholds:{warningMs:2*l},format:`words`})},p={render:()=>(0,c.jsx)(`div`,{className:`flex flex-col gap-6`,children:[`inline`,`badge`,`tile`].map(e=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-start gap-4`,children:[(0,c.jsx)(r,{variant:e,label:`Time left`,durationMs:90*l,elapsedMs:42*l,isPaused:!0}),(0,c.jsx)(r,{variant:e,label:`Time left`,durationMs:90*l,elapsedMs:82*l,thresholds:{warningMs:10*l,dangerMs:2*l},isPaused:!0}),(0,c.jsx)(r,{variant:e,label:`Time left`,durationMs:90*l,elapsedMs:89*l,thresholds:{warningMs:10*l,dangerMs:2*l},isPaused:!0}),(0,c.jsx)(r,{variant:e,label:`Time left`,endsAt:0})]},e))})},m={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-baseline gap-6`,children:[(0,c.jsx)(r,{size:`sm`,label:`Small`,durationMs:65*l,isPaused:!0}),(0,c.jsx)(r,{label:`Medium`,durationMs:65*l,isPaused:!0}),(0,c.jsx)(r,{size:`lg`,label:`Large`,durationMs:65*l,isPaused:!0}),(0,c.jsx)(r,{label:`Words`,format:`words`,durationMs:65*l,isPaused:!0})]})},h=[`ExamCountdown`,`QuestionTimer`,`States`,`SizesAndWords`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => {
    const [startedAt] = useState(() => Date.now());
    const [isPaused, setPaused] = useState(false);
    return <div className="flex flex-col items-start gap-3">
        <Timer label="Time left" variant="badge" startedAt={startedAt} durationMs={90 * MINUTE} thresholds={{
        warningMs: 10 * MINUTE,
        dangerMs: 2 * MINUTE
      }} isPaused={isPaused} />
        <Button size="sm" onPress={() => {
        setPaused(!isPaused);
      }}>
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>;
  }
}`,...d.parameters?.docs?.source},description:{story:`A 90-minute test countdown that warns at 10 minutes and turns to danger at 2, with pause and resume.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <Timer label="Time on this question" direction="up" thresholds={{
    warningMs: 2 * MINUTE
  }} format="words" />
}`,...f.parameters?.docs?.source},description:{story:`Time on a question, counting up against a 2-minute budget.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-6">
      {(['inline', 'badge', 'tile'] as const).map(variant => <div key={variant} className="flex flex-wrap items-start gap-4">
          <Timer variant={variant} label="Time left" durationMs={90 * MINUTE} elapsedMs={42 * MINUTE} isPaused />
          <Timer variant={variant} label="Time left" durationMs={90 * MINUTE} elapsedMs={82 * MINUTE} thresholds={{
        warningMs: 10 * MINUTE,
        dangerMs: 2 * MINUTE
      }} isPaused />
          <Timer variant={variant} label="Time left" durationMs={90 * MINUTE} elapsedMs={89 * MINUTE} thresholds={{
        warningMs: 10 * MINUTE,
        dangerMs: 2 * MINUTE
      }} isPaused />
          <Timer variant={variant} label="Time left" endsAt={0} />
        </div>)}
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Each variant and level, held still: normal, warning, danger and expired, as inline text, badges and tiles.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-baseline gap-6">
      <Timer size="sm" label="Small" durationMs={65 * MINUTE} isPaused />
      <Timer label="Medium" durationMs={65 * MINUTE} isPaused />
      <Timer size="lg" label="Large" durationMs={65 * MINUTE} isPaused />
      <Timer label="Words" format="words" durationMs={65 * MINUTE} isPaused />
    </div>
}`,...m.parameters?.docs?.source},description:{story:`Sizes, and the words format.`,...m.parameters?.docs?.description}}}})))()}g();export{d as ExamCountdown,f as QuestionTimer,m as SizesAndWords,p as States,h as __namedExportsOrder,u as default};