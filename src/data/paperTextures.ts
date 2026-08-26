import a4Texture from '@/assets/paper/a4.jpg';
import cardstockTexture from '@/assets/paper/cardstock.jpg';
import parchmentTexture from '@/assets/paper/parchment.jpg';
import xuanTexture from '@/assets/paper/xuan.jpg';
import type { PaperTextureId } from '@/type/settings';

export const PAPER_TEXTURES: Array<{ id: PaperTextureId; name: string; url: string }> = [
  { id: 'a4', name: 'A4 白纸', url: a4Texture },
  { id: 'xuan', name: '宣纸', url: xuanTexture },
  { id: 'parchment', name: '羊皮纸', url: parchmentTexture },
  { id: 'cardstock', name: '卡纸', url: cardstockTexture },
];

export function getPaperTexture(id: PaperTextureId) {
  return PAPER_TEXTURES.find(item => item.id === id) ?? PAPER_TEXTURES[0];
}
