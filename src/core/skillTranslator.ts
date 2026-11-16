/**
 * 技能中文简短说明提炼与翻译引擎
 * 用于将英文或冗长的 SKILL.md 描述提炼为列表右侧一眼看懂的简短中文说明
 */

/**
 * 高频核心技能精准中文简短说明映射表 (10~18字以内)
 */
const BUILTIN_SKILL_ZH_MAP: Record<string, string> = {
  // Agency 系列
  'agency-design-ui-designer': 'UI 视觉设计系统与组件规范',
  'agency-design-ux-architect': 'UX 架构、CSS 体系与布局指引',
  'agency-engineering-ai-engineer': 'AI 模型研发、部署与全链路工程',
  'agency-engineering-backend-architect': '高可用后端架构、数据库与 API 设计',
  'agency-engineering-code-reviewer': '代码质量审查（正确性/安全/性能）',
  'agency-engineering-database-optimizer': '数据库 Schema 优化与索引性能调优',
  'agency-engineering-devops-automator': '基础设施自动化与 CI/CD 流水线',
  'agency-engineering-frontend-developer': '现代 Web 前端工程与性能优化',
  'agency-engineering-minimal-change-engineer': '最小可行改动原则（防重构蔓延）',
  'agency-engineering-mobile-app-builder': 'iOS/Android 原生与跨平台开发',
  'agency-engineering-rag-pipeline-engineer': '生产级 RAG 检索、重排与评测',
  'agency-engineering-software-architect': '软件系统架构与领域驱动设计 (DDD)',
  'agency-engineering-sre': '站点可靠性工程、SLO 与稳定性守护',
  'agency-engineering-wechat-mini-program-developer': '微信小程序全栈开发与支付集成',
  'agency-marketing-wechat-official-account': '微信公众号内容营销与私域转化',
  'agency-marketing-xiaohongshu-specialist': '小红书审美叙事与爆款内容运营',
  'agency-product-manager': '全局产品规划、路线图与商业落地',
  'agency-security-ai-generated-code-auditor': 'AI 生成代码安全审计与漏洞扫描',
  'agency-security-appsec-engineer': '应用安全威胁建模与代码防线',
  'agency-specialized-document-generator': '代码化生成专业 PDF/PPTX/DOCX/XLSX',
  'agency-specialized-mcp-builder': 'MCP 服务器设计、构建与工具扩展',
  'agency-testing-api-tester': '全面 API 接口验证与性能测试',
  'agency-testing-reality-checker': '基于压倒性证据的质量验收门禁',

  // Baoyu 内容与图像系列
  'baoyu-article-illustrator': '文章配图分析与视觉插画生成',
  'baoyu-comic': '知识/科普教育漫画分镜创作',
  'baoyu-compress-image': '图片无损压缩与 WebP 格式转换',
  'baoyu-cover-image': '文章多维封面图生成 (16:9/2.35:1)',
  'baoyu-danger-gemini-web': 'Gemini Web API 图文生成后端',
  'baoyu-danger-x-to-markdown': 'X (Twitter) 推文与长文转 Markdown',
  'baoyu-diagram': '明暗双主题专业架构与流程图生成',
  'baoyu-electron-extract': 'Electron 应用 (.asar) 源码提取与还原',
  'baoyu-format-markdown': 'Markdown 文章自动排版与美化',
  'baoyu-image-gen': '多平台 AI 图像生成与批量出图',
  'baoyu-infographic': '21种布局高密度信息大图生成',
  'baoyu-markdown-to-html': 'Markdown 转微信兼容高亮 HTML',
  'baoyu-post-to-wechat': '一键发布微信公众号文章或图文',
  'baoyu-post-to-weibo': '一键发布微博动态或头条文章',
  'baoyu-post-to-x': '一键发布推文或 X 长文章',
  'baoyu-slide-deck': '内容自动生成专业 PPT 幻灯片',
  'baoyu-translate': '支持多模式与术语表的文章精翻',
  'baoyu-url-to-markdown': '网页链接正文抓取并转为 Markdown',
  'baoyu-wechat-summary': '微信群聊记录精华提炼与总结',
  'baoyu-xhs-images': '小红书/微信图文信息卡片批量生成',
  'baoyu-youtube-transcript': 'YouTube 字幕文本与视频封面提取',

  // 游戏开发与设计系列
  'brainstorm': '游戏概念头脑风暴与创意探索',
  'develop-web-game': 'Web 小游戏开发与微信/抖音平台适配',
  'game-design-theory': '游戏 MDA 理论、心流与经济平衡设计',
  'game-developer': '通用游戏数学、物理、A*寻路与架构',
  'game-engine': 'HTML5 Canvas/WebGL 游戏引擎构建',
  'game-feel': '游戏打击感调优（震屏/顿帧/缓动）',
  'game-ui-design': '游戏 HUD、血条与背包界面视觉设计',
  'game-ui-ux': '响应式游戏 UI/UX 与手柄焦点导航',
  'higgsfield-game-generation': '自然语言一键生成可玩小游戏原型',
  'multiplayer-game': '多人联机网络同步与延迟补偿',
  'pixelfx': '像素风游戏特效与精灵动画代码生成',
  'threejs-game-ui-designer': 'Three.js 3D 游戏 HUD 与世界空间 UI',
  'prototype': '快速构建可玩游戏原型与验证',
  'next-step': '游戏开发阶段诊断与下一步指引',
  'project-stage-detect': '分析项目当前研发阶段与缺失项',
  'map-systems': '游戏系统拆解、依赖梳理与优先级规划',
  'team-audio': '游戏音频团队编排（音效/技术美术）',
  'team-combat': '游戏战斗系统团队全流程协同',
  'team-qa': '游戏 QA 测试团队全周期编排',
  'team-release': '游戏版本发布与部署流水线编排',
  'team-ui': '游戏 UI/UX 团队流水线协作',

  // 动画、视频与图表系列
  'anatomy': '精细交互式等距 SVG 拆解图制作',
  'diagram-animation': '图表与架构图分步动画效果制作',
  'diagram-design': '多类型商业/技术架构图与数据图表设计',
  'dashboard-design': '简洁直观的数据分析看板 UI 设计',
  'explainer-assets': '解说视频 SVG/CSS 角色与道具资产制作',
  'explainer-studio': '端到端动画解说视频全流程制作向导',
  'explainer-video': '30-90秒产品/科普动画短片制作',
  'ffmpeg-skill': '本地 FFmpeg 音视频剪辑、字幕与压制',
  'gsap-explainer': 'GSAP 驱动的高品质网页动画视频',
  'isometric-animation': '2.5D 等距视角动画与立体拆解图',
  'knowledge-explainer-skill': 'Markdown 笔记自动转 Remotion 讲解视频',
  'manim-composer': '3b1b 风格数学科普动画分镜规划',
  'manimce-best-practices': 'Manim 社区版 (ManimCE) 动画开发规范',
  'manimgl-best-practices': 'ManimGL (3b1b原版) 交互式动画开发',
  'retention-pass': '动画视频完播率优化与节奏打磨',
  'science-content-ppt': '科普文本转仿 PPT 轮播动画网页',
  'visual-explainer': '概念白板草图、思维导图与信息图生成',
  'vox-explainer': '单提示词生成 Vox 风格纪录片视频',
  'whiteboard-animation': '手绘白板描边动画与笔迹跟随效果',
  'whiteboard-explainer': 'VideoScribe 风格手绘解说视频制作',
  'wrapped-video': '年度回顾/个性化数据分享短视频生成',

  // 架构、工程与工具系列
  'apk-reverse': 'Android APK 逆向分析、去广告与重打包',
  'architecture-decision': '编写技术架构决策记录 (ADR)',
  'architecture-review': '架构设计与 GDD 需求追踪一致性评审',
  'chrome-extensions': 'Chrome Manifest V3 浏览器扩展开发',
  'code-review': '代码规范、SOLID 原则与性能架构评审',
  'create-architecture': '编码前撰写系统架构蓝图与技术选型',
  'create-epics': '将设计与架构拆解为研发史诗 (Epics)',
  'create-stories': '将 Epic 拆解为可落地的开发任务 (Stories)',
  'design-review': '设计文档完整性与可实现性前置评审',
  'design-system': '单系统设计文档 (GDD) 逐节撰写',
  'dev-story': '按架构规范与测试驱动完成单个任务开发',
  'humanizer': '去除 AI 腔调，润色文本使其自然可读',
  'last30days': '近30天全网热点与社区真实舆情调研',
  'modern-web-guidance': '现代 Web HTML/CSS/JS 最佳实践检索',
  'perf-profile': '性能瓶颈剖析与量化优化建议',
  'qa-plan': '迭代测试计划编写与冒烟范围界定',
  'security-audit': '存档防篡改、作弊向量与网络安全审计',
  'skill-improve': '技能文件静态检查与闭环迭代优化',
  'skill-test': '技能结构合规性与行为规范自动化校验',
  'smoke-check': 'QA 交付前核心路径自动化冒烟检查',
  'tech-debt': '代码库技术债务扫描、分类与优先级登记',
  'test-evidence-review': '测试用例断言质量与覆盖度评审',
  'ub-mode': 'Uncle Bob 极致精简工程与 TDD 门禁开发',
  'understand': '代码库高维知识图谱构建与语义分析',
  'understand-architect': '代码库知识图谱、领域模型与 Diff 影响分析',
  'understand-chat': '基于代码知识图谱的交互式问答',
  'understand-dashboard': '代码知识图谱可视化 Web 看板',
  'understand-diff': '变更 Diff 架构影响面智能分析',
  'understand-domain': '业务领域模型与核心流程提取',
  'understand-explain': '基于图谱的代码模块深度原理解析',
  'understand-figma': '设计稿与代码库映射关联分析',
  'understand-knowledge': '代码知识图谱持久化管理',
  'understand-onboard': '新成员代码库架构导览与快速上手',
  'ux-design': '界面、流程与 HUD 交互规格文档撰写',
  'ux-review': 'UX 规格与无障碍设计规范验收评审',
  'windows-batch-guard': 'Windows .bat/.ps1 脚本编码防坑与防截断校验',

  // Antigravity 官方内置与插件扩展技能
  'antigravity-guide': 'Antigravity CLI/IDE/SDK 官方全景指南',
  'agy-customizations': 'Antigravity 技能、规则、插件与 MCP 定制指南',
  'automation': '交互式创建定时/周期后台自动化任务',
  'migrate-agent-settings': '迁移其他 AI 编程工具配置至 Antigravity 插件',
  'migrate-workflows': '旧版 Workflows 自动迁移为现代 Skills',
  'plugin': 'Antigravity 插件包创建、安装与启停管理',
  'run-workflow': 'Python 多智能体并发扇出与管道工作流编排',
  'swarm': '多智能体蜂群共享看板协同与工作区隔离',
  'swarm_monitor': '蜂群监控哨兵（检测卡死并唤醒协调）',
  'ui-plugin-navigation': '发现并一键打开相关 UI 插件侧边面板',
  'generative_ui': '渲染交互式 HTML 图表与可视化控件',
  'a11y-debugging': 'Chrome DevTools 网页无障碍 (a11y) 审计',
  'accidental-data-loss-prevention': '防误删高危 SQL/云存储数据安全门禁',
  'bigquery-data-transfer-service': 'BigQuery 数据传输服务 (DTS) 配置巡检',
  'cloud-databases-onboarding': 'GCP 云数据库选型评估与迁移向导',
  'dak-setup': 'Data Agent Kit (DAK) 插件配置与凭据初始化',
  'data-autocleaning': 'BigQuery/Dataform/dbt 自动化数据清洗',
  'dataform-bigquery': 'BigQuery Dataform ELT 管道与 SQLX 开发',
  'dbt-bigquery': 'BigQuery dbt 模型生成与 SQL 性能优化',
  'discovering-gcp-data-assets': 'GCP 云端数据资产、Schema 与治理发现',
  'enforcing-resource-attribution': '强制 bq/gcloud CLI 资源归属标签规范',
  'gcp-data-pipelines': 'GCP 数据管道选型与全链路编排总入口',
  'gcp-pipeline-orchestration': 'Cloud Composer 数据管道调度编排',
  'gcp-spark-observability': 'GCP Spark/Dataproc 集群监控与成本审计',
  'gcp-spark-troubleshooting': 'GCP Spark 失败作业与事件日志根因排查',
  'managing-python-dependencies': '规范管理 Python 虚拟环境与依赖隔离',
  'ml-best-practices': '机器学习建模、统计检验与数据分析规范',
  'resolving-mcp-region-configs': 'Dataproc/GCP 区域 MCP 配置占位符预检修复',
  'schema-mapping': '多表 ETL/ELT 源与目标 Schema 映射规划',
  'gdocs': 'Google Docs 文档读取、起草与协同编辑',
  'i18n-diagnostics': 'Antigravity 汉化状态检查与漏翻诊断修复',
  'skill-creator': '创建标准化 Antigravity Skill 技能目录',
  'skill-evolution-manager': '技能迭代演进与版本维护管理',
  'skill-manager': '本机全局技能库生命周期管理',
  'skill-repair': '技能元数据与目录结构自动修复',
  'github-to-skills': '从 GitHub 仓库一键抓取并转换为技能',
  'agency-engineering-git-workflow-master': 'Git 分支模型、变基与提交规范工作流',
  'agency-engineering-incident-response-commander': '线上故障应急响应与指挥排查流程',
  'agency-project-management-jira-workflow-steward': 'Jira 任务流转与敏捷看板协同规范',
  'agency-specialized-workflow-architect': '复杂业务自动化工作流架构设计',
  'agency-testing-workflow-optimizer': '测试流水线效率优化与并行编排',
  'canvas-design': 'Canvas 视觉海报与艺术排版生成',
  'Ensure Chinese Output': '强制保持全链路简体中文输出规范',
  'excalidraw-diagram': 'Excalidraw 手绘风格架构流程图生成',
  'pdf': 'PDF 文档读取、提取、合并与生成处理',
  'pptx': 'PowerPoint 幻灯片读取、编辑与生成',
  'theme-factory': '前端视觉主题色板与风格模板套件',
  'swarm_narrator': '多智能体蜂群解说与进度播报员',
  'scan_dependencies': '项目依赖安全与前置环境扫描门禁'
};

