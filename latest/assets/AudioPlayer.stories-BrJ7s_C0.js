import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./AudioPlayer-wEW5m_Wn.js";import{c as i,i as a,o,r as s,t as c}from"./media-CeW1V545.js";var l,u,d,f,p,m,h,g,_,v,y,b,x,S,C;function w(){return(w=e((()=>{s(),n(),l=t(),u={id:`talk`,src:i({seconds:130,frequency:330,sampleRate:4e3}),title:`A tour of the outer planets`,artist:`Grace, Mount Wilson Observatory`,durationMs:13e4,artworkSrc:a(160,160)},d=[u,{id:`rings`,src:i({seconds:48,frequency:440,sampleRate:4e3}),title:`How Saturn’s rings formed`,artist:`Ada`,durationMs:48e3},{id:`moons`,src:i({seconds:75,frequency:520,sampleRate:4e3}),title:`Moons of Jupiter`,artist:`Ada`,durationMs:75e3}],f={id:`note`,src:i({seconds:14,frequency:600}),title:`Voice message`,durationMs:14e3},p={title:`Media/AudioPlayer`,component:r,parameters:{layout:`padded`},args:{track:u,preload:`none`}},m={args:{waveform:{peaks:o}}},h={args:{markers:[{at:0,label:`Introduction`},{at:34e3,label:`Jupiter`},{at:71e3,label:`Saturn`},{at:102e3,label:`Uranus and Neptune`}]}},g={args:{playlist:d}},_={args:{variant:`compact`,playlist:d}},v={render:()=>(0,l.jsxs)(`div`,{className:`flex max-w-sm flex-col gap-1 rounded-card bg-accent-bg p-3 text-accent-fg`,children:[(0,l.jsx)(r,{track:f,variant:`inline`,waveform:{peaks:o.slice(0,120)},preload:`none`}),(0,l.jsx)(`span`,{className:`text-xs`,children:`Grace · 09:41`})]})},y={tags:[`!visual`],render:()=>(0,l.jsx)(`div`,{className:`flex flex-col gap-3`,children:d.map(e=>(0,l.jsx)(r,{track:e,variant:`compact`,preload:`none`},e.id))})},b={tags:[`!visual`],args:{track:f,waveform:`decode`,preload:`metadata`}},x={tags:[`!visual`],args:{track:{id:`lost`,src:`media/missing-recording.mp3`,title:`Lost recording`},preload:`metadata`}},S={tags:[`!visual`],loaders:[async()=>{let e=await c(`media/sample.mp3`,()=>f.src),t=o;try{let e=await fetch(`media/sample-peaks.json`);if(e.ok&&e.headers.get(`content-type`)?.includes(`json`)){let n=await e.json();t=Array.isArray(n)?n:n.data??o}}catch{}return{src:e,peaks:t}}],render:(e,{loaded:t})=>{let{src:n,peaks:i}=t;return(0,l.jsx)(r,{track:{id:`sample`,src:n,title:`Sample recording`,type:`audio/mpeg`},waveform:{peaks:i}})}},C=[`Full`,`WithChapters`,`Playlist`,`Compact`,`InlineInMessage`,`ExclusivePlayback`,`DecodedWaveform`,`MissingFile`,`RealFile`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    waveform: {
      peaks: samplePeaks
    }
  }
}`,...m.parameters?.docs?.source},description:{story:`The full player: artwork, title, a waveform from precomputed peaks (it seeks), the transport, speed and volume.
Space plays and pauses, the arrows seek 5 s (30 s with Shift), M mutes.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    markers: [{
      at: 0,
      label: 'Introduction'
    }, {
      at: 34_000,
      label: 'Jupiter'
    }, {
      at: 71_000,
      label: 'Saturn'
    }, {
      at: 102_000,
      label: 'Uranus and Neptune'
    }]
  }
}`,...h.parameters?.docs?.source},description:{story:`Without a waveform the seek slider shows buffered ranges. Chapters are marked and listed in a menu.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    playlist
  }
}`,...g.parameters?.docs?.source},description:{story:`A playlist adds previous and next, and moves along at the end of a track.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'compact',
    playlist
  }
}`,..._.parameters?.docs?.source},description:{story:`The compact variant: a title line over one row of controls.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex max-w-sm flex-col gap-1 rounded-card bg-accent-bg p-3 text-accent-fg">
      <AudioPlayer track={voiceNote} variant="inline" waveform={{
      peaks: samplePeaks.slice(0, 120)
    }} preload="none" />
      <span className="text-xs">Grace · 09:41</span>
    </div>
}`,...v.parameters?.docs?.source},description:{story:`The inline variant, in a message bubble: play, a small waveform and the time.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: () => <div className="flex flex-col gap-3">
      {playlist.map(track => <AudioPlayer key={track.id} track={track} variant="compact" preload="none" />)}
    </div>
}`,...y.parameters?.docs?.source},description:{story:"Several players: starting one pauses the others (one shared `exclusiveGroup`).",...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    track: voiceNote,
    waveform: 'decode',
    preload: 'metadata'
  }
}`,...b.parameters?.docs?.source},description:{story:'`waveform="decode"` decodes a small file in the browser for its waveform.',...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    track: {
      id: 'lost',
      src: 'media/missing-recording.mp3',
      title: 'Lost recording'
    },
    preload: 'metadata'
  }
}`,...x.parameters?.docs?.source},description:{story:`A missing file says so (404).`,...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  loaders: [async () => {
    const src = await assetOr('media/sample.mp3', () => voiceNote.src);
    let peaks: readonly number[] = samplePeaks;
    try {
      const response = await fetch('media/sample-peaks.json');
      if (response.ok && response.headers.get('content-type')?.includes('json')) {
        const json = (await response.json()) as {
          data?: number[];
        } | number[];
        peaks = Array.isArray(json) ? json : json.data ?? samplePeaks;
      }
    } catch {
      // Not there: the sample peaks.
    }
    return {
      src,
      peaks
    };
  }],
  render: (_args, {
    loaded
  }) => {
    const {
      src,
      peaks
    } = loaded as {
      src: string;
      peaks: readonly number[];
    };
    return <AudioPlayer track={{
      id: 'sample',
      src,
      title: 'Sample recording',
      type: 'audio/mpeg'
    }} waveform={{
      peaks
    }} />;
  }
}`,...S.parameters?.docs?.source},description:{story:"A real MP3 from `.storybook/public/media/sample.mp3` with its peaks from `sample-peaks.json`, when those files\nare there (otherwise a generated tone and the sample peaks).",...S.parameters?.docs?.description}}}})))()}w();export{_ as Compact,b as DecodedWaveform,y as ExclusivePlayback,m as Full,v as InlineInMessage,x as MissingFile,g as Playlist,S as RealFile,h as WithChapters,C as __namedExportsOrder,p as default};