import type { PhonePromptDefinition, PhoneTaskTemplateDefinition, PhoneTypePromptDomain } from '@/core/appRegistry';
import { cloneOutputFormat, objectListField, simpleXmlOutput, textField, xmlParser } from '@/apps/outputDefinitions';

function lines(...items: string[]) {
  return items.join('\n');
}

export function createSummaryTaskTemplateDefinitions(): PhoneTaskTemplateDefinition[] {
  return [{ actionId: 'generate', label: '生成总结', defaultTemplate: '' }];
}

export function createDiaryTaskTemplateDefinitions(): PhoneTaskTemplateDefinition[] {
  return [
    {
      actionId: 'generate',
      label: '生成日记',
      defaultTemplate: lines(
        '请严格以{{perspectiveName}}的第一人称口吻书写这篇日记，不要写成旁白总结。',
        '{{timeInstruction}}',
      ),
      variables: [
        { key: 'perspectiveName', label: '视角角色名' },
        { key: 'timeInstruction', label: '日记时间要求' },
      ],
    },
    {
      actionId: 'read-reaction',
      label: '日记阅读反应',
      defaultTemplate: lines(
        '请严格以{{perspectiveName}}的第一人称书写读后反应，重点放在阅读后的情绪、判断和联想，不要写成摘要。',
        '{{timeInstruction}}',
      ),
      variables: [
        { key: 'perspectiveName', label: '阅读者名字' },
        { key: 'timeInstruction', label: '反应时间要求' },
      ],
    },
  ];
}

export function createExtrasTaskTemplateDefinitions(): PhoneTaskTemplateDefinition[] {
  return [
    {
      actionId: 'chapter-generate',
      label: '生成番外章节',
      defaultTemplate: lines('{{modeInstruction}}', '{{typeFallback}}'),
      variables: [
        { key: 'modeInstruction', label: '新开或续写要求' },
        { key: 'typeFallback', label: '类型名称补充' },
      ],
    },
    {
      actionId: 'chapter-summary',
      label: '番外章节总结',
      defaultTemplate: '请概括上述已选章节，提炼关键事件、人物状态变化和后续续写需要保留的信息。',
    },
  ];
}

export function createForumTaskTemplateDefinitions(): PhoneTaskTemplateDefinition[] {
  return [
    {
      actionId: 'generate-thread',
      label: '生成论坛帖子',
      defaultTemplate: '{{boardInstruction}}',
      variables: [{ key: 'boardInstruction', label: '板块名称要求' }],
    },
    {
      actionId: 'generate-replies',
      label: '生成论坛回复',
      defaultTemplate: '请根据上述主楼和已有回复继续生成新的论坛回复，不要重写主楼或重复已有回复。',
    },
  ];
}

export function createTheaterTaskTemplateDefinitions(): PhoneTaskTemplateDefinition[] {
  return [{ actionId: 'generate', label: '生成小剧场', defaultTemplate: '' }];
}

export function createLettersTaskTemplateDefinitions(): PhoneTaskTemplateDefinition[] {
  return [
    {
      actionId: 'generate',
      label: '生成书信',
      defaultTemplate: '请由{{senderName}}写给{{receiverName}}，采用{{formatLabel}}形式。',
      variables: [
        { key: 'senderName', label: '寄件人' },
        { key: 'receiverName', label: '收件人' },
        { key: 'formatLabel', label: '书信格式' },
      ],
    },
  ];
}

export function createSummaryPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'summaries',
    label: '总结',
    defaultPrompt:
      '请根据提供的楼层内容生成一份总结。提炼关键事件脉络、人物状态变化和重要信息，语言精炼。不要写成剧情复述，不要添加主观评价。',
    outputFormats: [
      simpleXmlOutput(
        'summary.generate',
        '总结',
        lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '<result>',
          '  <title>总结标题</title>',
          '  <content>总结正文</content>',
          '</result>',
        ),
      ),
    ],
  };
}

export function createDiaryPromptDefinition(): PhonePromptDefinition {
  const outputFormats: NonNullable<PhonePromptDefinition['outputFormats']> = [
    {
      id: 'diary.generate',
      label: '日记',
      content: lines(
        '请只输出一个完整的日记块，不要补充标签之外的解释。',
        '必须包含标题、时间、内容三项，字段名不能改。',
        '时间写成日记发生或写作的自然时间描述即可；不要编造精确到分钟的时间，也不要照抄示例时间。',
        '如果上文明确给出了日期、时段或事件顺序，可以用这些线索概括；如果没有明确时间，就写“某天”“当晚”“事后”等自然表述。',
        '<日记>',
        '标题：日记标题',
        '时间：日记发生或写作的时间',
        '内容：日记正文',
        '</日记>',
      ),
      parser: {
        kind: 'labels',
        rootPath: '日记',
        fields: [
          textField('title', '标题', '标题', { required: true }),
          textField('occurredAt', '时间', '时间'),
          textField('content', '正文', '内容', { required: true }),
        ],
      },
    },
  ];

  return {
    key: 'diary',
    label: '日记',
    defaultPrompt: '请写一篇私密日记。保留角色真实情绪，不要写成剧情总结；重点记录角色不知道如何当面说出口的想法。',
    outputFormats,
  };
}

