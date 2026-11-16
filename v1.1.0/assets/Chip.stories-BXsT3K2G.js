import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./tag-0mms0y8E.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{n as a,t as o}from"./Chip-B8uvrygV.js";var s,c,l,u,d,f,p;function m(){return(m=e((()=>{n(),s=t(),a(),c=i(),l={title:`Display/Chip`,component:o,args:{children:`Region: North`}},u={tags:[`!visual`]},d={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[[`neutral`,`accent`,`success`,`warning`,`danger`].map(e=>(0,c.jsx)(o,{tone:e,icon:r,children:e},e)),(0,c.jsx)(o,{size:`sm`,children:`Small`})]})},f={render:function(){let[e,t]=(0,s.useState)([`Region: North`,`Status: Active`,`Tariff: Commercial`]);return(0,c.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[e.map(e=>(0,c.jsx)(o,{onRemove:()=>{t(t=>t.filter(t=>t!==e))},children:e},e)),(0,c.jsx)(o,{onRemove:()=>void 0,isDisabled:!0,children:`Locked filter`})]})}},p=[`Playground`,`Tones`,`Removable`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">
      {(['neutral', 'accent', 'success', 'warning', 'danger'] as const).map(tone => <Chip key={tone} tone={tone} icon={Tag}>
          {tone}
        </Chip>)}
      <Chip size="sm">Small</Chip>
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: function RemovableStory() {
    const [filters, setFilters] = useState(['Region: North', 'Status: Active', 'Tariff: Commercial']);
    return <div className="flex flex-wrap gap-2">
        {filters.map(filter => <Chip key={filter} onRemove={() => {
        setFilters(current => current.filter(item => item !== filter));
      }}>
            {filter}
          </Chip>)}
        <Chip onRemove={() => undefined} isDisabled>
          Locked filter
        </Chip>
      </div>;
  }
}`,...f.parameters?.docs?.source},description:{story:`Active filters: each chip has its own remove button.`,...f.parameters?.docs?.description}}}})))()}m();export{u as Playground,f as Removable,d as Tones,p as __namedExportsOrder,l as default};