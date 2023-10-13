import type { MarkdownPostProcessor } from 'obsidian';
import {
  createBanner,
  hasBanner,
  updateBanner,
  destroyBanner
} from 'src/banner';
import type { BannerProps } from 'src/banner';
import { extractBannerData, shouldDisplayBanner } from 'src/bannerData';
import { plug } from 'src/main';
import { getSetting } from 'src/settings';
import { registerSettingChangeEvent } from 'src/utils';
import BannerRenderChild from './BannerRenderChild';
import type { Embedded } from './BannerRenderChild';

// Helper to associate a banner to a specific view/document
const currentBanners: Record<string, BannerRenderChild> = {};

/* BUG: This doesn't rerender banners in internal embeds properly.
Reload app or manually edit the view/contents to fix */
const rerender = () => {
  for (const banner of Object.values(currentBanners)) {
    banner.unload();
  }

  for (const leaf of plug.app.workspace.getLeavesOfType('markdown')) {
    const { previewMode } = leaf.view;
    const sections = previewMode.renderer.sections.filter((s) => (
      s.el.querySelector('pre.frontmatter, .internal-embed')
    ));
    for (const section of sections) {
      section.rendered = false;
      section.html = '';
    }
    previewMode.renderer.queueRender();
  }
};

const isEmbedded = (containerEl: HTMLElement): Embedded => {
  if (containerEl.closest('.internal-embed')) return 'internal';
  if (containerEl.closest('.popover')) return 'popover';
  return false;
};

const postprocessor: MarkdownPostProcessor = (el, ctx) => {
  const {
    docId,
    containerEl,
    frontmatter,
    sourcePath
  } = ctx;

  // Only show banners in embeds when allowed
  const embed = isEmbedded(containerEl);
  if (
    (embed === 'internal' && !getSetting('showInInternalEmbed')) ||
    (embed === 'popover' && !getSetting('showInPopover'))
  ) return;

  const file = plug.app.metadataCache.getFirstLinkpathDest(sourcePath, '/')!;
  const bannerData = extractBannerData(frontmatter, file);

  if (shouldDisplayBanner(bannerData)) {
    const props: BannerProps = {
      ...bannerData,
      file,
      embed,
      viewType: 'reading'
    };
    if (hasBanner(docId)) {
      updateBanner(props, docId);
    } else {
      createBanner(props, containerEl.parentElement!, docId);
    }
  } else {
    destroyBanner(docId);
  }
};

export const loadPostProcessor = () => {
  plug.registerMarkdownPostProcessor(postprocessor);
  rerender();
};

export const registerReadingBannerEvents = () => {
  registerSettingChangeEvent([
    'frontmatterField',
    'showInInternalEmbed',
    'useHeaderByDefault',
    'defaultHeaderValue'
  ], rerender);
  plug.registerEvent(plug.app.vault.on('rename', rerender));
};

export const unloadReadingViewBanners = () => {
  rerender();
};
