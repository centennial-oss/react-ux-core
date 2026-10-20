import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{a as t,c as n,i as r,n as i,o as a,r as o,s,t as c}from"./wind-yH3u7nll.js";import{n as l,t as u}from"./building-complex-Isfmz8_O.js";import{n as d,t as f}from"./factory-CN3Z9RDG.js";import{n as p,t as m}from"./house-CbRxxT45.js";import{n as h,t as g}from"./sun-CGLgNahj.js";import{t as _}from"./jsx-runtime-MKhVqBIO.js";import{n as v,t as y}from"./TileGrid-DyQRjwAm.js";import{n as b,t as x}from"./TilePicker-CnAIunOm.js";function S(e){let t=e.data?.icon;return(0,C.jsxs)(C.Fragment,{children:[t&&(0,C.jsx)(t,{"aria-hidden":`true`,className:`size-5`}),(0,C.jsx)(`span`,{className:`w-full truncate text-center text-xs`,children:e.label})]})}var C,w,T,E,D,O,k;function A(){return(A=e((()=>{n(),l(),d(),a(),p(),h(),r(),i(),v(),b(),C=_(),w=(e,t,n,r)=>({id:e,label:t,data:{icon:n},...r?{keywords:r}:{}}),T=[{id:`buildings`,title:`Buildings`,items:[w(`home`,`Home`,m,[`house`]),w(`office`,`Office`,u),w(`factory`,`Factory`,f,[`plant`]),w(`warehouse`,`Warehouse`,o)]},{id:`energy`,title:`Energy`,items:[w(`solar`,`Solar`,g,[`pv`]),w(`wind`,`Wind`,c),w(`battery`,`Battery`,s,[`storage`]),w(`gas`,`Gas`,t)]}],E={title:`Inputs/TilePicker`,component:x},D={tags:[`visual-page`],args:{rows:T,renderTile:S},render:()=>(0,C.jsx)(`div`,{className:`max-w-xs`,children:(0,C.jsx)(x,{label:`Site type`,rows:T,renderTile:S,searchLabel:`Search site types`,placeholder:`None`,defaultValue:`solar`,defaultOpen:!0})})},O={args:{rows:T,renderTile:S},render:()=>(0,C.jsx)(`div`,{className:`max-w-sm`,children:(0,C.jsx)(y,{"aria-label":`Site type`,rows:T,renderTile:S,selectionMode:`single`,defaultValue:[`factory`]})})},k=[`Open`,`InlineGrid`],D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  tags: ['visual-page'],
  args: {
    rows,
    renderTile
  },
  render: () => <div className="max-w-xs">
      <TilePicker label="Site type" rows={rows} renderTile={renderTile} searchLabel="Search site types" placeholder="None" defaultValue="solar" defaultOpen />
    </div>
}`,...D.parameters?.docs?.source},description:{story:"The base of IconPicker and FlagPicker: rows with titles, tiles the app draws, and a search. Arrow keys move across\nrows; `onChange` receives the option with its `data`.",...D.parameters?.docs?.description}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    rows,
    renderTile
  },
  render: () => <div className="max-w-sm">
      <TileGrid aria-label="Site type" rows={rows} renderTile={renderTile} selectionMode="single" defaultValue={['factory']} />
    </div>
}`,...O.parameters?.docs?.source},description:{story:`TileGrid on its own, inline: the same rows and keyboard, without the trigger and popover.`,...O.parameters?.docs?.description}}}})))()}A();export{O as InlineGrid,D as Open,k as __namedExportsOrder,E as default};