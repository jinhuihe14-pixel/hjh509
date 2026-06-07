<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <span>🎮 运营后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#b9bdc5"
        active-text-color="#fff"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <span class="page-title">{{ currentPageTitle }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ adminStore.adminInfo?.username || '管理员' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../stores/admin'
import { User, ArrowDown } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const menuItems = [
  { path: '/dashboard', title: '数据概览', icon: 'DataAnalysis' },
  { path: '/items', title: '道具配置', icon: 'Goods' },
  { path: '/recipes', title: '合成配方', icon: 'MagicStick' },
  { path: '/levels', title: '关卡奖励', icon: 'Trophy' },
  { path: '/checkin', title: '签到礼包', icon: 'Calendar' },
  { path: '/activities', title: '活动管理', icon: 'Promotion' },
  { path: '/players', title: '玩家管理', icon: 'User' },
  { path: '/gift-codes', title: '礼包码', icon: 'Present' },
  { path: '/config-versions', title: '配置版本', icon: 'History' },
  { path: '/logs', title: '操作日志', icon: 'Document' }
]

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => {
  const item = menuItems.find(m => m.path === route.path)
  return item?.title || ''
})

const handleCommand = (command) => {
  if (command === 'logout') {
    adminStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background-color: #001529;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.el-menu {
  border-right: none;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #606266;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
