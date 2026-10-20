import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{_ as ee,a as n,c as r,d as i,g as a,h as o,i as te,l as ne,m as s,n as re,o as ie,p as ae,r as c,s as oe,t as l,u as se}from"./StatusBar-By5g9obd.js";import{n as ce,t as le}from"./circle-question-mark-C8tybhd0.js";import{n as ue,t as de}from"./file-text-Cy00aP_W.js";import{n as fe,t as u}from"./gauge-IV5NkPH7.js";import{n as pe,t as d}from"./layout-dashboard-swovHwDS.js";import{n as me,t as f}from"./map-pin-CPzpA45f.js";import{i as p,n as m,r as he,t as ge}from"./UserMenu-CZwlKgan.js";import{n as _e,t as ve}from"./plus-DAwTrFAj.js";import{n as ye,t as be}from"./plug-_03Ig2ku.js";import{n as xe,t as Se}from"./zap-CC66tEy-.js";import{t as Ce}from"./jsx-runtime-MKhVqBIO.js";import{n as h,t as g}from"./Button-e4ZjaxXL.js";import{n as _,t as v}from"./IconButton-B63kwQhA.js";import{n as y,r as b,s as x}from"./Menu-CvHUJ8Bq.js";import{n as S,t as C}from"./Badge-B8tm3wVn.js";import{a as w,r as T}from"./Tabs-B2XSsYH9.js";import{n as E,t as D}from"./StatusDot-CkmPgM6I.js";import{n as O,t as k}from"./PageHeader-BaKdG0Bz.js";var A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{ee(),ce(),ue(),fe(),pe(),me(),ye(),_e(),o(),xe(),A=t(),S(),h(),_(),x(),E(),w(),se(),r(),p(),ie(),O(),ae(),te(),re(),m(),j=Ce(),M={title:`Shell/Parts`,parameters:{layout:`padded`}},N=[{id:`operate`,items:[{id:`dashboard`,label:`Dashboard`,icon:d,href:`/`},{id:`sites`,label:`Sites`,icon:f,href:`/sites`,badge:3,children:[{id:`sites-map`,label:`Map`,href:`/sites/map`},{id:`sites-groups`,label:`Groups`,href:`/sites/groups`}]},{id:`meters`,label:`Meters`,icon:u,href:`/meters`}]},{id:`billing`,title:`Billing`,items:[{id:`invoices`,label:`Invoices`,icon:s,href:`/invoices`},{id:`tariffs`,label:`Tariffs`,icon:Se,href:`/tariffs`}]}],P={render:()=>{let[e,t]=(0,A.useState)(!1);return(0,j.jsx)(`div`,{className:`h-[30rem]`,children:(0,j.jsx)(c,{sections:N,currentPath:`/sites/map`,isCollapsed:e,onCollapsedChange:t,footer:(0,j.jsx)(`span`,{className:`text-xs text-fg-muted`,children:`Acme Energy`})})})}},F={render:()=>{let[e,t]=(0,A.useState)(!0);return(0,j.jsx)(`div`,{className:`h-[30rem]`,children:(0,j.jsx)(c,{sections:N,currentPath:`/sites/map`,isCollapsed:e,onCollapsedChange:t})})}},I={id:`plant-12`,label:`Plant 12`,description:`Denver, CO`},L={id:`plant-14`,label:`Plant 14`,description:`Boulder, CO`},R={id:`depot-3`,label:`Depot 3`,description:`Austin, TX`},z={id:`north`,label:`North`,children:[I,L]},B={id:`south`,label:`South`,children:[R]},V={id:`globex`,label:`Globex`,children:[]},H={id:`acme`,label:`Acme Energy`,children:[z,B]},U=[{id:`org`,label:`Organisation`},{id:`region`,label:`Region`},{id:`location`,label:`Location`}],W=[{id:`meters`,label:`Meters`,icon:u,severity:`warning`,alerts:[{id:`offline`,text:`Meters not reporting`,count:3,severity:`warning`}]},{id:`billing`,label:`Billing`,icon:s,severity:`ok`,alerts:[]},{id:`integrations`,label:`Integrations`,icon:be,severity:`error`,alerts:[{id:`sync`,text:`Accounting sync failed`,severity:`error`,action:{label:`Retry`,onPress:()=>void 0}}]}],G={render:()=>{let[e,t]=(0,A.useState)([H,z,I]);return(0,j.jsx)(he,{brand:(0,j.jsx)(`span`,{className:`text-base font-semibold`,children:`Gridline`}),environmentLabel:`Staging`,scopePicker:(0,j.jsx)(n,{tree:[H,V],levels:U,value:e,onSelect:t}),statusBar:(0,j.jsx)(l,{categories:W}),actions:(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(v,{icon:le,"aria-label":`Help`}),(0,j.jsx)(i,{})]}),userMenu:(0,j.jsx)(ge,{name:`Ada Lovelace`,secondary:`Acme Energy · Administrator`,children:(0,j.jsx)(b,{"aria-label":`Account`,children:(0,j.jsx)(y,{id:`sign-out`,children:`Sign out`})})})})}},K={tags:[`visual-page`],render:()=>{let[e,t]=(0,A.useState)([H,z,I]);return(0,j.jsx)(n,{tree:[H],levels:U,value:e,onSelect:t,recent:[[H,B,R]],searchLeaves:e=>Promise.resolve([I,L,R].filter(t=>t.label.toLowerCase().includes(e.toLowerCase())).map(e=>[H,e===R?B:z,e])),defaultOpen:!0})}},q={render:()=>(0,j.jsx)(k,{breadcrumbs:[{id:`sites`,label:`Sites`,href:`/sites`},{id:`north`,label:`North`,href:`/sites/north`},{id:`plant`,label:`Plant 12`}],title:`Plant 12`,subtitle:`Denver, CO · 48 meters`,status:(0,j.jsx)(D,{tone:`warning`,label:`3 meters offline`}),primaryAction:(0,j.jsx)(g,{icon:ve,children:`Add meter`}),secondaryActions:[{id:`export`,label:`Export`,icon:de,onPress:()=>void 0},{id:`report`,label:`Usage report`,icon:a,href:`/reports`}],quickActions:(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(y,{id:`rename`,children:`Rename`}),(0,j.jsx)(y,{id:`archive`,tone:`danger`,children:`Archive`})]}),tabs:[{id:`overview`,label:`Overview`},{id:`meters`,label:`Meters`,badge:(0,j.jsx)(C,{children:`48`})},{id:`tariff`,label:`Tariff`},{id:`contacts`,label:`Contacts`},{id:`history`,label:`History`}],children:[`overview`,`meters`,`tariff`,`contacts`,`history`].map(e=>(0,j.jsx)(T,{id:e,className:`pt-4 text-sm text-fg-muted`,children:`Tab content.`},e))})},J={render:()=>(0,j.jsx)(k,{title:`Invoices`,subtitle:`All invoices for Acme Energy`,primaryAction:(0,j.jsx)(g,{variant:`outline`,children:`Export`})})},Y={render:()=>(0,j.jsx)(l,{categories:W,updatedAt:Date.UTC(2026,9,15,15,42)})},X={render:()=>(0,j.jsx)(oe,{version:`2.4.0`,build:`a1b2c3d`,links:[{id:`status`,label:`Service status`,href:`/status`},{id:`privacy`,label:`Privacy`,href:`/privacy`}]})},Z={parameters:{layout:`fullscreen`},render:()=>(0,j.jsx)(`div`,{className:`relative h-40 translate-z-0`,children:(0,j.jsx)(ne,{items:[{id:`dashboard`,label:`Dashboard`,icon:d,href:`/`},{id:`sites`,label:`Sites`,icon:f,href:`/sites`,badge:3},{id:`usage`,label:`Usage`,icon:a,href:`/usage`},{id:`invoices`,label:`Invoices`,icon:s,href:`/invoices`}],currentPath:`/sites`,hasMoreButton:!0})})},Q=[`SidebarExpanded`,`SidebarRail`,`HeaderWithEverything`,`HierarchyPickerOpen`,`PageHeaderWithTabs`,`PageHeaderSimple`,`StatusBarCategories`,`FooterWithLinks`,`BottomTabs`],P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [isCollapsed, setCollapsed] = useState(false);
    return <div className="h-[30rem]">
        <Sidebar sections={sections} currentPath="/sites/map" isCollapsed={isCollapsed} onCollapsedChange={setCollapsed} footer={<span className="text-xs text-fg-muted">Acme Energy</span>} />
      </div>;
  }
}`,...P.parameters?.docs?.source},description:{story:`The expanded sidebar: sections with headings, badges, and a parent open around the current page.`,...P.parameters?.docs?.description}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [isCollapsed, setCollapsed] = useState(true);
    return <div className="h-[30rem]">
        <Sidebar sections={sections} currentPath="/sites/map" isCollapsed={isCollapsed} onCollapsedChange={setCollapsed} />
      </div>;
  }
}`,...F.parameters?.docs?.source},description:{story:`The icon rail: each icon is named by a tooltip; Sites opens its pages in a flyout.`,...F.parameters?.docs?.description}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [scope, setScope] = useState<HierarchyPath>([acme, north, plant12]);
    return <Header brand={<span className="text-base font-semibold">Gridline</span>} environmentLabel="Staging" scopePicker={<HierarchyPicker tree={[acme, globex]} levels={levels} value={scope} onSelect={setScope} />} statusBar={<StatusBar categories={categories} />} actions={<>
            <IconButton icon={CircleHelp} aria-label="Help" />
            <SettingsMenu />
          </>} userMenu={<UserMenu name="Ada Lovelace" secondary="Acme Energy · Administrator">
            <MenuSection aria-label="Account">
              <MenuItem id="sign-out">Sign out</MenuItem>
            </MenuSection>
          </UserMenu>} />;
  }
}`,...G.parameters?.docs?.source},description:{story:`The header with every slot, marked as a staging deployment.`,...G.parameters?.docs?.description}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: () => {
    const [scope, setScope] = useState<HierarchyPath>([acme, north, plant12]);
    return <HierarchyPicker tree={[acme]} levels={levels} value={scope} onSelect={setScope} recent={[[acme, south, depot3]]} searchLeaves={query => Promise.resolve([plant12, plant14, depot3].filter(leaf => leaf.label.toLowerCase().includes(query.toLowerCase())).map(leaf => [acme, leaf === depot3 ? south : north, leaf]))} defaultOpen />;
  }
}`,...K.parameters?.docs?.source},description:{story:`The scope picker's panel: search across every location, Recent, and a column per level. Acme is the only
organisation, so its level is skipped.`,...K.parameters?.docs?.description}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  render: () => <PageHeader breadcrumbs={[{
    id: 'sites',
    label: 'Sites',
    href: '/sites'
  }, {
    id: 'north',
    label: 'North',
    href: '/sites/north'
  }, {
    id: 'plant',
    label: 'Plant 12'
  }]} title="Plant 12" subtitle="Denver, CO · 48 meters" status={<StatusDot tone="warning" label="3 meters offline" />} primaryAction={<Button icon={Plus}>Add meter</Button>} secondaryActions={[{
    id: 'export',
    label: 'Export',
    icon: FileText,
    onPress: () => undefined
  }, {
    id: 'report',
    label: 'Usage report',
    icon: BarChart3,
    href: '/reports'
  }]} quickActions={<>
          <MenuItem id="rename">Rename</MenuItem>
          <MenuItem id="archive" tone="danger">
            Archive
          </MenuItem>
        </>} tabs={[{
    id: 'overview',
    label: 'Overview'
  }, {
    id: 'meters',
    label: 'Meters',
    badge: <Badge>48</Badge>
  }, {
    id: 'tariff',
    label: 'Tariff'
  }, {
    id: 'contacts',
    label: 'Contacts'
  }, {
    id: 'history',
    label: 'History'
  }]}>
      {['overview', 'meters', 'tariff', 'contacts', 'history'].map(id => <TabPanel key={id} id={id} className="pt-4 text-sm text-fg-muted">
          Tab content.
        </TabPanel>)}
    </PageHeader>
}`,...q.parameters?.docs?.source},description:{story:`A page header with breadcrumbs, a status, actions and tabs (a Select on phones).`,...q.parameters?.docs?.description}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  render: () => <PageHeader title="Invoices" subtitle="All invoices for Acme Energy" primaryAction={<Button variant="outline">Export</Button>} />
}`,...J.parameters?.docs?.source},description:{story:`A plain page header: a title, subtitle and one action.`,...J.parameters?.docs?.description}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: () => <StatusBar categories={categories} updatedAt={Date.UTC(2026, 9, 15, 15, 42)} />
}`,...Y.parameters?.docs?.source},description:{story:`Status categories; each opens its alerts. Phones show one dot with the worst severity.`,...Y.parameters?.docs?.description}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: () => <Footer version="2.4.0" build="a1b2c3d" links={[{
    id: 'status',
    label: 'Service status',
    href: '/status'
  }, {
    id: 'privacy',
    label: 'Privacy',
    href: '/privacy'
  }]} />
}`,...X.parameters?.docs?.source},description:{story:`The footer: version, build, the time zone and links.`,...X.parameters?.docs?.description}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  parameters: {
    layout: 'fullscreen'
  },
  render: () =>
  // A transform makes this box the containing block of the fixed bar, so the bar sits at its bottom (in an app,
  // it's the bottom of the screen).
  <div className="relative h-40 translate-z-0">
      <BottomTabBar items={[{
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/'
    }, {
      id: 'sites',
      label: 'Sites',
      icon: MapPin,
      href: '/sites',
      badge: 3
    }, {
      id: 'usage',
      label: 'Usage',
      icon: BarChart3,
      href: '/usage'
    }, {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      href: '/invoices'
    }]} currentPath="/sites" hasMoreButton />
    </div>
}`,...Z.parameters?.docs?.source},description:{story:`The phone tab bar (shown on phones only), with a badge and More.`,...Z.parameters?.docs?.description}}}})))()}$();export{Z as BottomTabs,X as FooterWithLinks,G as HeaderWithEverything,K as HierarchyPickerOpen,J as PageHeaderSimple,q as PageHeaderWithTabs,P as SidebarExpanded,F as SidebarRail,Y as StatusBarCategories,Q as __namedExportsOrder,M as default};