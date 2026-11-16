import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./StatTile-CJTLNL5h.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{n as i,t as a}from"./Button-e4ZjaxXL.js";import{n as o,t as s}from"./Badge-B8tm3wVn.js";import{a as c,i as l,n as u,r as d,t as f}from"./Layout-C_4VBnI9.js";import{n as p,t as m}from"./Card-BKrFQ2m4.js";function h({children:e}){return(0,g.jsx)(`span`,{className:`rounded-control border border-border bg-surface-3 px-3 py-2 text-sm text-fg`,children:e})}var g,_,v,y,b,x,S,C,w,T,E;function D(){return(D=e((()=>{o(),i(),p(),t(),c(),g=r(),_={title:`Display/Layout`,component:l,parameters:{layout:`padded`}},v=[`none`,`xs`,`sm`,`md`,`lg`,`xl`],y={render:()=>(0,g.jsxs)(l,{gap:`lg`,children:[(0,g.jsxs)(l,{children:[(0,g.jsx)(h,{children:`Column`}),(0,g.jsx)(h,{children:`stretches`}),(0,g.jsx)(h,{children:`each child`})]}),(0,g.jsxs)(l,{direction:`row`,children:[(0,g.jsx)(h,{children:`Row`}),(0,g.jsx)(h,{children:`stays on`}),(0,g.jsx)(h,{children:`one line`})]}),(0,g.jsxs)(u,{children:[(0,g.jsx)(s,{tone:`success`,children:`Active`}),(0,g.jsx)(s,{tone:`warning`,children:`Low balance`}),(0,g.jsx)(d,{}),(0,g.jsx)(a,{size:`sm`,children:`Action`})]})]})},b={render:()=>(0,g.jsx)(l,{gap:`lg`,children:v.map(e=>(0,g.jsxs)(l,{direction:`row`,gap:e,"aria-label":e,children:[(0,g.jsx)(h,{children:e}),(0,g.jsx)(h,{children:`B`}),(0,g.jsx)(h,{children:`C`})]},e))})},x={render:()=>(0,g.jsx)(`div`,{className:`max-w-64`,children:(0,g.jsx)(l,{direction:`row`,isWrapping:!0,gap:`sm`,children:[`Mechanics`,`Waves`,`Optics`,`Electricity`,`Magnetism`,`Astronomy`].map(e=>(0,g.jsx)(s,{children:e},e))})})},S=(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(n,{label:`Customers`,value:`84`}),(0,g.jsx)(n,{label:`Payments today`,value:`KES 12.4K`}),(0,g.jsx)(n,{label:`Energy today`,value:`173 kWh`}),(0,g.jsx)(n,{label:`Losses`,value:`10.9 %`})]}),C={render:()=>(0,g.jsxs)(l,{gap:`xl`,children:[(0,g.jsx)(f,{columns:2,children:S}),(0,g.jsx)(f,{columns:{base:1,sm:2,lg:4},children:S}),(0,g.jsx)(f,{minItemWidth:`12rem`,children:S})]})},w={render:()=>(0,g.jsx)(`div`,{className:`max-w-sm`,children:(0,g.jsx)(m,{title:`This month`,children:(0,g.jsx)(f,{columns:{base:1,sm:2,lg:4},children:S})})})},T={render:()=>(0,g.jsx)(f,{as:`ul`,"aria-label":`Inner planets`,columns:{base:2,md:4},gap:`sm`,children:[`Mercury`,`Venus`,`Earth`,`Mars`].map(e=>(0,g.jsx)(h,{children:e},e))})},E=[`Stacks`,`Gaps`,`WrappingRow`,`Grids`,`GridInANarrowCard`,`AsAList`],y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="lg">
      <Stack>
        <Box>Column</Box>
        <Box>stretches</Box>
        <Box>each child</Box>
      </Stack>
      <Stack direction="row">
        <Box>Row</Box>
        <Box>stays on</Box>
        <Box>one line</Box>
      </Stack>
      <Inline>
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Low balance</Badge>
        <Spacer />
        <Button size="sm">Action</Button>
      </Inline>
    </Stack>
}`,...y.parameters?.docs?.source},description:{story:`A column stack (the default), a row stack, and Inline: a row that wraps, with a Spacer pushing an action to the end.`,...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="lg">
      {gaps.map(gap => <Stack key={gap} direction="row" gap={gap} aria-label={gap}>
          <Box>{gap}</Box>
          <Box>B</Box>
          <Box>C</Box>
        </Stack>)}
    </Stack>
}`,...b.parameters?.docs?.source},description:{story:`Every gap, from none to xl.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-64">
      <Stack direction="row" isWrapping gap="sm">
        {['Mechanics', 'Waves', 'Optics', 'Electricity', 'Magnetism', 'Astronomy'].map(name => <Badge key={name}>{name}</Badge>)}
      </Stack>
    </div>
}`,...x.parameters?.docs?.source},description:{story:`A wrapping row in a narrow space.`,...x.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="xl">
      <Grid columns={2}>{tiles}</Grid>
      <Grid columns={{
      base: 1,
      sm: 2,
      lg: 4
    }}>{tiles}</Grid>
      <Grid minItemWidth="12rem">{tiles}</Grid>
    </Stack>
}`,...C.parameters?.docs?.source},description:{story:`Grids by a fixed count, by counts per container width, and by a minimum item width.`,...C.parameters?.docs?.description}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-sm">
      <Card title="This month">
        <Grid columns={{
        base: 1,
        sm: 2,
        lg: 4
      }}>{tiles}</Grid>
      </Card>
    </div>
}`,...w.parameters?.docs?.source},description:{story:`Columns follow the container, not the screen: inside a narrow card the same grid stays at one or two columns.`,...w.parameters?.docs?.description}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <Grid as="ul" aria-label="Inner planets" columns={{
    base: 2,
    md: 4
  }} gap="sm">
      {['Mercury', 'Venus', 'Earth', 'Mars'].map(planet => <Box key={planet}>{planet}</Box>)}
    </Grid>
}`,...T.parameters?.docs?.source},description:{story:`Lists: each child is rendered in an li.`,...T.parameters?.docs?.description}}}})))()}D();export{T as AsAList,b as Gaps,w as GridInANarrowCard,C as Grids,y as Stacks,x as WrappingRow,E as __namedExportsOrder,_ as default};