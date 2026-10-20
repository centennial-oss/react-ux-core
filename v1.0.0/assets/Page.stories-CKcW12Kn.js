import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./cn-BnE6eITj.js";import{n as r,t as i}from"./plus-DAwTrFAj.js";import{t as a}from"./jsx-runtime-MKhVqBIO.js";import{n as o,t as s}from"./Button-e4ZjaxXL.js";import{n as c,t as l}from"./Banner-OZcNcSI6.js";import{n as u,t as d}from"./Card-BKrFQ2m4.js";import{a as f,r as p}from"./Tabs-B2XSsYH9.js";import{n as m,t as h}from"./PageHeader-BaKdG0Bz.js";function g({children:e,notices:t,width:r=`full`,className:i,tabs:a,...o}){return(0,_.jsx)(`div`,{className:n(`mx-auto flex w-full min-w-0 flex-col gap-6`,v[r],i),children:a?(0,_.jsxs)(_.Fragment,{children:[t,(0,_.jsx)(h,{tabs:a,...o,children:e})]}):(0,_.jsxs)(_.Fragment,{children:[(0,_.jsx)(h,{...o}),t,e]})})}var _,v;function y(){return(y=e((()=>{t(),m(),_=a(),v={narrow:`max-w-3xl`,medium:`max-w-5xl`,full:`max-w-[96rem]`},g.__docgenInfo={description:`One screen: header (title, breadcrumbs, actions, tabs) over the content.`,methods:[],displayName:`Page`,props:{children:{required:!1,tsType:{name:`ReactNode`},description:"The page's content. With `tabs`, these are the `TabPanel`s (rendered by PageHeader); without, anything."},notices:{required:!1,tsType:{name:`ReactNode`},description:`Content between the header and the body, such as a page-level Banner.`},width:{required:!1,tsType:{name:`union`,raw:`'narrow' | 'medium' | 'full'`,elements:[{name:`literal`,value:`'narrow'`},{name:`literal`,value:`'medium'`},{name:`literal`,value:`'full'`}]},description:"Caps the content width for reading-heavy pages (forms, settings). Defaults to `full`.",defaultValue:{value:`'full'`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}},composes:[`Omit`]}})))()}var b,x,S,C,w;function T(){return(T=e((()=>{c(),o(),u(),f(),r(),y(),b=a(),x={title:`Shell/Page`,component:g,parameters:{layout:`padded`}},S={args:{title:`Customers & meters`,subtitle:`Newlian Glenn`,breadcrumbs:[{id:`org`,label:`Newlian Vale Lightwardens`,href:`#`},{id:`site`,label:`Newlian Glenn`,href:`#`},{id:`page`,label:`Customers & meters`}],primaryAction:(0,b.jsx)(s,{tone:`accent`,icon:i,children:`Add meter`}),notices:(0,b.jsx)(l,{tone:`info`,children:`A page-level notice sits between the header and the content.`}),children:(0,b.jsx)(d,{title:`Content`,headingLevel:2,children:`The page's content.`})}},C={args:{title:`Elowyth Thornquill`,subtitle:`S60R-8AE366 · Residential Plus`,tabs:[{id:`commercial`,label:`Commercial`},{id:`technical`,label:`Technical`}],children:(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(p,{id:`commercial`,children:`Commercial details`}),(0,b.jsx)(p,{id:`technical`,children:`Technical details`})]})}},w=[`WithActions`,`WithTabs`],S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Customers & meters',
    subtitle: 'Newlian Glenn',
    breadcrumbs: [{
      id: 'org',
      label: 'Newlian Vale Lightwardens',
      href: '#'
    }, {
      id: 'site',
      label: 'Newlian Glenn',
      href: '#'
    }, {
      id: 'page',
      label: 'Customers & meters'
    }],
    primaryAction: <Button tone="accent" icon={Plus}>
        Add meter
      </Button>,
    notices: <Banner tone="info">A page-level notice sits between the header and the content.</Banner>,
    children: <Card title="Content" headingLevel={2}>
        The page's content.
      </Card>
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Elowyth Thornquill',
    subtitle: 'S60R-8AE366 · Residential Plus',
    tabs: [{
      id: 'commercial',
      label: 'Commercial'
    }, {
      id: 'technical',
      label: 'Technical'
    }],
    children: <>
        <TabPanel id="commercial">Commercial details</TabPanel>
        <TabPanel id="technical">Technical details</TabPanel>
      </>
  }
}`,...C.parameters?.docs?.source}}}})))()}T();export{S as WithActions,C as WithTabs,w as __namedExportsOrder,x as default};