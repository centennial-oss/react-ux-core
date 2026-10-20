import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./MusicTransport-BBLgqEkY.js";var a,o,s,c,l,u;function d(){return(d=e((()=>{a=t(),r(),o=n(),s={title:`Music/MusicTransport`,component:i,args:{isPlaying:!1,onPlayingChange:()=>void 0,position:0,bpm:120}},c={render:function(){let[e,t]=(0,a.useState)(!1),[n,r]=(0,a.useState)(96),[s,c]=(0,a.useState)(!0);return(0,o.jsx)(i,{isPlaying:e,onPlayingChange:t,onStop:()=>{t(!1)},position:10.5,bpm:n,onBpmChange:r,isLooping:s,onLoopingChange:c})}},l={args:{isPlaying:!0,position:7,timeSignature:{beats:3,unit:4}}},u=[`Full`,`Minimal`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [isPlaying, setPlaying] = useState(false);
    const [bpm, setBpm] = useState(96);
    const [isLooping, setLooping] = useState(true);
    return <MusicTransport isPlaying={isPlaying} onPlayingChange={setPlaying} onStop={() => {
      setPlaying(false);
    }} position={10.5} bpm={bpm} onBpmChange={setBpm} isLooping={isLooping} onLoopingChange={setLooping} />;
  }
}`,...c.parameters?.docs?.source},description:{story:`Every control: play, stop, the position in bars and beats, the tempo and the loop toggle.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    isPlaying: true,
    position: 7,
    timeSignature: {
      beats: 3,
      unit: 4
    }
  }
}`,...l.parameters?.docs?.source},description:{story:`Playing in 3/4: just play/pause and the position.`,...l.parameters?.docs?.description}}}})))()}d();export{c as Full,l as Minimal,u as __namedExportsOrder,s as default};