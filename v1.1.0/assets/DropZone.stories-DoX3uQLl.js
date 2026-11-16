import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./createLucideIcon-BXqG86fR.js";import{n as i,t as a}from"./DropZone-CSuOQOSg.js";import{t as o}from"./jsx-runtime-MKhVqBIO.js";import{o as s,r as c}from"./mediaImages-BJPUk9rJ.js";var l,u;function d(){return(d=e((()=>{n(),l={name:`image-up`,size:24,node:[[`path`,{d:`M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21`,key:`9csbqa`}],[`path`,{d:`m14 19.5 3-3 3 3`,key:`9vmjn0`}],[`path`,{d:`M17 22v-5.5`,key:`1aa6fl`}],[`circle`,{cx:`9`,cy:`9`,r:`2`,key:`af1f0g`}]]},l.node,u=r(l)})))()}function f(e,t){let n=s({width:160,height:120,seed:t}),r=atob(n.slice(n.indexOf(`,`)+1));return new File([Uint8Array.from(r,e=>e.charCodeAt(0))],e,{type:`image/png`})}var p,m,h,g,_,v,y,b,x,S;function C(){return(C=e((()=>{d(),p=t(),c(),i(),m=o(),h={title:`Inputs/DropZone`,component:a},g={tags:[`!visual`]},_={render:function(){let[e,t]=(0,p.useState)([]);return(0,m.jsxs)(`div`,{className:`flex max-w-md flex-col gap-3 text-sm`,children:[(0,m.jsx)(a,{onDrop:e=>{t(e.map(e=>e.name))}}),e.length>0&&(0,m.jsx)(`p`,{className:`text-fg-muted`,children:e.join(`, `)})]})}},v={render:()=>(0,m.jsxs)(`div`,{className:`flex max-w-md flex-col gap-4`,children:[(0,m.jsx)(a,{label:`Drop a photo of the meter`,icon:u,children:(0,m.jsx)(`span`,{className:`text-xs`,children:`JPEG or PNG`})}),(0,m.jsx)(a,{label:`Uploads are paused`,isDisabled:!0})]})},y=[f(`orion.png`,4),new File([new Uint8Array(2048)],`telescope-manual.pdf`,{type:`application/pdf`}),new File([new Uint8Array(22)],`frames.zip`,{type:`application/zip`})],b={render:()=>(0,m.jsx)(`div`,{className:`max-w-md`,children:(0,m.jsx)(a,{hasPreviews:!0,files:y})})},x={tags:[`!visual`],render:()=>(0,m.jsx)(`div`,{className:`max-w-md`,children:(0,m.jsx)(a,{hasPreviews:!0})})},S=[`Playground`,`Basic`,`CustomContent`,`WithPreviews`,`PreviewsOnDrop`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: function BasicStory() {
    const [names, setNames] = useState<string[]>([]);
    return <div className="flex max-w-md flex-col gap-3 text-sm">
        <DropZone onDrop={files => {
        setNames(files.map(file => file.name));
      }} />
        {names.length > 0 && <p className="text-fg-muted">{names.join(', ')}</p>}
      </div>;
  }
}`,..._.parameters?.docs?.source},description:{story:`The bare drop target: drop files on it, or focus it and paste. It only reports the files.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-md flex-col gap-4">
      <DropZone label="Drop a photo of the meter" icon={ImageUp}>
        <span className="text-xs">JPEG or PNG</span>
      </DropZone>
      <DropZone label="Uploads are paused" isDisabled />
    </div>
}`,...v.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <DropZone hasPreviews files={droppedFiles} />
    </div>
}`,...b.parameters?.docs?.source},description:{story:"`hasPreviews` shows the files most recently dropped or pasted as thumbnails: images themselves, other files as the\nicon for their kind. Here `files` sets them, as an app would after its own checks.",...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-md">
      <DropZone hasPreviews />
    </div>
}`,...x.parameters?.docs?.source},description:{story:`Drop or paste files to see them previewed (the zone keeps the last ones dropped).`,...x.parameters?.docs?.description}}}})))()}C();export{_ as Basic,v as CustomContent,g as Playground,x as PreviewsOnDrop,b as WithPreviews,S as __namedExportsOrder,h as default};