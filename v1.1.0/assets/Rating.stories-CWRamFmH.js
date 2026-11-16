import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./createLucideIcon-BXqG86fR.js";import{n as i,t as a}from"./heart-DOjrKO5O.js";import{n as o,t as s}from"./zap-CC66tEy-.js";import{t as c}from"./jsx-runtime-MKhVqBIO.js";import{n as l,t as u}from"./Rating-BF0v4z2l.js";import{r as d,t as f}from"./RatingDisplay-DVKbW36D.js";var p,m;function h(){return(h=e((()=>{n(),p={name:`thumbs-up`,size:24,node:[[`path`,{d:`M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z`,key:`emmmcr`}],[`path`,{d:`M7 10v12`,key:`1qc93n`}]]},p.node,m=r(p)})))()}var g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j;function M(){return(M=e((()=>{i(),h(),o(),g=t(),l(),d(),_=c(),v={title:`Inputs/Rating`,component:u,args:{label:`Rating`,defaultValue:3}},y={tags:[`!visual`]},b={args:{label:`Overall`,step:.5,defaultValue:3.5,description:`Half stars allowed`}},x={render:()=>(0,_.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,_.jsx)(u,{label:`Small`,size:`sm`,defaultValue:2}),(0,_.jsx)(u,{label:`Medium`,size:`md`,defaultValue:3}),(0,_.jsx)(u,{label:`Large`,size:`lg`,defaultValue:4})]})},S={render:()=>(0,_.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,_.jsx)(u,{label:`Warning`,tone:`warning`,defaultValue:3}),(0,_.jsx)(u,{label:`Accent`,tone:`accent`,defaultValue:3}),(0,_.jsx)(u,{label:`Success`,tone:`success`,defaultValue:3}),(0,_.jsx)(u,{label:`Danger`,tone:`danger`,defaultValue:3}),(0,_.jsx)(u,{label:`Neutral`,tone:`neutral`,defaultValue:3})]})},C={render:()=>(0,_.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,_.jsx)(u,{label:`Love it?`,icon:a,tone:`danger`,defaultValue:4}),(0,_.jsx)(u,{label:`Helpful`,icon:m,tone:`accent`,maxValue:3,defaultValue:2}),(0,_.jsx)(u,{label:`Energy`,icon:s,tone:`warning`,maxValue:10,size:`sm`,defaultValue:7})]})},w={tags:[`!visual`],args:{label:`Your rating`,isClearable:!0,description:`Choose the same star again to clear it`}},T={args:{label:`Average from reviewers`,isReadOnly:!0,value:3.7,description:`1,284 reviews`}},E={render:()=>(0,_.jsxs)(`div`,{className:`flex flex-col gap-3 text-sm text-fg`,children:[(0,_.jsx)(f,{value:3.7}),(0,_.jsx)(f,{value:4.25,size:`lg`}),(0,_.jsx)(f,{value:1.5,size:`sm`,tone:`accent`}),(0,_.jsx)(f,{value:null}),(0,_.jsxs)(`p`,{children:[`Rated `,(0,_.jsx)(f,{value:4.6,size:`sm`}),` by 1,284 people`]})]})},D=[{name:`Trail runner`,rating:4.6,reviews:1284},{name:`Day pack`,rating:3.9,reviews:312},{name:`Rain shell`,rating:4.2,reviews:877},{name:`Camp stove`,rating:2.8,reviews:96}],O={render:()=>(0,_.jsxs)(`table`,{className:`w-full max-w-md text-start text-sm text-fg`,children:[(0,_.jsx)(`thead`,{children:(0,_.jsxs)(`tr`,{className:`border-b border-border text-fg-muted`,children:[(0,_.jsx)(`th`,{scope:`col`,className:`py-2 text-start font-medium`,children:`Product`}),(0,_.jsx)(`th`,{scope:`col`,className:`py-2 text-start font-medium`,children:`Rating`}),(0,_.jsx)(`th`,{scope:`col`,className:`py-2 text-end font-medium`,children:`Reviews`})]})}),(0,_.jsx)(`tbody`,{children:D.map(e=>(0,_.jsxs)(`tr`,{className:`border-b border-border`,children:[(0,_.jsx)(`td`,{className:`py-2`,children:e.name}),(0,_.jsx)(`td`,{className:`py-2`,children:(0,_.jsx)(f,{value:e.rating,size:`sm`})}),(0,_.jsx)(`td`,{className:`py-2 text-end tabular-nums`,children:e.reviews})]},e.name))})]})},k={render:()=>(0,_.jsxs)(`div`,{className:`flex flex-col gap-5`,children:[(0,_.jsx)(u,{label:`Required`,isRequired:!0,description:`Tell us how it went`}),(0,_.jsx)(u,{label:`Invalid`,isInvalid:!0,errorMessage:`Choose at least 2 stars to continue`,defaultValue:1}),(0,_.jsx)(u,{label:`Disabled`,isDisabled:!0,defaultValue:3}),(0,_.jsx)(u,{label:`Side label`,labelPosition:`side`,defaultValue:4,infoTip:`1 is poor, 5 is great`})]})},A={tags:[`!visual`],render:function(){let[e,t]=(0,g.useState)(2.5);return(0,_.jsxs)(`div`,{className:`flex flex-col gap-2 text-sm text-fg`,children:[(0,_.jsx)(u,{label:`Service`,step:.5,isClearable:!0,value:e,onChange:t}),(0,_.jsxs)(`span`,{className:`text-fg-muted`,children:[`Value: `,e??`none`]})]})}},j=[`Playground`,`HalfSteps`,`Sizes`,`Tones`,`CustomIcons`,`Clearable`,`ReadOnly`,`Display`,`InTable`,`States`,`Controlled`],y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Overall',
    step: 0.5,
    defaultValue: 3.5,
    description: 'Half stars allowed'
  }
}`,...b.parameters?.docs?.source},description:{story:"`step={0.5}` takes half icons: press the left half of an icon, or step by halves with the arrow keys.",...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <Rating label="Small" size="sm" defaultValue={2} />
      <Rating label="Medium" size="md" defaultValue={3} />
      <Rating label="Large" size="lg" defaultValue={4} />
    </div>
}`,...x.parameters?.docs?.source},description:{story:`Small, medium and large. Each icon is at least 24 px wide to point at, more on touch screens.`,...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <Rating label="Warning" tone="warning" defaultValue={3} />
      <Rating label="Accent" tone="accent" defaultValue={3} />
      <Rating label="Success" tone="success" defaultValue={3} />
      <Rating label="Danger" tone="danger" defaultValue={3} />
      <Rating label="Neutral" tone="neutral" defaultValue={3} />
    </div>
}`,...S.parameters?.docs?.source},description:{story:"`tone` colours the filled icons; `warning` (gold) is the default.",...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <Rating label="Love it?" icon={Heart} tone="danger" defaultValue={4} />
      <Rating label="Helpful" icon={ThumbsUp} tone="accent" maxValue={3} defaultValue={2} />
      <Rating label="Energy" icon={Zap} tone="warning" maxValue={10} size="sm" defaultValue={7} />
    </div>
}`,...C.parameters?.docs?.source},description:{story:"Any icon component, drawn outlined when empty and filled in the tone; `maxValue` sets how many.",...C.parameters?.docs?.description}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    label: 'Your rating',
    isClearable: true,
    description: 'Choose the same star again to clear it'
  }
}`,...w.parameters?.docs?.source},description:{story:"`isClearable`: choosing the current rating again, or Delete or Backspace, clears it.",...w.parameters?.docs?.description}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Average from reviewers',
    isReadOnly: true,
    value: 3.7,
    description: '1,284 reviews'
  }
}`,...T.parameters?.docs?.source},description:{story:"`isReadOnly` keeps the slider in the tab order, announced as read-only, with the exact value filled. It still\nsubmits with a form.",...T.parameters?.docs?.description}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3 text-sm text-fg">
      <RatingDisplay value={3.7} />
      <RatingDisplay value={4.25} size="lg" />
      <RatingDisplay value={1.5} size="sm" tone="accent" />
      <RatingDisplay value={null} />
      <p>
        Rated <RatingDisplay value={4.6} size="sm" /> by 1,284 people
      </p>
    </div>
}`,...E.parameters?.docs?.source},description:{story:`RatingDisplay: a cheap, unfocusable image named "3.7 out of 5", for tables, lists and summaries.`,...E.parameters?.docs?.description}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <table className="w-full max-w-md text-start text-sm text-fg">
      <thead>
        <tr className="border-b border-border text-fg-muted">
          <th scope="col" className="py-2 text-start font-medium">
            Product
          </th>
          <th scope="col" className="py-2 text-start font-medium">
            Rating
          </th>
          <th scope="col" className="py-2 text-end font-medium">
            Reviews
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map(product => <tr key={product.name} className="border-b border-border">
            <td className="py-2">{product.name}</td>
            <td className="py-2">
              <RatingDisplay value={product.rating} size="sm" />
            </td>
            <td className="py-2 text-end tabular-nums">{product.reviews}</td>
          </tr>)}
      </tbody>
    </table>
}`,...O.parameters?.docs?.source},description:{story:`RatingDisplay is one inline element, cheap to render in every row of a table or list.`,...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-5">
      <Rating label="Required" isRequired description="Tell us how it went" />
      <Rating label="Invalid" isInvalid errorMessage="Choose at least 2 stars to continue" defaultValue={1} />
      <Rating label="Disabled" isDisabled defaultValue={3} />
      <Rating label="Side label" labelPosition="side" defaultValue={4} infoTip="1 is poor, 5 is great" />
    </div>
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function Controlled() {
    const [value, setValue] = useState<number | null>(2.5);
    return <div className="flex flex-col gap-2 text-sm text-fg">
        <Rating label="Service" step={0.5} isClearable value={value} onChange={setValue} />
        <span className="text-fg-muted">Value: {value ?? 'none'}</span>
      </div>;
  }
}`,...A.parameters?.docs?.source},description:{story:`Controlled: the value lives in the app.`,...A.parameters?.docs?.description}}}})))()}M();export{w as Clearable,A as Controlled,C as CustomIcons,E as Display,b as HalfSteps,O as InTable,y as Playground,T as ReadOnly,x as Sizes,k as States,S as Tones,j as __namedExportsOrder,v as default};