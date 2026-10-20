import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Checkbox-DkKEWkna.js";var a,o,s,c,l,u,d,f;function p(){return(p=e((()=>{a=t(),r(),o=n(),s={title:`Inputs/Checkbox`,component:i,args:{children:`Remember this device`}},c={tags:[`!visual`]},l={render:()=>(0,o.jsxs)(`div`,{className:`flex max-w-md flex-col gap-2`,children:[(0,o.jsx)(i,{children:`Unchecked`}),(0,o.jsx)(i,{defaultSelected:!0,children:`Checked`}),(0,o.jsx)(i,{isIndeterminate:!0,children:`Indeterminate`}),(0,o.jsx)(i,{description:`Only the account owner can change this later.`,children:`Make this site public`}),(0,o.jsx)(i,{isDisabled:!0,children:`Disabled`}),(0,o.jsx)(i,{isDisabled:!0,defaultSelected:!0,children:`Disabled and checked`}),(0,o.jsx)(i,{isReadOnly:!0,defaultSelected:!0,children:`Read-only`}),(0,o.jsx)(i,{isInvalid:!0,errorMessage:`You must accept the terms to continue`,children:`I accept the terms of service`}),(0,o.jsx)(i,{isInvalid:!0,defaultSelected:!0,children:`Invalid and checked`})]})},u={render:function(){let[e,t]=(0,a.useState)({north:!0,south:!1,east:!1}),n=Object.values(e),r=n.every(Boolean),s=n.some(Boolean);return(0,o.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,o.jsx)(i,{isSelected:r,isIndeterminate:s&&!r,onChange:e=>{t({north:e,south:e,east:e})},children:`All regions`}),(0,o.jsx)(`div`,{className:`flex flex-col ps-6`,children:Object.entries(e).map(([e,n])=>(0,o.jsxs)(i,{isSelected:n,onChange:n=>{t(t=>({...t,[e]:n}))},children:[e[0]?.toUpperCase(),e.slice(1)]},e))})]})}},d={render:()=>(0,o.jsx)(`div`,{className:`max-w-xs`,children:(0,o.jsx)(i,{description:`You can change this at any time in your notification settings.`,children:`Email me when a scheduled export finishes, including exports started by other people`})})},f=[`Playground`,`States`,`SelectAll`,`LongLabel`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-2">
      <Checkbox>Unchecked</Checkbox>
      <Checkbox defaultSelected>Checked</Checkbox>
      <Checkbox isIndeterminate>Indeterminate</Checkbox>
      <Checkbox description="Only the account owner can change this later.">
        Make this site public
      </Checkbox>
      <Checkbox isDisabled>Disabled</Checkbox>
      <Checkbox isDisabled defaultSelected>
        Disabled and checked
      </Checkbox>
      <Checkbox isReadOnly defaultSelected>
        Read-only
      </Checkbox>
      <Checkbox isInvalid errorMessage="You must accept the terms to continue">
        I accept the terms of service
      </Checkbox>
      <Checkbox isInvalid defaultSelected>
        Invalid and checked
      </Checkbox>
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: function SelectAllStory() {
    const [checked, setChecked] = useState<Record<string, boolean>>({
      north: true,
      south: false,
      east: false
    });
    const values = Object.values(checked);
    const allChecked = values.every(Boolean);
    const someChecked = values.some(Boolean);
    return <div className="flex flex-col gap-1">
        <Checkbox isSelected={allChecked} isIndeterminate={someChecked && !allChecked} onChange={isSelected => {
        setChecked({
          north: isSelected,
          south: isSelected,
          east: isSelected
        });
      }}>
          All regions
        </Checkbox>
        <div className="flex flex-col ps-6">
          {Object.entries(checked).map(([region, isSelected]) => <Checkbox key={region} isSelected={isSelected} onChange={next => {
          setChecked(current => ({
            ...current,
            [region]: next
          }));
        }}>
              {region[0]?.toUpperCase()}
              {region.slice(1)}
            </Checkbox>)}
        </div>
      </div>;
  }
}`,...u.parameters?.docs?.source},description:{story:`A parent checkbox that is indeterminate while only some of its children are checked.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xs">
      <Checkbox description="You can change this at any time in your notification settings.">
        Email me when a scheduled export finishes, including exports started by other people
      </Checkbox>
    </div>
}`,...d.parameters?.docs?.source},description:{story:`Long labels wrap beside the box.`,...d.parameters?.docs?.description}}}})))()}p();export{d as LongLabel,c as Playground,u as SelectAll,l as States,f as __namedExportsOrder,s as default};