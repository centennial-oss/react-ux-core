import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./FilePreview-CWvgeoyN.js";import{n as a,t as o}from"./FilePreviewList-BdvLkCW9.js";import{o as s,r as c}from"./mediaImages-BJPUk9rJ.js";import{a as l,d as u,h as d,i as f,l as p,m,n as h,o as g,s as _,u as v}from"./mediaFiles-DkaBN8fP.js";var y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H;function U(){return(U=e((()=>{m(),y=t(),f(),c(),r(),a(),b=n(),x=p(`saturn.png`,7),S=_(`supply-statement.pdf`),C=g(`dome-chime.mp3`),w=u(`raw-frames.zip`),T=l(`mars.json`),E=h(`lab-readings.csv`,12),D={name:`andromeda.png`,url:s({width:480,height:300,seed:21}),type:`image/png`,size:412e3},O={name:`archive-2026.zip`,url:`media/archive-2026.zip`,type:`application/zip`,size:482e5},k={title:`Media/FilePreview`,component:i,parameters:{layout:`padded`},args:{file:D}},A={},j={tags:[`!visual`],render:()=>(0,b.jsx)(`div`,{className:`flex flex-wrap items-start gap-3`,children:[x,S,C,w,T,E].map(e=>(0,b.jsx)(i,{file:e,workerSrc:d},e.name))})},M={render:()=>(0,b.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,b.jsxs)(`div`,{className:`flex flex-wrap items-start gap-3`,children:[(0,b.jsx)(i,{file:D}),(0,b.jsx)(i,{file:O}),(0,b.jsx)(i,{file:{name:`notes.json`,url:`media/notes.json`,type:`application/json`,size:1200}})]}),(0,b.jsxs)(`div`,{className:`flex flex-wrap items-start gap-3`,children:[(0,b.jsx)(i,{file:D,size:`sm`}),(0,b.jsx)(i,{file:O,size:`sm`})]})]})},N={render:()=>(0,b.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,b.jsx)(i,{file:D,presentation:`dialog`}),(0,b.jsx)(i,{file:O,presentation:`dialog`}),(0,b.jsx)(i,{file:T,presentation:`dialog`})]})},P={render:()=>(0,b.jsxs)(`div`,{className:`flex max-w-2xl flex-col gap-4`,children:[(0,b.jsx)(i,{file:T,presentation:`inline`}),(0,b.jsx)(i,{file:E,presentation:`inline`,height:`12rem`})]})},F={render:()=>(0,b.jsx)(`div`,{className:`max-w-2xl`,children:(0,b.jsx)(i,{file:h(`night-log.csv`,400),presentation:`inline`,maxTextSize:512})})},I={tags:[`!visual`],render:()=>(0,b.jsx)(`div`,{className:`max-w-2xl`,children:(0,b.jsx)(i,{file:x,presentation:`inline`,height:`20rem`})})},L={tags:[`!visual`],render:()=>(0,b.jsx)(`div`,{className:`max-w-3xl`,children:(0,b.jsx)(i,{file:S,presentation:`inline`,height:`28rem`,workerSrc:d})})},R={tags:[`!visual`],render:()=>(0,b.jsx)(`div`,{className:`max-w-md`,children:(0,b.jsx)(i,{file:C,presentation:`inline`})})},z={render:()=>(0,b.jsx)(`div`,{className:`max-w-sm`,children:(0,b.jsx)(i,{file:O,presentation:`inline`})})},B={tags:[`!visual`],render:function(){let[e,t]=(0,y.useState)([x,S,C,w,v()]);return(0,b.jsx)(o,{files:e,workerSrc:d,onRemove:e=>{t(t=>t.filter((t,n)=>n!==e))}})}},V={render:()=>(0,b.jsx)(o,{files:[D,O,T],presentation:`dialog`,onRemove:()=>void 0,className:`max-w-lg`})},H=[`Thumbnail`,`Thumbnails`,`ThumbnailSizes`,`DialogChips`,`InlineText`,`TruncatedText`,`InlineImage`,`InlinePdf`,`InlineAudio`,`NoPreview`,`AttachmentList`,`AttachmentChips`],A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{}`,...A.parameters?.docs?.source},description:{story:`A thumbnail card: press it to open the image viewer in a dialog named by the file.`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex flex-wrap items-start gap-3">
      {[png, pdf, mp3, zip, json, csv].map(file => <FilePreview key={file.name} file={file} workerSrc={workerSrc} />)}
    </div>
}`,...j.parameters?.docs?.source},description:{story:`A PNG, a PDF, an MP3 and a ZIP: an image thumbnail, the PDF's first page, a play button (audio plays in the card)
and the archive's icon. JSON and CSV show their icon and open as text.`,...j.parameters?.docs?.description}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <FilePreview file={remoteImage} />
        <FilePreview file={remoteZip} />
        <FilePreview file={{
        name: 'notes.json',
        url: 'media/notes.json',
        type: 'application/json',
        size: 1_200
      }} />
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <FilePreview file={remoteImage} size="sm" />
        <FilePreview file={remoteZip} size="sm" />
      </div>
    </div>
}`,...M.parameters?.docs?.source},description:{story:`Thumbnails that render without waiting on anything: a remote image, an archive and a JSON file, in both sizes.`,...M.parameters?.docs?.description}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">
      <FilePreview file={remoteImage} presentation="dialog" />
      <FilePreview file={remoteZip} presentation="dialog" />
      <FilePreview file={json} presentation="dialog" />
    </div>
}`,...N.parameters?.docs?.source},description:{story:"`dialog`: compact chips with the file's icon, name and size, each opening its viewer.",...N.parameters?.docs?.description}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-2xl flex-col gap-4">
      <FilePreview file={json} presentation="inline" />
      <FilePreview file={csv} presentation="inline" height="12rem" />
    </div>
}`,...P.parameters?.docs?.source},description:{story:"`inline` JSON and CSV in a CodeBlock (JSON with colours).",...P.parameters?.docs?.description}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-2xl">
      <FilePreview file={csvFile('night-log.csv', 400)} presentation="inline" maxTextSize={512} />
    </div>
}`,...F.parameters?.docs?.source},description:{story:"Text past `maxTextSize` is cut, with a note saying how much is shown.",...F.parameters?.docs?.description}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-2xl">
      <FilePreview file={png} presentation="inline" height="20rem" />
    </div>
}`,...I.parameters?.docs?.source},description:{story:`An inline image in the zoomable ImageViewer.`,...I.parameters?.docs?.description}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-3xl">
      <FilePreview file={pdf} presentation="inline" height="28rem" workerSrc={workerSrc} />
    </div>
}`,...L.parameters?.docs?.source},description:{story:`An inline PDF in PdfViewer.`,...L.parameters?.docs?.description}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="max-w-md">
      <FilePreview file={mp3} presentation="inline" />
    </div>
}`,...R.parameters?.docs?.source},description:{story:`Inline audio in a compact AudioPlayer.`,...R.parameters?.docs?.description}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-sm">
      <FilePreview file={remoteZip} presentation="inline" />
    </div>
}`,...z.parameters?.docs?.source},description:{story:`A file without a viewer: its icon, name, kind, size and a download button.`,...z.parameters?.docs?.description}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function AttachmentListStory() {
    const [files, setFiles] = useState<PreviewFile[]>([png, pdf, mp3, zip, textFile()]);
    return <FilePreviewList files={files} workerSrc={workerSrc} onRemove={index => {
      setFiles(current => current.filter((_, at) => at !== index));
    }} />;
  }
}`,...B.parameters?.docs?.source},description:{story:`An attachment strip, such as a message's files, with remove buttons for a draft.`,...B.parameters?.docs?.description}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  render: () => <FilePreviewList files={[remoteImage, remoteZip, json]} presentation="dialog" onRemove={() => undefined} className="max-w-lg" />
}`,...V.parameters?.docs?.source},description:{story:`The same strip as compact chips.`,...V.parameters?.docs?.description}}}})))()}U();export{V as AttachmentChips,B as AttachmentList,N as DialogChips,R as InlineAudio,I as InlineImage,L as InlinePdf,P as InlineText,z as NoPreview,A as Thumbnail,M as ThumbnailSizes,j as Thumbnails,F as TruncatedText,H as __namedExportsOrder,k as default};