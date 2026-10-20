import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,t as o}from"./Badge-B8tm3wVn.js";import{n as s,t as c}from"./Stepper-BAJW1fn_.js";var l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A;function j(){return(j=e((()=>{l=t(),a(),r(),s(),u=n(),d=[{id:`cart`,title:`Cart`,description:`3 items`},{id:`shipping`,title:`Shipping`,description:`Address and speed`},{id:`payment`,title:`Payment`,description:`Card or invoice`},{id:`review`,title:`Review`,description:`Check and place the order`}],f=[{id:`account`,title:`Create the account`,description:`Name, email and password.`},{id:`team`,title:`Invite your team`,description:`They get an email with a link to join.`,isOptional:!0,status:`skipped`},{id:`billing`,title:`Add billing details`,description:`The card was declined. Try another one.`,status:`error`,content:(0,u.jsx)(i,{size:`sm`,tone:`accent`,children:`Update card`})},{id:`domain`,title:`Connect a domain`,isOptional:!0},{id:`launch`,title:`Launch`,description:`Waiting for billing.`,isDisabled:!0}],p={title:`Display/Stepper`,component:c,args:{steps:d,defaultCurrentStep:1,label:`Checkout`},argTypes:{variant:{control:`inline-radio`,options:[`numbered`,`dot`,`arrow`,`compact`]},orientation:{control:`inline-radio`,options:[`horizontal`,`vertical`]}}},m={tags:[`!visual`]},h={},g={args:{orientation:`vertical`,steps:f,defaultCurrentStep:2,label:`Onboarding`}},_={args:{steps:f,defaultCurrentStep:2,label:`Onboarding`}},v={args:{variant:`dot`}},y={args:{variant:`dot`,orientation:`vertical`,steps:f,defaultCurrentStep:2}},b={args:{variant:`arrow`,defaultCurrentStep:2}},x={args:{variant:`compact`}},S={render:e=>(0,u.jsx)(`div`,{className:`w-72 max-w-full`,children:(0,u.jsx)(c,{...e})})},C={render:function(e){let[t,n]=(0,l.useState)(1);return(0,u.jsx)(c,{...e,currentStep:t,onCurrentStepChange:n})}},w={render:function(e){let[t,n]=(0,l.useState)(2);return(0,u.jsxs)(`div`,{className:`flex flex-col gap-6`,children:[(0,u.jsx)(c,{...e,isLinear:!0,currentStep:t,onCurrentStepChange:n}),(0,u.jsxs)(`div`,{className:`flex gap-2`,children:[(0,u.jsx)(i,{isDisabled:t===0,onPress:()=>{n(t-1)},children:`Back`}),(0,u.jsx)(i,{tone:`accent`,isDisabled:t>=d.length,onPress:()=>{n(t+1)},children:`Next`})]})]})}},T={args:{orientation:`vertical`,steps:d.map((e,t)=>({...e,badge:t===0?(0,u.jsx)(o,{tone:`success`,children:`Saved`}):void 0}))},render:function(e){let[t,n]=(0,l.useState)(1);return(0,u.jsx)(c,{...e,currentStep:t,onCurrentStepChange:n})}},E={args:{label:`Site setup`,orientation:`vertical`,headingLevel:3,hasProgressBar:!0,hasStatusBadges:!0,currentStep:1,steps:[{id:`users`,title:`Add users`,description:`Operators and vendors can sign in.`},{id:`settings`,title:`Confirm site settings`,description:`Time zone, currency and phone code.`,content:(0,u.jsx)(i,{size:`sm`,tone:`accent`,children:`Confirm`})},{id:`driver`,title:`Register a meter driver`,content:(0,u.jsx)(i,{size:`sm`,children:`Register`})},{id:`tariff`,title:`Create the first tariff`,description:`Waiting for the site settings.`,isDisabled:!0}]}},D={args:{hasStatusBadges:!0,steps:f,defaultCurrentStep:2,label:`Onboarding`}},O={args:{currentStep:d.length}},k={render:e=>(0,u.jsxs)(`div`,{dir:`rtl`,className:`flex flex-col gap-8`,children:[(0,u.jsx)(c,{...e}),(0,u.jsx)(c,{...e,variant:`arrow`})]})},A=[`Playground`,`Horizontal`,`Vertical`,`States`,`Dots`,`DotsVertical`,`Arrows`,`Compact`,`NarrowContainer`,`Clickable`,`Linear`,`ClickableVertical`,`Checklist`,`StatusBadges`,`AllDone`,`RightToLeft`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{}`,...h.parameters?.docs?.source},description:{story:`Numbered steps in a row: done steps before the current one, upcoming after it.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: 'vertical',
    steps: ONBOARDING,
    defaultCurrentStep: 2,
    label: 'Onboarding'
  }
}`,...g.parameters?.docs?.source},description:{story:`A column of steps, with room for each step's description and content.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    steps: ONBOARDING,
    defaultCurrentStep: 2,
    label: 'Onboarding'
  }
}`,..._.parameters?.docs?.source},description:{story:`Every state: done, skipped (and optional), current with an error, optional, and disabled (locked).`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'dot'
  }
}`,...v.parameters?.docs?.source},description:{story:`Small dots instead of numbers, for a quieter row.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'dot',
    orientation: 'vertical',
    steps: ONBOARDING,
    defaultCurrentStep: 2
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'arrow',
    defaultCurrentStep: 2
  }
}`,...b.parameters?.docs?.source},description:{story:`Arrow-shaped segments in a row, like a breadcrumb trail.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'compact'
  }
}`,...x.parameters?.docs?.source},description:{story:`"Step 2 of 5" over a segmented bar, with the current step's title: for narrow containers. Horizontal steppers
switch to it by themselves when there isn't room for every step (\`compactBelow\`).`,...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: args => <div className="w-72 max-w-full">
      <Stepper {...args} />
    </div>
}`,...S.parameters?.docs?.source},description:{story:`The same horizontal stepper in a narrow column switches to the compact variant.`,...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: function Render(args) {
    const [current, setCurrent] = useState(1);
    return <Stepper {...args} currentStep={current} onCurrentStepChange={setCurrent} />;
  }
}`,...C.parameters?.docs?.source},description:{story:`Any step can be pressed to go to it (non-linear).`,...C.parameters?.docs?.description}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: function Render(args) {
    const [current, setCurrent] = useState(2);
    return <div className="flex flex-col gap-6">
        <Stepper {...args} isLinear currentStep={current} onCurrentStepChange={setCurrent} />
        <div className="flex gap-2">
          <Button isDisabled={current === 0} onPress={() => {
          setCurrent(current - 1);
        }}>
            Back
          </Button>
          <Button tone="accent" isDisabled={current >= CHECKOUT.length} onPress={() => {
          setCurrent(current + 1);
        }}>
            Next
          </Button>
        </div>
      </div>;
  }
}`,...w.parameters?.docs?.source},description:{story:"With `isLinear`, only steps already reached can be pressed; the next ones wait for Next.",...w.parameters?.docs?.description}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: 'vertical',
    steps: CHECKOUT.map((step, index) => ({
      ...step,
      badge: index === 0 ? <Badge tone="success">Saved</Badge> : undefined
    }))
  },
  render: function Render(args) {
    const [current, setCurrent] = useState(1);
    return <Stepper {...args} currentStep={current} onCurrentStepChange={setCurrent} />;
  }
}`,...T.parameters?.docs?.source},description:{story:`A vertical stepper whose steps can be pressed, with a badge beside each title.`,...T.parameters?.docs?.description}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Site setup',
    orientation: 'vertical',
    headingLevel: 3,
    hasProgressBar: true,
    hasStatusBadges: true,
    currentStep: 1,
    steps: [{
      id: 'users',
      title: 'Add users',
      description: 'Operators and vendors can sign in.'
    }, {
      id: 'settings',
      title: 'Confirm site settings',
      description: 'Time zone, currency and phone code.',
      content: <Button size="sm" tone="accent">
            Confirm
          </Button>
    }, {
      id: 'driver',
      title: 'Register a meter driver',
      content: <Button size="sm">Register</Button>
    }, {
      id: 'tariff',
      title: 'Create the first tariff',
      description: 'Waiting for the site settings.',
      isDisabled: true
    }]
  }
}`,...E.parameters?.docs?.source},description:{story:'A standing checklist whose steps happen on different screens over days: vertical, with an "N of M done" progress\nbar (`hasProgressBar`), each status in words beside its title (`hasStatusBadges`), headings, and an action per\nstep. Blocked steps are upcoming and `isDisabled`.',...E.parameters?.docs?.description}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    hasStatusBadges: true,
    steps: ONBOARDING,
    defaultCurrentStep: 2,
    label: 'Onboarding'
  }
}`,...D.parameters?.docs?.source},description:{story:`Status badges in a horizontal stepper sit under each title.`,...D.parameters?.docs?.description}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    currentStep: CHECKOUT.length
  }
}`,...O.parameters?.docs?.source},description:{story:"Every step done (`currentStep` is the number of steps).",...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: args => <div dir="rtl" className="flex flex-col gap-8">
      <Stepper {...args} />
      <Stepper {...args} variant="arrow" />
    </div>
}`,...k.parameters?.docs?.source},description:{story:`Right to left: the row, its connectors and the arrows are mirrored.`,...k.parameters?.docs?.description}}}})))()}j();export{O as AllDone,b as Arrows,E as Checklist,C as Clickable,T as ClickableVertical,x as Compact,v as Dots,y as DotsVertical,h as Horizontal,w as Linear,S as NarrowContainer,m as Playground,k as RightToLeft,_ as States,D as StatusBadges,g as Vertical,A as __namedExportsOrder,p as default};