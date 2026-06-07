# 合成放置小游戏全栈平台

工作室自研单页H5合成放置小游戏的完整全栈解决方案。

## 项目结构

```
.
├── server/     # Node.js 服务端 (Express + SQLite)
├── admin/      # Vue 3 运营管理后台
└── game/       # H5 游戏客户端
```

## 功能特性

### 配置管理
- 道具属性配置（名称、稀有度、图标、产出上限）
- 合成配方配置（材料、产物、成功率）
- 关卡通关奖励配置
- 每日签到礼包配置
- 限时活动参数配置
- 数值校验，稀有道具单日全服产出上限

### 运营后台
- 可视化配置表单
- 活动启停控制
- 道具掉落概率微调
- 玩家定向礼包发放
- 操作日志留存
- 配置版本管理与一键回滚

### 数据统计
- 全服道具产出消耗统计
- 用户留存数据
- 广告收益数据
- 运营图表展示

### 服务端校验
- 奖励领取二次校验
- 合成操作服务端验证
- 防篡改本地缓存

## 快速开始

### 前置要求

- Node.js >= 16
- npm >= 8

### 安装依赖

> **重要**：首次运行前必须安装依赖。项目使用 npm workspaces 管理多包，在根目录执行一次 `npm install` 即可安装所有子项目（server、admin、game）的依赖以及根目录的 concurrently 等工具。

```bash
# 在项目根目录执行，安装所有依赖
npm install
```

### 启动开发环境

```bash
# 同时启动服务端、管理后台、游戏客户端
npm run dev
```

启动后访问：
- 管理后台：http://localhost:3000/admin
- 游戏页面：http://localhost:3000/game
- 服务端 API：http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 启动生产环境

```bash
npm start
```

## 技术栈

- **服务端**: Node.js + Express + SQLite
- **管理后台**: Vue 3 + Vite + Element Plus + ECharts
- **游戏客户端**: 原生 HTML5 + Canvas + JavaScript
