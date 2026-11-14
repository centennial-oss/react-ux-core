import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./arrow-right-Cnowp2rz.js";import{n as r,t as i}from"./download-C_8cVRQ1.js";import{n as a,t as o}from"./save-QW3Nw_bw.js";import{n as s,t as c}from"./trash-FTNL_zRp.js";import{t as l}from"./jsx-runtime-MKhVqBIO.js";import{n as u,t as d}from"./Button-e4ZjaxXL.js";var f,p,m,h,g,_,v,y,b,x,S,C,w;function T(){return(T=e((()=>{t(),r(),a(),s(),u(),f=l(),p=[`solid`,`soft`,`outline`,`ghost`,`link`],m=[`neutral`,`accent`,`success`,`warning`,`danger`],h={title:`Actions/Button`,component:d,args:{children:`Save changes`,variant:`solid`,tone:`accent`,size:`md`},argTypes:{variant:{control:`inline-radio`,options:p},tone:{control:`inline-radio`,options:m},size:{control:`inline-radio`,options:[`sm`,`md`,`lg`]},iconPosition:{control:`inline-radio`,options:[`start`,`end`]},icon:{control:!1},onPress:{action:`pressed`}}},g={tags:[`!visual`]},_={render:e=>(0,f.jsx)(`div`,{className:`grid gap-3`,children:p.map(t=>(0,f.jsx)(`div`,{className:`flex flex-wrap items-center gap-3`,children:m.map(n=>(0,f.jsx)(d,{...e,variant:t,tone:n,children:`${t} ${n}`},n))},t))})},v={render:e=>(0,f.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,f.jsx)(d,{...e,size:`sm`,children:`Small`}),(0,f.jsx)(d,{...e,size:`md`,children:`Medium`}),(0,f.jsx)(d,{...e,size:`lg`,children:`Large`})]})},y={render:e=>(0,f.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,f.jsx)(d,{...e,icon:o,children:`Save`}),(0,f.jsx)(d,{...e,variant:`outline`,icon:i,children:`Export`}),(0,f.jsx)(d,{...e,variant:`ghost`,icon:n,iconPosition:`end`,children:`Continue`}),(0,f.jsx)(d,{...e,variant:`soft`,tone:`danger`,icon:c,children:`Delete`})]})},b={args:{isPending:!0,icon:o}},x={render:e=>(0,f.jsx)(`div`,{className:`flex flex-wrap items-center gap-3`,children:p.map(t=>(0,f.jsx)(d,{...e,variant:t,isDisabled:!0,children:t},t))})},S={render:({tone:e,size:t})=>(0,f.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,f.jsx)(d,{tone:e,size:t,href:`#settings`,children:`Open settings`}),(0,f.jsx)(d,{tone:e,size:t,variant:`link`,href:`#docs`,children:`Read the docs`})]})},C={globals:{viewport:{value:`phone360`}},render:e=>(0,f.jsxs)(`div`,{className:`flex flex-wrap gap-3`,children:[(0,f.jsx)(d,{...e,icon:o,children:`Save changes`}),(0,f.jsx)(d,{...e,variant:`outline`,tone:`neutral`,children:`Cancel`}),(0,f.jsx)(d,{...e,variant:`soft`,tone:`danger`,icon:c,children:`Delete record`})]})},w=[`Playground`,`VariantsAndTones`,`Sizes`,`WithIcon`,`Pending`,`Disabled`,`AsLink`,`NarrowContainer`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...g.parameters?.docs?.source},description:{story:`The interactive playground: change the props in the Controls panel.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: args => <div className="grid gap-3">
      {VARIANTS.map(variant => <div key={variant} className="flex flex-wrap items-center gap-3">
          {TONES.map(tone => <Button key={tone} {...args} variant={variant} tone={tone}>
              {\`\${variant} \${tone}\`}
            </Button>)}
        </div>)}
    </div>
}`,..._.parameters?.docs?.source},description:{story:`Every variant in every tone.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap items-center gap-3">
      <Button {...args} icon={Save}>
        Save
      </Button>
      <Button {...args} variant="outline" icon={Download}>
        Export
      </Button>
      <Button {...args} variant="ghost" icon={ArrowRight} iconPosition="end">
        Continue
      </Button>
      <Button {...args} variant="soft" tone="danger" icon={Trash2}>
        Delete
      </Button>
    </div>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    isPending: true,
    icon: Save
  }
}`,...b.parameters?.docs?.source},description:{story:`Pending shows a spinner, keeps the button's width, sets aria-busy and ignores presses.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map(variant => <Button key={variant} {...args} variant={variant} isDisabled>
          {variant}
        </Button>)}
    </div>
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: ({
    tone,
    size
  }) => <div className="flex flex-wrap items-center gap-3">
      <Button tone={tone} size={size} href="#settings">
        Open settings
      </Button>
      <Button tone={tone} size={size} variant="link" href="#docs">
        Read the docs
      </Button>
    </div>
}`,...S.parameters?.docs?.source},description:{story:"With `href`, Button renders a link through UIProvider's LinkComponent.",...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  globals: {
    viewport: {
      value: 'phone360'
    }
  },
  render: args => <div className="flex flex-wrap gap-3">
      <Button {...args} icon={Save}>
        Save changes
      </Button>
      <Button {...args} variant="outline" tone="neutral">
        Cancel
      </Button>
      <Button {...args} variant="soft" tone="danger" icon={Trash2}>
        Delete record
      </Button>
    </div>
}`,...C.parameters?.docs?.source},description:{story:`Buttons wrap rather than overflow at the narrowest phone width (360 px).`,...C.parameters?.docs?.description}}}})))()}T();export{S as AsLink,x as Disabled,C as NarrowContainer,b as Pending,g as Playground,v as Sizes,_ as VariantsAndTones,y as WithIcon,w as __namedExportsOrder,h as default};