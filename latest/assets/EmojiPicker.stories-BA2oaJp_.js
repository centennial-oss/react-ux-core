import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{c as n,l as r,n as i,r as a,t as o}from"./EmojiPicker-PRVukHvP.js";import{t as s}from"./jsx-runtime-MKhVqBIO.js";var c,l,u,d,f,p,m;function h(){return(h=e((()=>{c=t(),n(),a(),l=s(),u={title:`Chat/EmojiPicker`,component:o,args:{onSelect:()=>void 0,shouldAutoFocus:!1},loaders:[async()=>(await r(),{})],render:e=>(0,l.jsx)(`div`,{className:`inline-flex rounded-card border border-border bg-surface-2 p-2 shadow-raised`,children:(0,l.jsx)(o,{...e})})},d={},f={args:{recent:[`👍`,`🔭`,`🌙`,`🎉`,`✨`],defaultSkinTone:4}},p={tags:[`visual-page`],render:function(){let[e,t]=(0,c.useState)([]),[n,r]=(0,c.useState)(1),[a,o]=(0,c.useState)(!0);return(0,l.jsxs)(`div`,{className:`flex min-h-[30rem] items-end gap-2`,children:[(0,l.jsx)(i,{onSelect:e=>{t(t=>[e,...t].slice(0,8))},recent:e,skinTone:n,onSkinToneChange:r,isOpen:a,onOpenChange:o,shouldAutoFocus:!1}),(0,l.jsx)(`output`,{className:`text-2xl`,children:e.join(` `)})]})}},m=[`Basic`,`RecentAndSkinTone`,`PickerButton`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{}`,...d.parameters?.docs?.source},description:{story:`Categories with jump buttons, keyword search, a preview of the focused emoji's name, and skin tones.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    recent: ['👍', '🔭', '🌙', '🎉', '✨'],
    defaultSkinTone: 4
  }
}`,...f.parameters?.docs?.source},description:{story:`Recently used emoji first, and a chosen skin tone.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  render: function PickerButtonStory() {
    const [chosen, setChosen] = useState<string[]>([]);
    const [tone, setTone] = useState<SkinTone>(1);
    const [isOpen, setOpen] = useState(true);
    return <div className="flex min-h-[30rem] items-end gap-2">
        <EmojiPickerButton onSelect={emoji => {
        setChosen(current => [emoji, ...current].slice(0, 8));
      }} recent={chosen} skinTone={tone} onSkinToneChange={setTone} isOpen={isOpen} onOpenChange={setOpen} shouldAutoFocus={false} />
        <output className="text-2xl">{chosen.join(' ')}</output>
      </div>;
  }
}`,...p.parameters?.docs?.source},description:{story:`Opened from a button, in a popover (a bottom sheet on phones); the choice shows beside it.`,...p.parameters?.docs?.description}}}})))()}h();export{d as Basic,p as PickerButton,f as RecentAndSkinTone,m as __namedExportsOrder,u as default};