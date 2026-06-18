import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../layout/MainLayout.vue'),
    redirect: '/inventory',
    children: [
      {
        path: '/inventory',
        name: 'Inventory',
        component: () => import('../views/Inventory.vue'),
        meta: { title: '工作台' }
      },
      {
        path: '/consumables',
        name: 'Consumables',
        component: () => import('../views/Consumables.vue'),
        meta: { title: '耗材管理' }
      },
      {
        path: '/stock-in',
        name: 'StockIn',
        component: () => import('../views/StockIn.vue'),
        meta: { title: '入库管理' }
      },
      {
        path: '/stock-out',
        name: 'StockOut',
        component: () => import('../views/StockOut.vue'),
        meta: { title: '出库管理' }
      },
      {
        path: '/backup',
        name: 'Backup',
        component: () => import('../views/Backup.vue'),
        meta: { title: '数据备份', requiresAdmin: true }
      },
      {
        path: '/users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      },
      {
        path: '/logs',
        name: 'Logs',
        component: () => import('../views/Logs.vue'),
        meta: { title: '操作日志', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  if (to.path === '/login') {
    next()
  } else if (!token) {
    next('/login')
  } else if (to.meta.requiresAdmin && user?.role !== 'admin') {
    next('/inventory')
  } else {
    next()
  }
})

export default router
