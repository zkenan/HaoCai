<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <h2>耗材管理系统</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/inventory">
          <el-icon><DataLine /></el-icon>
          <span>库存看板</span>
        </el-menu-item>
        <el-menu-item index="/consumables">
          <el-icon><Goods /></el-icon>
          <span>耗材管理</span>
        </el-menu-item>
        <el-menu-item index="/stock-in">
          <el-icon><Upload /></el-icon>
          <span>入库管理</span>
        </el-menu-item>
        <el-menu-item index="/stock-out">
          <el-icon><Download /></el-icon>
          <span>出库管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <h3>{{ currentTitle }}</h3>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>{{ userStore.user?.username }}</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '耗材管理系统')

const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  background: linear-gradient(135deg, #276BA5 0%, #4A9FD9 50%, #6BC1F0 100%);
}

.sidebar {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.sidebar-menu {
  border-right: none;
  background: transparent;
}

.sidebar-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.85);
}

.sidebar-menu .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white;
}

.sidebar-menu .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.25) !important;
  color: white;
}

.main-container {
  background: transparent;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left h3 {
  color: white;
  font-size: 18px;
  font-weight: 500;
}

.header-right {
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.3s;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.15);
}

.main-content {
  background: transparent;
  padding: 20px;
  overflow-y: auto;
}
</style>
