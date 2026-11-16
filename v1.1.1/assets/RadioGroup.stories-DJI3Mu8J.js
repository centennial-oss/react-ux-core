import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,r as i,t as a}from"./RadioGroup-DskMAscj.js";var o,s,c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{o=t(),i(),s=n(),c={title:`Inputs/RadioGroup`,component:r,args:{label:`Billing interval`,defaultValue:`monthly`,children:(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(a,{value:`monthly`,children:`Monthly`}),(0,s.jsx)(a,{value:`yearly`,children:`Yearly`})]})}},l={tags:[`!visual`]},u={render:()=>(0,s.jsxs)(r,{label:`Plan`,description:`You can change plans at any time.`,defaultValue:`pro`,isRequired:!0,children:[(0,s.jsx)(a,{value:`free`,description:`Up to 3 sites`,children:`Free`}),(0,s.jsx)(a,{value:`pro`,description:`Unlimited sites and API access`,children:`Pro`}),(0,s.jsx)(a,{value:`enterprise`,description:`Single sign-on and audit logs`,isDisabled:!0,children:`Enterprise`})]})},d={render:()=>(0,s.jsx)(`div`,{className:`max-w-sm`,children:(0,s.jsxs)(r,{label:`Units`,orientation:`horizontal`,defaultValue:`kwh`,children:[(0,s.jsx)(a,{value:`wh`,children:`Watt-hours`}),(0,s.jsx)(a,{value:`kwh`,children:`Kilowatt-hours`}),(0,s.jsx)(a,{value:`mwh`,children:`Megawatt-hours`})]})})},f={render:()=>(0,s.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,s.jsxs)(r,{label:`Invalid`,isInvalid:!0,errorMessage:`Choose a delivery method`,children:[(0,s.jsx)(a,{value:`post`,children:`Post`}),(0,s.jsx)(a,{value:`courier`,children:`Courier`})]}),(0,s.jsxs)(r,{label:`Invalid with a choice`,isInvalid:!0,defaultValue:`post`,children:[(0,s.jsx)(a,{value:`post`,children:`Post`}),(0,s.jsx)(a,{value:`courier`,children:`Courier`})]}),(0,s.jsxs)(r,{label:`Disabled`,isDisabled:!0,defaultValue:`post`,children:[(0,s.jsx)(a,{value:`post`,children:`Post`}),(0,s.jsx)(a,{value:`courier`,children:`Courier`})]}),(0,s.jsxs)(r,{label:`Read-only`,isReadOnly:!0,defaultValue:`courier`,children:[(0,s.jsx)(a,{value:`post`,children:`Post`}),(0,s.jsx)(a,{value:`courier`,children:`Courier`})]})]})},p={render:()=>(0,s.jsx)(`div`,{className:`max-w-xl`,children:(0,s.jsxs)(r,{label:`Interval`,labelPosition:`side`,defaultValue:`monthly`,children:[(0,s.jsx)(a,{value:`monthly`,children:`Monthly`}),(0,s.jsx)(a,{value:`yearly`,children:`Yearly`})]})})},m={tags:[`!visual`],render:function(){let[e,t]=(0,o.useState)(`yearly`);return(0,s.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,s.jsxs)(r,{label:`Billing interval`,value:e,onChange:t,children:[(0,s.jsx)(a,{value:`monthly`,children:`Monthly`}),(0,s.jsx)(a,{value:`yearly`,children:`Yearly`})]}),(0,s.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Billed `,e,`.`]})]})}},h={render:()=>(0,s.jsxs)(r,{label:`Which planet is closest to the Sun?`,value:`venus`,isReadOnly:!0,description:`1 of 1 incorrect`,children:[(0,s.jsx)(a,{value:`earth`,children:`Earth`}),(0,s.jsx)(a,{value:`venus`,feedback:{tone:`danger`,message:`Your answer`},children:`Venus`}),(0,s.jsx)(a,{value:`mercury`,feedback:{tone:`success`,message:`Correct answer`},children:`Mercury`}),(0,s.jsx)(a,{value:`mars`,children:`Mars`})]})},g=[`Playground`,`Vertical`,`Horizontal`,`States`,`SideLabel`,`Controlled`,`CheckedAnswer`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup label="Plan" description="You can change plans at any time." defaultValue="pro" isRequired>
      <Radio value="free" description="Up to 3 sites">
        Free
      </Radio>
      <Radio value="pro" description="Unlimited sites and API access">
        Pro
      </Radio>
      <Radio value="enterprise" description="Single sign-on and audit logs" isDisabled>
        Enterprise
      </Radio>
    </RadioGroup>
}`,...u.parameters?.docs?.source},description:{story:`Options stack vertically by default. Each option can have its own description.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-sm">
      <RadioGroup label="Units" orientation="horizontal" defaultValue="kwh">
        <Radio value="wh">Watt-hours</Radio>
        <Radio value="kwh">Kilowatt-hours</Radio>
        <Radio value="mwh">Megawatt-hours</Radio>
      </RadioGroup>
    </div>
}`,...d.parameters?.docs?.source},description:{story:`A horizontal group wraps onto more rows when space is short.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-6">
      <RadioGroup label="Invalid" isInvalid errorMessage="Choose a delivery method">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
      <RadioGroup label="Invalid with a choice" isInvalid defaultValue="post">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
      <RadioGroup label="Disabled" isDisabled defaultValue="post">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
      <RadioGroup label="Read-only" isReadOnly defaultValue="courier">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <RadioGroup label="Interval" labelPosition="side" defaultValue="monthly">
        <Radio value="monthly">Monthly</Radio>
        <Radio value="yearly">Yearly</Radio>
      </RadioGroup>
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Side labels sit beside the options in wide containers and move on top in narrow ones.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [interval, setBillingInterval] = useState<Interval>('yearly');
    return <div className="flex flex-col gap-2">
        <RadioGroup label="Billing interval" value={interval} onChange={setBillingInterval}>
          <Radio value="monthly">Monthly</Radio>
          <Radio value="yearly">Yearly</Radio>
        </RadioGroup>
        <p className="text-sm text-fg-muted">Billed {interval}.</p>
      </div>;
  }
}`,...m.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`; bound to union-typed state, `onChange` receives that union.",...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup label="Which planet is closest to the Sun?" value="venus" isReadOnly description="1 of 1 incorrect">
      <Radio value="earth">Earth</Radio>
      <Radio value="venus" feedback={{
      tone: 'danger',
      message: 'Your answer'
    }}>
        Venus
      </Radio>
      <Radio value="mercury" feedback={{
      tone: 'success',
      message: 'Correct answer'
    }}>
        Mercury
      </Radio>
      <Radio value="mars">Mars</Radio>
    </RadioGroup>
}`,...h.parameters?.docs?.source},description:{story:"A checked quiz question: each option marked in place (`feedback`). The chosen wrong answer, and the correct answer\nthat wasn't chosen. Read-only, so it stays fully readable.",...h.parameters?.docs?.description}}}})))()}_();export{h as CheckedAnswer,m as Controlled,d as Horizontal,l as Playground,p as SideLabel,f as States,u as Vertical,g as __namedExportsOrder,c as default};