/**
 * 英文关键词到中文短语的兜底映射表
 */
const KEYWORD_ZH_FALLBACK: Array<[RegExp, string]> = [
  [/security|audit|vulnerability|exploit/i, '安全审计与漏洞排查'],
  [/architect|architecture|adr/i, '系统架构设计与技术评审'],
  [/review|lint|check|validate/i, '质量审查与规范校验'],
  [/test|qa|smoke|coverage/i, '自动化测试与质量验证'],
  [/diagram|flowchart|mermaid|chart/i, '架构流程图与图表绘制'],
  [/video|animation|ffmpeg|remotion|manim/i, '视频制作与动画渲染'],
  [/image|cover|comic|svg|pixel/i, '视觉图像与插画生成'],
  [/translate|markdown|article|format/i, '文档排版、转换与翻译'],
  [/database|sql|bigquery|dataform|dbt|spark/i, '数据工程与数据库管道'],
  [/ui|ux|dashboard|frontend|css/i, '前端界面与交互体验设计'],
  [/game|unity|phaser|threejs/i, '游戏玩法与引擎开发'],
  [/plugin|mcp|extension|cli/i, '插件扩展与工具链集成'],
  [/deploy|ci\/cd|docker|cloud|gcp/i, '云基础设施与自动化部署'],
  [/research|search|transcript|summary/i, '信息调研与内容摘要提取']
];

