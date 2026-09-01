import type { TutorialArticle } from '../types';

export const macroTutorialArticles: TutorialArticle[] = [
  {
    id: 'macro-builder-guide',
    category: 'macro',
    title: '用宏生成器建立随机规则',
    summary: '生成骰点判定、随机抽取或身份分配宏，先测试结果，再复制到提示词或世界书。',
    keywords: ['宏生成器', '骰点', '随机抽取', '身份分配', '重复抽取', '复制宏', '随机宏'],
    relatedAppIds: ['macro-builder'],
    blocks: [
      {
        type: 'paragraph',
        title: '宏生成器负责什么',
        text: '宏生成器只负责建立插件可识别的随机表达式，不会直接发起 AI 请求。填写参数后，下方会实时显示完整宏和一次测试结果；点击骰子图标可重新测试，确认逻辑后再复制宏。',
      },
      {
        type: 'steps',
        title: '骰点判定',
        items: [
          '填写随机数最小值和最大值。',
          '选择大于、大于等于、小于或小于等于，并填写目标值。',
          '分别填写判定成功和失败时插入的文字。',
          '重新测试几次，确认目标值和判定方向没有写反。',
        ],
      },
      {
        type: 'steps',
        title: '随机抽取与身份分配',
        items: [
          '随机抽取按每行一个候选填写，并设置最少、最多抽取数量以及是否允许重复。',
          '身份分配分别填写身份名称和候选项，可决定候选显示在身份前或后。',
          '身份分配关闭重复时，不同身份不会取得同一个候选；候选数量不足时应先补充候选。',
          '身份名称可以使用 {{char}}、{{user}}，测试结果会按当前聊天称呼替换。',
        ],
      },
      {
        type: 'note',
        title: '复制后放在哪里',
        text: '宏可以放在任务模板、App 提示词、类型提示词、预设条目或世界书正文中。只有进入插件生成组装流程时才会展开；把它当普通文字发到不支持插件宏的地方会保留原样。',
      },
    ],
  },
  {
    id: 'phone-user-input',
    category: 'macro',
    title: '{{phoneUserInput}} 宏',
    summary: '取得手机本次生成组织出的输入，不等于酒馆最后一条用户楼层。',
    relatedAppIds: ['macro-builder'],
    keywords: ['phoneUserInput', '宏', '用户输入', '本次任务', '任务模板', 'App 预设', '类型预设', '输出格式'],
    requirements: ['酒馆助手'],
    blocks: [
      {
        type: 'code',
        label: '宏',
        code: '{{phoneUserInput}}',
      },
      {
        type: 'paragraph',
        title: '包含内容',
        text: '依次包含本次任务 taskInstruction、App 预设、类型预设、生成页填写的追加要求和输出格式。空白区段会自动省略；预设中再次放入这个宏时，这些内容会按设计重复发送。',
      },
      {
        type: 'paragraph',
        title: '不包含内容',
        text: '不会把酒馆最后一条用户楼层当作生成页输入，也不包含所选来源楼层、App 上下文或引用资料。它们分别位于覆盖聊天历史和历史末尾。',
      },
      {
        type: 'note',
        title: '容易混淆',
        text: '{{lastUserMessage}} 指酒馆聊天中的最后一条用户消息；{{phoneUserInput}} 指手机整理出的任务、App 规则、类型、追加要求和格式。酒馆仍会原生追加本轮 user_input，宏只用于预设需要额外重复这组内容时。',
      },
    ],
  },
];
