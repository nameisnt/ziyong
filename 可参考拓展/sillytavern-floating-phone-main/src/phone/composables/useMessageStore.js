import { computed, ref } from 'vue';

const ROLE_KEY = 'phone_message_roles';
const CONVERSATION_KEY = 'phone_message_conversations';
const MESSAGE_KEY = 'phone_message_messages';

export const BUILTIN_STICKER_PACKS = [
  {
    id: 'xiaotuanzi',
    name: '小团子',
    stickers: [
      { name: '生气', url: 'https://i.postimg.cc/MTnL80ZC/mmexporta60894a47c5cee24839f00bb300978a1-1767061866941.gif' },
      { name: '流泪', url: 'https://i.postimg.cc/rpKjdV6M/mmexportdd83b799848a79e38a4f667a6d8f5b3b-1767061864718.gif' },
      { name: '被吓到', url: 'https://i.postimg.cc/GhKxq8d8/mmexport7ac3afd6d317f957e4cdc7df86e369d6-1767061861801.gif' },
      { name: '惬意', url: 'https://i.postimg.cc/rpB1K5C7/mmexporteb3df9e22c52e98e0f7bde24091913c5-1767061869051.gif' },
      { name: '大笑', url: 'https://i.postimg.cc/fbm3qpm9/mmexporta27bea8cc25c52493b26f50f7ee289e4-1767061870957.gif' },
      { name: '恶意卖萌', url: 'https://i.postimg.cc/kG1DtmPR/mmexport09bf6047f1d05b527effe7858d0e5d45-1767061872824.gif' },
      { name: '高兴', url: 'https://i.postimg.cc/zGR336t3/mmexportaa8a7522d7367165571922e64e1f31bf-1767061874668.gif' },
      { name: '眨眼wink', url: 'https://i.postimg.cc/3R3wSRKw/mmexport06487e948d6ad51d99e3f2133bef7383-1767061876431.gif' },
      { name: '打哈欠', url: 'https://i.postimg.cc/FzBsHV0g/mmexportf334967ea1cc463c10b1fb029bb4b671-1767061878200.gif' },
      { name: '戴墨镜酷', url: 'https://i.postimg.cc/wBpxMvRS/mmexport1fd8cd23321698337b72e8cfff72ba33-1767061880223.gif' },
      { name: '被可爱到', url: 'https://i.postimg.cc/h45SxM74/mmexport055d908aca186912054f3342ff4ce0b6-1767061881997.gif' },
      { name: '双手合十感谢', url: 'https://i.postimg.cc/qvdHXFJP/mmexport78bec4c90d81eaccb62944bb6f432a46-1767061883970.gif' },
      { name: '大哭', url: 'https://i.postimg.cc/SKS0HzMS/mmexport96fe6e8f27c80947891474e6232e69f6-1767061888571.gif' },
      { name: '眼冒爱心', url: 'https://i.postimg.cc/prn3KfgW/mmexport4eb07ffd3fe712f14b5d919313e48e47-1767061890465.gif' },
      { name: '蚊香眼，晕', url: 'https://i.postimg.cc/xqDh5k24/mmexporte95c0498d076bc07e01a58019087e809-1767061892251.gif' },
      { name: '对手指撅嘴', url: 'https://i.postimg.cc/R0pMRTDx/mmexport1e19638a2019ad3f551a1957abb6f7ce-1767061894187.gif' },
      { name: '脸红睁大眼睛', url: 'https://i.postimg.cc/MH2JP30g/mmexport629934f1f30b2c0455d736178081ef4a-1767061896396.gif' },
      { name: '天使光环，笑', url: 'https://i.postimg.cc/RZs55ZQ1/mmexportcafe9f93f3aa3d532e2ad74610b95bdc-1767061900456.gif' },
      { name: '对手指流眼泪', url: 'https://i.postimg.cc/brHW6ywq/mmexport0fb700c5cb6e6d1730b30093f697a8ea-1767061902523.gif' },
      { name: '爱心', url: 'https://i.postimg.cc/jSk93ktZ/mmexport91f7496a1a26c2d7e436e037766b30ef-1767061904266.gif' },
      { name: '赞', url: 'https://i.postimg.cc/FR0BRrcd/mmexport05e509f275e85dc07d3795a9001acf23-1767061906041.gif' },
      { name: '心虚看天', url: 'https://i.postimg.cc/RCQYx0vW/mmexporte45dcbd97a7a077cecab58cb0be48335-1767061907641.gif' },
      { name: '思索', url: 'https://i.postimg.cc/8c1tzhTQ/mmexportfafd03ee6cba8d0f62f5e4107eb8aa02-1767061909333.gif' },
      { name: '睡觉', url: 'https://i.postimg.cc/BndpKWJc/mmexportf8931e9f79dad07df0a26f85eb0bbcc3-1767061911112.gif' },
      { name: '呆', url: 'https://i.postimg.cc/TPg9jkwh/mmexporta577f2078cd03de2b1ac649ca507499f-1767061914297.gif' },
      { name: '无语', url: 'https://i.postimg.cc/vTHtsbvZ/mmexportbc18a1f4e0a53df8fab394b878a15814-1767061915997.gif' },
      { name: '大红嘴唇子亲亲', url: 'https://i.postimg.cc/L8ZBRyjh/mmexport55253efdee2efd9d52add381bb55e5e5-1767061917636.gif' },
      { name: '点头', url: 'https://i.postimg.cc/Y9t16MZ0/mmexport0ccd0da27d226927bf597e237d3db757-1767061919134.gif' },
      { name: '惊恐', url: 'https://i.postimg.cc/yYRk82rs/mmexportb85024de92fedf1b74482e2f71e79239-1767061920641.gif' },
      { name: '蛋花眼流泪', url: 'https://i.postimg.cc/1zmtMXRN/mmexport11e7ef89b798ade82aff24efbf6c9a72-1767061922123.gif' },
      { name: '诶？', url: 'https://i.postimg.cc/L516hZDk/mmexport7c175838c9127c58beec2a853381e9c1-1767061923797.gif' },
      { name: '叹气', url: 'https://i.postimg.cc/KcwN1kxn/mmexportc7bb352dbe095c5a297ad99151112e3d-1767061925332.gif' },
      { name: '星星眼', url: 'https://i.postimg.cc/QtVQtszv/mmexporte5ee590b0d6e4d1265b8afcbce889626-1767061926926.gif' },
      { name: '委屈', url: 'https://i.postimg.cc/HsbQj66R/mmexport3a40c5d4229acdbd3c7c227e4818efec-1767061928630.gif' },
      { name: '再见', url: 'https://i.postimg.cc/2Swh7VRH/mmexport038282c76fcda53db53dd0e3021853b1-1767061930077.gif' },
      { name: '可爱', url: 'https://i.postimg.cc/hjHdtmTf/mmexport83022c9fb9035ac6091d84806605c0ee-1767061932027.gif' },
      { name: '兴奋', url: 'https://i.postimg.cc/BQfFWxJY/mmexportbe3080518b480b1d5d8f8b5bd5c995c9-1767061935322.gif' },
      { name: 'OK', url: 'https://i.postimg.cc/g07wghML/mmexportc3e4ef7b32f8ad8d0a4d5f1de0207d2c-1767061937565.gif' },
      { name: '眨眼卖萌', url: 'https://i.postimg.cc/3N5kTTQK/mmexport9427c6fbbdd660a694402aee76d97d98-1767061939570.gif' },
      { name: '正确', url: 'https://i.postimg.cc/BQCXdkYn/mmexportaad5a658f6e7e81818796bce56780f49-1767061941468.gif' },
      { name: '捧脸飘出爱心', url: 'https://i.postimg.cc/Jz6thJWn/mmexporta8356efd1a35bd69ac9fa4002c532536-1767061943057.gif' },
      { name: '敬礼', url: 'https://i.postimg.cc/QdtxvtKm/mmexporta7741b6c2e873d60b0aa224ac9214d29-1767061945052.gif' },
      { name: '发出反派笑声', url: 'https://i.postimg.cc/85h1Lfx1/mmexport6a887c711684d8fa843b5b54d0b549e6-1767061948859.gif' },
      { name: '害怕', url: 'https://i.postimg.cc/c4Dd7SkD/mmexport3fab03e8df081fdde47fc8e7e845c40d-1767061950579.gif' },
      { name: '大笑举手', url: 'https://i.postimg.cc/D0jRG2f1/mmexport94ba5659e78381314496783bfc0fe356-1767061952530.gif' },
      { name: '陶醉融化成爱心', url: 'https://i.postimg.cc/9X8kJQVQ/mmexport8afb2c4d8c1120b2d1082857a3d1e78b-1767061955040.gif' },
      { name: '着急', url: 'https://i.postimg.cc/C5zmWb03/mmexportbd4ad12438d72567ca47b153b583bb1c-1767061956862.gif' },
      { name: '害羞', url: 'https://i.postimg.cc/HkQBDYGL/mmexport3640dbda920de728be1067ef589aa50c-1767061958591.gif' },
      { name: '对不起，鞠躬掉眼泪', url: 'https://i.postimg.cc/rs0NhcCs/mmexport6eed6fa22009875dbc3607eb7c2658ab-1767061960788.gif' },
      { name: '开心拍手', url: 'https://i.postimg.cc/4dMS4WW3/mmexport5b302d3c4a8a80b0fd941ee7cfd3feb7-1767061962466.gif' },
      { name: '点头冒爱心', url: 'https://i.postimg.cc/v8gK2dmX/mmexporta95070b4389f33943a489a3c886c2a93-1767061964060.gif' },
      { name: '张大嘴', url: 'https://i.postimg.cc/CKrvJvTW/mmexportf3f44e4303f684a9bb89ff75ac62ab08-1767061965774.gif' },
      { name: '好笨，拍额头', url: 'https://i.postimg.cc/SxDVNZsj/mmexporte55fa0061999cdbf46f9b4bfd0e39255-1767061967357.gif' },
      { name: '加油', url: 'https://i.postimg.cc/Y9mxRMxj/mmexportab068c1ace023d33824a37c052f2147f-1767061968920.gif' },
    ],
  },
  {
    id: 'abstract',
    name: '抽象',
    stickers: [
      { name: '886', url: 'https://i.postimg.cc/pXvx40xR/886.jpg' },
      { name: '一笑了之', url: 'https://i.postimg.cc/sXSd0WNW/yi-xiao-le-zhi.png' },
      { name: '啊...?', url: 'https://i.postimg.cc/c4WZ2DZJ/a.png' },
      { name: '俺不中勒', url: 'https://i.postimg.cc/bNR8hQNp/an-bu-zhong-lei.jpg' },
      { name: '俺就亲亲你不做什么', url: 'https://i.postimg.cc/rFTc3hcz/an-jiu-qin-qin-ni-bu-zuo-shen-me.png' },
      { name: '爆!!', url: 'https://i.postimg.cc/BQ3skhsb/bao.gif' },
      { name: '蹦蹦跳跳', url: 'https://i.postimg.cc/rF9ckSF0/beng-beng-tiao-tiao.gif' },
      { name: '不好笑哦', url: 'https://i.postimg.cc/qMG0T8Mg/bu-hao-xiao-o.jpg' },
      { name: '咪的天', url: 'https://i.postimg.cc/XYHbZ453/mi-de-tian.jpg' },
      { name: '我特喵去你的', url: 'https://i.postimg.cc/5tDW3gpr/wo-te-miao-qu-ni-de.jpg' },
      { name: '大脑褶皱都抚平了', url: 'https://i.postimg.cc/vHvMsWH1/da-nao-zhe-zhou-dou-yao-fu-ping-le.jpg' },
      { name: '瞪你', url: 'https://i.postimg.cc/28xmD48w/deng-ni.gif' },
      { name: '放心交给我一定会搞砸的', url: 'https://i.postimg.cc/c4cZSQ4M/fang-xin-jiao-gei-wo-yi-ding-hui-gao-za-de.jpg' },
      { name: '尴尬的擦汗', url: 'https://i.postimg.cc/5Nm1VwN5/gan-ga-de-ca-han.jpg' },
      { name: '感动', url: 'https://i.postimg.cc/bNR8hQNR/gan-dong.png' },
      { name: '干嘛', url: 'https://i.postimg.cc/gkKdWvks/gan-ma.jpg' },
      { name: '够了', url: 'https://i.postimg.cc/mg242ttQ/gou-le.jpg' },
      { name: '哈哈可恶', url: 'https://i.postimg.cc/zGXNXVVC/ha-ha-ke-e.jpg' },
      { name: '好耶', url: 'https://i.postimg.cc/mg242ttj/hao-ye.gif' },
      { name: '嘿嘿', url: 'https://i.postimg.cc/9QF2FrrB/hei-hei.jpg' },
      { name: '皇帝巡查', url: 'https://i.postimg.cc/wjTzT77f/huang-di-xun-cha.jpg' },
      { name: '敬礼', url: 'https://i.postimg.cc/Qd43BhTv/jing-li.gif' },
      { name: '救救我', url: 'https://i.postimg.cc/dVtFtLLf/jiu-jiu-wo.jpg' },
      { name: '开心', url: 'https://i.postimg.cc/Gm7CBdyS/kai-xin.gif' },
      { name: '看我不爽你就自杀', url: 'https://i.postimg.cc/7ZY4Yf58/kan-wo-bu-shuang-ni-jiu-zi-sha.jpg' },
      { name: '哭哭', url: 'https://i.postimg.cc/527VHbCR/ku-ku.jpg' },
      { name: '老公给我买', url: 'https://i.postimg.cc/527VHbCZ/lao-gong-gei-wo-mai.jpg' },
      { name: '累了这个B世界', url: 'https://i.postimg.cc/y8QHJsRq/lei-le-zhe-ge-B-shi-jie.jpg' },
      { name: '灵魂升天', url: 'https://i.postimg.cc/RZsB34t5/ling-hun-sheng-tian.jpg' },
      { name: '美味', url: 'https://i.postimg.cc/W1WvDTZv/mei-wei.jpg' },
      { name: '面对职责退化代替口舌', url: 'https://i.postimg.cc/CxPgZS8S/mian-dui-zhi-ze-tui-hua-dai-ti-kou-she.jpg' },
      { name: '抹泪', url: 'https://i.postimg.cc/Qd43Bh7t/mo-lei.gif' },
      { name: '抹泪2', url: 'https://i.postimg.cc/0yWs6PSy/mo-lei2.gif' },
      { name: '那我还活鸡毛啊跳了兄弟', url: 'https://i.postimg.cc/nLXtBgKj/na-wo-hai-huo-ji-mao-a-tiao-le-xiong-di.gif' },
      { name: '嗯?', url: 'https://i.postimg.cc/HkZgJdMj/n.jpg' },
      { name: '你要干啥', url: 'https://i.postimg.cc/pdmtz4QL/ni-yao-gan-sha.gif' },
      { name: '你要寄吧干啥', url: 'https://i.postimg.cc/JhsWZv3n/ni-yao-ji-ba-gan-sha.jpg' },
      { name: '你知道我要说什么', url: 'https://i.postimg.cc/0NzqDFGj/ni-zhi-dao-wo-yao-shuo-shen-me.jpg' },
      { name: '凄凉的世界走投无路了', url: 'https://i.postimg.cc/8C7VM9dv/qi-liang-de-shi-jie-zou-tou-wu-lu-le.gif' },
      { name: '期待', url: 'https://i.postimg.cc/hGXqT68T/qi-dai.jpg' },
      { name: '让我想想', url: 'https://i.postimg.cc/7L5y0d1g/rang-wo-xiang-xiang.jpg' },
      { name: '生气', url: 'https://i.postimg.cc/VNJcnp9K/sheng-qi.gif' },
      { name: '爽', url: 'https://i.postimg.cc/vm4dfk7t/shuang.jpg' },
      { name: '思考', url: 'https://i.postimg.cc/s2bCcmKp/si-kao.gif' },
      { name: '思考2', url: 'https://i.postimg.cc/CKRVkXCN/si-kao2.jpg' },
      { name: '天使降临', url: 'https://i.postimg.cc/25gNwGTQ/tian-shi-jiang-lin.png' },
      { name: '舔屏幕', url: 'https://i.postimg.cc/BvRfgpNm/tian-ping-mu.gif' },
      { name: '偷听群友怪话', url: 'https://i.postimg.cc/cJPGmhTD/tou-ting-qun-you-guai-hua.jpg' },
      { name: '猥琐的舔你', url: 'https://i.postimg.cc/MGgJD5tC/wei-suo-de-tian-ni.gif' },
      { name: '我操恶俗啊', url: 'https://i.postimg.cc/CK9pN7JP/wo-cao-e-su-a.jpg' },
      { name: '我天高雅啊', url: 'https://i.postimg.cc/SKHbrdV3/wo-tian-gao-ya-a.jpg' },
      { name: '我过的很好别担心(其实一点也不好)', url: 'https://i.postimg.cc/BvRfgpNR/wo-guo-de-hen-hao-bie-dan-xin.png' },
      { name: '我要草你', url: 'https://i.postimg.cc/43jR5PBR/wo-yao-cao-ni.png' },
      { name: '无语', url: 'https://i.postimg.cc/TwmMHbHB/wu-yu.gif' },
      { name: '......', url: 'https://i.postimg.cc/DzR3g6BF/wu-yu2.jpg' },
      { name: '无语的擦汗', url: 'https://i.postimg.cc/mrKWwj8L/wu-yu-de-ca-han.gif' },
      { name: '小猫做面包', url: 'https://i.postimg.cc/LXfK0P0r/xiao-mao-zuo-mian-bao.gif' },
      { name: '笑的很命苦', url: 'https://i.postimg.cc/hjxW3m5B/xiao-de-hen-ming-ku.png' },
      { name: '邪恶老鼠', url: 'https://i.postimg.cc/MTR2rBF8/xie-e-lao-shu.jpg' },
      { name: '邪恶的笑', url: 'https://i.postimg.cc/wvJ8bNbC/xie-e-de-xiao.gif' },
      { name: '邪恶小熊盯着你', url: 'https://i.postimg.cc/vB9FSnNb/xie-e-xiao-xiong-ding-zhe-ni.jpg' },
      { name: '兄弟你好香', url: 'https://i.postimg.cc/3Rp5bGc7/xiong-di-ni-hao-xiang.jpg' },
      { name: '兄弟我碎了', url: 'https://i.postimg.cc/ZR3tDNMK/xiong-di-wo-sui-le.gif' },
      { name: '摇尾巴', url: 'https://i.postimg.cc/wvJ8bNGv/yao-wei-ba.gif' },
      { name: '咬你', url: 'https://i.postimg.cc/gJRFBhTn/yao-ni.jpg' },
      { name: '一脸懵', url: 'https://i.postimg.cc/V6MQHtVJ/yi-lian-meng.jpg' },
      { name: '在干嘛呼吸也要跟我说一声啊', url: 'https://i.postimg.cc/tTPQm6Mx/zai-gan-ma-hu-xi-ye-yao-gen-wo-shuo-yi-sheng-a.jpg' },
      { name: '怎会如此', url: 'https://i.postimg.cc/XJFSD5zw/zen-hui-ru-ci.png' },
      { name: '这大傻逼疯了', url: 'https://i.postimg.cc/nrJb8LyM/zhe-da-sha-bi-feng-le.jpg' },
      { name: '这人招不招笑', url: 'https://i.postimg.cc/j2b0Vjpn/zhe-ren-zhao-bu-zhao-xiao.jpg' },
      { name: '震惊!!', url: 'https://i.postimg.cc/fyNn4bGd/zhen-jing.gif' },
      { name: '啊!?', url: 'https://i.postimg.cc/4ygkC3Dt/zhen-jing.gif' },
      { name: '主人请尽情吩咐', url: 'https://i.postimg.cc/fyNn4bG0/zhu-ren-qing-jin-qing-fen-fu.jpg' },
      { name: '主人我来舔你', url: 'https://i.postimg.cc/HngDGLqQ/zhu-ren-wo-lai-tian-ni.jpg' },
      { name: '做了亏心事汗流浃背', url: 'https://i.postimg.cc/NFcqh03x/zuo-le-kui-xin-shi-han-liu-jia-bei.gif' },
    ],
  },
  {
    id: 'gray-dog',
    name: '灰色小狗',
    stickers: [
      { name: '出警了', url: 'https://i.postimg.cc/C15njhH9/IMG-0904.gif' },
      { name: '喜极而泣', url: 'https://i.postimg.cc/0QjKpk01/IMG-0905.gif' },
      { name: '睡觉吗', url: 'https://i.postimg.cc/26yL4k7R/IMG-0906.gif' },
      { name: '比赞绕圈圈', url: 'https://i.postimg.cc/cHCtQxBq/IMG-0907.gif' },
      { name: '躺在床上', url: 'https://i.postimg.cc/26yL4k7f/IMG-0908.gif' },
      { name: '肚子撑的像球一样', url: 'https://i.postimg.cc/Kzj3nGD2/IMG-0909.gif' },
      { name: '购物中', url: 'https://i.postimg.cc/1tXVpmrS/IMG-0910.gif' },
      { name: '欣赏美貌中', url: 'https://i.postimg.cc/LX5gz93R/IMG-0912.gif' },
      { name: '午饭吃啥？', url: 'https://i.postimg.cc/TwsL0zCZ/IMG-0913.gif' },
      { name: '撕掉', url: 'https://i.postimg.cc/XJPGLRsS/IMG-0914.gif' },
      { name: '爱心冒泡', url: 'https://i.postimg.cc/V6hrgxKP/IMG-0915.gif' },
      { name: '变成鸟', url: 'https://i.postimg.cc/hjYzsk2B/IMG-0916.gif' },
      { name: '说教中', url: 'https://i.postimg.cc/j51wcpMT/IMG-0917.gif' },
      { name: '变脸', url: 'https://i.postimg.cc/85YJ42ZD/IMG-0918.gif' },
      { name: '过去软弱的我已经死了，现在是更加软弱的我', url: 'https://i.postimg.cc/mDnzjvmT/IMG-0919.gif' },
      { name: '孤单', url: 'https://i.postimg.cc/4d07PDWJ/IMG-0920.gif' },
      { name: '打扮', url: 'https://i.postimg.cc/gJ7XsCgz/IMG-0921.gif' },
      { name: 'Hey', url: 'https://i.postimg.cc/Px7pygSq/IMG-0922.gif' },
      { name: '拉勾', url: 'https://i.postimg.cc/gJ7XsCgk/IMG-0923.gif' },
      { name: '变身', url: 'https://i.postimg.cc/sXLQmkT1/IMG-0924.gif' },
      { name: '忍着泪', url: 'https://i.postimg.cc/d1fk6b5h/IMG-0925.gif' },
      { name: '萌', url: 'https://i.postimg.cc/j51wcpML/IMG-0926.gif' },
      { name: '抽奖（谢谢惠顾）', url: 'https://i.postimg.cc/B6zLprm8/IMG-0927.gif' },
      { name: '戴墨镜', url: 'https://i.postimg.cc/JnFDxfpH/IMG-0928.gif' },
      { name: '包装中', url: 'https://i.postimg.cc/SsP2dBgz/IMG-0929.gif' },
      { name: '耶（跳来跳去）', url: 'https://i.postimg.cc/j51wcpM7/IMG-0930.gif' },
      { name: '气鼓鼓', url: 'https://i.postimg.cc/hjYzsk2m/IMG-0931.gif' },
      { name: '好崩溃啊', url: 'https://i.postimg.cc/0Q4MnTVD/IMG-0932.gif' },
      { name: '变成食物', url: 'https://i.postimg.cc/XqyZzsPJ/IMG-0933.gif' },
      { name: '嘿！', url: 'https://i.postimg.cc/yxSJbLGN/IMG-0934.gif' },
      { name: '我爱你', url: 'https://i.postimg.cc/NFryzdn9/IMG-0935.gif' },
      { name: '生气抓耳朵', url: 'https://i.postimg.cc/XqyZzsPB/IMG-0936.gif' },
      { name: '紧张', url: 'https://i.postimg.cc/8crF0ZYr/IMG-0937.gif' },
      { name: '不可以（悠闲中）', url: 'https://i.postimg.cc/6qG7mMPv/IMG-0938.gif' },
      { name: '跳舞', url: 'https://i.postimg.cc/fy03r8PY/IMG-0939.gif' },
      { name: '惊吓', url: 'https://i.postimg.cc/Zny9MwQr/IMG-0940.gif' },
      { name: '绕圈（展示美貌）', url: 'https://i.postimg.cc/PJ8LRS7W/IMG-0941.gif' },
      { name: '打你', url: 'https://i.postimg.cc/zvRLcxQw/IMG-0942.gif' },
      { name: '展示才艺', url: 'https://i.postimg.cc/kGtVpTHF/IMG-0943.gif' },
    ],
  },
  {
    id: 'hamster',
    name: '小仓鼠',
    stickers: [
      { name: '大哭', url: 'https://i.postimg.cc/J4swS9Pr/IMG-0949.gif' },
      { name: '吐', url: 'https://i.postimg.cc/hPXFNHpP/IMG-0950.gif' },
      { name: '烦恼', url: 'https://i.postimg.cc/gkx91fN2/IMG-0951.gif' },
      { name: '生气', url: 'https://i.postimg.cc/bNZX4K3v/IMG-0952.gif' },
      { name: '流鼻血', url: 'https://i.postimg.cc/MKnkghdT/IMG-0953.gif' },
      { name: '比赞', url: 'https://i.postimg.cc/wTnKz0Gg/IMG-0954.gif' },
      { name: '啊！（压力）', url: 'https://i.postimg.cc/zX4mN0cr/IMG-0955.gif' },
      { name: '不可以', url: 'https://i.postimg.cc/TYB8xC4x/IMG-0956.gif' },
      { name: '变成方块', url: 'https://i.postimg.cc/FswtvDBm/IMG-0957.gif' },
      { name: '耶', url: 'https://i.postimg.cc/HsFGmBhs/IMG-0958.gif' },
      { name: '比心', url: 'https://i.postimg.cc/HsFGmBhY/IMG-0959.gif' },
      { name: '气鼓鼓', url: 'https://i.postimg.cc/vHCRy3N8/IMG-0960.gif' },
      { name: '冒爱心', url: 'https://i.postimg.cc/tC80b2M4/IMG-0961.gif' },
      { name: '兴奋', url: 'https://i.postimg.cc/CL9y0mQd/IMG-0962.gif' },
      { name: '眼冒爱心', url: 'https://i.postimg.cc/Gh60Rq5H/IMG-0963.gif' },
      { name: '开心', url: 'https://i.postimg.cc/FswtvDBR/IMG-0964.gif' },
      { name: '大笑', url: 'https://i.postimg.cc/TYB8xC41/IMG-0965.gif' },
      { name: '应援中', url: 'https://i.postimg.cc/yY2qKvbg/IMG-0966.gif' },
      { name: '给你心', url: 'https://i.postimg.cc/qMWfrj56/IMG-0967.gif' },
      { name: '幸福', url: 'https://i.postimg.cc/KvCXbJHg/IMG-0968.gif' },
      { name: '晕', url: 'https://i.postimg.cc/c4PqWXbn/IMG-0969.gif' },
      { name: '比心', url: 'https://i.postimg.cc/TYB8xC4V/IMG-0970.gif' },
      { name: '生气', url: 'https://i.postimg.cc/zX4mN0cn/IMG-0971.gif' },
      { name: '邪恶恶魔', url: 'https://i.postimg.cc/28gpY2Kh/IMG-0972.gif' },
      { name: '偷看', url: 'https://i.postimg.cc/5NDcJnR5/IMG-0973.gif' },
      { name: '哭', url: 'https://i.postimg.cc/rF76TQPN/IMG-0974.gif' },
      { name: '萌萌的', url: 'https://i.postimg.cc/MKgkwdFY/IMG-0975.gif' },
      { name: '惊讶', url: 'https://i.postimg.cc/pX3Nvq6Z/IMG-0976.gif' },
      { name: '比圈', url: 'https://i.postimg.cc/vHCRy3Nh/IMG-0977.gif' },
      { name: '感动哭', url: 'https://i.postimg.cc/kgS0gK0b/IMG-0978.gif' },
      { name: '翻白眼', url: 'https://i.postimg.cc/4xcDxVDc/IMG-0979.gif' },
      { name: '变成宝宝', url: 'https://i.postimg.cc/dVCbVrbd/IMG-0980.gif' },
      { name: '被击中要害', url: 'https://i.postimg.cc/cL3pLwpw/IMG-0981.gif' },
      { name: '天使', url: 'https://i.postimg.cc/4xcDxVDv/IMG-0982.gif' },
      { name: '求求你', url: 'https://i.postimg.cc/9Q96QZ6t/IMG-0983.gif' },
      { name: '萌', url: 'https://i.postimg.cc/L8Pc8Lc3/IMG-0984.gif' },
      { name: '给你心', url: 'https://i.postimg.cc/L8Pc8LcV/IMG-0985.gif' },
      { name: '给你屎', url: 'https://i.postimg.cc/mg9vgCvw/IMG-0986.gif' },
      { name: '给你酒', url: 'https://i.postimg.cc/FHSMH3Mp/IMG-0987.gif' },
      { name: '给你钱', url: 'https://i.postimg.cc/mg9vgCvV/IMG-0988.gif' },
    ],
  },
];

