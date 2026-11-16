import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{r,t as i}from"./ImageViewer-aeNGFAFd.js";import{i as a,o,r as s,t as c}from"./mediaImages-BJPUk9rJ.js";var l,u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{l=t(),s(),r(),u=n(),d={id:`starfield`,src:o(),alt:`A ringed planet and a small blue moon against a field of stars`,width:1600,height:1e3},f={title:`Media/ImageViewer`,component:i,args:{image:d}},p={},m={args:{fit:`fill`}},h={args:{fit:`actual`,height:`20rem`}},g={args:{hasControls:!1,height:`16rem`}},_={args:{minZoom:.5,maxZoom:2}},v={args:{image:{id:`broken`,src:c,alt:`Saturn photographed from the observatory`}}},y={tags:[`!visual`],render:function(e){let[t,n]=(0,l.useState)(null);return(0,l.useEffect)(()=>{let e=null,t=!0;return a().then(r=>{e=r,t?n(r):URL.revokeObjectURL(r)}),()=>{t=!1,e&&URL.revokeObjectURL(e)}},[]),t===null?(0,u.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Drawing a 6000 × 4000 image…`}):(0,u.jsx)(i,{...e,image:{id:`large`,src:t,alt:`A banded planet against a dense star field`,width:6e3,height:4e3}})}},b={tags:[`!visual`],args:{image:{id:`photo`,src:`media/photo-6000x4000.jpg`,alt:`A 6000 by 4000 pixel photograph`}}},x=[`Default`,`Fill`,`ActualSize`,`WithoutControls`,`ZoomLimits`,`Broken`,`LargeImage`,`RealPhoto`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{}`,...p.parameters?.docs?.source},description:{story:`The whole image fits the frame. Scroll or pinch to zoom, drag to pan, double-click for 100%.`,...p.parameters?.docs?.description}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    fit: 'fill'
  }
}`,...m.parameters?.docs?.source},description:{story:"`fill`: the image covers the frame and can be panned to see the rest.",...m.parameters?.docs?.description}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    fit: 'actual',
    height: '20rem'
  }
}`,...h.parameters?.docs?.source},description:{story:"`actual`: the image starts at its own pixel size (100%).",...h.parameters?.docs?.description}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    hasControls: false,
    height: '16rem'
  }
}`,...g.parameters?.docs?.source},description:{story:`Without the toolbar; gestures and keys still work.`,...g.parameters?.docs?.description}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    minZoom: 0.5,
    maxZoom: 2
  }
}`,..._.parameters?.docs?.source},description:{story:`Zoom limited to between 50% and 200%.`,..._.parameters?.docs?.description}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    image: {
      id: 'broken',
      src: BROKEN_IMAGE_SRC,
      alt: 'Saturn photographed from the observatory'
    }
  }
}`,...v.parameters?.docs?.source},description:{story:`A broken image shows an error with its alt text and a retry button.`,...v.parameters?.docs?.description}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  render: function LargeImage(args) {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
      let url: string | null = null;
      let isCurrent = true;
      void largeImageUrl().then(created => {
        url = created;
        if (isCurrent) {
          setSrc(created);
        } else {
          URL.revokeObjectURL(created);
        }
      });
      return () => {
        isCurrent = false;
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    }, []);
    if (src === null) {
      return <p className="text-sm text-fg-muted">Drawing a 6000 × 4000 image…</p>;
    }
    return <ImageViewer {...args} image={{
      id: 'large',
      src,
      alt: 'A banded planet against a dense star field',
      width: 6000,
      height: 4000
    }} />;
  }
}`,...y.parameters?.docs?.source},description:{story:`A 6000 × 4000 image generated in the browser; it should zoom smoothly to 400% on a phone.`,...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  tags: ['!visual'],
  args: {
    image: {
      id: 'photo',
      src: 'media/photo-6000x4000.jpg',
      alt: 'A 6000 by 4000 pixel photograph'
    }
  }
}`,...b.parameters?.docs?.source},description:{story:"A real 6000 × 4000 photo, if one has been added as `.storybook/public/media/photo-6000x4000.jpg`. Without it the\nviewer shows its error state.",...b.parameters?.docs?.description}}}})))()}S();export{h as ActualSize,v as Broken,p as Default,m as Fill,y as LargeImage,b as RealPhoto,g as WithoutControls,_ as ZoomLimits,x as __namedExportsOrder,f as default};