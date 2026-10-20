import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{a as n,i as r,r as i}from"./moreCharts-DDtQOmLd.js";import{n as a,t as o}from"./CategoryChart-DKmcwa1u.js";var s,c,l,u,d;function f(){return(f=e((()=>{i(),a(),s=t(),c={title:`Chart/Radar`,parameters:{layout:`padded`}},l={render:()=>(0,s.jsx)(o,{type:`radar`,title:`Instrument comparison`,description:`Scores from 0 to 5`,categories:r,series:n,valueAxis:{min:0,max:5},exportFileName:`instrument-comparison`,height:`22rem`})},u={render:()=>(0,s.jsx)(o,{type:`polarArea`,title:`Echelle spectrograph`,categories:r,series:n.slice(0,1),valueAxis:{min:0,max:5},height:`22rem`})},d=[`Radar`,`PolarArea`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart type="radar" title="Instrument comparison" description="Scores from 0 to 5" categories={instrumentAxes} series={instrumentScores} valueAxis={{
    min: 0,
    max: 5
  }} exportFileName="instrument-comparison" height="22rem" />
}`,...l.parameters?.docs?.source},description:{story:`Two instruments scored from 0 to 5 on six measures: each series is a filled shape with its own colour and point
shape. The legend shows, hides and highlights series; the summary names each one's best and worst measure.`,...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <CategoryChart type="polarArea" title="Echelle spectrograph" categories={instrumentAxes} series={instrumentScores.slice(0, 1)} valueAxis={{
    min: 0,
    max: 5
  }} height="22rem" />
}`,...u.parameters?.docs?.source},description:{story:`A polar area: the first series as wedges of equal angle, each as long as its value.`,...u.parameters?.docs?.description}}}})))()}f();export{u as PolarArea,l as Radar,d as __namedExportsOrder,c as default};