const roles = ref(loadJson(ROLE_KEY, []));
const conversations = ref(loadJson(CONVERSATION_KEY, []));
const messages = ref(loadJson(MESSAGE_KEY, {}));

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.warn('[MessageStore] save failed:', error); }
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessageId(prefix = 'msg') {
  return uid(prefix);
}

function getInitialAvatar(name) {
  return String(name || '讯').slice(0, 1);
}

function getMessageSummary(message) {
  if (!message) return '还没有消息';
  if (message.type === 'sticker') return '[表情]';
  if (message.type === 'image') return `[图片] ${message.image?.description || message.text || ''}`;
  if (message.type === 'voice') return `[语音] ${message.text || ''}`;
  if (message.type === 'redpacket') return `[红包] ${message.redpacket?.title || ''}`;
  if (message.type === 'transfer') return `[转账] ${message.transfer?.amountText || ''} · ${message.transfer?.note || '转账'}`;
  if (message.type === 'gift') return `[礼物] ${message.gift?.name || ''}`;
  if (message.type === 'interaction') return `[互动] ${message.interaction?.label || message.text || ''}`;
  if (message.type === 'mood_card') return `[心情] ${message.moodCard?.label || ''}`;
  if (message.type === 'weather') return `[天气] ${message.weather?.city || ''} ${message.weather?.condition || ''}`;
  if (message.type === 'shopping_share') return `[商品分享] ${message.shopping?.title || message.text || ''}`;
  if (message.type === 'shopping_gift') return `[商品赠予] ${message.shopping?.title || message.text || ''}`;
  if (message.type === 'music_listen_share') return `[一起听] ${message.music?.roleName || ''} · ${message.music?.durationText || ''}`;
  if (message.type === 'landlord_result_share') return `[斗地主] ${message.landlord?.title || message.text || '牌局战绩'} · ${message.landlord?.winnerTeam || ''}胜`;
  if (message.type === 'browser_ai_search_share') return `[AI搜索] ${message.browserSearch?.keyword || message.text || ''}`;
  if (message.type === 'inspect_share') return `[查岗] ${message.inspect?.roleName || '角色'} · ${(message.inspect?.selectedItemIds || []).length}项`;
  if (message.type === 'system') return message.text || '系统提示';
  return message.text || '新消息';
}

