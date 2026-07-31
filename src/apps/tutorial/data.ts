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
  {
    id: 'preset-enabled-and-link',
    category: 'dependency',
    title: '预设筛选与聊天绑定',
    summary: '预设管理可以只看已启用条目，也可以让不同聊天自动应用各自绑定的预设。',
    keywords: ['预设', '绑定', '聊天', '正则', '重新加载', '已启用条目'],
    requirements: ['酒馆助手'],
    blocks: [
      {
        type: 'paragraph',
        title: '只看已启用条目',
        text: '预设管理详情页的开关只改变列表筛选，不会修改任何条目的启用状态。停用的柏宝分组也不会出现在筛选结果中。',
      },
      {
        type: 'steps',
        title: '绑定当前聊天',
        items: [
          '打开“预设绑定”，选择当前聊天要使用的预设。',
          '需要预设正则立即生效时，开启“重新加载聊天应用正则”。',
          '点击“绑定并应用”。以后回到这个聊天时，手机会自动应用绑定预设。',
        ],
      },
      {
        type: 'note',
        title: '正则重新加载',
        text: '切换预设本身不一定会让已打开聊天里的正则重新运行。启用该选项后，仅当预设中存在已启用正则时才会重新加载聊天；这是可选操作。',
      },
      {
        type: 'note',
        title: '聊天分支',
        text: '从当前聊天创建分支时，新分支会继承原聊天的预设绑定。之后可以在新分支中单独修改或解除。',
      },
    ],
  },
  {
    id: 'entry-library',
    category: 'data',
    title: '收藏、查重与分组绑定',
    summary: '把预设或世界书条目保存为独立副本，并按分组同步到指定预设条目。',
    keywords: ['条目库', '收藏', '查重', '重复', '分组', '绑定', '预设', '世界书'],
    requirements: ['酒馆助手'],
    blocks: [
      {
        type: 'steps',
        title: '收藏条目',
        items: [
          '先选择“预设”或“世界书”，再选择来源名称。',
          '搜索名称或正文并勾选多个条目。',
          '选择收藏分组后点击收藏。收藏内容会成为独立副本。',
        ],
      },
      {
        type: 'paragraph',
        title: '80% 查重',
        text: '收藏后会检测正文相似度超过 80% 的条目。可以保留两条，也可以删除其中一个收藏副本；原预设和原世界书条目始终不会被删除。',
      },
      {
        type: 'paragraph',
        title: '绑定预设条目',
        text: '一个收藏分组可以绑定到某个预设条目。分组顺序、收藏顺序、内容和开关发生变化时，绑定条目的正文会重新组合；预设正在使用时也会同步 in_use。',
      },
      {
        type: 'note',
        title: '两层开关',
        text: '分组开关控制整个分组，条目开关控制单个收藏。只有分组和条目都启用时，该收藏才会写入绑定的预设内容。',
      },
    ],
  },
  {
    id: 'mvu-modifier',
    category: 'dependency',
    title: '安全修改 MVU 变量',
    summary: '先编辑本地草稿，确认差异后才写入消息、聊天、角色或全局变量。',
    keywords: ['MVU', '变量', '修改器', '楼层', '草稿', '撤回'],
    requirements: ['MVU 变量框架'],
    blocks: [
      {
        type: 'steps',
        title: '修改流程',
        items: [
          '选择消息、聊天、角色或全局作用域；消息作用域还要填写楼层号或 latest。',
          '点击变量节点带入路径和值，或在“完整 JSON”中整体编辑。',
          '路径编辑和完整 JSON 都只修改本地草稿。',
          '点击“保存到 MVU”，核对新增、修改、删除数量后确认写入。',
        ],
      },
      {
        type: 'note',
        title: '一次撤回',
        text: '每次成功写入前会保留一份完整快照。“撤回上次写入”会恢复该快照；新的写入会替换旧快照。',
      },
      {
        type: 'note',
        title: '谨慎选择作用域',
        text: '角色和全局变量可能影响多个聊天。保存前请确认作用域与差异数量，尤其注意删除项。',
      },
    ],
  },
  {
    id: 'workbench-step-generation',
    category: 'generation',
    title: '为工作台每一步选择 API 与预设',
    summary: '工作流有默认生成配置，每个步骤也可以跟随全局或单独覆盖。',
    keywords: ['工作台', '工作流', '步骤', 'API', '预设', '连接配置'],
    blocks: [
      {
        type: 'paragraph',
        title: '工作流默认值',
        text: '工作流可以分别选择默认 API 和默认预设。外部 API 从“连接”中的配置分组读取，预设仍从酒馆预设列表选择。',
      },
      {
        type: 'steps',
        title: '步骤生成模式',
        items: [
          '“跟随工作流默认”使用当前工作流的 API 与预设。',
          '“跟随全局生成模式”使用设置 App 中的全局生成配置。',
          '“自定义”允许该步骤单独选择酒馆或外部 API、连接配置分组和预设。',
        ],
      },
      {
        type: 'note',
        title: '运行中的任务',
        text: '任务开始时会保存步骤配置快照。运行期间再修改工作流，只会影响下一次启动的任务。',
      },
    ],
  },
  {
    id: 'cloud-media-generation',
    category: 'generation',
    title: '用云端 API 生成媒体',
    summary: '配置 fal.ai、MiniMax 或 NovelAI，把结果保存到相册、音乐和视频。',
    keywords: ['云媒体', 'fal.ai', 'MiniMax', 'NovelAI', '图片', '音乐', '视频', 'API'],
    blocks: [
      {
        type: 'steps',
        title: '配置与生成',
        items: [
          '打开“云媒体”，进入右上角配置页并新增服务配置。',
          '填写 API Key、接口地址和模型；fal.ai 的模型名称要填写完整端点。',
          '选择媒体类型，返回生成页填写提示词并点击“生成并保存”。',
          '图片会进入相册，音频会进入音乐，视频会进入视频 App。',
        ],
      },
      {
        type: 'paragraph',
        title: '三家服务的区别',
        text: 'fal.ai 可连接不同的图片、音频或视频模型，模型特有字段可写进高级请求 JSON；MiniMax 可生成图片、音乐和视频；NovelAI 当前只提供图片生成。',
      },
      {
        type: 'note',
        title: '密钥与备份',
        text: 'API Key 会保存在酒馆扩展设置中，但手机备份会自动清空所有云媒体密钥。导入备份后需要重新填写。',
      },
      {
        type: 'note',
        title: '浏览器跨域',
        text: '云媒体请求从浏览器直接发出。如果服务端或反向代理不允许跨域，请使用支持 CORS 的接口地址。',
      },
    ],
  },
];
