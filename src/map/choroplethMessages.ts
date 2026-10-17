// Strings for the Map's choropleth layer (merged into `/map`'s strings by `useMapMessages`).

/** Strings for the Map's choropleth layer. */
export interface ChoroplethMessages {
  /** Names the colour scale's legend. */
  choroplethScale: string;
  /** The regions list's heading. */
  choroplethRegionCount: (params: { count: number }) => string;
  /** Names the regions list (sorted by value), after the map's own name. */
  choroplethRegionList: (params: { label: string }) => string;
  /** The summary under the map, naming the highest and lowest regions. */
  choroplethSummary: (params: {
    highest: string;
    highestValue: string;
    lowest: string;
    lowestValue: string;
  }) => string;
}

export const defaultChoroplethMessages: ChoroplethMessages = {
  choroplethScale: 'Scale',
  choroplethRegionCount: ({ count }) => `Regions (${String(count)})`,
  choroplethRegionList: ({ label }) => `${label}: regions by value`,
  choroplethSummary: ({ highest, highestValue, lowest, lowestValue }) =>
    `Highest: ${highest}, ${highestValue}. Lowest: ${lowest}, ${lowestValue}.`,
};
