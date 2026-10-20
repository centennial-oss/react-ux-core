import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./StatTile-CJTLNL5h.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";var a,o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{a=t(),n(),o=i(),s={title:`Display/StatTile`,component:r,args:{label:`Energy today`,value:`1,284`,unit:`kWh`}},c={tags:[`!visual`]},l={render:()=>(0,o.jsxs)(`div`,{className:`grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`,children:[(0,o.jsx)(r,{label:`Energy today`,value:`1,284`,unit:`kWh`,delta:{value:`4.2%`,direction:`up`},sparkline:[3,5,4,8,6,9,7,11],footer:`vs. yesterday`}),(0,o.jsx)(r,{label:`Revenue (MTD)`,value:`$48,120`,delta:{value:`1.1%`,direction:`down`}}),(0,o.jsx)(r,{label:`Errors`,value:`42`,delta:{value:`8`,direction:`up`,tone:`danger`}}),(0,o.jsx)(r,{label:`Meters online`,value:`98.6`,unit:`%`,delta:{value:`0%`,direction:`flat`}})]})},u={render:()=>(0,o.jsx)(`div`,{className:`w-44`,children:(0,o.jsx)(r,{label:`Lifetime energy`,value:`123,456,789`,unit:`kWh`})})},d={args:{isLoading:!0}},f={render:function(){let e=[{value:`21.4`,caption:`Sensor A`},{value:`21.9`,caption:`Sensor B`},{value:`20.8`,caption:`Sensor C`}],[t,n]=(0,a.useState)(0),i=e[t]??e[0];return(0,o.jsx)(`div`,{className:`max-w-xs`,children:(0,o.jsx)(r,{label:`Hall temperature`,value:i?.value,unit:`°C`,footer:`${String(t+1)} of ${String(e.length)} · ${i?.caption??``}`,onPress:()=>{n(t=>(t+1)%e.length)},pressHint:`Show the next value`})})}},p=[`Playground`,`Grid`,`LongValueNarrowTile`,`Loading`,`Pressable`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  tags: ['!visual']
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Energy today" value="1,284" unit="kWh" delta={{
      value: '4.2%',
      direction: 'up'
    }} sparkline={[3, 5, 4, 8, 6, 9, 7, 11]} footer="vs. yesterday" />
      <StatTile label="Revenue (MTD)" value="$48,120" delta={{
      value: '1.1%',
      direction: 'down'
    }} />
      <StatTile label="Errors" value="42" delta={{
      value: '8',
      direction: 'up',
      tone: 'danger'
    }} />
      <StatTile label="Meters online" value="98.6" unit="%" delta={{
      value: '0%',
      direction: 'flat'
    }} />
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-44">
      <StatTile label="Lifetime energy" value="123,456,789" unit="kWh" />
    </div>
}`,...u.parameters?.docs?.source},description:{story:`Long values shrink to fit the tile instead of overflowing.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    isLoading: true
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const sensors = [{
      value: '21.4',
      caption: 'Sensor A'
    }, {
      value: '21.9',
      caption: 'Sensor B'
    }, {
      value: '20.8',
      caption: 'Sensor C'
    }];
    const [index, setIndex] = useState(0);
    const sensor = sensors[index] ?? sensors[0];
    return <div className="max-w-xs">
        <StatTile label="Hall temperature" value={sensor?.value} unit="°C" footer={\`\${String(index + 1)} of \${String(sensors.length)} · \${sensor?.caption ?? ''}\`} onPress={() => {
        setIndex(current => (current + 1) % sensors.length);
      }} pressHint="Show the next value" />
      </div>;
  }
}`,...f.parameters?.docs?.source},description:{story:`A tile that steps through variants of the same figure when pressed: the whole tile is a button.`,...f.parameters?.docs?.description}}}})))()}m();export{l as Grid,d as Loading,u as LongValueNarrowTile,c as Playground,f as Pressable,p as __namedExportsOrder,s as default};