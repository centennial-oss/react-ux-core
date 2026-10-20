import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./FileField-DYnrCYF_.js";import{o as a,r as o}from"./mediaImages-BJPUk9rJ.js";function s(e,t,n=`application/pdf`){return new File([new Uint8Array(t)],e,{type:n})}function c(e,t){let n=a({width:160,height:120,seed:t}),r=atob(n.slice(n.indexOf(`,`)+1)),i=Uint8Array.from(r,e=>e.charCodeAt(0));return new File([i],e,{type:`image/png`})}var l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{l=t(),o(),r(),u=n(),d={title:`Inputs/FileField`,component:i,args:{label:`Attachments`,description:`PDF or images, up to 5 MB each`}},f=(e,{onProgress:t,signal:n})=>new Promise((r,i)=>{let a=0,o=()=>{n.aborted?i(new DOMException(`Cancelled`,`AbortError`)):(a+=.1,t(a),a<1?setTimeout(o,200):e.name.includes(`fail`)?i(Error(`The server rejected ${e.name}`)):r(`stored/${e.name}`))};setTimeout(o,200)}),p={tags:[`!visual`],args:{allowsMultiple:!0,accept:[`application/pdf`,`image/*`],maxSize:5242880,maxFiles:4,upload:f}},m={render:()=>(0,u.jsx)(i,{label:`Attachments`,description:`PDF or images, up to 5 MB each`,allowsMultiple:!0,upload:f,className:`max-w-lg`,defaultValue:[{id:`1`,file:s(`site-survey.pdf`,482e3),status:`pending`},{id:`2`,file:s(`roof-photo.jpg`,24e5,`image/jpeg`),status:`uploading`,progress:.4},{id:`3`,file:s(`contract-signed.pdf`,121e4),status:`done`},{id:`4`,file:s(`meter-readings.pdf`,96e3),status:`error`,error:`The server rejected meter-readings.pdf`}]})},h={tags:[`!visual`],render:function(){let[e,t]=(0,l.useState)([{id:`a`,file:s(`quarterly-report-with-a-very-long-name-final-v2.pdf`,31e5),status:`uploading`,progress:.7},{id:`b`,file:s(`notes.pdf`,12e3),status:`error`,error:`Virus scan failed`}]);return(0,u.jsx)(i,{label:`Reports`,allowsMultiple:!0,value:e,onChange:t,className:`max-w-lg`})}},g={render:()=>(0,u.jsxs)(`div`,{className:`flex max-w-lg flex-col gap-6`,children:[(0,u.jsx)(i,{label:`Signed contract`,description:`One PDF`,accept:[`application/pdf`],isRequired:!0}),(0,u.jsx)(i,{label:`Proof of address`,isInvalid:!0,errorMessage:`Attach a document dated in the last 3 months`}),(0,u.jsx)(i,{label:`Archived files`,isDisabled:!0}),(0,u.jsx)(i,{label:`Side label`,labelPosition:`side`,dropLabel:`Drop a CSV here`,accept:[`.csv`]})]})},_={render:()=>(0,u.jsx)(i,{label:`Observation photos`,description:`Images, PDFs or archives`,allowsMultiple:!0,hasPreviews:!0,className:`max-w-lg`,defaultValue:[{id:`1`,file:c(`ring-nebula.png`,3),status:`pending`},{id:`2`,file:s(`seeing-log.pdf`,96e3),status:`done`},{id:`3`,file:s(`raw-frames.zip`,184e5,`application/zip`),status:`uploading`,progress:.6},{id:`4`,name:`saturn.png`,size:52e3,type:`image/png`,previewSrc:a({width:160,height:120,seed:9}),status:`done`},{id:`5`,file:s(`readings.csv`,2048,`text/csv`),status:`pending`}]})},v=[`Playground`,`UploadStates`,`AppReportedProgress`,`States`,`WithPreviews`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    allowsMultiple: true,
    accept: ['application/pdf', 'image/*'],
    maxSize: 5 * 1024 * 1024,
    maxFiles: 4,
    upload: fakeUpload
  }
}`,...p.parameters?.docs?.source},description:{story:`Uploads as files are added; name a file with "fail" in it to see an error and Retry.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <FileField label="Attachments" description="PDF or images, up to 5 MB each" allowsMultiple upload={fakeUpload} className="max-w-lg" defaultValue={[{
    id: '1',
    file: makeFile('site-survey.pdf', 482_000),
    status: 'pending'
  }, {
    id: '2',
    file: makeFile('roof-photo.jpg', 2_400_000, 'image/jpeg'),
    status: 'uploading',
    progress: 0.4
  }, {
    id: '3',
    file: makeFile('contract-signed.pdf', 1_210_000),
    status: 'done'
  }, {
    id: '4',
    file: makeFile('meter-readings.pdf', 96_000),
    status: 'error',
    error: 'The server rejected meter-readings.pdf'
  }]} />
}`,...m.parameters?.docs?.source},description:{story:`Every row state: chosen, uploading, uploaded, and failed (with Retry because the field runs the upload).`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function AppReported() {
    const [items, setItems] = useState<FileItem[]>([{
      id: 'a',
      file: makeFile('quarterly-report-with-a-very-long-name-final-v2.pdf', 3_100_000),
      status: 'uploading',
      progress: 0.7
    }, {
      id: 'b',
      file: makeFile('notes.pdf', 12_000),
      status: 'error',
      error: 'Virus scan failed'
    }]);
    return <FileField label="Reports" allowsMultiple value={items} onChange={setItems} className="max-w-lg" />;
  }
}`,...h.parameters?.docs?.source},description:{story:"The app runs the uploads and reports progress by updating the items (controlled `value`).",...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-lg flex-col gap-6">
      <FileField label="Signed contract" description="One PDF" accept={['application/pdf']} isRequired />
      <FileField label="Proof of address" isInvalid errorMessage="Attach a document dated in the last 3 months" />
      <FileField label="Archived files" isDisabled />
      <FileField label="Side label" labelPosition="side" dropLabel="Drop a CSV here" accept={['.csv']} />
    </div>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <FileField label="Observation photos" description="Images, PDFs or archives" allowsMultiple hasPreviews className="max-w-lg" defaultValue={[{
    id: '1',
    file: pngFile('ring-nebula.png', 3),
    status: 'pending'
  }, {
    id: '2',
    file: makeFile('seeing-log.pdf', 96_000),
    status: 'done'
  }, {
    id: '3',
    file: makeFile('raw-frames.zip', 18_400_000, 'application/zip'),
    status: 'uploading',
    progress: 0.6
  }, {
    id: '4',
    name: 'saturn.png',
    size: 52_000,
    type: 'image/png',
    previewSrc: starfieldImage({
      width: 160,
      height: 120,
      seed: 9
    }),
    status: 'done'
  }, {
    id: '5',
    file: makeFile('readings.csv', 2_048, 'text/csv'),
    status: 'pending'
  }]} />
}`,..._.parameters?.docs?.source},description:{story:"`hasPreviews`: images show a thumbnail (an object URL, revoked when the file is removed), other files the icon for\ntheir kind. A stored file without `file` shows its `previewSrc`. Full previews come from `/media`'s FilePreview.",..._.parameters?.docs?.description}}}})))()}y();export{h as AppReportedProgress,p as Playground,g as States,m as UploadStates,_ as WithPreviews,v as __namedExportsOrder,d as default};