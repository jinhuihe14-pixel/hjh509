import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据概览', icon: 'DataAnalysis' }
      },
      {
        path: 'items',
        name: 'Items',
        component: () => import('../views/Items.vue'),
        meta: { title: '道具配置', icon: 'Goods' }
      },
      {
        path: 'recipes',
        name: 'Recipes',
        component: () => import('../views/Recipes.vue'),
        meta: { title: '合成配方', icon: 'MagicStick' }
      },
      {
        path: 'levels',
        name: 'Levels',
        component: () => import('../views/Levels.vue'),
        meta: { title: '关卡奖励', icon: 'Trophy' }
      },
      {
        path: 'checkin',
        name: 'Checkin',
        component: () => import('../views/Checkin.vue'),
        meta: { title: '签到礼包', icon: 'Calendar' }
      },
      {
        path: 'activities',
        name: 'Activities',
        component: () => import('../views/Activities.vue'),
        meta: { title: '活动管理', icon: 'Promotion' }
      },
      {
        path: 'players',
        name: 'Players',
        component: () => import('../views/Players.vue'),
        meta: { title: '玩家管理', icon: 'User' }
      },
      {
        path: 'gift-codes',
        name: 'GiftCodes',
        component: () => import('../views/GiftCodes.vue'),
        meta: { title: '礼包码', icon: 'Present' }
      },
      {
        path: 'config-versions',
        name: 'ConfigVersions',
        component: () => import('../views/ConfigVersions.vue'),
        meta: { title: '配置版本', icon: 'History' }
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('../views/OperationLogs.vue'),
        meta: { title: '操作日志', icon: 'Document' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router
