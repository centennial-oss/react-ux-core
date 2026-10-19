// The map widget (§10.4): `geo` data on /map's Map. Selecting a place can set a dashboard filter, and the selection
// follows that filter when it changes elsewhere (BI-07). The view loads MapLibre only when a map widget renders.

import { MapPin } from 'lucide-react';
import { WidgetLoading } from '../WidgetFrame/WidgetStates';
import { lazyComponent } from '../../utils/lazyComponent';
import { geoShape, type GeoData } from '../data/shapes';
import type { WidgetRenderProps } from '../types';
import { defineWidget } from '../widgets/define';

/** The map widget's options. */
export interface MapWidgetOptions {
  [key: string]: string | number | boolean;
  /** The id of one of the host's `mapStyles`; defaults to the first. */
  style: string;
  /** Fit the places (the default), or a fixed centre and zoom. */
  initialView: 'fit' | 'fixed';
  centerLng: number;
  centerLat: number;
  zoom: number;
  /** With a fixed view, a marker at its centre. */
  hasCenterMarker: boolean;
  /** Groups nearby places. Defaults to true. */
  hasClustering: boolean;
  /** The dashboard filter that selecting a place sets, or empty for none (BI-07). */
  selectionFilter: string;
}

const MapWidgetView = lazyComponent<WidgetRenderProps<MapWidgetOptions, GeoData>>(
  () => import('./MapWidgetView').then((module) => module.default),
  WidgetLoading,
);

/** The map widget type (P0). It sets filters (CTX-10), and loads MapLibre on first render. */
export const mapWidget = defineWidget<MapWidgetOptions, GeoData>({
  type: 'ccux.map',
  displayName: (messages) => messages.mapWidget,
  description: (messages) => messages.mapWidgetDescription,
  icon: MapPin,
  category: (messages) => messages.widgetCategoryMaps,
  dataShape: geoShape.id,
  defaultSize: { w: 4, h: 6 },
  minSize: { w: 3, h: 3 },
  minPixelSize: { width: 240, height: 200 },
  stackedHeight: 7,
  hasOwnStates: true,
  defaultOptions: {
    style: '',
    initialView: 'fit',
    centerLng: 0,
    centerLat: 20,
    zoom: 2,
    hasCenterMarker: false,
    hasClustering: true,
    selectionFilter: '',
  },
  optionsSchema: [
    { type: 'text', name: 'style', label: (messages) => messages.optionMapStyle },
    {
      type: 'pillbox',
      name: 'initialView',
      label: (messages) => messages.optionInitialView,
      items: [
        { id: 'fit', label: (messages) => messages.optionFitData },
        { id: 'fixed', label: (messages) => messages.optionFixedView },
      ],
    },
    { type: 'switch', name: 'hasClustering', label: (messages) => messages.optionClustering },
    { type: 'text', name: 'selectionFilter', label: (messages) => messages.optionSelectionFilter },
  ],
  capabilities: { canSetFilters: true },
  component: MapWidgetView,
});