/**
 * 判断文本是否包含中文字符
 */
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 从 SKILL.md 的原始信息中提炼简短中文说明
 * @param skillName 技能文件夹/标识名称
 * @param rawDescription YAML 中的 description 原文
 * @returns shortTitle (简短中文标题，用于列表右侧展示) 与 fullDescription (完整说明，用于悬停 Tooltip)
 */
export function summarizeSkillDescription(
  skillName: string,
  rawDescription: string
): { shortTitle: string; fullDescription: string } {
  const cleanRaw = (rawDescription || '').replace(/\s+/g, ' ').trim();

  // 1. 优先命中精确中文映射字典
  if (BUILTIN_SKILL_ZH_MAP[skillName]) {
    const shortTitle = BUILTIN_SKILL_ZH_MAP[skillName];
    const fullDescription = cleanRaw
      ? `${shortTitle}\n\n原始描述：${cleanRaw}`
      : shortTitle;
    return { shortTitle, fullDescription };
  }

  // 2. 若原文已包含中文，自动提炼首句作为简短说明（去除冗余前缀）
  if (cleanRaw && hasChinese(cleanRaw)) {
    const firstSentence = cleanRaw
      .split(/[。！？\n]/)[0]
      .replace(/^(精通|专注|面向|负责|用于|提供|专业的?)/, '')
      .trim();
    const shortTitle =
      firstSentence.length > 22 ? firstSentence.slice(0, 20) + '…' : firstSentence;
    return {
      shortTitle: shortTitle || '自定义中文技能',
      fullDescription: cleanRaw
    };
  }

  // 3. 若为纯英文，使用语义关键词兜底提炼中文短语
  const matchedLabels: string[] = [];
  const combinedSource = `${skillName} ${cleanRaw}`;
  for (const [regex, zhLabel] of KEYWORD_ZH_FALLBACK) {
    if (regex.test(combinedSource) && !matchedLabels.includes(zhLabel)) {
      matchedLabels.push(zhLabel);
      if (matchedLabels.length >= 2) {
        break;
      }
    }
  }

  if (matchedLabels.length > 0) {
    const shortTitle = matchedLabels.join(' · ');
    return {
      shortTitle,
      fullDescription: cleanRaw ? `[中文提炼] ${shortTitle}\n\n${cleanRaw}` : shortTitle
    };
  }

  // 4. 最终兜底：保留干净的英文摘要，避免重复技能 ID
  const fallbackShort =
    cleanRaw.length > 28 ? cleanRaw.slice(0, 26) + '…' : cleanRaw || '扩展技能';
  return {
    shortTitle: fallbackShort,
    fullDescription: cleanRaw || `${skillName} 扩展技能`
  };
}

