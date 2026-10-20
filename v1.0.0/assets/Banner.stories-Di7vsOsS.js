import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Button-e4ZjaxXL.js";import{n as i,t as a}from"./Banner-OZcNcSI6.js";var o,s,c,l,u,d,f;function p(){return(p=e((()=>{n(),i(),o=t(),s={title:`Feedback/Banner`,component:a,args:{tone:`info`,title:`Scheduled maintenance`,children:`The console will be read-only from 22:00 to 23:00 UTC.`}},c={tags:[`!visual`]},l={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-2xl flex-col gap-3`,children:[(0,o.jsx)(a,{tone:`neutral`,title:`Draft`,children:`This tariff hasn't been published yet.`}),(0,o.jsx)(a,{tone:`info`,title:`Scheduled maintenance`,children:`The console will be read-only from 22:00 to 23:00 UTC.`}),(0,o.jsx)(a,{tone:`success`,title:`Import complete`,children:`1,284 meters were imported.`}),(0,o.jsx)(a,{tone:`warning`,title:`Quota nearly used`,children:`You've used 92% of this month's API quota.`}),(0,o.jsx)(a,{tone:`danger`,title:`Sync failed`,children:`The last three syncs failed. Check the connection settings.`})]})},u={args:{tone:`warning`,title:`Unsaved changes`,children:`You have changes that haven’t been saved.`,isDismissable:!0,actions:(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(r,{size:`sm`,tone:`warning`,children:`Save now`}),(0,o.jsx)(r,{size:`sm`,variant:`ghost`,children:`Discard`})]})}},d={args:{tone:`success`,title:`Saved`,children:void 0,isDismissable:!0}},f=[`Playground`,`Tones`,`WithActionsAndDismiss`,`TitleOnly`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-2xl flex-col gap-3">
      <Banner tone="neutral" title="Draft">
        This tariff hasn't been published yet.
      </Banner>
      <Banner tone="info" title="Scheduled maintenance">
        The console will be read-only from 22:00 to 23:00 UTC.
      </Banner>
      <Banner tone="success" title="Import complete">
        1,284 meters were imported.
      </Banner>
      <Banner tone="warning" title="Quota nearly used">
        You've used 92% of this month's API quota.
      </Banner>
      <Banner tone="danger" title="Sync failed">
        The last three syncs failed. Check the connection settings.
      </Banner>
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    tone: 'warning',
    title: 'Unsaved changes',
    children: 'You have changes that haven’t been saved.',
    isDismissable: true,
    actions: <>
        <Button size="sm" tone="warning">
          Save now
        </Button>
        <Button size="sm" variant="ghost">
          Discard
        </Button>
      </>
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    tone: 'success',
    title: 'Saved',
    children: undefined,
    isDismissable: true
  }
}`,...d.parameters?.docs?.source}}}})))()}p();export{c as Playground,d as TitleOnly,l as Tones,u as WithActionsAndDismiss,f as __namedExportsOrder,s as default};