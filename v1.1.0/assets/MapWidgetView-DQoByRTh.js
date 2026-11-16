import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{n,t as r}from"./MapView-C-4CAtej.js";import{t as i}from"./jsx-runtime-MKhVqBIO.js";import{f as a,o}from"./DashboardContexts-Dfy4aS2z.js";function s({dataState:e,displayOptions:t,dashboard:n,instance:i,messages:a,isLoading:s,error:f,onRetry:p,emptyState:m}){let h=(0,c.use)(o),g=e.status===`success`?e.data:e.status===`error`?e.staleData:void 0,_=h?.mapStyles??[],v=_.find(e=>e.id===t.style)??_[0],y=t.initialView===`fixed`,{centerLng:b,centerLat:x,zoom:S,hasCenterMarker:C}=t,w=i.title??a.mapWidget,T=(0,c.useMemo)(()=>{let e=g?.markers??[];return y&&C?[...e,{id:`${i.id}:centre`,label:w,position:[b,x],tone:`neutral`}]:e},[g?.markers,y,C,i.id,w,b,x]),E=t.selectionFilter,D=E===``?void 0:n.filterValues[E],O=E===``?void 0:T.find(e=>JSON.stringify(u(e))===JSON.stringify(D??null))?.id??null;return v?(0,l.jsx)(r,{"aria-label":a.mapWidgetLabel({title:i.title??a.mapWidget}),styleUrl:v.styleUrl,markers:T,choropleth:g?.choropleth,initialView:y?{center:[b,x],zoom:S}:T.length===0?d:void 0,hasClustering:t.hasClustering,height:`100%`,isLoading:s,error:f,onRetry:p,emptyState:m,hasCooperativeGestures:!0,...E===``?{}:{selectedId:O,onSelectionChange:e=>{let t=e===null?void 0:T.find(t=>t.id===e);n.setFilterValue(E,t?u(t):null)}},className:`min-h-0 flex-1 px-2 pb-2`}):null}var c,l,u,d;function f(){return(f=e((()=>{c=t(),n(),a(),l=i(),u=e=>e.filterValue??e.id,d={center:[0,20],zoom:1},s.__docgenInfo={description:``,methods:[],displayName:`MapWidgetView`,props:{instance:{required:!0,tsType:{name:`Readonly`,elements:[{name:`WidgetInstance`}],raw:`Readonly<WidgetInstance>`},description:`The widget as stored.`},displayOptions:{required:!0,tsType:{name:`TOptions`},description:`The widget's options: migrated, with the type's defaults applied.`},dataState:{required:!0,tsType:{name:`union`,raw:`| { status: 'idle' }
| { status: 'loading' }
| {
    status: 'success';
    data: TData;
    updatedAt: Date;
    isRefreshing: boolean;
    isEmpty: boolean;
    /** The time range the data was loaded for, for widgets that show it (BI-01). */
    timeRange?: ResolvedTimeRange;
  }
| { status: 'error'; error: unknown; staleData?: TData; retry: () => void }`,elements:[{name:`signature`,type:`object`,raw:`{ status: 'idle' }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`'idle'`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: 'loading' }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`'loading'`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  status: 'success';
  data: TData;
  updatedAt: Date;
  isRefreshing: boolean;
  isEmpty: boolean;
  /** The time range the data was loaded for, for widgets that show it (BI-01). */
  timeRange?: ResolvedTimeRange;
}`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`'success'`,required:!0}},{key:`data`,value:{name:`TData`,required:!0}},{key:`updatedAt`,value:{name:`Date`,required:!0}},{key:`isRefreshing`,value:{name:`boolean`,required:!0}},{key:`isEmpty`,value:{name:`boolean`,required:!0}},{key:`timeRange`,value:{name:`ResolvedTimeRange`,required:!1},description:`The time range the data was loaded for, for widgets that show it (BI-01).`}]}},{name:`signature`,type:`object`,raw:`{ status: 'error'; error: unknown; staleData?: TData; retry: () => void }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`'error'`,required:!0}},{key:`error`,value:{name:`unknown`,required:!0}},{key:`staleData`,value:{name:`TData`,required:!1}},{key:`retry`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}}]}}]},description:`The widget's data and what loading it is doing (§8.5).`},frameSize:{required:!0,tsType:{name:`WidgetSize`},description:`The widget's size, kept current without the widget measuring itself (WID-14).`},mode:{required:!0,tsType:{name:`union`,raw:`'view' | 'edit'`,elements:[{name:`literal`,value:`'view'`},{name:`literal`,value:`'edit'`}]},description:``},dashboard:{required:!0,tsType:{name:`DashboardContextApi`},description:`The dashboard context: time range, filters, legend and the actions widgets may take (CTX-15).`},setActions:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(actions: readonly WidgetAction[]) => void`,signature:{arguments:[{type:{name:`unknown`},name:`actions`}],return:{name:`void`}}},description:`Contributes items to the widget's single action menu (WID-08). Pass a stable list.`},setLegendEntries:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(entries: readonly Omit<DashboardLegendEntry, 'widgetId'>[]) => void`,signature:{arguments:[{type:{name:`unknown`},name:`entries`}],return:{name:`void`}}},description:"Publishes the widget's legend entries to the page (CTX-11); only for types that `canPublishLegend`."},widgetState:{required:!0,tsType:{name:`union`,raw:`JsonObject | undefined`,elements:[{name:`Record`,elements:[{name:`string`},{name:`union`,raw:`string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }`,elements:[{name:`string`},{name:`number`},{name:`boolean`},{name:`null`},{name:`Array`,elements:[{name:`JsonValue`}],raw:`JsonValue[]`},{name:`signature`,type:`object`,raw:`{ [key: string]: JsonValue }`,signature:{properties:[{key:{name:`string`},value:{name:`JsonValue`,required:!0}}]}}]}],raw:`Record<string, JsonValue>`},{name:`undefined`}]},description:`The widget's interactive state (a table's sort): session-only unless the host keeps it (Q3).`},setWidgetState:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(state: JsonObject) => void`,signature:{arguments:[{type:{name:`Record`,elements:[{name:`string`},{name:`union`,raw:`string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }`,elements:[{name:`string`},{name:`number`},{name:`boolean`},{name:`null`},{name:`Array`,elements:[{name:`JsonValue`}],raw:`JsonValue[]`},{name:`signature`,type:`object`,raw:`{ [key: string]: JsonValue }`,signature:{properties:[{key:{name:`string`},value:{name:`JsonValue`,required:!0}}]}}]}],raw:`Record<string, JsonValue>`},name:`state`}],return:{name:`void`}}},description:``},messages:{required:!0,tsType:{name:`intersection`,raw:`CommonMessages & typeof timeRangeStrings & DashboardMessages`,elements:[{name:`Pick`,elements:[{name:`CoreMessages`},{name:`union`,raw:`| 'close'
| 'cancel'
| 'save'
| 'revert'
| 'delete'
| 'clearAll'
| 'loadMore'
| 'loading'
| 'dismiss'
| 'remove'
| 'noData'
| 'moreActions'
| 'moreOptions'
| 'retry'
| 'details'
| 'genericError'
| 'copy'
| 'copied'
| 'notSet'
| 'noResults'
| 'loadError'
| 'selectPlaceholder'
| 'clearValue'
| 'moreInformation'
| 'notifications'
| 'showMore'
| 'showLess'
| 'yes'
| 'no'
| 'export'
| 'loadFailed'
| 'value'
| 'start'
| 'end'
| 'from'
| 'to'
| 'summary'
| 'confirm'
| 'back'
| 'next'
| 'moveUp'
| 'moveDown'
| 'itemMovedTo'
| 'removeRow'
| 'range'`,elements:[{name:`literal`,value:`'close'`},{name:`literal`,value:`'cancel'`},{name:`literal`,value:`'save'`},{name:`literal`,value:`'revert'`},{name:`literal`,value:`'delete'`},{name:`literal`,value:`'clearAll'`},{name:`literal`,value:`'loadMore'`},{name:`literal`,value:`'loading'`},{name:`literal`,value:`'dismiss'`},{name:`literal`,value:`'remove'`},{name:`literal`,value:`'noData'`},{name:`literal`,value:`'moreActions'`},{name:`literal`,value:`'moreOptions'`},{name:`literal`,value:`'retry'`},{name:`literal`,value:`'details'`},{name:`literal`,value:`'genericError'`},{name:`literal`,value:`'copy'`},{name:`literal`,value:`'copied'`},{name:`literal`,value:`'notSet'`},{name:`literal`,value:`'noResults'`},{name:`literal`,value:`'loadError'`},{name:`literal`,value:`'selectPlaceholder'`},{name:`literal`,value:`'clearValue'`},{name:`literal`,value:`'moreInformation'`},{name:`literal`,value:`'notifications'`},{name:`literal`,value:`'showMore'`},{name:`literal`,value:`'showLess'`},{name:`literal`,value:`'yes'`},{name:`literal`,value:`'no'`},{name:`literal`,value:`'export'`},{name:`literal`,value:`'loadFailed'`},{name:`literal`,value:`'value'`},{name:`literal`,value:`'start'`},{name:`literal`,value:`'end'`},{name:`literal`,value:`'from'`},{name:`literal`,value:`'to'`},{name:`literal`,value:`'summary'`},{name:`literal`,value:`'confirm'`},{name:`literal`,value:`'back'`},{name:`literal`,value:`'next'`},{name:`literal`,value:`'moveUp'`},{name:`literal`,value:`'moveDown'`},{name:`literal`,value:`'itemMovedTo'`},{name:`literal`,value:`'removeRow'`},{name:`literal`,value:`'range'`}]}],raw:`Pick<CoreMessages, K>`},{name:`timeRangeStrings`},{name:`DashboardMessages`}]},description:``},isLoading:{required:!1,tsType:{name:`boolean`},description:"With `hasOwnStates`, the states to draw (WID-12); the frame draws none of its own."},isRefreshing:{required:!1,tsType:{name:`boolean`},description:``},error:{required:!1,tsType:{name:`ReactNode`},description:``},onRetry:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},emptyState:{required:!1,tsType:{name:`ReactNode`},description:``}}}})))()}f();export{s as default};