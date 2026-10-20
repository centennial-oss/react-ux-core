import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{r as n,t as r}from"./RelativeTime-D7iqS0Pj.js";var i,a,o,s;function c(){return(c=e((()=>{n(),i=t(),a={title:`Display/RelativeTime`,component:r,args:{value:0}},o={render:function(){let e=Date.now();return(0,i.jsxs)(`ul`,{className:`flex flex-col gap-2 text-sm text-fg`,children:[(0,i.jsxs)(`li`,{children:[`Last reading `,(0,i.jsx)(r,{value:e-2e4})]}),(0,i.jsxs)(`li`,{children:[`Synced `,(0,i.jsx)(r,{value:e-3e5})]}),(0,i.jsxs)(`li`,{children:[`Created `,(0,i.jsx)(r,{value:e-2592e5,timeZone:`Europe/Berlin`})]}),(0,i.jsxs)(`li`,{children:[`Renews `,(0,i.jsx)(r,{value:e+10368e5})]})]})}},s=[`Examples`],o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: function ExamplesStory() {
    const now = Date.now();
    return <ul className="flex flex-col gap-2 text-sm text-fg">
        <li>
          Last reading <RelativeTime value={now - 20_000} />
        </li>
        <li>
          Synced <RelativeTime value={now - 5 * 60_000} />
        </li>
        <li>
          Created <RelativeTime value={now - 3 * 86_400_000} timeZone="Europe/Berlin" />
        </li>
        <li>
          Renews <RelativeTime value={now + 12 * 86_400_000} />
        </li>
      </ul>;
  }
}`,...o.parameters?.docs?.source},description:{story:`Hover, focus or tap a time to see the exact timestamp. Times stay current without one timer per element.`,...o.parameters?.docs?.description}}}})))()}c();export{o as Examples,s as __namedExportsOrder,a as default};