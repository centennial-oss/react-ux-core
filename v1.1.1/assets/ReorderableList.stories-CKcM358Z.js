import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,r as o}from"./Text-CiszJ5rL.js";import{n as s,t as c}from"./ReorderableList-D9Z7LvDL.js";var l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{l=t(),r(),o(),s(),u=n(),d=[{id:`mercury`,label:`Mercury`,description:`The smallest planet`},{id:`venus`,label:`Venus`,description:`The hottest planet`},{id:`earth`,label:`Earth`,description:`The only one with liquid water on its surface`},{id:`mars`,label:`Mars`,description:`The red planet`},{id:`jupiter`,label:`Jupiter`,description:`The largest planet`}],f={title:`Inputs/ReorderableList`,component:c,args:{items:d}},p={render:()=>{let[e,t]=(0,l.useState)([`mars`,`mercury`,`jupiter`,`earth`,`venus`]);return(0,u.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-3`,children:[(0,u.jsx)(c,{label:`Put the planets in order from the Sun`,description:`Drag a planet by its handle, or move it with the arrows.`,items:d,value:e,onChange:t}),(0,u.jsxs)(a,{variant:`small`,children:[`Order: `,e.join(`, `)]})]})}},m={render:()=>(0,u.jsx)(`div`,{className:`max-w-xl`,children:(0,u.jsx)(c,{label:`Your order`,items:d,value:[`mercury`,`earth`,`venus`,`mars`,`jupiter`],isReadOnly:!0,feedback:{mercury:{tone:`success`,message:`Correct position`},earth:{tone:`danger`,message:`Should be third`},venus:{tone:`danger`,message:`Should be second`},mars:{tone:`success`,message:`Correct position`},jupiter:{tone:`success`,message:`Correct position`}}})})},h=[`mercury`,`venus`,`earth`,`mars`,`jupiter`],g={name:`Checked answer (locks after Check)`,tags:[`!visual`],render:()=>{let[e,t]=(0,l.useState)([`venus`,`mercury`,`earth`,`jupiter`,`mars`]),[n,r]=(0,l.useState)(!1),a=Object.fromEntries(e.map((e,t)=>[e,e===h[t]?{tone:`success`,message:`Correct position`}:{tone:`danger`,message:`Should be number ${String(h.indexOf(e)+1)}`}]));return(0,u.jsxs)(`div`,{className:`flex max-w-xl flex-col gap-3`,children:[(0,u.jsx)(c,{label:`Put the planets in order from the Sun`,items:d,value:e,onChange:t,isReadOnly:n,feedback:n?a:void 0}),(0,u.jsx)(`div`,{children:(0,u.jsx)(i,{onPress:()=>{r(!n)},children:n?`Try again`:`Check answer`})})]})}},_={render:()=>(0,u.jsx)(`div`,{className:`max-w-xl`,children:(0,u.jsx)(c,{label:`Observing plan`,size:`sm`,items:[{id:`moon`,label:`Sketch the Moon’s terminator`},{id:`jupiter`,label:`Count Jupiter’s moons`,description:`Set by your teacher`,isDisabled:!0},{id:`orion`,label:`Find the Orion Nebula`}]})})},v=[`Procedure`,`CheckedAnswer`,`CheckedAnswerLocksAfterCheck`,`DisabledItemAndSmall`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [order, setOrder] = useState(['mars', 'mercury', 'jupiter', 'earth', 'venus']);
    return <div className="flex max-w-xl flex-col gap-3">
        <ReorderableList label="Put the planets in order from the Sun" description="Drag a planet by its handle, or move it with the arrows." items={planets} value={order} onChange={setOrder} />
        <Text variant="small">Order: {order.join(', ')}</Text>
      </div>;
  }
}`,...p.parameters?.docs?.source},description:{story:`Put the planets in order from the Sun: drag a handle, or use the move buttons. Each move is announced.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <ReorderableList label="Your order" items={planets} value={['mercury', 'earth', 'venus', 'mars', 'jupiter']} isReadOnly feedback={{
      mercury: {
        tone: 'success',
        message: 'Correct position'
      },
      earth: {
        tone: 'danger',
        message: 'Should be third'
      },
      venus: {
        tone: 'danger',
        message: 'Should be second'
      },
      mars: {
        tone: 'success',
        message: 'Correct position'
      },
      jupiter: {
        tone: 'success',
        message: 'Correct position'
      }
    }} />
    </div>
}`,...m.parameters?.docs?.source},description:{story:`After checking: read-only, with each planet marked right or wrong in place.`,...m.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: 'Checked answer (locks after Check)',
  tags: ['!visual'],
  render: () => {
    const [order, setOrder] = useState(['venus', 'mercury', 'earth', 'jupiter', 'mars']);
    const [isChecked, setChecked] = useState(false);
    const feedback = Object.fromEntries(order.map((id, index) => [id, id === answerKey[index] ? {
      tone: 'success' as const,
      message: 'Correct position'
    } : {
      tone: 'danger' as const,
      message: \`Should be number \${String(answerKey.indexOf(id) + 1)}\`
    }]));
    return <div className="flex max-w-xl flex-col gap-3">
        <ReorderableList label="Put the planets in order from the Sun" items={planets} value={order} onChange={setOrder} isReadOnly={isChecked} feedback={isChecked ? feedback : undefined} />
        <div>
          <Button onPress={() => {
          setChecked(!isChecked);
        }}>
            {isChecked ? 'Try again' : 'Check answer'}
          </Button>
        </div>
      </div>;
  }
}`,...g.parameters?.docs?.source},description:{story:'The same mounted list locks after "Check answer": `isReadOnly` and `feedback` switch on, and "Try again" unlocks\nit. (Before checking it looks like the Procedure story, so it has no visual snapshot of its own.)',...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <ReorderableList label="Observing plan" size="sm" items={[{
      id: 'moon',
      label: 'Sketch the Moon’s terminator'
    }, {
      id: 'jupiter',
      label: 'Count Jupiter’s moons',
      description: 'Set by your teacher',
      isDisabled: true
    }, {
      id: 'orion',
      label: 'Find the Orion Nebula'
    }]} />
    </div>
}`,..._.parameters?.docs?.source},description:{story:`A disabled item can't move, and the small size.`,..._.parameters?.docs?.description}}}})))()}y();export{m as CheckedAnswer,g as CheckedAnswerLocksAfterCheck,_ as DisabledItemAndSmall,p as Procedure,v as __namedExportsOrder,f as default};