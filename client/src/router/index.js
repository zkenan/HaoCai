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
    redirect: '/consumables',
    children: [
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
        path: '/inventory',
        name: 'Inventory',
        component: () => import('../views/Inventory.vue'),
        meta: { title: '库存看板' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.path === '/login') {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router
