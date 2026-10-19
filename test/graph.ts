// Sample graphs for NodeGraph's tests and stories: a five-stage image pipeline for a telescope, and a 60-node network
// of observatories grouped by region.
import { Archive, Camera, Layers, Send, SlidersHorizontal } from 'lucide-react';
import type { GraphEdge, GraphGroup, GraphNode } from '../src/graph/types';

export const pipelineNodes: GraphNode[] = [
  {
    id: 'capture',
    label: 'Capture',
    icon: Camera,
    status: { tone: 'success', label: 'Running' },
    metrics: [
      { label: 'Frames', value: '1,240' },
      { label: 'Rate', value: '2.4 fps' },
    ],
  },
  {
    id: 'calibrate',
    label: 'Calibrate',
    icon: SlidersHorizontal,
    status: { tone: 'success', label: 'Running' },
    metrics: [{ label: 'Darks', value: '32' }],
  },
  {
    id: 'stack',
    label: 'Stack',
    icon: Layers,
    status: { tone: 'danger', label: 'Failed' },
    description: 'Out of memory at frame 812',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    status: { tone: 'neutral', label: 'Waiting' },
  },
  {
    id: 'publish',
    label: 'Publish',
    icon: Send,
    status: { tone: 'neutral', label: 'Waiting' },
  },
];

export const pipelineEdges: GraphEdge[] = [
  { id: 'capture-calibrate', from: 'capture', to: 'calibrate', label: '48 MB/s' },
  {
    id: 'calibrate-stack',
    from: 'calibrate',
    to: 'stack',
    status: { tone: 'danger', label: 'Stalled' },
  },
  { id: 'stack-archive', from: 'stack', to: 'archive' },
  { id: 'archive-publish', from: 'archive', to: 'publish' },
];

const regions = [
  {
    id: 'north-america',
    label: 'North America',
    sites: ['Mauna Kea', 'Kitt Peak', 'Palomar'],
  },
  {
    id: 'south-america',
    label: 'South America',
    sites: ['Cerro Paranal', 'La Silla', 'Cerro Tololo'],
  },
  { id: 'europe', label: 'Europe', sites: ['La Palma', 'Calar Alto', 'Pic du Midi'] },
  {
    id: 'asia-pacific',
    label: 'Asia-Pacific',
    sites: ['Siding Spring', 'Mount John', 'Xinglong'],
  },
];
const instruments = ['Imager', 'Spectrograph', 'Survey camera'];

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Four regions of 15 nodes: per site a gateway and three instruments, then a regional pipeline, archive and mirror. */
function buildTopology(): { nodes: GraphNode[]; edges: GraphEdge[]; groups: GraphGroup[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const link = (from: string, to: string, extra: Partial<GraphEdge> = {}) => {
    edges.push({ id: `${from}->${to}`, from, to, ...extra });
  };
  regions.forEach((region, regionIndex) => {
    const pipeline = `${region.id}-pipeline`;
    const archive = `${region.id}-archive`;
    const mirror = `${region.id}-mirror`;
    region.sites.forEach((site, siteIndex) => {
      const gateway = `${slug(site)}-gateway`;
      const isDegraded = regionIndex === 1 && siteIndex === 2;
      nodes.push({
        id: gateway,
        label: `${site} gateway`,
        group: region.id,
        status: isDegraded
          ? { tone: 'warning', label: 'Degraded' }
          : { tone: 'success', label: 'Online' },
        metrics: [{ label: 'Uplink', value: `${String(40 + siteIndex * 15)} Mbps` }],
      });
      instruments.forEach((instrument, instrumentIndex) => {
        const id = `${slug(site)}-${slug(instrument)}`;
        const isOffline = regionIndex === 2 && siteIndex === 0 && instrumentIndex === 1;
        nodes.push({
          id,
          label: `${site} ${instrument.toLowerCase()}`,
          group: region.id,
          status: isOffline ? { tone: 'danger', label: 'Offline' } : undefined,
        });
        link(id, gateway, isOffline ? { status: { tone: 'danger', label: 'No signal' } } : {});
      });
      link(
        gateway,
        pipeline,
        isDegraded ? { status: { tone: 'warning', label: 'Packet loss' } } : {},
      );
    });
    nodes.push(
      {
        id: pipeline,
        label: `${region.label} pipeline`,
        group: region.id,
        status: { tone: 'success', label: 'Healthy' },
      },
      { id: archive, label: `${region.label} archive`, group: region.id },
      { id: mirror, label: `${region.label} mirror`, group: region.id },
    );
    link(pipeline, archive);
    link(archive, mirror);
  });
  // Each archive replicates to the next region's mirror.
  regions.forEach((region, index) => {
    const next = regions[(index + 1) % regions.length];
    if (next) {
      link(`${region.id}-archive`, `${next.id}-mirror`, { label: 'Replica' });
    }
  });
  return {
    nodes,
    edges,
    groups: regions.map((region) => ({ id: region.id, label: region.label })),
  };
}

export const observatoryTopology = buildTopology();