export function createDiaryReactionPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'diaryReaction',
    label: '日记阅读反应',
    defaultPrompt: '请写出读完日记后的私密反应，保留角色真实语气和情绪。',
    outputFormats: createDiaryPromptDefinition().outputFormats?.map(item => cloneOutputFormat(item, 'diary.reaction')),
  };
}

export function createExtrasPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'extras',
    label: '新开番外',
    defaultPrompt: '请按本次番外类型创作一个新故事的第一章。建立清晰场景、人物关系和情节起点，并留下自然的后续空间。',
    outputFormats: [
      simpleXmlOutput(
        'extras.chapter',
        '番外章节',
        lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '<result>',
          '  <title>章节标题</title>',
          '  <content>章节正文</content>',
          '</result>',
        ),
      ),
      simpleXmlOutput(
        'extras.summary',
        '章节总结',
        lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '<result>',
          '  <content>章节总结正文</content>',
          '</result>',
        ),
        { contentOnly: true },
      ),
    ],
  };
}

export function createExtrasContinuePromptDefinition(): PhonePromptDefinition {
  return {
    key: 'extrasContinue',
    label: '续写章节',
    defaultPrompt: '请续写当前番外。延续已保存章节的叙事语气、人物状态和未解决线索，推进新情节，不要复述上一章。',
  };
}

export function createExtraSummaryPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'extraSummary',
    label: '番外章节总结',
    defaultPrompt: '请总结所选番外章节，提炼关键事件、人物状态变化、关系推进和后续续写必须保留的信息，避免逐段复述。',
    outputFormats: createExtrasPromptDefinition().outputFormats?.filter(item => item.label === '章节总结') ?? [],
  };
}

export function createExtrasTypePromptDomain(): PhoneTypePromptDomain {
  return {
    key: 'extras',
    label: '番外',
    emptyLabel: '还没有番外类型提示词',
    defaultOpen: true,
    defaultPrompts: [
      {
        id: 'prompt_type_extra_reading',
        domain: 'extras',
        name: '阅读体',
        prompt: '以角色们聚集在一起阅读/观看某个文本或影像的形式，展示他们的反应、讨论和情感变化。',
      },
      {
        id: 'prompt_type_extra_flower',
        domain: 'extras',
        name: '花吐症',
        prompt: '以花吐症为背景写番外章节，保留症状隐喻、情感压抑与关系张力，不要把设定写成科普。',
      },
      {
        id: 'prompt_type_extra_if',
        domain: 'extras',
        name: 'IF线',
        prompt: '以“如果当时……”为起点，围绕主线的关键分岔点展开另一条世界线，保持人物核心性格不变。',
      },
    ],
  };
}

export function createForumPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'forum',
    label: '论坛',
    defaultPrompt: '请生成真实论坛风格的主楼与若干回复。网友语气要有差异，允许吐槽和歪楼，但不要脱离当前剧情事实。',
    outputFormats: [
      {
        id: 'forum.thread',
        label: '论坛帖子',
        content: lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '需要多条回复时，重复完整的 <reply>...</reply>。',
          '<result>',
          '  <board>板块名称</board>',
          '  <title>帖子标题</title>',
          '  <author>主楼作者</author>',
          '  <content>主楼正文</content>',
          '  <reply>',
          '    <author>回复作者</author>',
          '    <is_op>true 或 false，表示是否为楼主本人</is_op>',
          '    <content>回复正文</content>',
          '  </reply>',
          '</result>',
        ),
        parser: xmlParser([
          textField('board', '板块名称', 'board', { required: true }),
          textField('title', '帖子标题', 'title', { required: true }),
          textField('author', '主楼作者', 'author', { required: true }),
          textField('content', '主楼正文', 'content', { required: true }),
          objectListField('replies', '回复列表', 'reply', [
            textField('author', '回复作者', 'author', { required: true }),
            textField('isOriginalPoster', '是否楼主', 'is_op', { required: true }),
            textField('content', '回复正文', 'content', { required: true }),
          ]),
        ]),
      },
      {
        id: 'forum.replies',
        label: '论坛回复',
        content: lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '需要多条回复时，重复完整的 <reply>...</reply>。',
          '<result>',
          '  <reply>',
          '    <author>回复作者</author>',
          '    <is_op>true 或 false，表示是否为楼主本人</is_op>',
          '    <content>回复正文</content>',
          '  </reply>',
          '</result>',
        ),
        parser: xmlParser([
          objectListField(
            'replies',
            '回复列表',
            'reply',
            [
              textField('author', '回复作者', 'author', { required: true }),
              textField('isOriginalPoster', '是否楼主', 'is_op', { required: true }),
              textField('content', '回复正文', 'content', { required: true }),
            ],
            true,
          ),
        ]),
      },
    ],
  };
}

