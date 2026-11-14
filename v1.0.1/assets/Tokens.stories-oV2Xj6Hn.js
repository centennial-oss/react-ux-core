import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";function n({token:e}){return(0,i.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,i.jsx)(`span`,{className:`size-8 shrink-0 rounded-control border border-border`,style:{background:`var(--color-${e})`}}),(0,i.jsx)(`code`,{className:`text-xs text-fg-muted`,children:`--color-${e}`})]})}function r({title:e,children:t}){return(0,i.jsxs)(`section`,{className:`grid gap-3`,children:[(0,i.jsx)(`h2`,{className:`text-sm font-semibold text-fg`,children:e}),t]})}var i,a,o,s,c,l,u,d;function f(){return(f=e((()=>{i=t(),a=[`surface-1`,`surface-2`,`surface-3`,`surface-4`],o=[`fg`,`fg-muted`],s=[`neutral`,`accent`,`success`,`warning`,`danger`,`info`],c=Array.from({length:10},(e,t)=>`chart-${t+1}`),l={title:`Foundations/Colour tokens`,parameters:{layout:`padded`}},u={render:()=>(0,i.jsxs)(`div`,{className:`grid max-w-5xl gap-8 bg-surface-1 p-4 text-fg`,children:[(0,i.jsxs)(r,{title:`Surfaces and text`,children:[(0,i.jsx)(`div`,{className:`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`,children:a.map(e=>(0,i.jsxs)(`div`,{className:`grid gap-1 rounded-card border border-border p-3`,style:{background:`var(--color-${e})`},children:[(0,i.jsx)(`code`,{className:`text-xs font-semibold`,children:e}),o.map(e=>(0,i.jsx)(`span`,{className:`text-sm`,style:{color:`var(--color-${e})`},children:`Text in ${e}`},e))]},e))}),(0,i.jsxs)(`div`,{className:`flex flex-wrap gap-4`,children:[(0,i.jsx)(n,{token:`border`}),(0,i.jsx)(n,{token:`border-strong`}),(0,i.jsx)(n,{token:`focus`})]})]}),(0,i.jsx)(r,{title:`Tones`,children:(0,i.jsx)(`div`,{className:`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3`,children:s.map(e=>(0,i.jsxs)(`div`,{className:`grid gap-2 rounded-card border p-3`,style:{background:`var(--color-${e}-bg)`,borderColor:`var(--color-${e}-border)`},children:[(0,i.jsx)(`span`,{className:`text-sm font-semibold`,style:{color:`var(--color-${e}-fg)`},children:`${e} on ${e}-bg`}),(0,i.jsx)(`span`,{className:`w-fit rounded-control px-2 py-1 text-sm font-medium`,style:{background:`var(--color-${e}-solid)`,color:`var(--color-${e}-on-solid)`},children:`${e}-solid`})]},e))})}),(0,i.jsx)(r,{title:`Chart series`,children:(0,i.jsx)(`div`,{className:`grid grid-cols-2 gap-3 sm:grid-cols-5`,children:c.map(e=>(0,i.jsx)(n,{token:e},e))})})]})},d=[`Colours`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid max-w-5xl gap-8 bg-surface-1 p-4 text-fg">
      <Section title="Surfaces and text">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SURFACES.map(surface => <div key={surface} className="grid gap-1 rounded-card border border-border p-3" style={{
          background: \`var(--color-\${surface})\`
        }}>
              <code className="text-xs font-semibold">{surface}</code>
              {FOREGROUNDS.map(fg => <span key={fg} className="text-sm" style={{
            color: \`var(--color-\${fg})\`
          }}>
                  {\`Text in \${fg}\`}
                </span>)}
            </div>)}
        </div>
        <div className="flex flex-wrap gap-4">
          <Swatch token="border" />
          <Swatch token="border-strong" />
          <Swatch token="focus" />
        </div>
      </Section>

      <Section title="Tones">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TONES.map(tone => <div key={tone} className="grid gap-2 rounded-card border p-3" style={{
          background: \`var(--color-\${tone}-bg)\`,
          borderColor: \`var(--color-\${tone}-border)\`
        }}>
              <span className="text-sm font-semibold" style={{
            color: \`var(--color-\${tone}-fg)\`
          }}>
                {\`\${tone} on \${tone}-bg\`}
              </span>
              <span className="w-fit rounded-control px-2 py-1 text-sm font-medium" style={{
            background: \`var(--color-\${tone}-solid)\`,
            color: \`var(--color-\${tone}-on-solid)\`
          }}>
                {\`\${tone}-solid\`}
              </span>
            </div>)}
        </div>
      </Section>

      <Section title="Chart series">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CHART.map(token => <Swatch key={token} token={token} />)}
        </div>
      </Section>
    </div>
}`,...u.parameters?.docs?.source}}}})))()}f();export{u as Colours,d as __namedExportsOrder,l as default};