import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{a,r as o}from"./mediaImages-BJPUk9rJ.js";import{n as s,t as c}from"./Lightbox-0Piu6yE1.js";var l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{l=t(),o(),r(),s(),u=n(),d=a(),f={title:`Media/Lightbox`,component:c,args:{images:d}},p={tags:[`visual-page`],args:{defaultOpen:!0,defaultIndex:2,hasDownload:!0}},m={tags:[`visual-page`],args:{images:d.slice(3,4),defaultOpen:!0}},h={tags:[`!visual`],render:function(e){let[t,n]=(0,l.useState)(!1),[r,a]=(0,l.useState)(0);return(0,u.jsxs)(`div`,{className:`flex flex-col items-start gap-2`,children:[(0,u.jsx)(i,{onPress:()=>{n(!0)},children:`View planets`}),(0,u.jsxs)(`p`,{className:`text-sm text-fg-muted`,children:[`Last viewed: `,d[r]?.caption]}),(0,u.jsx)(c,{...e,isOpen:t,onOpenChange:n,index:r,onIndexChange:a})]})}},g=[`Open`,`SingleImage`,`Controlled`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  args: {
    defaultOpen: true,
    defaultIndex: 2,
    hasDownload: true
  }
}`,...p.parameters?.docs?.source},description:{story:`Open on the third planet: previous and next, swipe, arrow keys, the thumbnail strip and a download button.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  args: {
    images: planets.slice(3, 4),
    defaultOpen: true
  }
}`,...m.parameters?.docs?.source},description:{story:`A single image: no previous, next or thumbnails.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function Controlled(args) {
    const [isOpen, setOpen] = useState(false);
    const [index, setIndex] = useState(0);
    return <div className="flex flex-col items-start gap-2">
        <Button onPress={() => {
        setOpen(true);
      }}>
          View planets
        </Button>
        <p className="text-sm text-fg-muted">Last viewed: {planets[index]?.caption}</p>
        <Lightbox {...args} isOpen={isOpen} onOpenChange={setOpen} index={index} onIndexChange={setIndex} />
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:`Opened from a button and controlled by the page; focus returns to the button on close.`,...h.parameters?.docs?.description}}}})))()}_();export{h as Controlled,p as Open,m as SingleImage,g as __namedExportsOrder,f as default};