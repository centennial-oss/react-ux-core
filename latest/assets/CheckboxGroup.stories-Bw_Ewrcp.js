import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Checkbox-DkKEWkna.js";import{n as a,t as o}from"./CheckboxGroup-DRP9egOz.js";var s,c,l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{s=t(),r(),a(),c=n(),l={title:`Inputs/CheckboxGroup`,component:o,args:{label:`Notification channels`,defaultValue:[`email`],children:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,children:`SMS`}),(0,c.jsx)(i,{value:`push`,children:`Push notification`})]})}},u={tags:[`!visual`]},d={render:()=>(0,c.jsxs)(o,{label:`Notification channels`,description:`Where we send alerts about your sites.`,defaultValue:[`email`,`push`],isRequired:!0,children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,description:`Carrier charges may apply.`,children:`SMS`}),(0,c.jsx)(i,{value:`push`,children:`Push notification`}),(0,c.jsx)(i,{value:`fax`,isDisabled:!0,children:`Fax`})]})},f={render:()=>(0,c.jsx)(`div`,{className:`max-w-sm`,children:(0,c.jsxs)(o,{label:`Days`,orientation:`horizontal`,defaultValue:[`mon`,`wed`,`fri`],children:[(0,c.jsx)(i,{value:`mon`,children:`Monday`}),(0,c.jsx)(i,{value:`tue`,children:`Tuesday`}),(0,c.jsx)(i,{value:`wed`,children:`Wednesday`}),(0,c.jsx)(i,{value:`thu`,children:`Thursday`}),(0,c.jsx)(i,{value:`fri`,children:`Friday`})]})})},p={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-6`,children:[(0,c.jsxs)(o,{label:`Invalid`,isInvalid:!0,errorMessage:`Choose at least one channel`,children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,children:`SMS`})]}),(0,c.jsxs)(o,{label:`Disabled`,isDisabled:!0,defaultValue:[`email`],children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,children:`SMS`})]}),(0,c.jsxs)(o,{label:`Read-only`,isReadOnly:!0,defaultValue:[`sms`],children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,children:`SMS`})]})]})},m={render:()=>(0,c.jsx)(`div`,{className:`max-w-xl`,children:(0,c.jsxs)(o,{label:`Channels`,labelPosition:`side`,description:`Pick any`,children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,children:`SMS`})]})})},h={tags:[`!visual`],render:function(){let[e,t]=(0,s.useState)([`email`]);return(0,c.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,c.jsxs)(o,{label:`Channels`,value:e,onChange:t,children:[(0,c.jsx)(i,{value:`email`,children:`Email`}),(0,c.jsx)(i,{value:`sms`,children:`SMS`}),(0,c.jsx)(i,{value:`push`,children:`Push`})]}),(0,c.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Selected: `,e.join(`, `)||`none`]})]})}},g={render:()=>(0,c.jsxs)(o,{label:`Which two planets are gas giants? (Choose two.)`,value:[`jupiter`,`mars`],isReadOnly:!0,children:[(0,c.jsx)(i,{value:`jupiter`,feedback:{tone:`success`,message:`Your answer, correct`},children:`Jupiter`}),(0,c.jsx)(i,{value:`mars`,feedback:{tone:`danger`,message:`Your answer`},children:`Mars`}),(0,c.jsx)(i,{value:`saturn`,feedback:{tone:`warning`,message:`Correct answer, not chosen`},children:`Saturn`}),(0,c.jsx)(i,{value:`venus`,children:`Venus`})]})},_=[`Playground`,`Vertical`,`Horizontal`,`States`,`SideLabel`,`Controlled`,`CheckedAnswers`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <CheckboxGroup label="Notification channels" description="Where we send alerts about your sites." defaultValue={['email', 'push']} isRequired>
      <Checkbox value="email">Email</Checkbox>
      <Checkbox value="sms" description="Carrier charges may apply.">
        SMS
      </Checkbox>
      <Checkbox value="push">Push notification</Checkbox>
      <Checkbox value="fax" isDisabled>
        Fax
      </Checkbox>
    </CheckboxGroup>
}`,...d.parameters?.docs?.source},description:{story:`Options stack vertically by default. Each option can have its own description.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-sm">
      <CheckboxGroup label="Days" orientation="horizontal" defaultValue={['mon', 'wed', 'fri']}>
        <Checkbox value="mon">Monday</Checkbox>
        <Checkbox value="tue">Tuesday</Checkbox>
        <Checkbox value="wed">Wednesday</Checkbox>
        <Checkbox value="thu">Thursday</Checkbox>
        <Checkbox value="fri">Friday</Checkbox>
      </CheckboxGroup>
    </div>
}`,...f.parameters?.docs?.source},description:{story:`A horizontal group wraps onto more rows when space is short.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-6">
      <CheckboxGroup label="Invalid" isInvalid errorMessage="Choose at least one channel">
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
      <CheckboxGroup label="Disabled" isDisabled defaultValue={['email']}>
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
      <CheckboxGroup label="Read-only" isReadOnly defaultValue={['sms']}>
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
    </div>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <CheckboxGroup label="Channels" labelPosition="side" description="Pick any">
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
    </div>
}`,...m.parameters?.docs?.source},description:{story:`Side labels sit beside the options in wide containers and move on top in narrow ones.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<string[]>(['email']);
    return <div className="flex flex-col gap-2">
        <CheckboxGroup label="Channels" value={value} onChange={setValue}>
          <Checkbox value="email">Email</Checkbox>
          <Checkbox value="sms">SMS</Checkbox>
          <Checkbox value="push">Push</Checkbox>
        </CheckboxGroup>
        <p className="text-sm text-fg-muted">Selected: {value.join(', ') || 'none'}</p>
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`, which receives the checked values.",...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <CheckboxGroup label="Which two planets are gas giants? (Choose two.)" value={['jupiter', 'mars']} isReadOnly>
      <Checkbox value="jupiter" feedback={{
      tone: 'success',
      message: 'Your answer, correct'
    }}>
        Jupiter
      </Checkbox>
      <Checkbox value="mars" feedback={{
      tone: 'danger',
      message: 'Your answer'
    }}>
        Mars
      </Checkbox>
      <Checkbox value="saturn" feedback={{
      tone: 'warning',
      message: 'Correct answer, not chosen'
    }}>
        Saturn
      </Checkbox>
      <Checkbox value="venus">Venus</Checkbox>
    </CheckboxGroup>
}`,...g.parameters?.docs?.source},description:{story:"A checked multiple-response question: chosen and correct, chosen and wrong, and correct but missed, each marked in\nplace with `feedback`.",...g.parameters?.docs?.description}}}})))()}v();export{g as CheckedAnswers,h as Controlled,f as Horizontal,u as Playground,m as SideLabel,p as States,d as Vertical,_ as __namedExportsOrder,l as default};