import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./cn-BnE6eITj.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{n as a,t as o}from"./useControllableState-H9u9kSf4.js";import{t as s}from"./math-CJ-pjqGV.js";import{i as c,n as l,r as u}from"./music-DoHyH6Ij.js";import{m as d,p as f}from"./pitch-C7cgygzB.js";import{n as p,t as m}from"./MusicTransport-BBLgqEkY.js";import{n as h,r as g,t as _}from"./musicSynth-DfbxeQ4H.js";import{n as v,t as y}from"./beatClock-BalOEyH-.js";function b({rows:e,stepCount:t=16,value:n,defaultValue:i=C,onChange:o,currentStep:c,onAudition:l,stepsPerBeat:u=4,defaultVelocity:f=100,isDisabled:p=!1,"aria-label":m,"aria-labelledby":h,className:g,ref:_}){let v=d(),y=(0,x.useId)(),b=(0,x.useId)(),[T,E]=a(n,i,o),D=(0,x.useRef)(T);(0,x.useLayoutEffect)(()=>{D.current=T});let O=(0,x.useRef)(null),k=l!==void 0,[A,j]=(0,x.useState)({row:0,step:0}),M=Math.min(A.row,Math.max(0,e.length-1)),N=Math.min(A.step,t-1),P=(e,t)=>D.current[e]?.[t]??0,F=(n,r,i)=>{let a=D.current;if((a[n]?.[r]??0)===i)return;let o={};for(let n of e)o[n.id]=Array.from({length:t},(e,t)=>a[n.id]?.[t]??0);let s=o[n]??Array.from({length:t},()=>0);s[r]=i,o[n]=s,D.current=o,E(o),i>0&&l?.(n)},I=(e,t)=>{let n=P(e,t)>0?0:f;return F(e,t,n),n},L=n=>{let r=s(n.row,0,e.length-1),i=s(n.step,k?-1:0,t-1);j({row:r,step:i}),O.current?.querySelector(`[data-cell="${String(r)}:${String(i)}"]`)?.focus()},R=(n,r)=>{let i=k?-1:0,a=n.ctrlKey||n.metaKey,o={ArrowLeft:{row:r.row,step:r.step-1},ArrowRight:{row:r.row,step:r.step+1},ArrowUp:{row:r.row-1,step:r.step},ArrowDown:{row:r.row+1,step:r.step},Home:a?{row:0,step:i}:{row:r.row,step:i},End:a?{row:e.length-1,step:t-1}:{row:r.row,step:t-1}}[n.key];if(o){n.preventDefault(),L(o);return}let s=e[r.row];if(!s||r.step<0||p)return;let c=n.key===`+`||n.key===`=`?1:n.key===`-`||n.key===`_`?-1:0;if(c!==0){n.preventDefault();let e=P(s.id,r.step),t=Math.max(1,Math.min(127,(e||f)+c*w));F(s.id,r.step,t)}},z=(0,x.useRef)(null),B=(0,x.useRef)(!1),V=(e,t)=>{let n=document.elementFromPoint(e,t),r=n instanceof Element?n.closest(`[data-step]`):null;return!r||!O.current?.contains(r)?null:{rowId:r.dataset.row??``,step:Number(r.dataset.step)}},H=(e,t,n)=>{B.current=e.pointerType!==`touch`,!p&&B.current&&e.button===0&&(z.current={pointerId:e.pointerId,velocity:I(t,n)})},U=e=>{let t=z.current;if(t?.pointerId!==e.pointerId)return;let n=V(e.clientX,e.clientY);n&&F(n.rowId,n.step,t.velocity)},W=e=>{z.current?.pointerId===e.pointerId&&(z.current=null)},G=Array.from({length:t},(e,t)=>t),K=`min-w-9 flex-1 pointer-coarse:min-w-11`;return(0,S.jsxs)(`div`,{ref:_,className:r(`relative min-w-0 overflow-x-auto overscroll-x-contain rounded-card border border-border bg-surface-1`,g),children:[(0,S.jsxs)(`div`,{ref:O,role:`grid`,"aria-label":h?void 0:m??v.stepSequencerLabel,"aria-labelledby":h,"aria-describedby":y,"aria-rowcount":e.length+1,"aria-colcount":t+1,"aria-disabled":p||void 0,className:`flex w-full min-w-fit flex-col gap-1 p-2`,onPointerMove:U,onPointerUp:W,onPointerCancel:W,children:[(0,S.jsxs)(`div`,{role:`row`,"aria-rowindex":1,className:`flex gap-1`,children:[(0,S.jsx)(`div`,{role:`columnheader`,"aria-colindex":1,className:`sticky left-0 z-10 flex w-20 shrink-0 items-end bg-surface-1 text-xs font-medium text-fg-muted sm:w-24`,children:(0,S.jsx)(`span`,{className:`sr-only`,children:v.stepSequencerSounds})}),G.map(e=>{let t=e===c;return(0,S.jsx)(`div`,{role:`columnheader`,"aria-colindex":e+2,"data-current":t||void 0,className:r(K,`border-b-2 border-transparent pb-0.5 text-center text-xs text-fg-muted tabular-nums`,e%u===0&&`font-medium text-fg`,t&&`border-accent-solid font-semibold text-accent-fg`),children:e+1},e)})]}),e.map((e,t)=>(0,S.jsxs)(`div`,{role:`row`,"aria-rowindex":t+2,className:`flex gap-1`,children:[(0,S.jsx)(`div`,{role:`rowheader`,"aria-colindex":1,className:`sticky left-0 z-10 flex w-20 shrink-0 items-center bg-surface-1 pe-1 sm:w-24`,children:k?(0,S.jsx)(`button`,{type:`button`,"data-cell":`${String(t)}:-1`,tabIndex:M===t&&N===-1?0:-1,disabled:p,"aria-label":v.stepSequencerAudition({row:e.label}),className:`hit-area relative w-full truncate rounded-control px-2 py-1.5 text-start text-sm font-medium text-fg outline-none hover:bg-surface-2 focus-visible:focus-ring disabled:opacity-50`,onFocus:()=>{j({row:t,step:-1})},onKeyDown:e=>{R(e,{row:t,step:-1})},onClick:()=>{l(e.id)},children:e.label}):(0,S.jsx)(`span`,{className:`truncate px-2 text-sm font-medium text-fg`,children:e.label})}),G.map(n=>{let i=T[e.id]?.[n]??0,a=i>0,o=n===c,s=n%u===0,l=Math.floor(n/u)%2==0;return(0,S.jsxs)(`div`,{role:`gridcell`,"aria-colindex":n+2,className:r(K,`flex`),children:[(0,S.jsx)(`button`,{type:`button`,"data-cell":`${String(t)}:${String(n)}`,"data-row":e.id,"data-step":n,"data-current":o||void 0,tabIndex:M===t&&N===n?0:-1,disabled:p,"aria-pressed":a,"aria-label":v.stepSequencerCell({row:e.label,step:n+1}),"aria-describedby":a?`${b}-${String(t)}-${String(n)}`:void 0,className:r(`relative flex h-9 w-full cursor-pointer items-end overflow-hidden rounded-control border outline-none pointer-coarse:h-11`,`focus-visible:z-10 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-50`,l?`border-border bg-surface-2`:`border-border bg-surface-3`,s&&`border-border-strong`,o&&`border-accent-solid bg-accent-bg`,a&&`border-accent-solid`),onFocus:()=>{j({row:t,step:n})},onKeyDown:e=>{R(e,{row:t,step:n})},onPointerDown:t=>{H(t,e.id,n)},onClick:t=>{t.detail>0&&B.current||I(e.id,n)},children:a&&(0,S.jsx)(`span`,{"aria-hidden":`true`,className:`pointer-events-none w-full rounded-[inherit] bg-accent-solid`,style:{height:`${String(Math.round(i/127*100))}%`}})}),a&&(0,S.jsx)(`span`,{id:`${b}-${String(t)}-${String(n)}`,hidden:!0,children:v.stepSequencerVelocity({velocity:i})})]},n)})]},e.id))]}),(0,S.jsx)(`span`,{id:y,hidden:!0,children:v.stepSequencerInstructions})]})}var x,S,C,w;function T(){return(T=e((()=>{x=t(),n(),o(),f(),S=i(),C={},w=16,b.__docgenInfo={description:`A drum-machine style grid of steps with velocities.`,methods:[],displayName:`StepSequencer`,props:{rows:{required:!0,tsType:{name:`unknown`},description:``},stepCount:{required:!1,tsType:{name:`number`},description:`Steps per row. Defaults to 16.`,defaultValue:{value:`16`,computed:!1}},value:{required:!1,tsType:{name:`Readonly`,elements:[{name:`Record`,elements:[{name:`string`},{name:`unknown`}],raw:`Record<string, readonly number[]>`}],raw:`Readonly<Record<string, readonly number[]>>`},description:`The pattern, controlled. Rows missing from it are all off.`},defaultValue:{required:!1,tsType:{name:`Readonly`,elements:[{name:`Record`,elements:[{name:`string`},{name:`unknown`}],raw:`Record<string, readonly number[]>`}],raw:`Readonly<Record<string, readonly number[]>>`},description:`The initial pattern, uncontrolled.`,defaultValue:{value:`{}`,computed:!1}},onChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(value: StepPattern) => void`,signature:{arguments:[{type:{name:`Record`,elements:[{name:`string`},{name:`Array`,elements:[{name:`number`}],raw:`number[]`}],raw:`Record<string, number[]>`},name:`value`}],return:{name:`void`}}},description:``},currentStep:{required:!1,tsType:{name:`number`},description:`The step that's playing (0-based), highlighted down the grid.`},onAudition:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(rowId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`rowId`}],return:{name:`void`}}},description:`Called when a row name is pressed or a step turned on, so the app can play the row's sound.`},stepsPerBeat:{required:!1,tsType:{name:`number`},description:`Steps per beat, for shading beat groups. Defaults to 4.`,defaultValue:{value:`4`,computed:!1}},defaultVelocity:{required:!1,tsType:{name:`number`},description:`Velocity of a step when it's turned on. Defaults to 100.`,defaultValue:{value:`100`,computed:!1}},isDisabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},"aria-label":{required:!1,tsType:{name:`string`},description:``},"aria-labelledby":{required:!1,tsType:{name:`string`},description:``},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``}}}})))()}var E,D,O,k,A,j,M,N;function P(){return(P=e((()=>{E=t(),c(),h(),y(),p(),T(),D=i(),O={title:`Music/StepSequencer`,component:b,parameters:{layout:`padded`},args:{rows:u}},k={args:{defaultValue:l,currentStep:4,onAudition:()=>void 0}},A={args:{stepCount:8,stepsPerBeat:2}},j={args:{defaultValue:l,isDisabled:!0}},M={tags:[`!visual`],render:function(){let[e,t]=(0,E.useState)(l),[n,r]=(0,E.useState)(110),[i]=(0,E.useState)(()=>_()),a=(0,E.useRef)(e);(0,E.useLayoutEffect)(()=>{a.current=e});let{beat:o,isPlaying:s,play:c,pause:d,stop:f}=v({bpm:n,audioContext:i,loop:{start:0,end:4},onSchedule:e=>{for(let t=Math.ceil(e.from*4);t<e.to*4;t++)for(let n of u){let r=a.current[n.id]?.[t%16]??0;r>0&&g(n.id,r,e.timeAt(t/4))}}});return(0,D.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,D.jsx)(m,{isPlaying:s,onPlayingChange:e=>{e?c():d()},onStop:f,position:o,bpm:n,onBpmChange:r}),(0,D.jsx)(b,{rows:u,value:e,onChange:t,currentStep:s?Math.floor(o*4)%16:void 0,onAudition:e=>{g(e)}})]})}},N=[`DrumPattern`,`Empty`,`Disabled`,`Playback`],k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: drumPattern,
    currentStep: 4,
    onAudition: () => undefined
  }
}`,...k.parameters?.docs?.source},description:{story:`A 16-step drum pattern with step 5 playing. Fill shows velocity; row names audition their sound.`,...k.parameters?.docs?.description}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    stepCount: 8,
    stepsPerBeat: 2
  }
}`,...A.parameters?.docs?.source},description:{story:`An empty 8-step pattern in groups of two.`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: drumPattern,
    isDisabled: true
  }
}`,...j.parameters?.docs?.source},description:{story:`Disabled.`,...j.parameters?.docs?.description}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function Render() {
    const [pattern, setPattern] = useState<StepPattern>(drumPattern);
    const [bpm, setBpm] = useState(110);
    const [context] = useState(() => audioContext());
    const patternRef = useRef(pattern);
    useLayoutEffect(() => {
      patternRef.current = pattern;
    });
    const {
      beat,
      isPlaying,
      play,
      pause,
      stop
    } = useBeatClock({
      bpm,
      audioContext: context,
      loop: {
        start: 0,
        end: 4
      },
      onSchedule: (window: BeatWindow) => {
        for (let step = Math.ceil(window.from * 4); step < window.to * 4; step++) {
          for (const row of drumRows) {
            const velocity = patternRef.current[row.id]?.[step % 16] ?? 0;
            if (velocity > 0) {
              playDrum(row.id, velocity, window.timeAt(step / 4));
            }
          }
        }
      }
    });
    return <div className="flex flex-col gap-3">
        <MusicTransport isPlaying={isPlaying} onPlayingChange={isPlaying => {
        if (isPlaying) {
          play();
        } else {
          pause();
        }
      }} onStop={stop} position={beat} bpm={bpm} onBpmChange={setBpm} />
        <StepSequencer rows={drumRows} value={pattern} onChange={setPattern} currentStep={isPlaying ? Math.floor(beat * 4) % 16 : undefined} onAudition={row => {
        playDrum(row);
      }} />
      </div>;
  }
}`,...M.parameters?.docs?.source},description:{story:`Playback with a transport: steps are sixteenth notes scheduled ahead on the Web Audio clock.`,...M.parameters?.docs?.description}}}})))()}P();export{j as Disabled,k as DrumPattern,A as Empty,M as Playback,N as __namedExportsOrder,O as default};