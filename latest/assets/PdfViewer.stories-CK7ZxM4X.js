import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./PdfViewer-BPoRRAzY.js";import{n as r,r as i,s as a}from"./media-CeW1V545.js";var o,s,c,l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{i(),t(),o=new Blob([r(a)],{type:`application/pdf`}),s=new Blob([r([[],[],[]],{isScanned:!0})],{type:`application/pdf`}),c=new Blob([r(a.slice(0,2),{password:`orbit`})],{type:`application/pdf`}),l={title:`Media/PdfViewer`,component:n,tags:[`!visual`],parameters:{layout:`padded`},args:{source:o,title:`Observatory Supply Co. statement`}},u={},d={args:{defaultPage:3,defaultZoom:`fit-page`}},f={args:{hasThumbnails:!1,hasSearch:!1,hasDownload:!1,hasPrint:!1,height:`28rem`}},p={args:{source:s,title:`Scanned delivery note`}},m={args:{source:c,title:`Protected statement`}},h={args:{source:`media/missing-statement.pdf`,title:`Missing statement`}},g={args:{source:`media/statement.pdf`,title:`Statement (40 pages)`}},_=[`Statement`,`FitPage`,`Minimal`,`ScannedDocument`,`PasswordProtected`,`LoadError`,`RealDocument`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{}`,...u.parameters?.docs?.source},description:{story:`A five-page statement at fit width: page n of N, zoom, search (try "INV-01044"), download, print, and the
thumbnails sidebar (a drawer on narrow screens). Pages render only near the viewport.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    defaultPage: 3,
    defaultZoom: 'fit-page'
  }
}`,...d.parameters?.docs?.source},description:{story:`Opens at page 3, fitting the whole page.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    hasThumbnails: false,
    hasSearch: false,
    hasDownload: false,
    hasPrint: false,
    height: '28rem'
  }
}`,...f.parameters?.docs?.source},description:{story:`Just the document: no thumbnails, search, download or print.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    source: scan,
    title: 'Scanned delivery note'
  }
}`,...p.parameters?.docs?.source},description:{story:`A scan without a text layer: an info tip says its text can't be selected, searched or read aloud.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    source: locked,
    title: 'Protected statement'
  }
}`,...m.parameters?.docs?.source},description:{story:`A protected document asks for its password ("orbit").`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    source: 'media/missing-statement.pdf',
    title: 'Missing statement'
  }
}`,...h.parameters?.docs?.source},description:{story:`A document that can't be loaded: an error with "Download instead".`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    source: 'media/statement.pdf',
    title: 'Statement (40 pages)'
  }
}`,...g.parameters?.docs?.source},description:{story:"A real document from `.storybook/public/media/statement.pdf` (a 40-page statement), when it's there.",...g.parameters?.docs?.description}}}})))()}v();export{d as FitPage,h as LoadError,f as Minimal,m as PasswordProtected,g as RealDocument,p as ScannedDocument,u as Statement,_ as __namedExportsOrder,l as default};