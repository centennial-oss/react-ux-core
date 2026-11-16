import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./cn-BnE6eITj.js";import{n as r,t as i}from"./createLucideIcon-BXqG86fR.js";import{i as a,n as o,r as s,t as c}from"./minimize-2-LIufXM2-.js";import{n as l,t as u}from"./VideoPlayer-DGw1TqSZ.js";import{t as d}from"./jsx-runtime-MKhVqBIO.js";import{n as f,t as p}from"./useControllableState-H9u9kSf4.js";import{n as m,t as h}from"./IconButton-B63kwQhA.js";import{n as g,t as _}from"./Tooltip-hGlsFL6n.js";import{a as v,t as y}from"./Layout-C_4VBnI9.js";import{n as b,t as x}from"./StatusDot-CkmPgM6I.js";import{n as S,t as C}from"./messages-CQuz_Qib.js";import{c as w,i as T,r as E,t as D}from"./media-CeW1V545.js";var O,k;function A(){return(A=e((()=>{r(),O={name:`headphones`,size:24,node:[[`path`,{d:`M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3`,key:`1xhozi`}]]},O.node,k=i(O)})))()}function j({status:e,className:t}){return(0,N.jsx)(`span`,{className:n(`inline-flex items-center rounded-full border border-border bg-surface-1/90 px-2 py-0.5 text-xs font-medium shadow-raised`,t),children:(0,N.jsx)(x,{tone:e.tone,label:e.label,size:`sm`})})}function M({status:e,isLive:t=!0,isMuted:n=!0,shouldAutoPlay:r=!0,controlsLayout:i=`compact`,shouldPauseOffscreen:a=!0,hasQualityMenu:o=!0,overlay:s,...c}){return(0,N.jsx)(u,{...c,isLive:t,isMuted:n,shouldAutoPlay:r,controlsLayout:i,shouldPauseOffscreen:a,hasQualityMenu:o,overlay:e||s!==void 0?(0,N.jsxs)(`span`,{className:`flex items-center gap-1`,children:[s,e&&(0,N.jsx)(j,{status:e})]}):void 0})}var N;function P(){return(P=e((()=>{b(),t(),l(),N=d(),j.__docgenInfo={description:`The status chip over a preview: a dot whose shape follows the tone, and the label.`,methods:[],displayName:`StreamStatusChip`,props:{status:{required:!0,tsType:{name:`StreamStatus`},description:``},className:{required:!1,tsType:{name:`string`},description:``}}},M.__docgenInfo={description:`A live preview with a status chip; muted autoplay, compact controls and off-screen pausing by default.`,methods:[],displayName:`StreamPreview`,props:{src:{required:!0,tsType:{name:`string`},description:``},type:{required:!1,tsType:{name:`union`,raw:`'auto' | 'hls' | 'dash' | 'progressive'`,elements:[{name:`literal`,value:`'auto'`},{name:`literal`,value:`'hls'`},{name:`literal`,value:`'dash'`},{name:`literal`,value:`'progressive'`}]},description:"`auto` infers from the extension: .m3u8 (HLS), .mpd (DASH), otherwise progressive. Defaults to `auto`."},poster:{required:!1,tsType:{name:`string`},description:``},title:{required:!0,tsType:{name:`string`},description:`Names the player for assistive technology.`},isLive:{required:!1,tsType:{name:`boolean`},description:`A live stream. Detected from the stream when it can be (an endless duration).`,defaultValue:{value:`true`,computed:!1}},isMuted:{required:!1,tsType:{name:`boolean`},description:`Muted. Autoplay always starts muted. Defaults to false.`,defaultValue:{value:`true`,computed:!1}},onMutedChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(isMuted: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`isMuted`}],return:{name:`void`}}},description:`Called when the mute toggle (or M) changes the muting.`},shouldAutoPlay:{required:!1,tsType:{name:`boolean`},description:`Starts playing (muted) as soon as it can. Defaults to false.`,defaultValue:{value:`true`,computed:!1}},captions:{required:!1,tsType:{name:`unknown`},description:``},hasStatsOverlay:{required:!1,tsType:{name:`boolean`},description:`Overlays playback stats (rendition, bitrate, resolution, fps, buffer, dropped frames, live latency), with a toggle.`},onStats:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(stats: PlaybackStats) => void`,signature:{arguments:[{type:{name:`PlaybackStats`},name:`stats`}],return:{name:`void`}}},description:`Called with playback stats once a second while mounted.`},hasQualityMenu:{required:!1,tsType:{name:`boolean`},description:`The rendition picker (Auto plus the ladder). Defaults to true; it shows when hls.js plays the stream.`,defaultValue:{value:`true`,computed:!1}},controlsLayout:{required:!1,tsType:{name:`union`,raw:`'full' | 'compact' | 'none'`,elements:[{name:`literal`,value:`'full'`},{name:`literal`,value:`'compact'`},{name:`literal`,value:`'none'`}]},description:"`full` (the default), `compact` (one row) or `none` (no controls, for preview tiles).",defaultValue:{value:`'compact'`,computed:!1}},shouldPauseOffscreen:{required:!1,tsType:{name:`boolean`},description:`Pauses (and stops downloading) while scrolled out of view, resuming when back. Defaults to false.`,defaultValue:{value:`true`,computed:!1}},playbackRates:{required:!1,tsType:{name:`unknown`},description:`Speeds in the speed menu (not shown for live streams).`},skipSeconds:{required:!1,tsType:{name:`number`},description:`Seconds the skip buttons move. Defaults to 10.`},aspectRatio:{required:!1,tsType:{name:`union`,raw:`'16/9' | '4/3' | '1/1' | '9/16'`,elements:[{name:`literal`,value:`'16/9'`},{name:`literal`,value:`'4/3'`},{name:`literal`,value:`'1/1'`},{name:`literal`,value:`'9/16'`}]},description:"The picture's shape. Defaults to `16/9`."},exclusiveGroup:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:"Players in the same group pause each other. Defaults to `null` (none), so previews can play side by side."},loadSource:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(
  media: HTMLMediaElement,
  src: string,
  type: Exclude<ResolvedSourceType, 'progressive'>,
) => unknown`,signature:{arguments:[{type:{name:`HTMLMediaElement`},name:`media`},{type:{name:`string`},name:`src`},{type:{name:`Exclude`,elements:[{name:`Exclude`,elements:[{name:`union`,raw:`'auto' | 'hls' | 'dash' | 'progressive'`,elements:[{name:`literal`,value:`'auto'`},{name:`literal`,value:`'hls'`},{name:`literal`,value:`'dash'`},{name:`literal`,value:`'progressive'`}]},{name:`literal`,value:`'auto'`}],raw:`Exclude<MediaSourceType, 'auto'>`},{name:`literal`,value:`'progressive'`}],raw:`Exclude<ResolvedSourceType, 'progressive'>`},name:`type`}],return:{name:`unknown`}}},description:"Plays formats the library doesn't, such as DASH through dash.js (see `MediaSourceLoader`)."},hlsConfig:{required:!1,tsType:{name:`Partial`,elements:[{name:`HlsConfig`}],raw:`Partial<HlsConfig>`},description:`Extra hls.js configuration.`},crossOrigin:{required:!1,tsType:{name:`union`,raw:`'anonymous' | 'use-credentials'`,elements:[{name:`literal`,value:`'anonymous'`},{name:`literal`,value:`'use-credentials'`}]},description:`CORS mode for the video element (needed for captions from another origin).`},overlay:{required:!1,tsType:{name:`ReactNode`},description:`Content over the picture's top end corner, such as a status chip.`},mediaRef:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLVideoElement`}],raw:`Ref<HTMLVideoElement>`},description:`The <video> element, for apps that need it.`},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``},status:{required:!1,tsType:{name:`StreamStatus`},description:`A status chip over the picture. Its tone has a shape as well as a colour.`}}}})))()}function F({streams:e,columns:t={base:1,sm:2,lg:3},audioStreamId:r,defaultAudioStreamId:i=null,onAudioStreamChange:a,focusedStreamId:o,defaultFocusedStreamId:l=null,onFocusedStreamChange:u,"aria-label":d,className:p,ref:m}){let g=S(),[v,b]=f(r,i,a),[x,C]=f(o,l,u);return(0,I.jsx)(`div`,{ref:m,role:`group`,"aria-label":d??g.mediaStreams,className:n(`min-w-0`,p),children:(0,I.jsx)(y,{columns:t,gap:`sm`,children:e.map(({id:e,...t})=>{let r=e===x,i=e===v;return(0,I.jsxs)(`div`,{"data-stream-id":e,className:n(`flex min-w-0 flex-col gap-1`,r&&`order-first col-span-full`),children:[(0,I.jsx)(M,{...t,isMuted:!i,onMutedChange:t=>{t?i&&b(null):b(e)},controlsLayout:r?`full`:`none`,shouldPauseOffscreen:!0}),(0,I.jsxs)(`div`,{className:`flex min-w-0 items-center gap-1 px-1.5`,children:[(0,I.jsx)(`span`,{className:`min-w-0 flex-1 truncate text-sm font-medium`,children:t.title}),(0,I.jsx)(_,{content:g.mediaListenTo({title:t.title}),children:(0,I.jsx)(h,{icon:k,size:`sm`,"aria-label":g.mediaListenTo({title:t.title}),isSelected:i,onChange:t=>{b(t?e:null)}})}),(0,I.jsx)(_,{content:r?g.mediaShowAllStreams:g.mediaFocusStream({title:t.title}),children:(0,I.jsx)(h,{icon:r?c:s,size:`sm`,"aria-label":g.mediaFocusStream({title:t.title}),isSelected:r,onChange:t=>{C(t?e:null)}})})]})]},e)})})})}var I;function L(){return(L=e((()=>{A(),a(),o(),m(),v(),g(),t(),p(),C(),P(),I=d(),F.__docgenInfo={description:`Stream previews in a grid, with one tile's audio at a time, click-to-focus, and off-screen pausing.`,methods:[],displayName:`MultiView`,props:{streams:{required:!0,tsType:{name:`unknown`},description:``},columns:{required:!1,tsType:{name:`union`,raw:`Columns | GridColumns`,elements:[{name:`union`,raw:`1 | 2 | 3 | 4 | 5 | 6`,elements:[{name:`literal`,value:`1`},{name:`literal`,value:`2`},{name:`literal`,value:`3`},{name:`literal`,value:`4`},{name:`literal`,value:`5`},{name:`literal`,value:`6`}]},{name:`GridColumns`}]},description:"Columns by the view's width. Defaults to `{ base: 1, sm: 2, lg: 3 }`.",defaultValue:{value:`{ base: 1, sm: 2, lg: 3 }`,computed:!1}},audioStreamId:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`The stream whose audio plays (one at a time), or null for silence. Controlled.`},defaultAudioStreamId:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`The stream whose audio plays at first, uncontrolled. Defaults to none.`,defaultValue:{value:`null`,computed:!1}},onAudioStreamChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(id: string | null) => void`,signature:{arguments:[{type:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},name:`id`}],return:{name:`void`}}},description:``},focusedStreamId:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`The focused stream, shown large first. Controlled.`},defaultFocusedStreamId:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`The stream focused at first, uncontrolled. Defaults to none.`,defaultValue:{value:`null`,computed:!1}},onFocusedStreamChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(id: string | null) => void`,signature:{arguments:[{type:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},name:`id`}],return:{name:`void`}}},description:``},"aria-label":{required:!1,tsType:{name:`string`},description:"Names the view. Defaults to the `mediaStreams` message."},className:{required:!1,tsType:{name:`string`},description:``},ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``}}}})))()}var R,z,B,V,H,U,W,G,K,q,J,Y,X,Z;function Q(){return(Q=e((()=>{E(),L(),P(),l(),R=d(),z=T(640,360),B=w({seconds:90,frequency:220,sampleRate:4e3}),V=URL.createObjectURL(new Blob([`WEBVTT

