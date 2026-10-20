import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Button-e4ZjaxXL.js";import{n as a,r as o,t as s}from"./LiveRegion-Bwin-dAI.js";import{a as c,n as l}from"./Layout-C_4VBnI9.js";var u,d,f,p,m,h;function g(){return(g=e((()=>{u=t(),r(),c(),a(),d=n(),f={title:`Display/LiveRegion`,component:s,tags:[`!visual`]},p={render:()=>{let[e,t]=(0,u.useState)(0);return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(i,{onPress:()=>{t(e+1)},children:`Add to cart`}),(0,d.jsx)(s,{children:e===0?``:`${String(e)} items in the cart`})]})}},m={render:()=>{let e=o(),t=o();return(0,d.jsxs)(l,{children:[(0,d.jsx)(i,{onPress:()=>{e.announce(`Row added`)},children:`Add row`}),(0,d.jsx)(i,{variant:`outline`,tone:`danger`,onPress:()=>{t.announce(`Couldn’t save the row`)},children:`Fail to save`}),(0,d.jsx)(s,{ref:e.ref}),(0,d.jsx)(s,{ref:t.ref,politeness:`assertive`})]})}},h=[`StateText`,`Announcer`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [count, setCount] = useState(0);
    return <>
        <Button onPress={() => {
        setCount(count + 1);
      }}>
          Add to cart
        </Button>
        <LiveRegion>{count === 0 ? '' : \`\${String(count)} items in the cart\`}</LiveRegion>
      </>;
  }
}`,...p.parameters?.docs?.source},description:{story:`Announces state text as it changes: each press is read out by screen readers ("3 items in the cart").`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => {
    const polite = useAnnouncer();
    const assertive = useAnnouncer();
    return <Inline>
        <Button onPress={() => {
        polite.announce('Row added');
      }}>
          Add row
        </Button>
        <Button variant="outline" tone="danger" onPress={() => {
        assertive.announce('Couldn’t save the row');
      }}>
          Fail to save
        </Button>
        <LiveRegion ref={polite.ref} />
        <LiveRegion ref={assertive.ref} politeness="assertive" />
      </Inline>;
  }
}`,...m.parameters?.docs?.source},description:{story:"`useAnnouncer` announces what an action did, assertively for failures; the same text twice is read twice.",...m.parameters?.docs?.description}}}})))()}g();export{m as Announcer,p as StateText,h as __namedExportsOrder,f as default};