import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,r as o}from"./Dialog-DWPS_dsB.js";import{n as s,t as c}from"./TextField-57e0_XUI.js";import{n as l,t as u}from"./StepDialog-QftcELkM.js";var d,f,p,m,h;function g(){return(g=e((()=>{d=t(),r(),o(),s(),l(),f=n(),p={title:`Overlays/StepDialog`,component:u,args:{title:`Steps`,steps:[],onConfirm:()=>void 0}},m={tags:[`visual-page`],render:function(){let[e,t]=(0,d.useState)(`Acme Corporation`),[n,r]=(0,d.useState)(`120.00`);return(0,f.jsxs)(a,{defaultOpen:!0,children:[(0,f.jsx)(i,{tone:`accent`,children:`Issue refund`}),(0,f.jsx)(u,{title:`Issue refund`,hasSummaryStep:!0,confirmLabel:`Issue refund`,onConfirm:()=>new Promise(e=>setTimeout(e,1e3)),steps:[{id:`customer`,title:`Customer`,content:(0,f.jsx)(c,{label:`Customer`,value:e,onChange:t,isRequired:!0}),canAdvance:e.trim()!==``,summary:[{label:`Customer`,value:e}]},{id:`amount`,title:`Amount`,content:(0,f.jsx)(c,{label:`Amount`,prefix:`USD`,inputMode:`decimal`,value:n,onChange:r}),validate:()=>Number(n)>0&&Number(n)<=500||`Enter an amount between 0.01 and 500.`,summary:[{label:`Amount`,value:`USD ${n}`}]}]})]})}},h=[`RefundWizard`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: function RefundWizardStory() {
    const [customer, setCustomer] = useState('Acme Corporation');
    const [amount, setAmount] = useState('120.00');
    return <DialogTrigger defaultOpen>
        <Button tone="accent">Issue refund</Button>
        <StepDialog title="Issue refund" hasSummaryStep confirmLabel="Issue refund" onConfirm={() => new Promise(resolve => setTimeout(resolve, 1000))} steps={[{
        id: 'customer',
        title: 'Customer',
        content: <TextField label="Customer" value={customer} onChange={setCustomer} isRequired />,
        canAdvance: customer.trim() !== '',
        summary: [{
          label: 'Customer',
          value: customer
        }]
      }, {
        id: 'amount',
        title: 'Amount',
        content: <TextField label="Amount" prefix="USD" inputMode="decimal" value={amount} onChange={setAmount} />,
        validate: () => Number(amount) > 0 && Number(amount) <= 500 ? true : 'Enter an amount between 0.01 and 500.',
        summary: [{
          label: 'Amount',
          value: \`USD \${amount}\`
        }]
      }]} />
      </DialogTrigger>;
  }
}`,...m.parameters?.docs?.source},description:{story:`A money flow: validated steps, then a generated summary before the final confirm.`,...m.parameters?.docs?.description}}}})))()}g();export{m as RefundWizard,h as __namedExportsOrder,p as default};