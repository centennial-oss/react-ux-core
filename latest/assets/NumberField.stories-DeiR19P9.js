import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./NumberField-ufIbOK3w.js";import{n as a,r as o}from"./iframe-URYqQxDH.js";var s,c,l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{s=t(),o(),r(),c=n(),l={title:`Inputs/NumberField`,component:i,args:{label:`Panels`,defaultValue:12}},u={tags:[`!visual`]},d={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Panels`,description:`On the main roof`,isRequired:!0}),(0,c.jsx)(i,{label:`Battery capacity`,isInvalid:!0,errorMessage:`Enter a capacity between 1 and 100 kWh`,defaultValue:0}),(0,c.jsx)(i,{label:`Read-only`,isReadOnly:!0,defaultValue:42}),(0,c.jsx)(i,{label:`Disabled`,isDisabled:!0,defaultValue:7,hasStepper:!0}),(0,c.jsx)(i,{label:`Small`,size:`sm`,defaultValue:3})]})},f={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-xs flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Quantity`,hasStepper:!0,defaultValue:1,minValue:1,maxValue:10}),(0,c.jsx)(i,{label:`Tilt (degrees)`,hasStepper:!0,defaultValue:30,step:5,minValue:0,maxValue:90})]})},p={render:()=>(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Price (USD)`,formatOptions:{style:`currency`,currency:`USD`},defaultValue:1499.5}),(0,c.jsx)(i,{label:`Price (JPY)`,description:`Yen has no minor unit, so no decimals`,formatOptions:{style:`currency`,currency:`JPY`},defaultValue:12e4}),(0,c.jsx)(i,{label:`Efficiency`,formatOptions:{style:`percent`,maximumFractionDigits:1},defaultValue:.215}),(0,c.jsx)(i,{label:`Setpoint`,formatOptions:{style:`unit`,unit:`celsius`},defaultValue:21.5})]})},m={tags:[`!visual`],render:()=>(0,c.jsx)(a,{locale:`de-DE`,children:(0,c.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,c.jsx)(i,{label:`Leistung`,defaultValue:1234.5}),(0,c.jsx)(i,{label:`Preis`,formatOptions:{style:`currency`,currency:`EUR`},defaultValue:1499.5})]})})},h={render:()=>(0,c.jsx)(`div`,{className:`max-w-xl`,children:(0,c.jsx)(i,{label:`Panels`,labelPosition:`side`,hasStepper:!0,defaultValue:12})})},g={tags:[`!visual`],render:function(){let[e,t]=(0,s.useState)(250);return(0,c.jsxs)(`div`,{className:`flex max-w-xs flex-col gap-2`,children:[(0,c.jsx)(i,{label:`Monthly budget`,formatOptions:{style:`currency`,currency:`USD`},value:e,onChange:t,minValue:0,hasStepper:!0,step:10}),(0,c.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Value: `,e??`empty`]})]})}},_=[`Playground`,`States`,`Steppers`,`Formatting`,`Locale`,`SideLabel`,`Controlled`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <NumberField label="Panels" description="On the main roof" isRequired />
      <NumberField label="Battery capacity" isInvalid errorMessage="Enter a capacity between 1 and 100 kWh" defaultValue={0} />
      <NumberField label="Read-only" isReadOnly defaultValue={42} />
      <NumberField label="Disabled" isDisabled defaultValue={7} hasStepper />
      <NumberField label="Small" size="sm" defaultValue={3} />
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-xs flex-col gap-5">
      <NumberField label="Quantity" hasStepper defaultValue={1} minValue={1} maxValue={10} />
      <NumberField label="Tilt (degrees)" hasStepper defaultValue={30} step={5} minValue={0} maxValue={90} />
    </div>
}`,...f.parameters?.docs?.source},description:{story:"Decrement and increment buttons; they disable at `minValue` and `maxValue`.",...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <NumberField label="Price (USD)" formatOptions={{
      style: 'currency',
      currency: 'USD'
    }} defaultValue={1499.5} />
      <NumberField label="Price (JPY)" description="Yen has no minor unit, so no decimals" formatOptions={{
      style: 'currency',
      currency: 'JPY'
    }} defaultValue={120000} />
      <NumberField label="Efficiency" formatOptions={{
      style: 'percent',
      maximumFractionDigits: 1
    }} defaultValue={0.215} />
      <NumberField label="Setpoint" formatOptions={{
      style: 'unit',
      unit: 'celsius'
    }} defaultValue={21.5} />
    </div>
}`,...p.parameters?.docs?.source},description:{story:"`formatOptions` takes `Intl.NumberFormat` options: currency, percent and units.",...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <UIProvider locale="de-DE">
      <div className="flex max-w-md flex-col gap-5">
        <NumberField label="Leistung" defaultValue={1234.5} />
        <NumberField label="Preis" formatOptions={{
        style: 'currency',
        currency: 'EUR'
      }} defaultValue={1499.5} />
      </div>
    </UIProvider>
}`,...m.parameters?.docs?.source},description:{story:'Parsing and formatting follow `UIProvider`\'s `locale`: German uses "." for thousands and "," for decimals.',...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <NumberField label="Panels" labelPosition="side" hasStepper defaultValue={12} />
    </div>
}`,...h.parameters?.docs?.source},description:{story:`Side labels sit beside the input in wide containers and move on top in narrow ones.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<number | null>(250);
    return <div className="flex max-w-xs flex-col gap-2">
        <NumberField label="Monthly budget" formatOptions={{
        style: 'currency',
        currency: 'USD'
      }} value={value} onChange={setValue} minValue={0} hasStepper step={10} />
        <p className="text-sm text-fg-muted">Value: {value ?? 'empty'}</p>
      </div>;
  }
}`,...g.parameters?.docs?.source},description:{story:"Controlled with `value` / `onChange`; an empty field is `null`.",...g.parameters?.docs?.description}}}})))()}v();export{g as Controlled,p as Formatting,m as Locale,u as Playground,h as SideLabel,d as States,f as Steppers,_ as __namedExportsOrder,l as default};