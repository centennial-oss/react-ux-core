import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./external-link-Bobo3hPH.js";import{n as r,t as i}from"./refresh-cw-WPIq2VfP.js";import{t as a}from"./jsx-runtime-MKhVqBIO.js";import{n as o,t as s}from"./IconButton-B63kwQhA.js";import{i as c,n as l,r as u,t as d}from"./CopyField-Ck00sf0P.js";var f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{t(),r(),o(),c(),l(),f=a(),p=`urn:observatory:archive:north-ridge:surveys/2026/messier/m31/andromeda-mosaic-final-v12.fits`,m={title:`Inputs/CopyField`,component:d,args:{label:`Webhook URL`,value:`https://hooks.example.com/telescope/7f3c9a`}},h={tags:[`!visual`]},g={render:()=>(0,f.jsxs)(`div`,{className:`flex max-w-md flex-col gap-5`,children:[(0,f.jsx)(d,{label:`Observation ID`,value:`OBS-2026-10-16-0042`}),(0,f.jsx)(d,{label:`Archive object`,description:`The middle is cut, so the file name stays visible.`,value:p,truncate:`middle`}),(0,f.jsx)(d,{label:`Archive object (end)`,value:p}),(0,f.jsx)(d,{label:`Ingest command`,value:`astro ingest --site mauna-kea --night 2026-10-16`}),(0,f.jsx)(d,{label:`Station name`,value:`Northern Ridge Observatory`,isMonospace:!1}),(0,f.jsx)(d,{label:`Small`,size:`sm`,value:`m31-andromeda`}),(0,f.jsx)(d,{label:`Disabled`,isDisabled:!0,value:`OBS-2026-10-16-0001`}),(0,f.jsx)(d,{label:`Side label`,labelPosition:`side`,value:`OBS-2026-10-16-0042`})]})},_={render:()=>(0,f.jsx)(`div`,{className:`max-w-md`,children:(0,f.jsx)(d,{label:`Webhook URL`,value:`https://hooks.example.com/telescope/7f3c9a`,actions:(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(s,{icon:n,size:`sm`,"aria-label":`Open webhook URL`}),(0,f.jsx)(s,{icon:i,size:`sm`,"aria-label":`Regenerate webhook URL`})]})})})},v={render:()=>(0,f.jsxs)(`p`,{className:`flex items-center gap-2 text-sm text-fg`,children:[(0,f.jsx)(`code`,{className:`font-mono`,children:`OBS-2026-10-16-0042`}),(0,f.jsx)(u,{value:`OBS-2026-10-16-0042`,label:`observation ID`})]})},y=[`Playground`,`Variants`,`WithActions`,`Button`],h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-5">
      <CopyField label="Observation ID" value="OBS-2026-10-16-0042" />
      <CopyField label="Archive object" description="The middle is cut, so the file name stays visible." value={archiveId} truncate="middle" />
      <CopyField label="Archive object (end)" value={archiveId} />
      <CopyField label="Ingest command" value="astro ingest --site mauna-kea --night 2026-10-16" />
      <CopyField label="Station name" value="Northern Ridge Observatory" isMonospace={false} />
      <CopyField label="Small" size="sm" value="m31-andromeda" />
      <CopyField label="Disabled" isDisabled value="OBS-2026-10-16-0001" />
      <CopyField label="Side label" labelPosition="side" value="OBS-2026-10-16-0042" />
    </div>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <CopyField label="Webhook URL" value="https://hooks.example.com/telescope/7f3c9a" actions={<>
            <IconButton icon={ExternalLink} size="sm" aria-label="Open webhook URL" />
            <IconButton icon={RefreshCw} size="sm" aria-label="Regenerate webhook URL" />
          </>} />
    </div>
}`,..._.parameters?.docs?.source},description:{story:`Extra actions sit before the copy button.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <p className="flex items-center gap-2 text-sm text-fg">
      <code className="font-mono">OBS-2026-10-16-0042</code>
      <CopyButton value="OBS-2026-10-16-0042" label="observation ID" />
    </p>
}`,...v.parameters?.docs?.source},description:{story:`CopyButton on its own, beside any text.`,...v.parameters?.docs?.description}}}})))()}b();export{v as Button,h as Playground,g as Variants,_ as WithActions,y as __namedExportsOrder,m as default};