import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./OneTimeCodeField-B8nbP2uR.js";var a,o,s,c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{a=t(),r(),o=n(),s={title:`Inputs/OneTimeCodeField`,component:i,args:{label:`Verification code`,description:`We sent a code to your phone`}},c={tags:[`!visual`]},l={args:{groupSizes:[3,3],defaultValue:`1234`}},u={args:{label:`Recovery code`,description:`Letters and numbers, from your saved codes`,allowedCharacters:`alphanumeric`,groupSizes:[4,4],defaultValue:`K7QX2`}},d={args:{label:`Pairing code`,description:`Shown on the device: 0–9 and a–f`,allowedCharacters:/[0-9a-f]/,codeLength:5,defaultValue:`3fa`}},f={args:{label:`PIN`,description:void 0,codeLength:4,isMasked:!0,defaultValue:`12`}},p={render:()=>(0,o.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,o.jsx)(i,{label:`Small`,size:`sm`,codeLength:4,defaultValue:`12`}),(0,o.jsx)(i,{label:`Medium`,size:`md`,codeLength:4,defaultValue:`12`}),(0,o.jsx)(i,{label:`Large`,size:`lg`,codeLength:4,defaultValue:`12`})]})},m={render:()=>(0,o.jsxs)(`div`,{className:`flex flex-col gap-5`,children:[(0,o.jsx)(i,{label:`Required`,isRequired:!0,groupSizes:[3,3]}),(0,o.jsx)(i,{label:`Invalid`,isInvalid:!0,errorMessage:`That code didn’t work. Check it and try again.`,defaultValue:`123456`}),(0,o.jsx)(i,{label:`Disabled`,isDisabled:!0,defaultValue:`123`}),(0,o.jsx)(i,{label:`Read-only`,isReadOnly:!0,defaultValue:`483920`}),(0,o.jsx)(i,{label:`Side label`,labelPosition:`side`,codeLength:4,infoTip:`Check your authenticator app`})]})},h={tags:[`!visual`],render:function(){let[e,t]=(0,a.useState)(``),[n,r]=(0,a.useState)(null);return(0,o.jsxs)(`div`,{className:`flex flex-col gap-2 text-sm text-fg`,children:[(0,o.jsx)(i,{label:`Verification code`,groupSizes:[3,3],value:e,onChange:e=>{t(e),r(null)},onComplete:r}),(0,o.jsx)(`span`,{role:`status`,className:`text-fg-muted`,children:n===null?`Waiting for 6 digits`:`Checking ${n}…`})]})}},g=[`Playground`,`Groups`,`Alphanumeric`,`CustomPattern`,`Masked`,`Sizes`,`States`,`OnComplete`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    groupSizes: [3, 3],
    defaultValue: '1234'
  }
}`,...l.parameters?.docs?.source},description:{story:'`groupSizes` splits the cells with a separator, here 3 + 3. Pasting "123 456" or "123-456" fills every cell.',...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Recovery code',
    description: 'Letters and numbers, from your saved codes',
    allowedCharacters: 'alphanumeric',
    groupSizes: [4, 4],
    defaultValue: 'K7QX2'
  }
}`,...u.parameters?.docs?.source},description:{story:"`alphanumeric` takes Latin letters (uppercased as they're typed) and digits, with a text keyboard.",...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Pairing code',
    description: 'Shown on the device: 0–9 and a–f',
    allowedCharacters: /[0-9a-f]/,
    codeLength: 5,
    defaultValue: '3fa'
  }
}`,...d.parameters?.docs?.source},description:{story:`A pattern each character must match, taken as typed: here lowercase hexadecimal.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'PIN',
    description: undefined,
    codeLength: 4,
    isMasked: true,
    defaultValue: '12'
  }
}`,...f.parameters?.docs?.source},description:{story:"`isMasked` shows dots and makes the input a password input.",...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <OneTimeCodeField label="Small" size="sm" codeLength={4} defaultValue="12" />
      <OneTimeCodeField label="Medium" size="md" codeLength={4} defaultValue="12" />
      <OneTimeCodeField label="Large" size="lg" codeLength={4} defaultValue="12" />
    </div>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-5">
      <OneTimeCodeField label="Required" isRequired groupSizes={[3, 3]} />
      <OneTimeCodeField label="Invalid" isInvalid errorMessage="That code didn’t work. Check it and try again." defaultValue="123456" />
      <OneTimeCodeField label="Disabled" isDisabled defaultValue="123" />
      <OneTimeCodeField label="Read-only" isReadOnly defaultValue="483920" />
      <OneTimeCodeField label="Side label" labelPosition="side" codeLength={4} infoTip="Check your authenticator app" />
    </div>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function OnComplete() {
    const [code, setCode] = useState('');
    const [checked, setChecked] = useState<string | null>(null);
    return <div className="flex flex-col gap-2 text-sm text-fg">
        <OneTimeCodeField label="Verification code" groupSizes={[3, 3]} value={code} onChange={next => {
        setCode(next);
        setChecked(null);
      }} onComplete={setChecked} />
        <span role="status" className="text-fg-muted">
          {checked === null ? 'Waiting for 6 digits' : \`Checking \${checked}…\`}
        </span>
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:"`onComplete` fires when every cell is filled, for example to verify the code at once.",...h.parameters?.docs?.description}}}})))()}_();export{u as Alphanumeric,d as CustomPattern,l as Groups,f as Masked,h as OnComplete,c as Playground,p as Sizes,m as States,g as __namedExportsOrder,s as default};