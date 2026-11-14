import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./MaskedField-CkJ0uYE6.js";function a(e,t){let n=``;for(let r=0;r<e;r++){let e=r<2?`A`:r<4?`9`:`X`,i=r>0&&r%4==0?` ${e}`:e;n+=r<t?i:`[${i}]`}return n}function o(){let[e,t]=(0,s.useState)(`5551234567`),[n,r]=(0,s.useState)(`(555) 123-4567`);return(0,c.jsxs)(`div`,{className:`flex flex-col gap-5`,children:[(0,c.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,c.jsx)(i,{label:`Raw value`,mask:l,value:e,onChange:t}),(0,c.jsx)(`output`,{className:`text-sm text-fg-muted`,children:e})]}),(0,c.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,c.jsx)(i,{label:`Formatted value`,mask:l,valueFormat:`formatted`,value:n,onChange:r}),(0,c.jsx)(`output`,{className:`text-sm text-fg-muted`,children:n})]})]})}var s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T;function E(){return(E=e((()=>{s=t(),r(),c=n(),l=`(999) 999-9999`,u=e=>/^3[47]/.test(e)?`9999 999999 99999`:/^3(0[0-5]|[68])/.test(e)?`9999 999999 9999`:`9999 9999 9999 9999[ 999]`,d={X:{pattern:/[A-Z0-9]/,transform:e=>e.toUpperCase()}},f={BE:16,CH:21,DE:22,ES:24,FR:27,GB:22,IT:27,NL:18},p=e=>{let t=f[e.slice(0,2)];return t===void 0?a(34,15):a(t,t)},m={title:`Inputs/MaskedField`,component:i,args:{label:`Phone`,description:`Like (555) 123-4567`,mask:l}},h={tags:[`!visual`]},g={args:{autoComplete:`tel-national`,defaultValue:`5551234`}},_={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Postal code`,description:`Like K1A 0B1`,mask:`A9A 9A9`,autoComplete:`postal-code`,defaultValue:`k1a0b1`}),(0,c.jsx)(i,{label:`ZIP code`,description:`5 digits, or ZIP+4`,mask:`99999[-9999]`,autoComplete:`postal-code`,defaultValue:`902101234`})]})},v={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Card number`,mask:u,autoComplete:`cc-number`,defaultValue:`4111111111111111`}),(0,c.jsx)(i,{label:`Amex card number`,mask:u,autoComplete:`cc-number`,defaultValue:`378282246310005`})]})},y={name:`Date`,args:{label:`Date of birth`,description:`MM/DD/YYYY`,mask:`99/99/9999`,valueFormat:`formatted`,autoComplete:`bday`,defaultValue:`03/14/1990`}},b={args:{label:`IBAN`,description:`Starts with the country code, such as GB`,mask:p,tokens:d,defaultValue:`GB82WEST12345698765432`}},x={args:{placeholderChar:`_`,defaultValue:`555`},play:async({canvas:e,userEvent:t})=>{await t.click(e.getByRole(`textbox`,{name:`Phone`}))}},S={tags:[`!visual`],render:()=>(0,c.jsx)(o,{})},C={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,c.jsx)(i,{label:`Small`,size:`sm`,mask:l,defaultValue:`5551234567`}),(0,c.jsx)(i,{label:`Medium`,size:`md`,mask:l,defaultValue:`5551234567`})]})},w={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Required`,isRequired:!0,mask:l}),(0,c.jsx)(i,{label:`Invalid`,mask:l,defaultValue:`555`,isInvalid:!0,errorMessage:`Enter the complete value`}),(0,c.jsx)(i,{label:`Disabled`,isDisabled:!0,mask:l,defaultValue:`5551234567`}),(0,c.jsx)(i,{label:`Read-only`,isReadOnly:!0,mask:l,defaultValue:`5551234567`}),(0,c.jsx)(i,{label:`Side label`,labelPosition:`side`,mask:l,defaultValue:`5551234567`})]})},T=[`Playground`,`Phone`,`PostalCode`,`CreditCard`,`DateOfBirth`,`Iban`,`Template`,`Values`,`Sizes`,`States`],h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    autoComplete: 'tel-national',
    defaultValue: '5551234'
  }
}`,...g.parameters?.docs?.source},description:{story:`A phone number. The value is the digits alone ("5551234567"); the field shows the brackets, space and hyphen.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-5">
      <MaskedField label="Postal code" description="Like K1A 0B1" mask="A9A 9A9" autoComplete="postal-code" defaultValue="k1a0b1" />
      <MaskedField label="ZIP code" description="5 digits, or ZIP+4" mask="99999[-9999]" autoComplete="postal-code" defaultValue="902101234" />
    </div>
}`,..._.parameters?.docs?.source},description:{story:"Postal codes: a Canadian one (`A9A 9A9`, letters uppercased as they're typed, with a text keyboard) and a US ZIP\ncode whose four-digit extension is optional (`99999[-9999]`).",..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-5">
      <MaskedField label="Card number" mask={cardMask} autoComplete="cc-number" defaultValue="4111111111111111" />
      <MaskedField label="Amex card number" mask={cardMask} autoComplete="cc-number" defaultValue="378282246310005" />
    </div>
}`,...v.parameters?.docs?.source},description:{story:`A card number whose grouping follows its brand, picked by a function mask as the first digits arrive.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: 'Date',
  args: {
    label: 'Date of birth',
    description: 'MM/DD/YYYY',
    mask: '99/99/9999',
    valueFormat: 'formatted',
    autoComplete: 'bday',
    defaultValue: '03/14/1990'
  }
}`,...y.parameters?.docs?.source},description:{story:'A date as typed text. `valueFormat="formatted"` makes the value "03/14/2026" rather than "03142026".',...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'IBAN',
    description: 'Starts with the country code, such as GB',
    mask: ibanMask,
    tokens: ibanTokens,
    defaultValue: 'GB82WEST12345698765432'
  }
}`,...b.parameters?.docs?.source},description:{story:'An IBAN, with custom tokens (`X`, a letter or digit, uppercased) and a function mask that takes the length the\ncountry uses once its code is typed. Pasting "gb82 west 1234 5698 7654 32" fills it.',...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    placeholderChar: '_',
    defaultValue: '555'
  },
  play: async ({
    canvas,
    userEvent
  }) => {
    await userEvent.click(canvas.getByRole('textbox', {
      name: 'Phone'
    }));
  }
}`,...x.parameters?.docs?.source},description:{story:"`placeholderChar` draws the rest of the mask while the field has focus; it isn't part of the value.",...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <ValuesDemo />
}`,...S.parameters?.docs?.source},description:{story:`The value as the app gets it, raw and formatted.`,...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <MaskedField label="Small" size="sm" mask={phoneMask} defaultValue="5551234567" />
      <MaskedField label="Medium" size="md" mask={phoneMask} defaultValue="5551234567" />
    </div>
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-5">
      <MaskedField label="Required" isRequired mask={phoneMask} />
      <MaskedField label="Invalid" mask={phoneMask} defaultValue="555" isInvalid errorMessage="Enter the complete value" />
      <MaskedField label="Disabled" isDisabled mask={phoneMask} defaultValue="5551234567" />
      <MaskedField label="Read-only" isReadOnly mask={phoneMask} defaultValue="5551234567" />
      <MaskedField label="Side label" labelPosition="side" mask={phoneMask} defaultValue="5551234567" />
    </div>
}`,...w.parameters?.docs?.source},description:{story:`An incomplete value fails when its form is submitted; here the error shows from the start.`,...w.parameters?.docs?.description}}}})))()}E();export{v as CreditCard,y as DateOfBirth,b as Iban,g as Phone,h as Playground,_ as PostalCode,C as Sizes,w as States,x as Template,S as Values,T as __namedExportsOrder,m as default};