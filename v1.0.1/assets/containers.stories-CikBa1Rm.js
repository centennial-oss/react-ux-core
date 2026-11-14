import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./cn-BnE6eITj.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{n as i,t as a}from"./Button-e4ZjaxXL.js";import{n as o,r as s}from"./Dialog-DWPS_dsB.js";import{n as c,t as l}from"./Card-BKrFQ2m4.js";import{_ as u,a as d,c as f,i as p,l as m,n as h,r as g,v as _}from"./ConfigForm-mXAgVdFX.js";import{L as v,R as y}from"./uploads-22tlT3wb.js";import{i as b,n as x,r as S,t as C}from"./WizardForm-QaUfA3-e.js";function w({title:e,description:t,headingLevel:n,className:r,...i}){let a=d(i),o=a.mode===`edit`;return(0,T.jsx)(v.Provider,{value:a,children:(0,T.jsx)(l,{title:e,description:t,headingLevel:n,className:r,footer:o?(0,T.jsx)(u,{isSticky:!1,className:`w-full`}):void 0,children:o?(0,T.jsx)(h,{}):(0,T.jsx)(f,{})})})}var T;function E(){return(E=e((()=>{c(),g(),_(),m(),y(),p(),T=r(),w.__docgenInfo={description:"A ConfigForm in a Card, with the buttons in the card footer. With `hasEditToggle` the card shows the record\nread-only until Edit is pressed, so a detail card and its edit form share one definition.",methods:[],displayName:`CardForm`,props:{config:{required:!0,tsType:{name:`FormConfig`,elements:[{name:`V`},{name:`TCustom`}],raw:`FormConfig<V, TCustom>`},description:``},registry:{required:!1,tsType:{name:`FieldRegistry`},description:"Field renderers. Defaults to the nearest `FieldRegistryContext`, or the built-ins."},mode:{required:!1,tsType:{name:`union`,raw:`'edit' | 'view'`,elements:[{name:`literal`,value:`'edit'`},{name:`literal`,value:`'view'`}]},description:"`view` shows the values read-only. Controlled; see `defaultMode`."},defaultMode:{required:!1,tsType:{name:`union`,raw:`'edit' | 'view'`,elements:[{name:`literal`,value:`'edit'`},{name:`literal`,value:`'view'`}]},description:``},onModeChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(mode: FormMode) => void`,signature:{arguments:[{type:{name:`union`,raw:`'edit' | 'view'`,elements:[{name:`literal`,value:`'edit'`},{name:`literal`,value:`'view'`}]},name:`mode`}],return:{name:`void`}}},description:``},hasEditToggle:{required:!1,tsType:{name:`boolean`},description:`Shows Edit in view mode and returns to view mode after a save or cancel.`},resetKey:{required:!1,tsType:{name:`unknown`},description:"When this changes, the form re-seeds from `config.defaultValues` (for example when another record loads)."},onDirtyChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(isDirty: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`isDirty`}],return:{name:`void`}}},description:`Called when the form gains or loses unsaved changes (to block navigation, for example).`},onValuesChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(values: V) => void`,signature:{arguments:[{type:{name:`V`},name:`values`}],return:{name:`void`}}},description:`Called when any value changes. Observe only: the form owns its values.`},onSuccess:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(event: FormSuccessEvent<V>) => void`,signature:{arguments:[{type:{name:`FormSuccessEvent`,elements:[{name:`V`}],raw:`FormSuccessEvent<V>`},name:`event`}],return:{name:`void`}}},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`ConfigFormHandle`,elements:[{name:`V`}],raw:`ConfigFormHandle<V>`}],raw:`Ref<ConfigFormHandle<V>>`},description:``},title:{required:!1,tsType:{name:`ReactNode`},description:``},description:{required:!1,tsType:{name:`ReactNode`},description:``},headingLevel:{required:!1,tsType:{name:`union`,raw:`2 | 3 | 4 | 5 | 6`,elements:[{name:`literal`,value:`2`},{name:`literal`,value:`3`},{name:`literal`,value:`4`},{name:`literal`,value:`5`},{name:`literal`,value:`6`}]},description:`The card title's heading level. Defaults to the Card default.`},className:{required:!1,tsType:{name:`string`},description:``}}}})))()}function D({title:e,description:t,headingLevel:r=2,onCancel:i,className:a,...o}){let s=d(o),c=`h${String(r)}`,l=s.mode===`edit`;return(0,O.jsx)(v.Provider,{value:s,children:(0,O.jsxs)(`div`,{className:n(`flex min-w-0 flex-col gap-6`,a),children:[(e!==void 0||t!==void 0)&&(0,O.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[e!==void 0&&(0,O.jsx)(c,{className:`text-xl font-semibold text-fg`,children:e}),t!==void 0&&(0,O.jsx)(`p`,{className:`text-sm text-fg-muted`,children:t})]}),l?(0,O.jsxs)(O.Fragment,{children:[(0,O.jsx)(h,{className:`scroll-pb-24`}),(0,O.jsx)(`div`,{className:`sticky bottom-0 z-sticky -mx-4 border-t border-border bg-surface-1 px-4 pt-3 pb-[max(--spacing(3),env(safe-area-inset-bottom))]`,children:(0,O.jsx)(u,{isSticky:!1,onCancel:i})})]}):(0,O.jsx)(f,{})]})})}var O;function k(){return(k=e((()=>{t(),g(),_(),m(),y(),p(),O=r(),D.__docgenInfo={description:`A ConfigForm laid out as a page: an optional heading, the sections, and an action bar that stays at the bottom of
the screen while the page scrolls (above the safe area on phones). Focused fields scroll clear of the bar.`,methods:[],displayName:`PageForm`,props:{config:{required:!0,tsType:{name:`FormConfig`,elements:[{name:`V`},{name:`TCustom`}],raw:`FormConfig<V, TCustom>`},description:``},registry:{required:!1,tsType:{name:`FieldRegistry`},description:"Field renderers. Defaults to the nearest `FieldRegistryContext`, or the built-ins."},mode:{required:!1,tsType:{name:`union`,raw:`'edit' | 'view'`,elements:[{name:`literal`,value:`'edit'`},{name:`literal`,value:`'view'`}]},description:"`view` shows the values read-only. Controlled; see `defaultMode`."},defaultMode:{required:!1,tsType:{name:`union`,raw:`'edit' | 'view'`,elements:[{name:`literal`,value:`'edit'`},{name:`literal`,value:`'view'`}]},description:``},onModeChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(mode: FormMode) => void`,signature:{arguments:[{type:{name:`union`,raw:`'edit' | 'view'`,elements:[{name:`literal`,value:`'edit'`},{name:`literal`,value:`'view'`}]},name:`mode`}],return:{name:`void`}}},description:``},hasEditToggle:{required:!1,tsType:{name:`boolean`},description:`Shows Edit in view mode and returns to view mode after a save or cancel.`},resetKey:{required:!1,tsType:{name:`unknown`},description:"When this changes, the form re-seeds from `config.defaultValues` (for example when another record loads)."},onDirtyChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(isDirty: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`isDirty`}],return:{name:`void`}}},description:`Called when the form gains or loses unsaved changes (to block navigation, for example).`},onValuesChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(values: V) => void`,signature:{arguments:[{type:{name:`V`},name:`values`}],return:{name:`void`}}},description:`Called when any value changes. Observe only: the form owns its values.`},onSuccess:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(event: FormSuccessEvent<V>) => void`,signature:{arguments:[{type:{name:`FormSuccessEvent`,elements:[{name:`V`}],raw:`FormSuccessEvent<V>`},name:`event`}],return:{name:`void`}}},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`ConfigFormHandle`,elements:[{name:`V`}],raw:`ConfigFormHandle<V>`}],raw:`Ref<ConfigFormHandle<V>>`},description:``},title:{required:!1,tsType:{name:`ReactNode`},description:``},description:{required:!1,tsType:{name:`ReactNode`},description:``},headingLevel:{required:!1,tsType:{name:`union`,raw:`2 | 3 | 4 | 5 | 6`,elements:[{name:`literal`,value:`2`},{name:`literal`,value:`3`},{name:`literal`,value:`4`},{name:`literal`,value:`5`},{name:`literal`,value:`6`}]},description:`The title's heading level. Defaults to 2 (the page header usually holds the 1).`,defaultValue:{value:`2`,computed:!1}},onCancel:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Shows a Cancel button in the action bar (for example to navigate back).`},className:{required:!1,tsType:{name:`string`},description:``}}}})))()}var A,j,M,N,P,F,I,L,R;function z(){return(z=e((()=>{i(),s(),E(),b(),k(),x(),A=r(),j={title:`Form/Containers`,parameters:{layout:`padded`}},M=e=>new Promise(t=>setTimeout(t,e)),N={defaultValues:{label:`Main meter`,serial:`EM-20419`,capacity:60,notes:``},layout:[{id:`meter`,columns:2,fields:[`label`,`serial`,`capacity`,`notes`]}],fields:[{type:`text`,name:`label`,label:`Label`,isRequired:!0},{type:`text`,name:`serial`,label:`Serial number`,isRequired:!0},{type:`number`,name:`capacity`,label:`Capacity`,unit:`A`},{type:`textarea`,name:`notes`,label:`Notes`,colSpan:`full`}],actions:{update:async()=>(await M(600),{ok:!0,message:`Meter saved`}),delete:async()=>(await M(600),{ok:!0,message:`Meter deleted`})}},P={tags:[`visual-page`],render:()=>(0,A.jsxs)(o,{defaultOpen:!0,children:[(0,A.jsx)(a,{children:`Edit meter`}),(0,A.jsx)(S,{title:`Edit meter`,description:`Changes apply immediately.`,config:N})]})},F={render:()=>(0,A.jsx)(w,{title:`Meter`,description:`Installed at the north substation.`,config:N,defaultMode:`view`,hasEditToggle:!0,className:`max-w-2xl`})},I={render:()=>(0,A.jsx)(D,{title:`Edit meter`,description:`Meter details for billing and outage alerts.`,config:N,onCancel:()=>void 0,className:`max-w-3xl`})},L={tags:[`visual-page`],render:()=>(0,A.jsxs)(o,{defaultOpen:!0,children:[(0,A.jsx)(a,{children:`Issue a refund`}),(0,A.jsx)(C,{title:`Issue a refund`,hasSummaryStep:!0,steps:[{id:`account`,title:`Account`,fields:[`account`,`invoice`]},{id:`amount`,title:`Amount`,fields:[`amount`,`reason`]},{id:`notify`,title:`Notify`,fields:[`shouldNotify`]}],config:{defaultValues:{account:``,invoice:null,amount:null,reason:``,shouldNotify:!0},fields:[{type:`text`,name:`account`,label:`Account number`,isRequired:!0},{type:`select`,name:`invoice`,label:`Invoice`,isRequired:!0,items:[{id:`inv-1042`,label:`INV-1042 · March`},{id:`inv-1043`,label:`INV-1043 · April`}]},{type:`money`,name:`amount`,label:`Amount`,currency:`USD`,isRequired:!0},{type:`textarea`,name:`reason`,label:`Reason`},{type:`switch`,name:`shouldNotify`,label:`Email the customer`}],actions:{create:async()=>(await M(600),{ok:!0,message:`Refund issued`}),submitLabel:`Issue refund`}}})]})},R=[`Dialog`,`Card`,`Page`,`Wizard`],P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <DialogTrigger defaultOpen>
      <Button>Edit meter</Button>
      <DialogForm title="Edit meter" description="Changes apply immediately." config={meterConfig} />
    </DialogTrigger>
}`,...P.parameters?.docs?.source},description:{story:`DialogForm: the buttons sit in the dialog footer. It can't be dismissed while saving; with unsaved changes Escape
and the backdrop don't close it, and Cancel asks first. Full screen on phones.`,...P.parameters?.docs?.description}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <CardForm title="Meter" description="Installed at the north substation." config={meterConfig} defaultMode="view" hasEditToggle className="max-w-2xl" />
}`,...F.parameters?.docs?.source},description:{story:`CardForm with the edit toggle: the record reads as a detail card until Edit, then edits in place.`,...F.parameters?.docs?.description}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <PageForm title="Edit meter" description="Meter details for billing and outage alerts." config={meterConfig} onCancel={() => undefined} className="max-w-3xl" />
}`,...I.parameters?.docs?.source},description:{story:`PageForm: a full page with an action bar that stays at the bottom of the screen as the page scrolls.`,...I.parameters?.docs?.description}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <DialogTrigger defaultOpen>
      <Button>Issue a refund</Button>
      <WizardForm<Refund> title="Issue a refund" hasSummaryStep steps={[{
      id: 'account',
      title: 'Account',
      fields: ['account', 'invoice']
    }, {
      id: 'amount',
      title: 'Amount',
      fields: ['amount', 'reason']
    }, {
      id: 'notify',
      title: 'Notify',
      fields: ['shouldNotify']
    }]} config={{
      defaultValues: {
        account: '',
        invoice: null,
        amount: null,
        reason: '',
        shouldNotify: true
      },
      fields: [{
        type: 'text',
        name: 'account',
        label: 'Account number',
        isRequired: true
      }, {
        type: 'select',
        name: 'invoice',
        label: 'Invoice',
        isRequired: true,
        items: [{
          id: 'inv-1042',
          label: 'INV-1042 · March'
        }, {
          id: 'inv-1043',
          label: 'INV-1043 · April'
        }]
      }, {
        type: 'money',
        name: 'amount',
        label: 'Amount',
        currency: 'USD',
        isRequired: true
      }, {
        type: 'textarea',
        name: 'reason',
        label: 'Reason'
      }, {
        type: 'switch',
        name: 'shouldNotify',
        label: 'Email the customer'
      }],
      actions: {
        create: async () => {
          await wait(600);
          return {
            ok: true,
            message: 'Refund issued'
          };
        },
        submitLabel: 'Issue refund'
      }
    }} />
    </DialogTrigger>
}`,...L.parameters?.docs?.source},description:{story:`WizardForm: each step must be valid before Next, and the summary lists every value before the refund is issued.
Shows "Step 2 of 4" on phones too.`,...L.parameters?.docs?.description}}}})))()}z();export{F as Card,P as Dialog,I as Page,L as Wizard,R as __namedExportsOrder,j as default};