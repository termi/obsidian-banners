import type { TFile } from 'obsidian';
import { plug } from './main';
import { getSetting } from './settings';

/* NOTE: These are bi-directional maps between "suffixes" for YAML banner keys and
`BannerMetadata` keys, to help read and write banner data from/to frontmatter */
const SUFFIX_TO_KEY_MAP: Record<string, keyof BannerMetadata> = {
  '': 'source',
  x: 'x',
  y: 'y'
} as const;

const KEY_TO_SUFFIX_MAP: Record<keyof BannerMetadata, string> = {
  source: '',
  x: 'x',
  y: 'y'
} as const;

const getYamlKey = (suffix: string) => {
  const prefix = getSetting('frontmatterField');
  return suffix ? `${prefix}_${suffix}` : prefix;
};

// Extract banner data from a given frontmatter-like object (key:value form)
// eslint-disable-next-line max-len
export const extractBannerData = (frontmatter: Record<string, unknown> = {}): Partial<BannerMetadata> => {
  return Object.entries(SUFFIX_TO_KEY_MAP).reduce((data, [suffix, dataKey]) => {
    const yamlKey = getYamlKey(suffix);
    if (Object.hasOwn(frontmatter, yamlKey)) data[dataKey] = frontmatter[yamlKey] as any;
    return data;
  }, {} as Partial<BannerMetadata>);
};

// Helper to extract banner data from a given file
export const extractBannerDataFromFile = (file: TFile): Partial<BannerMetadata> => {
  const { frontmatter } = plug.app.metadataCache.getFileCache(file) ?? {};
  return extractBannerData(frontmatter);
};

// Upsert banner data into the frontmatter with its associated field
export const updateBannerData = async (file: TFile, bannerData: Partial<BannerMetadata>) => {
  await plug.app.fileManager.processFrontMatter(file, async (frontmatter) => {
    for (const [dataKey, val] of Object.entries(bannerData) as [keyof BannerMetadata, any][]) {
      const suffix = KEY_TO_SUFFIX_MAP[dataKey];
      const yamlKey = getYamlKey(suffix);
      frontmatter[yamlKey] = val;
    }
  });
};
