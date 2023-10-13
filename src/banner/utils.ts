import { requestUrl } from 'obsidian';
import type { TFile } from 'obsidian';
import { IMAGE_FORMATS } from 'src/bannerData';
import { plug } from 'src/main';

const getInternalFile = (src: string, file: TFile): TFile | null => {
  const isInternalLink = /^\[\[.+\]\]/.test(src);
  if (!isInternalLink) return null;

  const link = src.slice(2, -2);
  return plug.app.metadataCache.getFirstLinkpathDest(link, file.path);
};

export const fetchImage = async (src: string, file: TFile): Promise<string | null> => {
  // Check if it's an internal link to an image and use that if it is
  const internalFile = getInternalFile(src, file);
  if (internalFile) {
    if (!IMAGE_FORMATS.includes(internalFile.extension)) {
      throw new Error(`${internalFile.name} is not an image!`);
    }
    return plug.app.vault.getResourcePath(internalFile);
  }

  try {
    const resp = await requestUrl(src);
    const blob = new Blob([resp.arrayBuffer], { type: resp.headers['content-type'] });
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  } catch (error: any) {
    throw new Error(error);
  }
};
