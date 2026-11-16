import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{r as n,t as r}from"./I18nProvider-CHhkoz8A.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{a,s as o}from"./context-BPba8fk9.js";import{a as s,c,d as l,f as u,g as d,h as f,i as p,l as m,m as h,n as g,o as _,p as v,r as y,t as b,u as x,v as S}from"./DurationField-DgSKdGEA.js";import{n as C,t as w}from"./number-CajkKRFS.js";import{n as T,t as E}from"./ByteSizeField-BfQpS7Bo.js";function D({defaultUnit:e=`Mbps`,...t}){let{locale:n}=r(),i=o(c),a=(0,O.useMemo)(()=>d.map(e=>({id:e.id,factor:e.factor,label:e.id,name:e.intlUnit?f(n,e.intlUnit,`long`):void 0})),[n]);return(0,k.jsx)(y,{...t,locale:n,units:a,initialUnit:e,parse:(e,t)=>_(e,{locale:n,defaultUnit:t}),present:e=>{let t=x(e,d);return{text:w(e/t.factor,n,3),unit:t.id}},formatShort:e=>l(e,{locale:n,maximumFractionDigits:3}),formatLong:e=>l(e,{locale:n,unitDisplay:`long`,maximumFractionDigits:3}),invalidMessage:()=>i.bitrateFieldInvalid})}var O,k;function A(){return(A=e((()=>{O=t(),n(),a(),h(),m(),C(),s(),p(),S(),k=i(),D.__docgenInfo={description:`A bitrate in bits per second, typed as friendly units: a number with a unit Select, or text such as "4.5 Mbps",
"4500k" or "4.5M". Once committed it shows in the largest unit that keeps it exact (4,500,000 bps is "4.5" Mbps), and
announces it in words ("4.5 megabits per second").`,methods:[],displayName:`BitrateField`,props:{label:{required:!1,tsType:{name:`ReactNode`},description:"The visible label. Without one, pass `aria-label`."},description:{required:!1,tsType:{name:`ReactNode`},description:`Help text under the input.`},errorMessage:{required:!1,tsType:{name:`union`,raw:`ReactNode | ((validation: ValidationResult) => ReactNode)`,elements:[{name:`ReactNode`},{name:`unknown`}]},description:"Shown when the field is invalid (`isInvalid`, or failed validation). A function receives the validation result."},labelPosition:{required:!1,tsType:{name:`union`,raw:`'top' | 'side'`,elements:[{name:`literal`,value:`'top'`},{name:`literal`,value:`'side'`}]},description:"`side` puts the label beside the input in containers wider than 28rem. Defaults to `top`."},infoTip:{required:!1,tsType:{name:`ReactNode`},description:`Extra help behind an (i) button next to the label.`},value:{required:!1,tsType:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},description:"The value in the base unit, controlled. `null` is an empty field."},defaultValue:{required:!1,tsType:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},description:`The initial value in the base unit, uncontrolled. Defaults to empty.`},onChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(value: number | null) => void`,signature:{arguments:[{type:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},name:`value`}],return:{name:`void`}}},description:"Called with the committed value in the base unit when the user presses Enter, leaves the field or picks another\nunit; `null` when they empty it. Text that can't be read shows an error and isn't reported."},minValue:{required:!1,tsType:{name:`number`},description:`The smallest allowed value, in the base unit. Smaller values show an error in friendly units.`},maxValue:{required:!1,tsType:{name:`number`},description:`The largest allowed value, in the base unit.`},placeholder:{required:!1,tsType:{name:`string`},description:``},name:{required:!1,tsType:{name:`string`},description:`Submits the value in the base unit with a form, through a hidden input.`},size:{required:!1,tsType:{name:`union`,raw:`'sm' | 'md'`,elements:[{name:`literal`,value:`'sm'`},{name:`literal`,value:`'md'`}]},description:"Defaults to `md`. On touch screens the height grows to the minimum touch target."},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:`The field's root element.`},inputRef:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLInputElement`}],raw:`Ref<HTMLInputElement>`},description:`The text input.`},defaultUnit:{required:!1,tsType:{name:`union`,raw:`'bps' | 'kbps' | 'Mbps' | 'Gbps' | 'Tbps'`,elements:[{name:`literal`,value:`'bps'`},{name:`literal`,value:`'kbps'`},{name:`literal`,value:`'Mbps'`},{name:`literal`,value:`'Gbps'`},{name:`literal`,value:`'Tbps'`}]},description:"The unit selected while the field is empty. Defaults to `Mbps`.",defaultValue:{value:`'Mbps'`,computed:!1}}},composes:[`Omit`]}})))()}var j,M,N,P,F,I,L,R,z,B,V;function H(){return(H=e((()=>{j=t(),A(),T(),g(),h(),M=i(),N={title:`Inputs/UnitField`,component:b,args:{label:`TTL`,defaultValue:54e5}},P={tags:[`!visual`]},F={render:()=>(0,M.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,M.jsx)(b,{label:`Cache TTL`,defaultValue:54e5,description:`Shown as 1h 30m`}),(0,M.jsx)(b,{label:`Retention (single unit)`,defaultValue:54e5,display:`single`,description:`Shown as 90 minutes`}),(0,M.jsx)(b,{label:`Request timeout`,units:[`ms`,`s`,`m`],defaultValue:1500,allowsCompound:!1}),(0,M.jsx)(b,{label:`Empty`,units:[`m`,`h`,`d`,`w`],placeholder:`e.g. 2h`})]})},I={render:()=>(0,M.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,M.jsx)(E,{label:`Buffer size`,defaultValue:536870912}),(0,M.jsx)(E,{label:`Storage quota (SI)`,system:`si`,defaultValue:15e8})]})},L={render:()=>(0,M.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,M.jsx)(D,{label:`Video bitrate`,defaultValue:45e5}),(0,M.jsx)(D,{label:`Audio bitrate`,defaultValue:128e3,size:`sm`})]})},R={render:()=>(0,M.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-6`,children:[(0,M.jsx)(b,{label:`Session length`,maxValue:864e5,defaultValue:9e7,description:`Up to a day`}),(0,M.jsx)(E,{label:`Upload limit`,minValue:1048576,defaultValue:1024}),(0,M.jsx)(D,{label:`Disabled`,defaultValue:2e6,isDisabled:!0}),(0,M.jsx)(b,{label:`Read-only`,defaultValue:6e4,isReadOnly:!0}),(0,M.jsx)(b,{label:`Side label`,labelPosition:`side`,defaultValue:36e5})]})},z={render:()=>(0,M.jsxs)(`dl`,{className:`grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-fg`,children:[(0,M.jsx)(`dt`,{className:`text-fg-muted`,children:`formatDuration`}),(0,M.jsx)(`dd`,{children:v(54e5,{locale:`en-US`})}),(0,M.jsx)(`dt`,{className:`text-fg-muted`,children:`long`}),(0,M.jsx)(`dd`,{children:v(54e5,{locale:`en-US`,unitDisplay:`long`})}),(0,M.jsx)(`dt`,{className:`text-fg-muted`,children:`formatBytes`}),(0,M.jsx)(`dd`,{children:u(1610612736,{locale:`en-US`})}),(0,M.jsx)(`dt`,{className:`text-fg-muted`,children:`formatBitrate`}),(0,M.jsx)(`dd`,{children:l(45e5,{locale:`en-US`})})]})},B={tags:[`!visual`],render:function(){let[e,t]=(0,j.useState)(54e5);return(0,M.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-2`,children:[(0,M.jsx)(b,{label:`TTL`,value:e,onChange:t}),(0,M.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Value: `,e===null?`empty`:`${String(e)} ms`]})]})}},V=[`Playground`,`Duration`,`ByteSize`,`Bitrate`,`States`,`Formatters`,`Controlled`],P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <DurationField label="Cache TTL" defaultValue={5_400_000} description="Shown as 1h 30m" />
      <DurationField label="Retention (single unit)" defaultValue={5_400_000} display="single" description="Shown as 90 minutes" />
      <DurationField label="Request timeout" units={['ms', 's', 'm']} defaultValue={1500} allowsCompound={false} />
      <DurationField label="Empty" units={['m', 'h', 'd', 'w']} placeholder="e.g. 2h" />
    </div>
}`,...F.parameters?.docs?.source},description:{story:`Durations in milliseconds. Type "90s", "2h" or "1h30m"; the unit Select follows.`,...F.parameters?.docs?.description}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <ByteSizeField label="Buffer size" defaultValue={536_870_912} />
      <ByteSizeField label="Storage quota (SI)" system="si" defaultValue={1_500_000_000} />
    </div>
}`,...I.parameters?.docs?.source},description:{story:"Byte sizes in bytes, in binary (`iec`, the default) or decimal (`si`) units.",...I.parameters?.docs?.description}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <BitrateField label="Video bitrate" defaultValue={4_500_000} />
      <BitrateField label="Audio bitrate" defaultValue={128_000} size="sm" />
    </div>
}`,...L.parameters?.docs?.source},description:{story:`Bitrates in bits per second: 4,500,000 bps shows as 4.5 Mbps.`,...L.parameters?.docs?.description}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-6">
      <DurationField label="Session length" maxValue={86_400_000} defaultValue={90_000_000} description="Up to a day" />
      <ByteSizeField label="Upload limit" minValue={1_048_576} defaultValue={1024} />
      <BitrateField label="Disabled" defaultValue={2_000_000} isDisabled />
      <DurationField label="Read-only" defaultValue={60_000} isReadOnly />
      <DurationField label="Side label" labelPosition="side" defaultValue={3_600_000} />
    </div>
}`,...R.parameters?.docs?.source},description:{story:`Min and max are checked in the base unit, with messages in friendly units.`,...R.parameters?.docs?.description}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  render: () => <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-fg">
      <dt className="text-fg-muted">formatDuration</dt>
      <dd>{formatDuration(5_400_000, {
        locale: 'en-US'
      })}</dd>
      <dt className="text-fg-muted">long</dt>
      <dd>{formatDuration(5_400_000, {
        locale: 'en-US',
        unitDisplay: 'long'
      })}</dd>
      <dt className="text-fg-muted">formatBytes</dt>
      <dd>{formatBytes(1_610_612_736, {
        locale: 'en-US'
      })}</dd>
      <dt className="text-fg-muted">formatBitrate</dt>
      <dd>{formatBitrate(4_500_000, {
        locale: 'en-US'
      })}</dd>
    </dl>
}`,...z.parameters?.docs?.source},description:{story:`The formatters, for showing values elsewhere (tables, summaries).`,...z.parameters?.docs?.description}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<number | null>(5_400_000);
    return <div className="flex max-w-sm flex-col gap-2">
        <DurationField label="TTL" value={value} onChange={setValue} />
        <p className="text-sm text-fg-muted">
          Value: {value === null ? 'empty' : \`\${String(value)} ms\`}
        </p>
      </div>;
  }
}`,...B.parameters?.docs?.source},description:{story:`Controlled: the value is always in the base unit.`,...B.parameters?.docs?.description}}}})))()}H();export{L as Bitrate,I as ByteSize,B as Controlled,F as Duration,z as Formatters,P as Playground,R as States,V as __namedExportsOrder,N as default};