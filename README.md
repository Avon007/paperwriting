# ScholarGrid AI

<div align="center">
  <h3>🤖 多智能体协作学术论文写作系统</h3>
  <p>基于 Vue 3 + TypeScript + Google Gemini API 的智能论文写作助手</p>
</div>

## ✨ 特性

- **🤖 多智能体协作架构** - 研究、大纲、规划、写作、编辑五个 AI 智能体协同工作
- **📝 完整写作工作流** - 从选题研究到最终润色的全流程支持
- **🎨 现代化 UI** - 使用 Vue 3 Composition API + Tailwind CSS 构建的响应式界面
- **🔄 实时交互** - 与 AI 智能体实时对话，调整研究方向和内容
- **📊 可视化状态** - 直观展示各智能体的工作状态和进度
- **📐 灵活布局** - 可调整大小的面板布局，适应不同工作需求

## 🏗️ 技术栈

### 前端框架
- **Vue 3.5** - 使用 Composition API 和 `<script setup>` 语法
- **TypeScript** - 完整的类型安全支持
- **Vite 6** - 极速的开发构建工具

### 核心依赖
- **@google/genai** - Google Gemini API SDK
- **lucide-vue-next** - 现代化图标库

### 架构特点
- **Composables** - 可复用的逻辑组合函数
- **单一职责组件** - 每个组件专注于特定功能
- **Type-safe** - 完整的 TypeScript 类型定义
- **响应式设计** - 适配各种屏幕尺寸

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm/npm/yarn
- Google Gemini API Key

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件并添加你的 API Key：

```env
API_KEY=your_gemini_api_key_here
```

> 💡 **获取 API Key**: 访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取免费的 Gemini API Key

### 运行开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 📖 使用指南

### 工作流程

1. **输入主题** - 在聊天界面输入你想研究的论文主题
2. **研究阶段** - AI 研究员智能体搜索相关文献和资料
3. **生成大纲** - AI 架构师智能体创建论文结构大纲
4. **制定计划** - AI 规划师智能体分配写作任务给多个写作智能体
5. **并行写作** - 多个 AI 写作智能体同时起草各个章节
6. **最终润色** - AI 编辑智能体优化全文，确保流畅性和学术规范

### 界面布局

- **左侧面板**:
  - 🤖 智能体状态监控
  - 💬 实时聊天界面
  - 🎛️ 操作工具栏

- **右侧工作区**:
  - 📚 参考文献列表（可编辑）
  - 📑 论文大纲编辑器
  - ✍️ 论文正文编辑器

### 智能体角色

| 智能体 | 角色 | 职责 |
|--------|------|------|
| 🔍 Dr. Search | 研究员 | 搜索和整理学术文献 |
| 📐 Architect | 架构师 | 设计论文结构和大纲 |
| 🎯 Strategist | 规划师 | 分配写作任务 |
| ✍️ Writer Units | 写作组 | 起草各章节内容 |
| 🎨 The Finisher | 编辑师 | 润色和优化全文 |

## 🏗️ 项目结构

```
paperwriting/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── AppHeader.vue          # 应用头部
│   │   ├── ActionToolbar.vue      # 操作工具栏
│   │   ├── AgentVisualizer.vue    # 智能体状态展示
│   │   ├── ChatPanel.vue          # 聊天界面
│   │   └── PaperWorkspace.vue     # 论文工作区
│   ├── composables/         # 可复用逻辑
│   │   ├── useAgents.ts           # 智能体状态管理
│   │   ├── useChat.ts             # 聊天功能
│   │   ├── usePaperWorkflow.ts    # 写作工作流
│   │   └── useResizableLayout.ts  # 可调整布局
│   ├── services/            # 服务层
│   │   └── geminiService.ts       # Gemini API 集成
│   ├── App.vue              # 根组件
│   ├── main.ts              # 应用入口
│   └── types.ts             # TypeScript 类型定义
├── .env                    # 环境变量（需自行创建）
├── index.html              # HTML 入口
├── package.json            # 项目配置
├── vite.config.ts          # Vite 配置
└── tsconfig.json           # TypeScript 配置
```

## 🔧 开发指南

### 添加新的工作流步骤

1. 在 `types.ts` 中添加新的 `WorkflowStep`
2. 在 `usePaperWorkflow.ts` 中实现对应处理函数
3. 在 `ActionToolbar.vue` 中添加操作按钮
4. 在 `ChatPanel.vue` 中添加占位符文本

### 自定义智能体

编辑 `useAgents.ts` 中的 `INITIAL_AGENTS` 常量来修改默认智能体配置。

### 调整 API 限制

在 `geminiService.ts` 中修改以下参数：
- `retries` - 重试次数
- `initialDelay` - 初始延迟（毫秒）
- 章节间延迟时间在 `usePaperWorkflow.ts` 的 `handleStartWriting` 中

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub: [@Avon007](https://github.com/Avon007)
- 项目链接: [https://github.com/Avon007/paperwriting](https://github.com/Avon007/paperwriting)

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
