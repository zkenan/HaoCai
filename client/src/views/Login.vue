<template>
  <div class="login-container">
    <div class="login-background">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
    </div>
    
    <div class="login-card">
      <div class="login-header">
        <img src="/logo.png" alt="Logo" class="logo-img" />
        <h1>耗材出入库管理系统</h1>
        <p>人工智能学院实习实训教研室</p>
      </div>
      
      <el-form 
        :model="loginForm" 
        :rules="rules" 
        ref="loginFormRef"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import request from '../utils/api'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      const response = await request.post('/auth/login', loginForm)
      
      userStore.setToken(response.token)
      userStore.setUser(response.user)
      
      ElMessage.success('登录成功')
      router.push('/inventory')
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(39, 107, 165) 0%, rgb(25, 80, 130) 100%);
  position: relative;
  overflow: hidden;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  animation: float 20s infinite;
}

.circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  right: -50px;
  animation-delay: -5s;
}

.circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.login-card {
  width: 450px;
  padding: 50px 40px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-img {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  display: block;
  object-fit: contain;
}

.login-header h1 {
  font-size: 26px;
  font-weight: 600;
  color: rgb(39, 107, 165);
  margin-bottom: 10px;
  line-height: 1.3;
}

.login-header p {
  font-size: 14px;
  color: #64748b;
}

.login-form {
  margin-top: 30px;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  background: linear-gradient(135deg, rgb(39, 107, 165) 0%, rgb(25, 80, 130) 100%);
  border: none;
  font-weight: 500;
  letter-spacing: 2px;
}

.login-button:hover {
  opacity: 0.9;
}

.login-tip {
  margin-top: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
