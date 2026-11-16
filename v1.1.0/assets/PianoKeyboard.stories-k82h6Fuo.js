import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./PianoKeyboard-DfSXGeJr.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{i as a,n as o}from"./musicSynth-DfbxeQ4H.js";var s,c,l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{s=t(),o(),n(),c=i(),l={title:`Music/PianoKeyboard`,component:r,parameters:{layout:`padded`}},u={},d={args:{keyLabels:`all`,pitchRange:{low:55,high:76},highlightedNotes:[{pitch:60,tone:`accent`,label:`root`},{pitch:63,tone:`success`,label:`minor third`},{pitch:67,tone:`warning`,label:`fifth`}]}},f={args:{activeNotes:[55,59,62,66],keyLabels:`none`}},p={args:{pitchRange:{low:36,high:84}}},m={args:{hasQwertyInput:!0}},h={args:{isDisabled:!0,activeNotes:[60]}},g={tags:[`!visual`],args:{midiInput:`auto`}},_={tags:[`!visual`],render:function(){let[e,t]=(0,s.useState)([]);return(0,c.jsx)(r,{hasQwertyInput:!0,midiInput:`auto`,activeNotes:e,onNoteOn:(e,n)=>{a(e,n,void 0,.6),t(t=>[...t,e])},onNoteOff:e=>{t(t=>t.filter(t=>t!==e))}})}},v=[`Default`,`ChordHighlight`,`ActiveNotes`,`WideRange`,`QwertyInput`,`Disabled`,`MidiInput`,`Playable`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{}`,...u.parameters?.docs?.source},description:{story:`Two octaves from C3 to C5 with the Cs labelled. Keys are buttons named by pitch.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    keyLabels: 'all',
    pitchRange: {
      low: 55,
      high: 76
    },
    highlightedNotes: [{
      pitch: 60,
      tone: 'accent',
      label: 'root'
    }, {
      pitch: 63,
      tone: 'success',
      label: 'minor third'
    }, {
      pitch: 67,
      tone: 'warning',
      label: 'fifth'
    }]
  }
}`,...d.parameters?.docs?.source},description:{story:`Every key labelled, with a C minor chord highlighted (the highlight's text is part of each key's name).`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    activeNotes: [55, 59, 62, 66],
    keyLabels: 'none'
  }
}`,...f.parameters?.docs?.source},description:{story:`Keys shown pressed by playback: a G major chord, one of them on a black key.`,...f.parameters?.docs?.description}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    pitchRange: {
      low: 36,
      high: 84
    }
  }
}`,...p.parameters?.docs?.source},description:{story:`Four octaves (C2–C6). On narrow screens it scrolls inside itself, opening on middle C, with octave buttons.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    hasQwertyInput: true
  }
}`,...m.parameters?.docs?.source},description:{story:`With computer-keyboard playing (A W S E D …, Z and X for octaves), which a switch turns off.`,...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    isDisabled: true,
    activeNotes: [60]
  }
}`,...h.parameters?.docs?.source},description:{story:`Disabled.`,...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    midiInput: 'auto'
  }
}`,...g.parameters?.docs?.source},description:{story:`Listens to every MIDI input once access is granted. What it shows depends on the browser (support and permission),
so it isn't in the visual suite.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function Render() {
    const [active, setActive] = useState<number[]>([]);
    return <PianoKeyboard hasQwertyInput midiInput="auto" activeNotes={active} onNoteOn={(pitch, velocity) => {
      playNote(pitch, velocity, undefined, 0.6);
      setActive(current => [...current, pitch]);
    }} onNoteOff={pitch => {
      setActive(current => current.filter(other => other !== pitch));
    }} />;
  }
}`,..._.parameters?.docs?.source},description:{story:`Plays a simple synth: touch, mouse, glissando, computer keyboard and MIDI all sound.`,..._.parameters?.docs?.description}}}})))()}y();export{f as ActiveNotes,d as ChordHighlight,u as Default,h as Disabled,g as MidiInput,_ as Playable,m as QwertyInput,p as WideRange,v as __namedExportsOrder,l as default};