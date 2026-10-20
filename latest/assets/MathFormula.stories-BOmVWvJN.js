import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{n,t as r}from"./Prose-DxQDqpIg.js";import{a as i,f as a,i as o,l as s,n as c,o as l,r as u,s as d,t as f,u as p}from"./math-DVVgmzhl.js";import{r as m,t as h}from"./MathFormula-DgZ9G2xF.js";var g,_,v,y,b,x,S,C,w,T,E;function D(){return(D=e((()=>{u(),n(),m(),g=t(),_={title:`Math/MathFormula`,component:h,args:{tex:s,display:`block`}},v={},y={render:()=>(0,g.jsxs)(`div`,{children:[(0,g.jsx)(h,{tex:a,display:`block`,label:`(1)`,id:`eq-sum`}),(0,g.jsx)(h,{tex:o,display:`block`,label:`(2)`,id:`eq-integral`})]})},b={name:`3×3 matrix`,args:{tex:d}},x={render:()=>(0,g.jsxs)(r,{children:[(0,g.jsxs)(`p`,{children:[`Solving the pair of equations by elimination (see `,(0,g.jsx)(`a`,{href:`#eq-system`,children:`equation (3)`}),`):`]}),(0,g.jsx)(h,{tex:f,display:`block`,label:`(3)`,id:`eq-system`})]})},S={args:{tex:c,hasChemistry:!0}},C={args:{tex:i,display:`inline`}},w={render:()=>(0,g.jsx)(r,{children:(0,g.jsxs)(`p`,{children:[`For a sample of `,(0,g.jsx)(h,{tex:`n`}),` readings with standard deviation`,` `,(0,g.jsx)(h,{tex:`s`}),`, the standard error of the mean is`,` `,(0,g.jsx)(h,{tex:p}),`, so quadrupling `,(0,g.jsx)(h,{tex:`n`}),` halves it. The roots of `,(0,g.jsx)(h,{tex:`ax^2 + bx + c = 0`}),` are `,(0,g.jsx)(h,{tex:s}),`.`]})})},T={args:{tex:l,label:`(4)`}},E=[`QuadraticFormula`,`SummationAndIntegral`,`Matrix`,`AlignedEquations`,`ChemicalEquation`,`InvalidTex`,`InParagraph`,`LongFormula`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{}`,...v.parameters?.docs?.source},description:{story:`The quadratic formula as a block, rendered as native MathML in the theme's text colour.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <div>
      <MathFormula tex={summation} display="block" label="(1)" id="eq-sum" />
      <MathFormula tex={integral} display="block" label="(2)" id="eq-integral" />
    </div>
}`,...y.parameters?.docs?.source},description:{story:`A summation and an integral, numbered.`,...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: '3×3 matrix',
  args: {
    tex: matrix
  }
}`,...b.parameters?.docs?.source},description:{story:`A 3×3 rotation matrix.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <Prose>
      <p>
        Solving the pair of equations by elimination (see <a href="#eq-system">equation (3)</a>):
      </p>
      <MathFormula tex={alignedEquations} display="block" label="(3)" id="eq-system" />
    </Prose>
}`,...x.parameters?.docs?.source},description:{story:`Aligned equations with a label that text links to by id.`,...x.parameters?.docs?.description}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    tex: combustion,
    hasChemistry: true
  }
}`,...S.parameters?.docs?.source},description:{story:"A chemical equation with mhchem's `\\ce{}` (needs `hasChemistry`).",...S.parameters?.docs?.description}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    tex: invalidFormula,
    display: 'inline'
  }
}`,...C.parameters?.docs?.source},description:{story:`TeX that doesn't parse shows its source in the danger tone, with the parser's message behind the (i) button.`,...C.parameters?.docs?.description}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <Prose>
      <p>
        For a sample of <MathFormula tex="n" /> readings with standard deviation{' '}
        <MathFormula tex="s" />, the standard error of the mean is{' '}
        <MathFormula tex={standardError} />, so quadrupling <MathFormula tex="n" /> halves it. The
        roots of <MathFormula tex="ax^2 + bx + c = 0" /> are <MathFormula tex={quadraticFormula} />.
      </p>
    </Prose>
}`,...w.parameters?.docs?.source},description:{story:`Formulas in running text: inline maths sits on the line and wraps with it.`,...w.parameters?.docs?.description}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    tex: longFormula,
    label: '(4)'
  }
}`,...T.parameters?.docs?.source},description:{story:`A long block formula scrolls sideways inside a focusable region on narrow screens, never the page.`,...T.parameters?.docs?.description}}}})))()}D();export{x as AlignedEquations,S as ChemicalEquation,w as InParagraph,C as InvalidTex,T as LongFormula,b as Matrix,v as QuadraticFormula,y as SummationAndIntegral,E as __namedExportsOrder,_ as default};