import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{a as n,c as r,i,l as a,n as o,s,t as c}from"./flags-eO0e9Wov.js";var l,u,d,f,p,m;function h(){return(h=e((()=>{i(),s(),a(),l=t(),u={title:`Display/Flag`,component:n,args:{country:`France`},decorators:[e=>(0,l.jsx)(r,{countries:c,basePath:o,children:(0,l.jsx)(e,{})})]},d={render:()=>(0,l.jsx)(`div`,{className:`flex flex-col gap-3`,children:[`United States`,`France`,`cn`,`br`].map(e=>(0,l.jsx)(n,{country:e,details:[`name`,`nativeName`,`languages`]},e))})},f={render:()=>(0,l.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,l.jsx)(n,{country:`jp`,size:`sm`}),(0,l.jsx)(n,{country:`jp`}),(0,l.jsx)(n,{country:`jp`,size:`lg`}),(0,l.jsx)(n,{country:`Japan`,size:`lg`,details:[`name`,`code`]})]})},p={render:()=>(0,l.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,l.jsx)(n,{country:`Deutschland`,details:[`nativeName`,`name`]}),(0,l.jsx)(n,{country:`Peru`,details:[`name`,`languages`]}),(0,l.jsx)(n,{country:`Atlantis`,details:[`name`]})]})},m=[`StockCountries`,`Sizes`,`RegisteredAndUnknown`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3">
      {['United States', 'France', 'cn', 'br'].map(country => <Flag key={country} country={country} details={['name', 'nativeName', 'languages']} />)}
    </div>
}`,...d.parameters?.docs?.source},description:{story:`The stock countries, by name or code, with their English and native names and languages.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex items-center gap-4">
      <Flag country="jp" size="sm" />
      <Flag country="jp" />
      <Flag country="jp" size="lg" />
      <Flag country="Japan" size="lg" details={['name', 'code']} />
    </div>
}`,...f.parameters?.docs?.source},description:{story:`Three sizes; alone, a flag is named for screen readers by its country.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3">
      <Flag country="Deutschland" details={['nativeName', 'name']} />
      <Flag country="Peru" details={['name', 'languages']} />
      <Flag country="Atlantis" details={['name']} />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`Countries the app registered, and a name nobody registered (a generic flag).`,...p.parameters?.docs?.description}}}})))()}h();export{p as RegisteredAndUnknown,f as Sizes,d as StockCountries,m as __namedExportsOrder,u as default};