export function createForumReplyPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'forumReplies',
    label: '论坛回复',
    defaultPrompt: '请生成真实论坛风格的新回复。不同网友的语气要有差异，可以自然吐槽或歪楼，但不要脱离当前剧情事实。',
    outputFormats: createForumPromptDefinition().outputFormats?.filter(item => item.label === '论坛回复') ?? [],
  };
}

export function createForumBoardTypePromptDomain(): PhoneTypePromptDomain {
  return {
    key: 'forum-board',
    label: '论坛板块',
    emptyLabel: '还没有论坛板块类型提示词',
    defaultOpen: true,
    defaultPrompts: [
      {
        id: 'prompt_type_forum_board_discussion',
        domain: 'forum-board',
        name: '剧情讨论',
        prompt: '讨论当前剧情进展、人物动机和后续走向。发言可以分析、质疑和补充线索，但不要脱离已发生的事实。',
      },
      {
        id: 'prompt_type_forum_board_relationship',
        domain: 'forum-board',
        name: '角色关系',
        prompt: '围绕角色关系、情感变化和互动细节展开讨论。允许不同立场争论，但保持论坛用户之间明显的语气差异。',
      },
      {
        id: 'prompt_type_forum_board_gossip',
        domain: 'forum-board',
        name: '八卦闲聊',
        prompt: '以轻松八卦和日常闲聊为主，允许吐槽、玩梗和自然歪楼，但不要凭空捏造会改变剧情事实的重大信息。',
      },
      {
        id: 'prompt_type_forum_board_analysis',
        domain: 'forum-board',
        name: '设定考据',
        prompt: '集中讨论世界观、背景设定和细节线索。发言应有推理过程，区分已有事实、合理猜测和个人观点。',
      },
    ],
  };
}

export function createTheaterPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'theater',
    label: '小剧场',
    defaultPrompt: '请在保留角色们的核心性格的基础上，创建一个小剧场，不需要解释变化的原因。小剧场要求如下：',
    outputFormats: [
      simpleXmlOutput(
        'theater.markdown',
        'Markdown 文本',
        lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '<result>',
          '  <title>小剧场标题</title>',
          '  <content>小剧场正文</content>',
          '</result>',
        ),
      ),
      simpleXmlOutput(
        'theater.frontend',
        '网页渲染',
        lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '输出格式：',
          '<result>',
          '  <title>小剧场标题</title>',
          '  <content>这里直接放完整 HTML 或 HTML 片段，可包含 style / script / body 内节点</content>',
          '</result>',
          '要求：不要把 HTML 再转义成 &lt;div&gt; 这样的文本，也不要额外包裹 Markdown 代码块。',
        ),
        { preserveContentMarkup: true },
      ),
    ],
  };
}

export function createTheaterTypePromptDomain(): PhoneTypePromptDomain {
  return {
    key: 'theater',
    label: '小剧场',
    emptyLabel: '还没有小剧场类型提示词',
    defaultOpen: true,
    defaultPrompts: [
      {
        id: 'prompt_type_theater_sweet',
        domain: 'theater',
        name: '甜饼',
        prompt: '写一个主角相互甜蜜生活的日常片段，节奏轻快，结局温暖。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_funny',
        domain: 'theater',
        name: '搞笑',
        prompt: '写一个轻松搞笑的短篇，允许夸张和吐槽，结尾要有笑点收束。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_argument',
        domain: 'theater',
        name: '吵架',
        prompt: '写一场角色之间的争吵，保留真实情绪层次，不强行和解。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_group',
        domain: 'theater',
        name: '群像',
        prompt: '写一个多人互动的场景，每人都有存在感，自然带出性格差异。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_dialogue',
        domain: 'theater',
        name: '对话体',
        prompt: '纯对话格式，不加叙述，靠台词推进剧情和展现人物。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_barrage',
        domain: 'theater',
        name: '弹幕体',
        prompt: '以视频弹幕形式呈现，弹幕吐槽密集，节奏快。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_forum',
        domain: 'theater',
        name: '论坛体',
        prompt: '模拟论坛帖子风格，网友语气要有差异，允许歪楼。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_roast',
        domain: 'theater',
        name: '吐槽',
        prompt: '以吐槽口吻写一段短内容，角度犀利但不恶意。',
        renderMode: 'markdown',
      },
      {
        id: 'prompt_type_theater_daily',
        domain: 'theater',
        name: '日常片段',
        prompt: '截取一个日常瞬间，不追求戏剧冲突，细腻平实。',
        renderMode: 'markdown',
      },
    ],
  };
}

export function createLettersPromptDefinition(): PhonePromptDefinition {
  return {
    key: 'letters',
    label: '书信',
    defaultPrompt: '请保留角色真实语气和情感来写这封信，不要写成第三人称叙事。',
    outputFormats: [
      simpleXmlOutput(
        'letters.generate',
        '书信',
        lines(
          '请只输出一个完整的 XML 结果，不要补充 XML 之外的解释。',
          '<result>',
          '  <title>信件标题</title>',
          '  <content>信件正文</content>',
          '</result>',
        ),
      ),
    ],
  };
}