00:00.000 --> 00:06.000
Saturn’s rings are mostly water ice.

00:06.000 --> 00:12.000
The widest spans 280,000 km.
`],{type:`text/vtt`})),H={title:`Media/VideoPlayer`,component:u,tags:[`!visual`],parameters:{layout:`padded`},args:{src:B,title:`Saturn flyby`,poster:z}},U=e=>async()=>({src:await D(e,()=>B)}),W={loaders:[U(`media/sample.mp4`)],render:(e,{loaded:t})=>(0,R.jsx)(u,{...e,src:t.src,captions:[{src:V,srcLang:`en`,label:`English`,isDefault:!0}],playbackRates:[.5,1,1.5,2]})},G={name:`HLS with stats`,loaders:[U(`media/stream/master.m3u8`)],render:(e,{loaded:t})=>(0,R.jsx)(u,{...e,src:t.src,hasStatsOverlay:!0,onStats:()=>void 0})},K={args:{isLive:!0}},q={name:`DASH without a loader`,args:{src:`https://cdn.example.com/vod/manifest.mpd`,title:`DASH stream`}},J={args:{controlsLayout:`compact`}},Y={render:()=>(0,R.jsx)(`div`,{className:`max-w-md`,children:(0,R.jsx)(M,{src:B,poster:z,title:`Encoder 1 — main stage`,status:{tone:`success`,label:`Live`}})})},X={loaders:[U(`media/stream/master.m3u8`)],render:(e,{loaded:t})=>{let{src:n}=t;return(0,R.jsx)(F,{columns:{base:1,sm:2},streams:[{id:`main`,src:n,poster:z,title:`Main stage`,status:{tone:`success`,label:`Live`}},{id:`north`,src:n,poster:z,title:`North dome`,status:{tone:`success`,label:`Live`}},{id:`south`,src:n,poster:z,title:`South dome`,status:{tone:`warning`,label:`Degraded`}},{id:`lab`,src:`media/missing-stream.m3u8`,poster:z,title:`Lab camera`,status:{tone:`neutral`,label:`Offline`}}]})}},Z=[`Progressive`,`HlsWithStats`,`Live`,`DashWithoutLoader`,`Compact`,`Preview`,`Wall`],W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  loaders: [real('media/sample.mp4')],
  render: (args, {
    loaded
  }) => <VideoPlayer {...args} src={(loaded as {
    src: string;
  }).src} captions={[{
    src: captions,
    srcLang: 'en',
    label: 'English',
    isDefault: true
  }]} playbackRates={[0.5, 1, 1.5, 2]} />
}`,...W.parameters?.docs?.source},description:{story:"A progressive file (`.storybook/public/media/sample.mp4` when present) with the transport, captions, speed,\npicture-in-picture and full screen. Space, F, M, C and the arrows work anywhere in the player.",...W.parameters?.docs?.description}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  name: 'HLS with stats',
  loaders: [real('media/stream/master.m3u8')],
  render: (args, {
    loaded
  }) => <VideoPlayer {...args} src={(loaded as {
    src: string;
  }).src} hasStatsOverlay onStats={() => undefined} />
}`,...G.parameters?.docs?.source},description:{story:"An HLS stream (`.storybook/public/media/stream/master.m3u8`): hls.js loads on demand, the quality menu lists the\nladder, and the stats overlay shows the rendition and bitrate switching.",...G.parameters?.docs?.description}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  args: {
    isLive: true
  }
}`,...K.parameters?.docs?.source},description:{story:`A live stream: "Go live" and the DVR window (here a file played as live).`,...K.parameters?.docs?.description}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  name: 'DASH without a loader',
  args: {
    src: 'https://cdn.example.com/vod/manifest.mpd',
    title: 'DASH stream'
  }
}`,...q.parameters?.docs?.source},description:{story:"DASH without a `loadSource` hook in a browser that can't play it natively: a clear error.",...q.parameters?.docs?.description}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  args: {
    controlsLayout: 'compact'
  }
}`,...J.parameters?.docs?.source},description:{story:`Compact controls in one row.`,...J.parameters?.docs?.description}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-md">
      <StreamPreview src={tone} poster={poster} title="Encoder 1 — main stage" status={{
      tone: 'success',
      label: 'Live'
    }} />
    </div>
}`,...Y.parameters?.docs?.source},description:{story:`A stream preview: a status chip, muted autoplay, compact controls, paused off-screen.`,...Y.parameters?.docs?.description}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  loaders: [real('media/stream/master.m3u8')],
  render: (_args, {
    loaded
  }) => {
    const {
      src
    } = loaded as {
      src: string;
    };
    return <MultiView columns={{
      base: 1,
      sm: 2
    }} streams={[{
      id: 'main',
      src,
      poster,
      title: 'Main stage',
      status: {
        tone: 'success',
        label: 'Live'
      }
    }, {
      id: 'north',
      src,
      poster,
      title: 'North dome',
      status: {
        tone: 'success',
        label: 'Live'
      }
    }, {
      id: 'south',
      src,
      poster,
      title: 'South dome',
      status: {
        tone: 'warning',
        label: 'Degraded'
      }
    }, {
      id: 'lab',
      src: 'media/missing-stream.m3u8',
      poster,
      title: 'Lab camera',
      status: {
        tone: 'neutral',
        label: 'Offline'
      }
    }]} />;
  }
}`,...X.parameters?.docs?.source},description:{story:`Four previews in a MultiView: listen to one at a time, focus one (it spans the width, with full controls), and
tiles scrolled out of view pause.`,...X.parameters?.docs?.description}}}})))()}Q();export{J as Compact,q as DashWithoutLoader,G as HlsWithStats,K as Live,Y as Preview,W as Progressive,X as Wall,Z as __namedExportsOrder,H as default};