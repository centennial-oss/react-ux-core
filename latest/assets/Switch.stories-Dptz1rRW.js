import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./Switch-BcEAlLDl.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";var a,o,s,c,l,u,d,f;function p(){return(p=e((()=>{a=t(),n(),o=i(),s={title:`Inputs/Switch`,component:r,args:{children:`Email notifications`}},c={tags:[`!visual`]},l={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-3`,children:[(0,o.jsx)(r,{children:`Off`}),(0,o.jsx)(r,{defaultSelected:!0,children:`On`}),(0,o.jsx)(r,{description:`A weekly summary of activity, sent on Mondays.`,children:`Weekly digest`}),(0,o.jsx)(r,{isDisabled:!0,children:`Disabled off`}),(0,o.jsx)(r,{isDisabled:!0,defaultSelected:!0,children:`Disabled on`}),(0,o.jsx)(r,{isReadOnly:!0,defaultSelected:!0,children:`Read-only`}),(0,o.jsx)(r,{isInvalid:!0,errorMessage:`Turn this on to continue`,children:`Accept the data policy`})]})},u={render:()=>(0,o.jsx)(`div`,{className:`max-w-xs`,children:(0,o.jsx)(r,{description:`Applies to every site in this organisation, including archived ones.`,children:`Send a notification whenever a scheduled report finishes running`})})},d={tags:[`!visual`],render:function(){let[e,t]=(0,a.useState)(!1);return(0,o.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,o.jsx)(r,{isSelected:e,onChange:t,children:`Maintenance mode`}),(0,o.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Maintenance mode is `,e?`on`:`off`,`.`]})]})}},f=[`Playground`,`States`,`LongLabel`,`Controlled`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-3">
      <Switch>Off</Switch>
      <Switch defaultSelected>On</Switch>
      <Switch description="A weekly summary of activity, sent on Mondays.">Weekly digest</Switch>
      <Switch isDisabled>Disabled off</Switch>
      <Switch isDisabled defaultSelected>
        Disabled on
      </Switch>
      <Switch isReadOnly defaultSelected>
        Read-only
      </Switch>
      <Switch isInvalid errorMessage="Turn this on to continue">
        Accept the data policy
      </Switch>
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xs">
      <Switch description="Applies to every site in this organisation, including archived ones.">
        Send a notification whenever a scheduled report finishes running
      </Switch>
    </div>
}`,...u.parameters?.docs?.source},description:{story:`Long labels wrap beside the switch instead of widening the page.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [isOn, setOn] = useState(false);
    return <div className="flex flex-col gap-2">
        <Switch isSelected={isOn} onChange={setOn}>
          Maintenance mode
        </Switch>
        <p className="text-sm text-fg-muted">Maintenance mode is {isOn ? 'on' : 'off'}.</p>
      </div>;
  }
}`,...d.parameters?.docs?.source},description:{story:"Controlled with `isSelected` / `onChange`.",...d.parameters?.docs?.description}}}})))()}p();export{d as Controlled,u as LongLabel,c as Playground,l as States,f as __namedExportsOrder,s as default};