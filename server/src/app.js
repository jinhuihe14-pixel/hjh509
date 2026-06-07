const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const configRoutes = require('./routes/config');
const activityRoutes = require('./routes/activity');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const statsRoutes = require('./routes/stats');
const playerRoutes = require('./routes/player');

const { initDB } = require('./db');
const { generateConfigJSON } = require('./services/configService');

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const configDir = path.join(__dirname, '../public/config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

app.use('/public', express.static(path.join(__dirname, '../public')));

const adminDistPath = path.join(__dirname, '../../admin/dist');
const gameDistPath = path.join(__dirname, '../../game/dist');

if (isDev) {
  app.use('/admin', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^': '/admin' }
  }));

  app.use('/game', createProxyMiddleware({
    target: 'http://localhost:5174',
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^': '/game' }
  }));
} else {
  app.use('/game', express.static(gameDistPath));
  app.use('/admin', express.static(adminDistPath));
}

app.use('/api/config', configRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/player', playerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

initDB().then(() => {
  generateConfigJSON();
  app.listen(PORT, () => {
    console.log(`🚀 游戏服务端运行在 http://localhost:${PORT}`);
    console.log(`📊 管理后台: http://localhost:${PORT}/admin`);
    console.log(`🎮 游戏客户端: http://localhost:${PORT}/game`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});

module.exports = app;
