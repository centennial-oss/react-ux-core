import{n as e}from"./rolldown-runtime-sJBDdmOt.js";function t(e,...t){return{notes:t.map(([t,n,r],i)=>{let a=e[i];return{...t?{pitches:[t]}:{},duration:n,...r?{dots:r}:{},...a?{chord:a}:{}}})}}function n(){let e=[t([`G`],[`B4`,`quarter`],[`B4`,`quarter`],[`C5`,`quarter`],[`D5`,`quarter`]),t([`D`],[`D5`,`quarter`],[`C5`,`quarter`],[`B4`,`quarter`],[`A4`,`quarter`]),t([`G`],[`G4`,`quarter`],[`G4`,`quarter`],[`A4`,`quarter`],[`B4`,`quarter`])];return[...e,t([`D`],[`B4`,`quarter`,1],[`A4`,`eighth`],[`A4`,`half`]),...e,t([`D`,null,`G`],[`A4`,`quarter`,1],[`G4`,`eighth`],[`G4`,`half`]),t([`D`],[`A4`,`quarter`],[`A4`,`quarter`],[`B4`,`quarter`],[`G4`,`quarter`]),t([`D`,null,null,`G`],[`A4`,`quarter`],[`B4`,`eighth`],[`C5`,`eighth`],[`B4`,`quarter`],[`G4`,`quarter`]),t([`D`,null,null,`G`],[`A4`,`quarter`],[`B4`,`eighth`],[`C5`,`eighth`],[`B4`,`quarter`],[`A4`,`quarter`]),t([`G`,null,`D7`],[`G4`,`quarter`],[`A4`,`quarter`],[`D4`,`half`]),...e,t([`D`,null,`G`],[`A4`,`quarter`,1],[`G4`,`eighth`],[`G4`,`half`])]}var r,i,a,o,s,c,l;function u(){return(u=e((()=>{r=(()=>{let e=n();return e[3]={notes:[{pitches:[`B4`],duration:`quarter`,dots:1,chord:`D`},{pitches:[`A4`],duration:`eighth`},{pitches:[`A4`],duration:`quarter`,isTied:!0},{pitches:[`A4`],duration:`quarter`}]},e[15]={notes:[{pitches:[`A4`],duration:`quarter`,dots:1,chord:`D7`},{pitches:[`G4`],duration:`eighth`},{pitches:[`G4`,`B4`,`D5`],duration:`quarter`,chord:`G`},{duration:`quarter`}]},{title:`Ode to Joy`,clef:`treble`,key:`G`,timeSignature:{beats:4,unit:4},measures:[...n(),...e]}})(),i={...r,measures:r.measures.slice(0,4)},a={title:`Walking bass`,clef:`bass`,key:`F`,timeSignature:{beats:3,unit:4},measures:[{notes:[{pitches:[`F2`],duration:`quarter`,chord:`F`},{pitches:[`A2`],duration:`quarter`},{pitches:[`C3`],duration:`quarter`}]},{notes:[{pitches:[`Bb2`],duration:`quarter`,chord:`Bb`},{pitches:[`D3`],duration:`quarter`},{pitches:[`F#3`],duration:`quarter`,isTied:!0}]},{notes:[{pitches:[`F#3`],duration:`quarter`,chord:`D7`},{duration:`quarter`},{pitches:[`G2`,`D3`],duration:`quarter`,chord:`Gm`}]},{notes:[{pitches:[`C3`],duration:`half`,dots:1,chord:`C7`}]}]},o=`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Ode to Joy</work-title></work>
  <part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <harmony><root><root-step>G</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>D</root-step></root><kind>dominant</kind></harmony>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><tie type="start"/><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><tie type="stop"/><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>G</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><rest/><duration>4</duration><voice>2</voice><type>half</type></note>
    </measure>
    <measure number="4">
      <note><rest/><duration>8</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`,s=[[64,0,1],[64,1,1],[65,2,1],[67,3,1],[67,4,1],[65,5,1],[64,6,1],[62,7,1],[60,8,1],[60,9,1],[62,10,1],[64,11,1],[64,12,1.5],[62,13.5,.5],[62,14,2]].map(([e,t,n],r)=>({id:`n${String(r+1)}`,pitch:e,start:t,duration:n,velocity:r%4==0?110:90})),c=[{id:`kick`,label:`Kick`},{id:`snare`,label:`Snare`},{id:`hat`,label:`Closed hat`},{id:`open`,label:`Open hat`}],l={kick:[120,0,0,0,0,0,0,0,120,0,80,0,0,0,0,0],snare:[0,0,0,0,110,0,0,0,0,0,0,0,110,0,0,40],hat:[90,0,60,0,90,0,60,0,90,0,60,0,90,0,60,0],open:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,100]}})))()}export{s as a,i as c,u as i,l as n,r as o,c as r,o as s,a as t};