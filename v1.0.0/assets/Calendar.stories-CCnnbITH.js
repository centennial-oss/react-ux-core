import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,r,t as i}from"./Calendar-BHyh5IkK.js";import{R as a,i as o,n as s,x as c}from"./CalendarDate-C4hiS7wv.js";import{t as l}from"./jsx-runtime-MKhVqBIO.js";function u(e){let t=w[e.day];if(e.month===3&&t!==void 0)return{content:`$${String(t)}`,description:`From $${String(t)}`,tone:t<90?`success`:void 0}}var d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A;function j(){return(j=e((()=>{o(),a(),d=t(),r(),f=l(),p={title:`Inputs/Calendar`,component:i,args:{"aria-label":`Delivery date`,timeZone:`America/Denver`}},m={tags:[`!visual`]},h=new s(2025,3,14),g=e=>c(e,`en-US`)%6==0,_={render:()=>(0,f.jsx)(i,{"aria-label":`Delivery date`,defaultValue:h,minValue:new s(2025,3,5),isDateUnavailable:g,timeZone:`America/Denver`})},v={render:()=>(0,f.jsx)(i,{"aria-label":`Birth date`,defaultValue:new s(1987,7,24),yearRange:{start:1925,end:2025},timeZone:`America/Denver`})},y={render:()=>(0,f.jsx)(i,{"aria-label":`Delivery date`,defaultValue:h,headerControls:`arrows`,timeZone:`America/Denver`})},b={render:()=>(0,f.jsx)(i,{"aria-label":`Delivery date`,defaultValue:h,visibleMonths:2,selectionAlignment:`start`,timeZone:`America/Denver`})},x={render:function(){let[e,t]=(0,d.useState)([new s(2025,3,7),new s(2025,3,14),new s(2025,3,21)]);return(0,f.jsxs)(`div`,{className:`flex flex-col items-center gap-3`,children:[(0,f.jsx)(i,{"aria-label":`Days off`,selectionMode:`multiple`,value:e,onChange:t,timeZone:`America/Denver`}),(0,f.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[e.length,` `,e.length===1?`day`:`days`,` off`]})]})}},S={render:()=>(0,f.jsx)(i,{"aria-label":`Appointment date`,defaultValue:h,view:`week`,timeZone:`America/Denver`})},C={a11y:{config:{rules:[{id:`label-content-name-mismatch`,enabled:!1}]}}},w={3:129,4:99,10:89,14:149,17:79,21:189,25:99},T={parameters:C,render:()=>(0,f.jsx)(i,{"aria-label":`Departure date`,defaultValue:h,size:`lg`,getDayInfo:u,timeZone:`America/Denver`})},E={3:1,6:2,12:3,14:1,19:2,27:1},D={render:()=>(0,f.jsx)(i,{"aria-label":`Agenda date`,defaultValue:h,getDayInfo:e=>{let t=e.month===3?E[e.day]:void 0;if(t!==void 0)return{content:(0,f.jsx)(`span`,{className:`flex gap-0.5`,children:Array.from({length:t},(e,t)=>(0,f.jsx)(`span`,{className:`size-1 rounded-full bg-current`},t))}),description:t===1?`1 event`:`${String(t)} events`}},timeZone:`America/Denver`})},O={render:()=>(0,f.jsx)(n,{"aria-label":`Stay`,defaultValue:{start:h,end:new s(2025,3,19)},visibleMonths:2,selectionAlignment:`start`,maxRangeDays:14,timeZone:`America/Denver`})},k={parameters:C,render:()=>(0,f.jsx)(n,{"aria-label":`Stay`,defaultValue:{start:new s(2025,3,10),end:h},size:`lg`,getDayInfo:u,timeZone:`America/Denver`})},A=[`Playground`,`Single`,`MonthAndYearCyclers`,`Arrows`,`MultipleMonths`,`MultipleSelection`,`WeekView`,`Prices`,`Dots`,`Range`,`RangeWithPrices`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...m.parameters?.docs?.source},description:{story:`Opens on today.`,...m.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <Calendar aria-label="Delivery date" defaultValue={march14} minValue={new CalendarDate(2025, 3, 5)} isDateUnavailable={isWeekend} timeZone="America/Denver" />
}`,..._.parameters?.docs?.source},description:{story:"Days before `minValue` are disabled, and weekends are unavailable (struck through).",..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <Calendar aria-label="Birth date" defaultValue={new CalendarDate(1987, 7, 24)} yearRange={{
    start: 1925,
    end: 2025
  }} timeZone="America/Denver" />
}`,...v.parameters?.docs?.source},description:{story:`The header's month and year Cyclers (the default): step with their arrows (the month rolls into the next year), or
press the month or year to jump straight to one. Years page by decade.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <Calendar aria-label="Delivery date" defaultValue={march14} headerControls="arrows" timeZone="America/Denver" />
}`,...y.parameters?.docs?.source},description:{story:'`headerControls="arrows"`: just previous and next buttons around the month, for calendars that stay near today.',...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <Calendar aria-label="Delivery date" defaultValue={march14} visibleMonths={2} selectionAlignment="start" timeZone="America/Denver" />
}`,...b.parameters?.docs?.source},description:{story:`Months sit side by side and wrap onto more rows when there isn't room (one per row on phones).`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: function MultipleSelectionStory() {
    const [days, setDays] = useState<CalendarDate[]>([new CalendarDate(2025, 3, 7), new CalendarDate(2025, 3, 14), new CalendarDate(2025, 3, 21)]);
    return <div className="flex flex-col items-center gap-3">
        <Calendar aria-label="Days off" selectionMode="multiple" value={days} onChange={setDays} timeZone="America/Denver" />
        <p className="text-sm text-fg-muted">
          {days.length} {days.length === 1 ? 'day' : 'days'} off
        </p>
      </div>;
  }
}`,...x.parameters?.docs?.source},description:{story:`Each press adds or removes a day.`,...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <Calendar aria-label="Appointment date" defaultValue={march14} view="week" timeZone="America/Denver" />
}`,...S.parameters?.docs?.source},description:{story:`One week at a time; the arrows move by a week.`,...S.parameters?.docs?.description}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  parameters: dayTextParameters,
  render: () => <Calendar aria-label="Departure date" defaultValue={march14} size="lg" getDayInfo={fareInfo} timeZone="America/Denver" />
}`,...T.parameters?.docs?.source},description:{story:'`size="lg"` leaves a line under each number for a price or a short badge. The cheapest fares are tinted, and each\nprice is read after its date by screen readers.',...T.parameters?.docs?.description}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <Calendar aria-label="Agenda date" defaultValue={march14} getDayInfo={date => {
    const count = date.month === 3 ? events[date.day] : undefined;
    if (count === undefined) {
      return undefined;
    }
    return {
      content: <span className="flex gap-0.5">
              {Array.from({
          length: count
        }, (_, index) => <span key={index} className="size-1 rounded-full bg-current" />)}
            </span>,
      description: count === 1 ? '1 event' : \`\${String(count)} events\`
    };
  }} timeZone="America/Denver" />
}`,...D.parameters?.docs?.source},description:{story:"Dots along the bottom of `md` days. `bg-current` keeps them visible on the selected day.",...D.parameters?.docs?.description}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <RangeCalendar aria-label="Stay" defaultValue={{
    start: march14,
    end: new CalendarDate(2025, 3, 19)
  }} visibleMonths={2} selectionAlignment="start" maxRangeDays={14} timeZone="America/Denver" />
}`,...O.parameters?.docs?.source},description:{story:"The first press picks one end and the second the other. With `maxRangeDays`, days too far from the first end\nbecome unavailable once it's picked.",...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  parameters: dayTextParameters,
  render: () => <RangeCalendar aria-label="Stay" defaultValue={{
    start: new CalendarDate(2025, 3, 10),
    end: march14
  }} size="lg" getDayInfo={fareInfo} timeZone="America/Denver" />
}`,...k.parameters?.docs?.source},description:{story:`Ranges can carry day content too.`,...k.parameters?.docs?.description}}}})))()}j();export{y as Arrows,D as Dots,v as MonthAndYearCyclers,b as MultipleMonths,x as MultipleSelection,m as Playground,T as Prices,O as Range,k as RangeWithPrices,_ as Single,S as WeekView,A as __namedExportsOrder,p as default};