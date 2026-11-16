import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./cn-BnE6eITj.js";import{n as r,r as i}from"./Button-CVI84LfO.js";import{t as a}from"./jsx-runtime-MKhVqBIO.js";import{a as o,s}from"./context-BPba8fk9.js";import{n as c,r as l,t as u}from"./Popover-DW4jg2YI.js";import{n as d,t as f}from"./StatusDot-CkmPgM6I.js";import{i as p,n as m,r as h,t as g}from"./Avatar-KjKAvQyI.js";import{a as _,i as v,r as y}from"./people-0DzGjKZ5.js";function b({people:e,max:t=4,size:i=`sm`,onOverflowPress:a,className:o,ref:l}){let d=s(h),p=e.length>t?e.slice(0,Math.max(0,t)):e,m=e.slice(p.length),_=d.avatarGroupMoreLabel({count:m.length}),v=(0,x.jsx)(r,{"aria-label":_,onPress:a,className:n(`hit-area relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full`,`bg-neutral-bg font-semibold text-neutral-fg tabular-nums ring-2 ring-surface-1 outline-none`,`data-focus-visible:focus-ring data-hovered:brightness-95 data-pressed:brightness-90`,C[i],S[i]),children:d.avatarGroupMore({count:m.length})});return(0,x.jsxs)(`div`,{ref:l,role:`group`,"aria-label":d.avatarGroupLabel({count:e.length}),className:n(`flex min-w-0 items-center`,o),children:[p.map((e,t)=>(0,x.jsx)(g,{...e,size:i,className:n(`ring-2 ring-surface-1`,S[i],e.className)},`${e.name}-${String(t)}`)),m.length>0&&(a?v:(0,x.jsxs)(c,{children:[v,(0,x.jsx)(u,{"aria-label":_,placement:`bottom end`,children:(0,x.jsx)(`ul`,{className:`flex max-h-72 flex-col gap-2 overflow-y-auto`,children:m.map((e,t)=>(0,x.jsxs)(`li`,{className:`flex min-w-0 items-center gap-2 text-sm text-fg`,children:[(0,x.jsx)(g,{...e,size:`sm`,presence:void 0,"aria-hidden":`true`}),(0,x.jsx)(`span`,{className:`min-w-0 flex-1 truncate`,children:e.name}),e.presence&&(0,x.jsx)(f,{tone:e.presence.tone,label:e.presence.label,size:`sm`,className:`shrink-0 text-fg-muted`})]},`${e.name}-${String(t)}`))})})]}))]})}var x,S,C;function w(){return(w=e((()=>{i(),o(),t(),l(),d(),m(),p(),x=a(),S={xs:`-ms-1 first:ms-0`,sm:`-ms-1.5 first:ms-0`,md:`-ms-2 first:ms-0`,lg:`-ms-2.5 first:ms-0`,xl:`-ms-3 first:ms-0`},C={xs:`size-6 text-[0.625rem]`,sm:`size-8 text-xs`,md:`size-9 text-xs`,lg:`size-12 text-sm`,xl:`size-16 text-base`},b.__docgenInfo={description:'A row of overlapping avatars that ends with "+N" when there are more than `max`. The "+N" button opens a list of\nthe others (or calls `onOverflowPress`). A group named "N people".',methods:[],displayName:`AvatarGroup`,props:{people:{required:!0,tsType:{name:`unknown`},description:"The people, in order. Each takes Avatar's props (`name`, `src`, `presence`, `color`…)."},max:{required:!1,tsType:{name:`number`},description:`How many avatars show before the "+N" button. Defaults to 4.`,defaultValue:{value:`4`,computed:!1}},size:{required:!1,tsType:{name:`union`,raw:`'xs' | 'sm' | 'md' | 'lg' | 'xl'`,elements:[{name:`literal`,value:`'xs'`},{name:`literal`,value:`'sm'`},{name:`literal`,value:`'md'`},{name:`literal`,value:`'lg'`},{name:`literal`,value:`'xl'`}]},description:"Defaults to `sm`.",defaultValue:{value:`'sm'`,computed:!1}},onOverflowPress:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Called by the "+N" button instead of opening the list of the other people.`},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``}}}})))()}var T,E,D,O,k,A,j,M,N,P;function F(){return(F=e((()=>{v(),m(),w(),T=a(),E={title:`Display/Avatar`,component:g,args:{name:`Ada Lovelace`}},D=_[0],O={render:()=>(0,T.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,T.jsx)(g,{name:`Grace Hopper`}),(0,T.jsx)(g,{name:D.name,src:D.src}),(0,T.jsx)(g,{name:`Alan Turing`,src:y}),(0,T.jsx)(g,{name:`Vera Rubin`,initials:`VR`,shape:`square`})]})},k={render:()=>(0,T.jsx)(`div`,{className:`flex flex-col gap-3`,children:[`circle`,`square`].map(e=>(0,T.jsx)(`div`,{className:`flex flex-wrap items-end gap-3`,children:[`xs`,`sm`,`md`,`lg`,`xl`].map(t=>(0,T.jsx)(g,{name:`Katherine Johnson`,size:t,shape:e},t))},e))})},A={render:()=>(0,T.jsxs)(`div`,{className:`flex flex-wrap items-end gap-4`,children:[(0,T.jsx)(g,{name:D.name,src:D.src,presence:{tone:`success`,label:`Online`}}),(0,T.jsx)(g,{name:`Grace Hopper`,presence:{tone:`warning`,label:`Away`},size:`lg`}),(0,T.jsx)(g,{name:`Alan Turing`,presence:{tone:`danger`,label:`Do not disturb`},size:`xl`,shape:`square`}),(0,T.jsx)(g,{name:`Carl Sagan`,presence:{tone:`neutral`,label:`Offline`},size:`sm`})]})},j=[`chart-1`,`chart-2`,`chart-3`,`chart-4`,`chart-5`,`chart-6`,`chart-7`,`chart-8`,`chart-9`,`chart-10`,`accent`,`success`,`warning`,`danger`,`neutral`],M={render:()=>(0,T.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:j.map(e=>(0,T.jsx)(g,{name:e,initials:e.startsWith(`chart-`)?e.slice(6):e.slice(0,2).toUpperCase(),color:e},e))})},N={render:()=>(0,T.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,T.jsx)(b,{people:_.map((e,t)=>({...e,presence:t===0?{tone:`success`,label:`Online`}:void 0}))}),(0,T.jsx)(b,{people:_,max:3,size:`md`}),(0,T.jsx)(b,{people:_.slice(0,3),size:`lg`})]})},P=[`Default`,`Sizes`,`Presence`,`Colors`,`Group`],O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-3">
      <Avatar name="Grace Hopper" />
      <Avatar name={ada.name} src={ada.src} />
      <Avatar name="Alan Turing" src={brokenPicture} />
      <Avatar name="Vera Rubin" initials="VR" shape="square" />
    </div>
}`,...O.parameters?.docs?.source},description:{story:`Initials on a colour picked from the name, or a picture. A picture that fails to load falls back to initials.`,...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3">
      {(['circle', 'square'] as const).map(shape => <div key={shape} className="flex flex-wrap items-end gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(size => <Avatar key={size} name="Katherine Johnson" size={size} shape={shape} />)}
        </div>)}
    </div>
}`,...k.parameters?.docs?.source},description:{story:`Five sizes, from 24 to 64 px, in both shapes.`,...k.parameters?.docs?.description}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-end gap-4">
      <Avatar name={ada.name} src={ada.src} presence={{
      tone: 'success',
      label: 'Online'
    }} />
      <Avatar name="Grace Hopper" presence={{
      tone: 'warning',
      label: 'Away'
    }} size="lg" />
      <Avatar name="Alan Turing" presence={{
      tone: 'danger',
      label: 'Do not disturb'
    }} size="xl" shape="square" />
      <Avatar name="Carl Sagan" presence={{
      tone: 'neutral',
      label: 'Offline'
    }} size="sm" />
    </div>
}`,...A.parameters?.docs?.source},description:{story:`A presence dot in StatusDot's tones and shapes; its label joins the avatar's name ("Ada Lovelace, Online").`,...A.parameters?.docs?.description}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">
      {colors.map(color => <Avatar key={color} name={color} initials={color.startsWith('chart-') ? color.slice(6) : color.slice(0, 2).toUpperCase()} color={color} />)}
    </div>
}`,...M.parameters?.docs?.source},description:{story:`Every colour: the chart palette as tints under the text colour, and the tones' soft pairs.`,...M.parameters?.docs?.description}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <AvatarGroup people={people.map((person, index) => ({
      ...person,
      presence: index === 0 ? {
        tone: 'success',
        label: 'Online'
      } : undefined
    }))} />
      <AvatarGroup people={people} max={3} size="md" />
      <AvatarGroup people={people.slice(0, 3)} size="lg" />
    </div>
}`,...N.parameters?.docs?.source},description:{story:`Overlapping avatars ending with "+N", which opens a list of the others. The group is named "8 people".`,...N.parameters?.docs?.description}}}})))()}F();export{M as Colors,O as Default,N as Group,A as Presence,k as Sizes,P as __namedExportsOrder,E as default};