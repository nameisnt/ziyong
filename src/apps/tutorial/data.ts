export type TutorialCategoryId = 'data' | 'dependency' | 'generation' | 'macro' | 'start' | 'troubleshooting';

export type TutorialBlock =
  | {
      text: string;
      title?: string;
      type: 'note' | 'paragraph';
    }
  | {
      code: string;
      label?: string;
      type: 'code';
    }
  | {
      items: string[];
      title?: string;
      type: 'steps';
    };

export type TutorialArticle = {
  blocks: TutorialBlock[];
  category: TutorialCategoryId;
  id: string;
  keywords: string[];
  requirements?: string[];
  summary: string;
  title: string;
};

export const tutorialCategories: Array<{ id: 'all' | TutorialCategoryId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'start', label: '入门' },
  { id: 'generation', label: '生成' },
  { id: 'macro', label: '宏' },
  { id: 'dependency', label: '依赖' },
  { id: 'data', label: '数据' },
  { id: 'troubleshooting', label: '排查' },
];

export const tutorialArticles: TutorialArticle[] = [
  {
    id: 'tavern-helper',
    category: 'dependency',
    title: '酒馆助手提供了哪些能力',
    summary: '预设、世界书、宏和部分生成能力依赖酒馆助手接口。',
    keywords: ['酒馆助手', 'Tavern Helper', '依赖', '接口', '预设', '世界书'],
    requirements: ['酒馆助手'],
    blocks: [
      {
        type: 'paragraph',
        title: '什么时候需要',
        text: '预设管理、世界书管理、自定义宏和部分不写入聊天楼层的生成流程，会调用酒馆助手提供的接口。',
      },
      {
        type: 'note',
        title: '未检测到时',
        text: '相关 App 会显示缺少接口或无法读取数据。普通阅读、本地保存和不依赖这些接口的功能仍可继续使用。',
      },
      {
        type: 'steps',
        title: '排查顺序',
        items: [
          '确认酒馆助手已经安装并启用。',
          '刷新整个 SillyTavern 页面，而不只是关闭手机面板。',
          '重新打开对应 App，使用刷新按钮再次读取。',
        ],
      },
    ],
  },
  {
    id: 'baibai-preset-groups',
    category: 'dependency',
    title: '柏宝预设分组如何显示',
    summary: '预设管理只读取已有柏宝分组，没有分组时保持普通列表。',
    keywords: ['柏宝', 'BaiBai', '预设', '分组', '折叠'],
    requirements: ['ST-BaiBai-Tools（可选）'],
    blocks: [
      {
        type: 'paragraph',
        text: '预设管理会读取预设文件中由柏宝工具保存的分组信息，并按原有条目归属折叠显示。',
      },
      {
        type: 'note',
        title: '不会修改分组',
        text: '手机不会创建、删除、重命名或拖动柏宝分组。预设没有分组信息时，条目直接按原顺序平铺。',
      },
      {
        type: 'note',
        title: '组已停用',
        text: '柏宝可以停用整个分组。此时子条目的单独开关仍保留原值，但整组不会参与实际提示词。',
      },
    ],
  },
  {
    id: 'phone-user-input',
    category: 'macro',
    title: '{{phoneUserInput}} 宏',
    summary: '取得手机本次生成组织出的输入，不等于酒馆最后一条用户楼层。',
    keywords: ['phoneUserInput', '宏', '用户输入', 'App 预设', '类型预设', '输出格式'],
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
        text: '依次包含 App 预设、类型预设、生成页填写的追加要求和输出格式。预设中再次放入这个宏时，这些内容会按设计重复发送。',
      },
      {
        type: 'paragraph',
        title: '不包含内容',
        text: '不会把酒馆最后一条用户楼层当作生成页输入，也不包含所选来源楼层和引用资料。',
      },
      {
        type: 'note',
        title: '容易混淆',
        text: '{{lastUserMessage}} 指酒馆聊天中的最后一条用户消息；{{phoneUserInput}} 指手机本次生成整理出的输入。',
      },
    ],
  },
  {
    id: 'generation-composition',
    category: 'generation',
    title: '一次生成会组合哪些内容',
    summary: '来源、引用、预设、追加要求和输出格式分别承担不同作用。',
    keywords: ['生成', '来源', '引用', 'App 预设', '类型预设', '追加要求', '输出格式'],
    blocks: [
      {
        type: 'steps',
        title: '发送内容',
        items: [
          '来源楼层：作为本次生成所依据的聊天内容。',
          '引用内容：从其他 App 中额外选取的资料。',
          'App 预设：规定当前 App 要生成什么。',
          '类型预设：进一步限制日记、小剧场、番外等具体类型。',
          '追加要求：当前这一次由用户补充的要求。',
          '输出格式：规定 AI 应返回的结构。',
        ],
      },
      {
        type: 'note',
        title: '预览用途',
        text: '生成页的提示词预览用于确认最终组合结果。它不会发起正式生成，也不会写入聊天楼层。',
      },
    ],
  },
  {
    id: 'source-versus-input',
    category: 'generation',
    title: '来源楼层和追加要求的区别',
    summary: '来源楼层提供素材，追加要求告诉 AI 这次要怎么处理。',
    keywords: ['来源楼层', '楼层范围', '追加要求', '用户输入', '0层'],
    blocks: [
      {
        type: 'paragraph',
        title: '来源楼层',
        text: '来源选择决定哪些酒馆聊天楼层会被送给 AI。选择范围不会自动变成用户在生成页填写的文字。',
      },
      {
        type: 'paragraph',
        title: '追加要求',
        text: '追加要求只来自当前生成表单，用于补充本次目标、语气、人物或特殊限制。',
      },
      {
        type: 'note',
        title: '建议',
        text: '需要 AI 阅读聊天时调整来源楼层；需要临时改变生成方向时填写追加要求。',
      },
    ],
  },
  {
    id: 'output-parsing',
    category: 'generation',
    title: '修改输出格式和解析规则',
    summary: '输出格式决定 AI 怎么写，解析规则决定手机从哪里读取字段。',
    keywords: ['输出格式', '解析', 'XML', 'JSON', '字段路径', '重新解析'],
    blocks: [
      {
        type: 'steps',
        title: '调整顺序',
        items: [
          '在提示词 App 的菜单中进入“输出与解析”。',
          '选择具体生成操作并修改输出格式。',
          '格式中的标签或层级发生变化时，启用自定义解析并同步填写字段路径。',
          '粘贴一段样例输出，测试成功后再保存规则。',
        ],
      },
      {
        type: 'note',
        title: '失败草稿',
        text: '修改解析规则后，可以回到失败草稿重新解析；重新解析会使用当前规则，不会改动已经保存的内容。',
      },
    ],
  },
  {
    id: 'streaming-output',
    category: 'generation',
    title: '流式输出何时可见',
    summary: '开启流式后，实时输出区会随着生成事件或外部接口数据更新。',
    keywords: ['流式', '实时输出', 'stream', '外部 API', '酒馆生成'],
    blocks: [
      {
        type: 'steps',
        title: '生效条件',
        items: [
          '手机设置中的流式生成已经开启。',
          '当前文本提供方或酒馆接口支持流式返回。',
          '生成仍在运行，且已经收到第一段文本。',
        ],
      },
      {
        type: 'note',
        title: '仍然一次性出现',
        text: '某些模型、反向代理或 API 会缓冲完整回复后再返回。手机虽然请求了流式，仍可能只能一次看到全部内容。',
      },
    ],
  },
  {
    id: 'generation-rpm',
    category: 'generation',
    title: '全局 RPM 和批量任务',
    summary: '设置页与工作台共用同一个全局请求频率，批量任务打开时会带入该值。',
    keywords: ['RPM', '限速', '请求限制', '全局', '工作台', '工作流', '批量生成', '0'],
    blocks: [
      {
        type: 'paragraph',
        title: '全局 RPM',
        text: '设置 App 中的“RPM 请求限制”是全局默认值。填写 3 表示生成请求之间至少间隔约 20 秒，填写 5 表示至少间隔约 12 秒；全局值为 0 表示不限制。',
      },
      {
        type: 'paragraph',
        title: '工作台 RPM',
        text: '工作台直接显示设置页中的全局 RPM。修改工作台里的数值会同步修改全局设置，所有工作流运行时都读取这个值，不再为单条工作流保存独立 RPM。',
      },
      {
        type: 'note',
        title: '批量生成',
        text: '日记和总结的批量页都可以选择全部楼层或自定义楼层，并会在打开时带入全局 RPM。只在批量页修改数值会影响当次批量任务，不会反向修改全局设置。',
      },
      {
        type: 'paragraph',
        title: '工作台分批',
        text: '“每 N 层”既是自动触发间隔，也是积压内容的分批大小。来源选“新增”时各批互不重叠；选“全部”时每批从第 0 楼累计到当前批次；选“最近 N 楼”时每批只读取该批结束前的最近楼层。',
      },
      {
        type: 'note',
        title: '失败续跑',
        text: '同一批次有部分步骤失败时，工作台会记住已经保存成功的步骤。下次运行只继续未完成步骤，整批完成后才推进检查点。',
      },
      {
        type: 'note',
        title: '共享请求间隔',
        text: '手机内的文字生成任务共享同一个请求间隔队列。遇到明确的 429 或 rate limit 错误时，还会等待后有限重试两次；仍然失败才交给任务暂停或失败草稿处理。',
      },
      {
        type: 'note',
        title: '离开页面时',
        text: '普通单次生成在离开对应 App 时会停止。日记、总结的批量任务和工作台任务由任务中心管理，返回首页后仍可查看进度、暂停或继续。',
      },
    ],
  },
  {
    id: 'current-and-archive-chat',
    category: 'data',
    title: '当前聊天和历史聊天',
    summary: '聊天档案可以查看旧数据，但生成与写回只允许在酒馆当前聊天进行。',
    keywords: ['当前聊天', '历史聊天', '聊天档案', '只读', '作用域'],
    blocks: [
      {
        type: 'paragraph',
        text: '从聊天档案选择历史聊天后，手机会切换到该聊天的数据作用域，用于查看已经保存的日记、番外、小剧场等内容。',
      },
      {
        type: 'note',
        title: '历史聊天只读',
        text: '第一版不会替用户切换 SillyTavern 当前聊天，因此历史聊天中不能发起生成，也不能把内容写回酒馆楼层。',
      },
      {
        type: 'steps',
        title: '需要继续生成时',
        items: [
          '先在 SillyTavern 中切换到目标聊天。',
          '重新打开手机或返回当前聊天作用域。',
          '确认页面不再显示“历史聊天只读”。',
        ],
      },
    ],
  },
  {
    id: 'preview-not-saved',
    category: 'troubleshooting',
    title: '生成预览还没有保存',
    summary: '预览只是草稿，保存到条目后才会进入对应 App 的正式记录。',
    keywords: ['预览', '草稿', '未保存', '后退', '丢失'],
    blocks: [
      {
        type: 'paragraph',
        text: '生成成功进入预览后，内容仍是待确认草稿。点击“保存”后才会写入日记、番外、小剧场或其他目标 App。',
      },
      {
        type: 'note',
        title: '离开提示',
        text: '点击返回或首页时，手机会提示预览尚未保存。选择离开会放弃这次生成结果。',
      },
      {
        type: 'note',
        title: '解析失败草稿',
        text: '解析失败与未保存预览不同。失败草稿会保留原始输出，可以稍后重新解析或删除。',
      },
    ],
  },
];