function refreshConversationSummary(conversationId) {
  const conversation = conversations.value.find(item => item.id === conversationId);
  if (!conversation) return;
  const list = messages.value[conversationId] || [];
  const last = list[list.length - 1];
  conversation.lastMessageText = getMessageSummary(last);
  conversation.updatedAt = last?.createdAt || Date.now();
}

function persistAll() {
  saveJson(ROLE_KEY, roles.value);
  saveJson(CONVERSATION_KEY, conversations.value);
  saveJson(MESSAGE_KEY, messages.value);
}

export function useMessageStore() {
  const sortedConversations = computed(() => [...conversations.value].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));

  function addRole(payload) {
    const role = {
      id: uid('role'),
      name: payload.name.trim(),
      avatar: payload.avatar || '',
      avatarText: getInitialAvatar(payload.name),
      source: payload.source || 'custom',
      enableCustomPersona: Boolean(payload.enableCustomPersona),
      customPersona: payload.customPersona || '',
      status: 'online',
      mood: '',
      tavern: payload.tavern || null,
    };
    roles.value.unshift(role);
    persistAll();
    return role;
  }

  function importTavernRoles(roleList = []) {
    roleList.filter(Boolean).forEach(item => {
      const name = item.name || item.name2;
      if (!name || roles.value.some(role => role.source === 'tavern' && role.name === name)) return;
      roles.value.push({
        id: uid('role'),
        name,
        avatar: '',
        avatarText: getInitialAvatar(name),
        source: 'tavern',
        enableCustomPersona: false,
        customPersona: '',
        status: 'online',
        mood: '',
        tavern: item,
      });
    });
    persistAll();
  }

  function importRoleAppCharacter(character) {
    if (!character?.id || !character?.name) return null;
    const sourceId = `role-app:${character.id}`;
    const existing = roles.value.find(role => role.sourceId === sourceId || (role.source === 'role-app' && role.name === character.name));
    const payload = {
      name: character.name,
      avatar: character.avatar || '',
      avatarText: getInitialAvatar(character.name),
      source: 'role-app',
      sourceId,
      enableCustomPersona: false,
      customPersona: '',
      status: existing?.status || 'online',
      mood: existing?.mood || '',
      tavern: character,
    };
    if (existing) {
      return updateRole(existing.id, payload);
    }
    const role = { id: uid('role'), ...payload };
    roles.value.push(role);
    persistAll();
    return role;
  }

  function updateRole(roleId, patch) {
    const role = roles.value.find(item => item.id === roleId);
    if (!role) return null;
    Object.assign(role, patch);
    conversations.value.forEach(conversation => {
      if (conversation.type !== 'private' || conversation.memberIds?.[0] !== roleId) return;
      if (Object.prototype.hasOwnProperty.call(patch, 'name')) conversation.name = role.name;
      if (Object.prototype.hasOwnProperty.call(patch, 'avatar')) conversation.avatar = role.avatar;
      if (Object.prototype.hasOwnProperty.call(patch, 'avatarText')) conversation.avatarText = role.avatarText;
    });
    Object.values(messages.value).flat().forEach(message => {
      if (message.senderType !== 'role' || message.senderId !== roleId) return;
      if (Object.prototype.hasOwnProperty.call(patch, 'name')) message.senderName = role.name;
      if (Object.prototype.hasOwnProperty.call(patch, 'avatar')) message.senderAvatar = role.avatar;
    });
    persistAll();
    return role;
  }

  function deleteRole(roleId) {
    roles.value = roles.value.filter(role => role.id !== roleId);
    const privateConversationIds = conversations.value
      .filter(conversation => conversation.type === 'private' && conversation.memberIds?.[0] === roleId)
      .map(conversation => conversation.id);
    privateConversationIds.forEach(conversationId => { delete messages.value[conversationId]; });
    conversations.value = conversations.value
      .filter(conversation => !privateConversationIds.includes(conversation.id))
      .map(conversation => conversation.type === 'group'
        ? { ...conversation, memberIds: conversation.memberIds.filter(memberId => memberId !== roleId) }
        : conversation);
    Object.keys(messages.value).forEach(conversationId => {
      messages.value[conversationId] = (messages.value[conversationId] || []).filter(message => message.senderId !== roleId);
    });
    persistAll();
  }

  function deleteRoleAppRoles() {
    const roleIds = roles.value.filter(role => role.source === 'role-app').map(role => role.id);
    roleIds.forEach(deleteRole);
    return roleIds;
  }

  function createPrivateConversation(role) {
    const existing = conversations.value.find(item => item.type === 'private' && item.memberIds?.[0] === role.id);
    if (existing) return existing;
    const conversation = {
      id: uid('conv'),
      type: 'private',
      name: role.name,
      avatar: role.avatar || '',
      avatarText: role.avatarText,
      description: '',
      memberIds: [role.id],
      includeUser: true,
      unread: 0,
      lastMessageText: '开始聊天',
      updatedAt: Date.now(),
      wallpaper: { type: 'default', value: '' },
    };
    conversations.value.unshift(conversation);
    messages.value[conversation.id] = [];
    persistAll();
    return conversation;
  }

  function createGroupConversation(payload) {
    const conversation = {
      id: uid('conv'),
      type: 'group',
      name: payload.name.trim(),
      avatar: payload.avatar || '',
      avatarText: '群',
      description: payload.description || '',
      memberIds: [...payload.memberIds],
      includeUser: Boolean(payload.includeUser),
      speechMode: payload.speechMode || 'random',
      selectedSpeakerId: payload.selectedSpeakerId || '',
      memberFrequency: {},
      unread: 0,
      lastMessageText: payload.description || '群聊已创建',
      updatedAt: Date.now(),
      wallpaper: { type: 'default', value: '' },
    };
    conversations.value.unshift(conversation);
    messages.value[conversation.id] = [];
    persistAll();
    return conversation;
  }

  function addMessage(conversationId, payload) {
    const message = {
      id: uid('msg'),
      conversationId,
      createdAt: Date.now(),
      transcriptVisible: true,
      status: payload.senderType === 'system' || payload.status === '' ? '' : 'sent',
      ...payload,
    };
    if (!messages.value[conversationId]) messages.value[conversationId] = [];
    messages.value[conversationId].push(message);
    const conversation = conversations.value.find(item => item.id === conversationId);
    if (conversation) {
      conversation.lastMessageText = getMessageSummary(message);
      conversation.updatedAt = message.createdAt;
    }
    persistAll();
    return message;
  }

  function removeMessage(conversationId, messageId) {
    if (!messages.value[conversationId]) return null;
    const removed = messages.value[conversationId].find(message => message.id === messageId) || null;
    messages.value[conversationId] = messages.value[conversationId].filter(message => message.id !== messageId);
    refreshConversationSummary(conversationId);
    persistAll();
    return removed;
  }

  function updateMessage(conversationId, messageId, patch) {
    const message = (messages.value[conversationId] || []).find(item => item.id === messageId);
    if (!message) return null;
    Object.assign(message, patch);
    refreshConversationSummary(conversationId);
    persistAll();
    return message;
  }

  function removeMessageGroup(conversationId, replyGroupId) {
    if (!messages.value[conversationId]) return [];
    const removed = messages.value[conversationId].filter(message => message.replyGroupId === replyGroupId);
    messages.value[conversationId] = messages.value[conversationId].filter(message => message.replyGroupId !== replyGroupId);
    refreshConversationSummary(conversationId);
    persistAll();
    return removed;
  }

  function addSystemMessage(conversationId, text) {
    return addMessage(conversationId, { senderType: 'system', senderId: 'system', senderName: '系统', type: 'system', text });
  }

  function updateConversation(conversationId, patch) {
    const conversation = conversations.value.find(item => item.id === conversationId);
    if (!conversation) return;
    Object.assign(conversation, patch);
    persistAll();
  }

  function deleteConversation(conversationId) {
    conversations.value = conversations.value.filter(conversation => conversation.id !== conversationId);
    delete messages.value[conversationId];
    persistAll();
  }

  function clearMessages(conversationId) {
    messages.value[conversationId] = [];
    updateConversation(conversationId, { lastMessageText: '聊天记录已清空', updatedAt: Date.now() });
    persistAll();
  }

  function markRead(conversationId) {
    updateConversation(conversationId, { unread: 0 });
  }

  function findRole(roleId) {
    return roles.value.find(role => role.id === roleId) || null;
  }

  return {
    roles,
    conversations,
    sortedConversations,
    messages,
    stickerPacks: BUILTIN_STICKER_PACKS,
    addRole,
    importTavernRoles,
    importRoleAppCharacter,
    deleteRoleAppRoles,
    createPrivateConversation,
    createGroupConversation,
    updateRole,
    deleteRole,
    addMessage,
    removeMessage,
    updateMessage,
    removeMessageGroup,
    addSystemMessage,
    updateConversation,
    deleteConversation,
    clearMessages,
    markRead,
    findRole,
  };
}
