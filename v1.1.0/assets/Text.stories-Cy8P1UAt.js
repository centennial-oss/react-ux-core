import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{a as n,i as r}from"./Layout-C_4VBnI9.js";import{n as i,r as a,t as o}from"./Text-CiszJ5rL.js";import{n as s,t as c}from"./Code-DVS8v-Lm.js";var l,u,d,f,p;function m(){return(m=e((()=>{s(),n(),a(),l=t(),u={title:`Display/Text`,component:i,args:{children:`Body text.`}},d={render:()=>(0,l.jsxs)(r,{gap:`sm`,children:[(0,l.jsx)(o,{level:2,children:`Section heading`}),(0,l.jsx)(o,{level:3,children:`Subsection heading`}),(0,l.jsx)(i,{variant:`lead`,children:`A lead paragraph introduces the page in a slightly larger size.`}),(0,l.jsxs)(i,{children:[`Body text, in the app's type scale, with inline code such as `,(0,l.jsx)(c,{children:`F = ma`}),`.`]}),(0,l.jsx)(i,{variant:`muted`,children:`Muted text for secondary details.`}),(0,l.jsx)(i,{variant:`small`,children:`Small text for notes and fine print.`})]})},f={render:()=>(0,l.jsx)(r,{gap:`md`,className:`max-w-sm`,children:[1,2,3].map(e=>(0,l.jsx)(i,{maxLines:e,children:`A ball is thrown horizontally at 12 metres per second from the top of a 45-metre cliff. Ignoring air resistance, how long does it take to reach the ground, how far from the base of the cliff does it land, and how fast is it moving just before it hits?`},e))})},p=[`Variants`,`Clamped`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="sm">
      <Heading level={2}>Section heading</Heading>
      <Heading level={3}>Subsection heading</Heading>
      <Text variant="lead">A lead paragraph introduces the page in a slightly larger size.</Text>
      <Text>
        Body text, in the app&apos;s type scale, with inline code such as <Code>F = ma</Code>.
      </Text>
      <Text variant="muted">Muted text for secondary details.</Text>
      <Text variant="small">Small text for notes and fine print.</Text>
    </Stack>
}`,...d.parameters?.docs?.source},description:{story:`Headings, and each Text variant.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="md" className="max-w-sm">
      {([1, 2, 3] as const).map(lines => <Text key={lines} maxLines={lines}>
          A ball is thrown horizontally at 12 metres per second from the top of a 45-metre cliff.
          Ignoring air resistance, how long does it take to reach the ground, how far from the base
          of the cliff does it land, and how fast is it moving just before it hits?
        </Text>)}
    </Stack>
}`,...f.parameters?.docs?.source},description:{story:`Clamping to one to four lines; the full text stays in the page for screen readers.`,...f.parameters?.docs?.description}}}})))()}m();export{f as Clamped,d as Variants,p as __namedExportsOrder,u as default};