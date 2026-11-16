import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,r as i}from"./ReactionBar-D83zk9wA.js";var a,o,s,c,l,u,d;function f(){return(f=e((()=>{a=t(),i(),o=n(),s={title:`Chat/ReactionBar`,component:r,args:{reactions:[{emoji:`🔭`,count:3,isMine:!1,names:[`Grace Hopper`,`Edwin Hubble`,`SkyGuide`]},{emoji:`👍`,count:2,isMine:!0,names:[`Ada Lovelace`,`Edwin Hubble`]},{emoji:`🌙`,count:1,isMine:!1,names:[`Grace Hopper`]}],onToggle:()=>void 0},render:function(e){let[t,n]=(0,a.useState)(e.reactions);return(0,o.jsx)(r,{...e,reactions:t,onToggle:e=>{n(t=>t.find(t=>t.emoji===e)?t.map(t=>t.emoji===e?{...t,isMine:!t.isMine,count:t.count+(t.isMine?-1:1)}:t).filter(e=>e.count>0):[...t,{emoji:e,count:1,isMine:!0,names:[`Ada Lovelace`]}])}})}},c={},l={args:{isDisabled:!0,canAdd:!1}},u={args:{quick:[`🌙`,`🔭`]}},d=[`Basic`,`ReadOnly`,`CustomQuick`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{}`,...c.parameters?.docs?.source},description:{story:`Toggle chips with counts; quick reactions (👍 here) come first. Who reacted is in the tooltip and the button's
description, and toggling announces the new count. The last button adds a reaction from the picker.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    isDisabled: true,
    canAdd: false
  }
}`,...l.parameters?.docs?.source},description:{story:`Read-only: reactions show, but can't be changed or added.`,...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    quick: ['🌙', '🔭']
  }
}`,...u.parameters?.docs?.source},description:{story:`Your own quick reactions.`,...u.parameters?.docs?.description}}}})))()}f();export{c as Basic,u as CustomQuick,l as ReadOnly,d as __namedExportsOrder,s as default};