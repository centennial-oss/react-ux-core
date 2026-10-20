import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{i as t,l as n,t as r,u as i}from"./CalendarDate-C4hiS7wv.js";import{t as a}from"./jsx-runtime-MKhVqBIO.js";import{n as o,t as s}from"./TimeField-CLAiLm72.js";var c,l,u,d,f,p;function m(){return(m=e((()=>{i(),t(),o(),c=a(),l={title:`Inputs/TimeField`,component:s,args:{label:`Opens at`}},u={tags:[`!visual`]},d={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,c.jsx)(s,{label:`Opens at`,description:`Local time at the site`,isRequired:!0}),(0,c.jsx)(s,{label:`Closes at`,defaultValue:new r(17,30)}),(0,c.jsx)(s,{label:`24-hour`,hourCycle:24,defaultValue:new r(17,30)}),(0,c.jsx)(s,{label:`With seconds`,granularity:`second`,defaultValue:new r(9,5,30)}),(0,c.jsx)(s,{label:`Break starts`,defaultValue:new r(3),isInvalid:!0,errorMessage:`Choose a time in business hours`}),(0,c.jsx)(s,{label:`Locked`,defaultValue:new r(9),isReadOnly:!0}),(0,c.jsx)(s,{label:`Disabled`,defaultValue:new r(9),isDisabled:!0}),(0,c.jsx)(s,{label:`Small`,size:`sm`,defaultValue:new r(9)})]})},f={render:()=>{let e=n(`2025-03-14T14:30[America/Denver]`);return(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,c.jsx)(s,{label:`Denver`,timeZone:`America/Denver`,defaultValue:e}),(0,c.jsx)(s,{label:`London`,timeZone:`Europe/London`,defaultValue:e}),(0,c.jsx)(s,{label:`Tokyo (zone hidden)`,timeZone:`Asia/Tokyo`,defaultValue:e,hideTimeZone:!0})]})}},p=[`Playground`,`States`,`TimeZones`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <TimeField label="Opens at" description="Local time at the site" isRequired />
      <TimeField label="Closes at" defaultValue={new Time(17, 30)} />
      <TimeField label="24-hour" hourCycle={24} defaultValue={new Time(17, 30)} />
      <TimeField label="With seconds" granularity="second" defaultValue={new Time(9, 5, 30)} />
      <TimeField label="Break starts" defaultValue={new Time(3)} isInvalid errorMessage="Choose a time in business hours" />
      <TimeField label="Locked" defaultValue={new Time(9)} isReadOnly />
      <TimeField label="Disabled" defaultValue={new Time(9)} isDisabled />
      <TimeField label="Small" size="sm" defaultValue={new Time(9)} />
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => {
    // A fixed instant (never "now"), so the zone abbreviations and the visual snapshots stay stable.
    const instant = parseZonedDateTime('2025-03-14T14:30[America/Denver]');
    return <div className="flex max-w-md flex-col gap-5">
        <TimeField label="Denver" timeZone="America/Denver" defaultValue={instant} />
        <TimeField label="London" timeZone="Europe/London" defaultValue={instant} />
        <TimeField label="Tokyo (zone hidden)" timeZone="Asia/Tokyo" defaultValue={instant} hideTimeZone />
      </div>;
  }
}`,...f.parameters?.docs?.source},description:{story:"A zoned value is shown in `timeZone` (or the provider's), with the zone's abbreviation unless hidden.",...f.parameters?.docs?.description}}}})))()}m();export{u as Playground,d as States,f as TimeZones,p as __namedExportsOrder,l as default};