import a4Texture from '@/assets/paper/a4.jpg';
import cardstockTexture from '@/assets/paper/cardstock.jpg';
import cypressTexture from '@/assets/paper/cypress.jpg';
import graphiteTexture from '@/assets/paper/graphite.jpg';
import oceanTexture from '@/assets/paper/ocean.jpg';
import parchmentTexture from '@/assets/paper/parchment.jpg';
import skyTexture from '@/assets/paper/sky.jpg';
import velvetTexture from '@/assets/paper/velvet.jpg';
import xuanTexture from '@/assets/paper/xuan.jpg';
import type { PaperTextureId } from '@/type/settings';

export const PAPER_TEXTURES: Array<{ id: PaperTextureId; name: string; url: string }> = [
  { id: 'a4', name: 'A4 白纸', url: a4Texture },
  { id: 'graphite', name: '石墨黑纸', url: graphiteTexture },
  { id: 'parchment', name: '羊皮纸', url: parchmentTexture },
  { id: 'velvet', name: '暗红皮革', url: velvetTexture },
  { id: 'xuan', name: '宣纸', url: xuanTexture },
  { id: 'cypress', name: '松柏夜墨', url: cypressTexture },
  { id: 'sky', name: '彩色纸页', url: skyTexture },
  { id: 'ocean', name: '深海卡纸', url: oceanTexture },
  { id: 'cardstock', name: '旧版黑卡纸', url: cardstockTexture },
];

export function getPaperTexture(id: PaperTextureId) {
  return PAPER_TEXTURES.find(item => item.id === id) ?? PAPER_TEXTURES[0];
}
