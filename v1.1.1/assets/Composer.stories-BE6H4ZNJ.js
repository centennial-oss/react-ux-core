import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{c as n,n as r,o as i,r as a,s as o,t as s}from"./Composer-BAO154Cz.js";import{t as c}from"./jsx-runtime-MKhVqBIO.js";var l,u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{l=t(),o(),a(),u=c(),d=()=>void 0,f={title:`Chat/Composer`,component:s,args:{onSubmit:d,loadMentions:n,commands:i,hasAttachments:!0,hasEmoji:!0},decorators:[e=>(0,u.jsx)(`div`,{className:`flex min-h-80 flex-col justify-end`,children:(0,u.jsx)(e,{})})]},p={},m={render:function(e){let[t,n]=(0,l.useState)(!0);return(0,u.jsx)(s,{...e,context:t?(0,u.jsx)(r,{author:`Ada Lovelace`,excerpt:`Focus drifted around 3 AM; I think the temperature dropped faster than forecast.`,onCancel:()=>{n(!1)}}):void 0})}},h={args:{sendKey:`mod-enter`,minRows:3,defaultValue:`Night log:
- M51 mosaic, 4 of 6 panels`}},g={args:{maxLength:80,defaultValue:`Clouds clear by 22:00, humidity under 70%. We should get a full night on M51.`}},_={tags:[`!visual`],args:{defaultValue:`Dome closing at dawn`,onSubmit:()=>new Promise((e,t)=>{setTimeout(()=>{t(Error(`offline`))},800)})}},v={args:{isDisabled:!0,placeholder:`You can’t post in this channel`}},y=[`Basic`,`Replying`,`ModEnter`,`MaxLength`,`SendFails`,`Disabled`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{}`,...p.parameters?.docs?.source},description:{story:`Type "@" to mention someone, "/" at the start for commands, paste or drop an image to attach it, or open the
emoji picker. Enter sends; Shift+Enter adds a line. The (i) button lists the shortcuts.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: function ReplyingStory(args) {
    const [isReplying, setReplying] = useState(true);
    return <Composer {...args} context={isReplying ? <ComposerReplyContext author="Ada Lovelace" excerpt="Focus drifted around 3 AM; I think the temperature dropped faster than forecast." onCancel={() => {
      setReplying(false);
    }} /> : undefined} />;
  }
}`,...m.parameters?.docs?.source},description:{story:`Replying to a message: the context bar above the text, with a cancel button.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    sendKey: 'mod-enter',
    minRows: 3,
    defaultValue: 'Night log:\\n- M51 mosaic, 4 of 6 panels'
  }
}`,...h.parameters?.docs?.source},description:{story:`⌘/Ctrl+Enter sends and Enter adds a line, for longer notes.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    maxLength: 80,
    defaultValue: 'Clouds clear by 22:00, humidity under 70%. We should get a full night on M51.'
  }
}`,...g.parameters?.docs?.source},description:{story:`Near the length limit, a counter shows; past it, sending is blocked.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    defaultValue: 'Dome closing at dawn',
    onSubmit: () => new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('offline'));
      }, 800);
    })
  }
}`,..._.parameters?.docs?.source},description:{story:`Sending fails: the text stays, with an error.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    isDisabled: true,
    placeholder: 'You can’t post in this channel'
  }
}`,...v.parameters?.docs?.source}}}})))()}b();export{p as Basic,v as Disabled,g as MaxLength,h as ModEnter,m as Replying,_ as SendFails,y as __namedExportsOrder,f as default};