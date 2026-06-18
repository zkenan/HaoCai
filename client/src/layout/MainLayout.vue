<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <img src="/logo.png" alt="Logo" class="logo-img" />
        <div class="logo-text">
          <h2>耗材管理</h2>
          <span class="subtitle">Supply Chain System</span>
        </div>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        router
        class="sidebar-menu"
      >
        <div class="menu-group">
          <div class="menu-label">概览</div>
          <el-menu-item index="/inventory">
            <el-icon><DataAnalysis /></el-icon>
            <span>工作台</span>
          </el-menu-item>
        </div>
        
        <div class="menu-group">
          <div class="menu-label">业务</div>
          <el-menu-item index="/consumables">
            <el-icon><Goods /></el-icon>
            <span>库存管理</span>
          </el-menu-item>
          <el-menu-item index="/stock-in">
            <el-icon><Upload /></el-icon>
            <span>入库管理</span>
          </el-menu-item>
          <el-menu-item index="/stock-out">
            <el-icon><Download /></el-icon>
            <span>出库管理</span>
          </el-menu-item>
        </div>
        
        <div class="menu-group" v-if="userStore.user?.role === 'admin'">
          <div class="menu-label">系统</div>
          <el-menu-item index="/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/backup">
            <el-icon><FolderChecked /></el-icon>
            <span>数据备份</span>
          </el-menu-item>
          <el-menu-item index="/logs">
            <el-icon><Document /></el-icon>
            <span>操作日志</span>
          </el-menu-item>
        </div>
      </el-menu>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <h3>{{ currentTitle }}</h3>
        </div>
        <div class="header-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索耗材名称..."
            :prefix-icon="Search"
            class="header-search"
            clearable
          />
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32" style="background: #3b82f6">
                {{ userStore.user?.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="change-password">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 内容区域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改用户名和密码"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-position="top"
      >
        <el-form-item label="新用户名" prop="username">
          <el-input
            v-model="passwordForm.username"
            placeholder="请输入新用户名"
          />
        </el-form-item>
        <el-form-item label="旧密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            placeholder="请输入旧密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword" :loading="passwordLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, DataAnalysis, Goods, Upload, Download, Lock, FolderChecked, User, Document } from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'
import request from '../utils/api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const searchKeyword = ref('')

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '工作台')

const passwordDialogVisible = ref(false)
const passwordLoading = ref(false)
const passwordFormRef = ref(null)

const passwordForm = reactive({
  username: '',
  password: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  username: [
    { required: true, message: '请输入新用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入旧密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码长度至少为6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (command === 'change-password') {
    passwordForm.username = userStore.user?.username || ''
    passwordForm.password = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordDialogVisible.value = true
  }
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    passwordLoading.value = true
    try {
      const response = await request.put('/auth/change-password', {
        username: passwordForm.username,
        password: passwordForm.password,
        newPassword: passwordForm.newPassword
      })
      
      ElMessage.success('修改成功，请重新登录')
      passwordDialogVisible.value = false
      
      // 更新本地用户信息
      userStore.setUser({
        ...userStore.user,
        username: response.data.username
      })
      
      // 退出登录，让用户重新登录
      setTimeout(() => {
        userStore.logout()
        router.push('/login')
      }, 1500)
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '修改失败')
    } finally {
      passwordLoading.value = false
    }
  })
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  background-color: var(--color-bg-page);
}

.sidebar {
  background: var(--sidebar-bg);
  border-right: none;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 80px;
  padding: 0 var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.logo-text h2 {
  color: white;
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}

.logo-text .subtitle {
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.2;
}

.sidebar-menu {
  border-right: none;
  background: transparent;
  padding: var(--space-md) var(--space-sm);
  flex: 1;
}

.menu-group {
  margin-bottom: var(--space-xl);
}

.menu-label {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
  padding: 0 var(--space-md);
  margin-bottom: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sidebar-menu .el-menu-item {
  color: var(--sidebar-text);
  height: 48px;
  line-height: 48px;
  border-radius: var(--radius-md);
  margin: 2px 0;
  transition: var(--transition-fast);
}

.sidebar-menu .el-menu-item:hover {
  background: var(--sidebar-hover) !important;
  color: var(--color-border);
}

.sidebar-menu .el-menu-item.is-active {
  background: var(--sidebar-active) !important;
  color: white;
}

.sidebar-menu .el-menu-item .el-icon {
  font-size: 18px;
  margin-right: var(--space-md);
}

.main-container {
  background-color: var(--color-bg-page);
}

.header {
  background: var(--color-bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-xl);
}

.header-left h3 {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.header-search {
  width: 240px;
}

.user-dropdown {
  cursor: pointer;
}

.main-content {
  background-color: var(--color-bg-page);
  padding: var(--space-xl);
  overflow-y: auto;
}

/* 响应式：大屏自适应 */
@media (min-width: 1920px) {
  .sidebar {
    width: 260px !important;
  }
  .main-content {
    padding: var(--space-2xl);
  }
}

@media (min-width: 2560px) {
  .sidebar {
    width: 300px !important;
  }
  .header-search {
    width: 320px;
  }
}

/* 响应式：中等屏幕 */
@media (max-width: 1400px) {
  .main-content {
    padding: var(--space-lg);
  }
  .header-search {
    width: 200px;
  }
}

@media (max-width: 1024px) {
  .main-content {
    padding: var(--space-md);
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -220px;
    width: 220px;
    height: 100vh;
    z-index: 1000;
    transition: left 0.3s ease;
  }
  .sidebar.open {
    left: 0;
  }
  .header {
    padding: 0 12px;
  }
  .header-left h3 {
    font-size: 14px;
  }
  .header-search {
    width: 150px !important;
  }
  .main-content {
    padding: 12px;
  }
}
</style>
