import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,t as i}from"./Pagination-CbfdcUgU.js";var a,o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{a=t(),r(),o=n(),s={title:`Actions/Pagination`,component:i},c={render:function(){let[e,t]=(0,a.useState)(5),[n,r]=(0,a.useState)(25);return(0,o.jsx)(i,{mode:`offset`,pageIndex:e,pageSize:n,total:1203,onPageIndexChange:t,pageSizeOptions:[10,25,50,100],onPageSizeChange:e=>{r(e),t(0)}})}},l={render:()=>(0,o.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,o.jsx)(i,{"aria-label":`Stars`,mode:`offset`,pageIndex:0,pageSize:10,total:240,onPageIndexChange:()=>void 0}),(0,o.jsx)(i,{"aria-label":`Moons`,mode:`offset`,pageIndex:23,pageSize:10,total:240,onPageIndexChange:()=>void 0}),(0,o.jsx)(i,{"aria-label":`Observatories`,mode:`offset`,pageIndex:1,pageSize:10,total:42,onPageIndexChange:()=>void 0})]})},u={render:()=>(0,o.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,o.jsx)(i,{"aria-label":`Readings`,mode:`cursor`,hasPrevious:!1,hasNext:!0,onPrevious:()=>void 0,onNext:()=>void 0,approximateTotal:1200}),(0,o.jsx)(i,{"aria-label":`Search results`,mode:`cursor`,hasPrevious:!0,hasNext:!0,onPrevious:()=>void 0,onNext:()=>void 0,pageItemCount:25})]})},d={render:()=>(0,o.jsx)(i,{mode:`offset`,pageIndex:5,pageSize:25,total:1203,onPageIndexChange:()=>void 0,pageSizeOptions:[25,50],onPageSizeChange:()=>void 0,isCompact:!0})},f={render:()=>(0,o.jsx)(i,{mode:`offset`,pageIndex:2,pageSize:25,total:300,onPageIndexChange:()=>void 0,isDisabled:!0})},p=[`Offset`,`Ends`,`Cursor`,`Compact`,`Disabled`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: function OffsetStory() {
    const [pageIndex, setPageIndex] = useState(5);
    const [pageSize, setPageSize] = useState(25);
    return <Pagination mode="offset" pageIndex={pageIndex} pageSize={pageSize} total={1203} onPageIndexChange={setPageIndex} pageSizeOptions={[10, 25, 50, 100]} onPageSizeChange={size => {
      setPageSize(size);
      setPageIndex(0);
    }} />;
  }
}`,...c.parameters?.docs?.source},description:{story:`Offset paging: the range shown, previous and next, and page numbers that collapse with an ellipsis.`,...c.parameters?.docs?.description}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <Pagination aria-label="Stars" mode="offset" pageIndex={0} pageSize={10} total={240} onPageIndexChange={() => undefined} />
      <Pagination aria-label="Moons" mode="offset" pageIndex={23} pageSize={10} total={240} onPageIndexChange={() => undefined} />
      <Pagination aria-label="Observatories" mode="offset" pageIndex={1} pageSize={10} total={42} onPageIndexChange={() => undefined} />
    </div>
}`,...l.parameters?.docs?.source},description:{story:`Near either end, the first or last five pages show together. Several on one page each need their own label.`,...l.parameters?.docs?.description}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
      <Pagination aria-label="Readings" mode="cursor" hasPrevious={false} hasNext onPrevious={() => undefined} onNext={() => undefined} approximateTotal={1200} />
      <Pagination aria-label="Search results" mode="cursor" hasPrevious hasNext onPrevious={() => undefined} onNext={() => undefined} pageItemCount={25} />
    </div>
}`,...u.parameters?.docs?.source},description:{story:`Cursor paging: only previous and next, with an approximate total when the server has one.`,...u.parameters?.docs?.description}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Pagination mode="offset" pageIndex={5} pageSize={25} total={1203} onPageIndexChange={() => undefined} pageSizeOptions={[25, 50]} onPageSizeChange={() => undefined} isCompact />
}`,...d.parameters?.docs?.source},description:{story:`Compact (the default on phones): no page numbers or page-size choice.`,...d.parameters?.docs?.description}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <Pagination mode="offset" pageIndex={2} pageSize={25} total={300} onPageIndexChange={() => undefined} isDisabled />
}`,...f.parameters?.docs?.source},description:{story:`Every control disabled, for example while a page loads.`,...f.parameters?.docs?.description}}}})))()}m();export{d as Compact,u as Cursor,f as Disabled,l as Ends,c as Offset,p as __namedExportsOrder,s as default};