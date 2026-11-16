import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{i as t,n}from"./CalendarDate-C4hiS7wv.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{n as i,t as a}from"./DateRangePicker-4_yY9s75.js";var o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{t(),i(),o=r(),s={title:`Inputs/DateRangePicker`,component:a,args:{label:`Stay`,timeZone:`America/Denver`}},c={tags:[`!visual`]},l={start:new n(2025,3,10),end:new n(2025,3,14)},u={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,o.jsx)(a,{label:`Stay`,description:`Check-in to check-out`,isRequired:!0}),(0,o.jsx)(a,{label:`Billing period`,defaultValue:l}),(0,o.jsx)(a,{label:`Report period`,defaultValue:{start:l.start,end:new n(2025,4,30)},maxRangeDays:31,errorMessage:`Choose 31 days or fewer`}),(0,o.jsx)(a,{label:`Locked period`,defaultValue:l,isReadOnly:!0}),(0,o.jsx)(a,{label:`Archived period`,defaultValue:l,isDisabled:!0}),(0,o.jsx)(a,{label:`Small`,size:`sm`,defaultValue:l})]})},d={tags:[`visual-page`],render:()=>(0,o.jsx)(`div`,{className:`max-w-xs`,children:(0,o.jsx)(a,{label:`Stay`,description:`Up to 7 nights`,defaultOpen:!0,defaultValue:l,maxRangeDays:8,minValue:new n(2025,3,3)})})},f={tags:[`visual-page`],render:()=>(0,o.jsx)(`div`,{className:`max-w-xs`,children:(0,o.jsx)(a,{label:`Stay`,defaultOpen:!0,defaultValue:{start:new n(2025,3,28),end:new n(2025,4,3)},visibleMonths:2,timeZone:`America/Denver`})})},p=[`Playground`,`States`,`OpenWithMaxRange`,`OpenWithTwoMonths`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <DateRangePicker label="Stay" description="Check-in to check-out" isRequired />
      <DateRangePicker label="Billing period" defaultValue={stay} />
      <DateRangePicker label="Report period" defaultValue={{
      start: stay.start,
      end: new CalendarDate(2025, 4, 30)
    }} maxRangeDays={31} errorMessage="Choose 31 days or fewer" />
      <DateRangePicker label="Locked period" defaultValue={stay} isReadOnly />
      <DateRangePicker label="Archived period" defaultValue={stay} isDisabled />
      <DateRangePicker label="Small" size="sm" defaultValue={stay} />
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <div className="max-w-xs">
      <DateRangePicker label="Stay" description="Up to 7 nights" defaultOpen defaultValue={stay} maxRangeDays={8} minValue={new CalendarDate(2025, 3, 3)} />
    </div>
}`,...d.parameters?.docs?.source},description:{story:"With `maxRangeDays`, once the first end is picked the calendar makes days further away unavailable. A popover on\ntablet and desktop, a full-screen sheet on phones.",...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => <div className="max-w-xs">
      <DateRangePicker label="Stay" defaultOpen defaultValue={{
      start: new CalendarDate(2025, 3, 28),
      end: new CalendarDate(2025, 4, 3)
    }} visibleMonths={2} timeZone="America/Denver" />
    </div>
}`,...f.parameters?.docs?.source},description:{story:"`visibleMonths={2}` shows two months side by side in the popover, so a range across a month boundary is easy to pick.\nThe phone sheet stacks them.",...f.parameters?.docs?.description}}}})))()}m();export{d as OpenWithMaxRange,f as OpenWithTwoMonths,c as Playground,u as States,p as __namedExportsOrder,s as default};