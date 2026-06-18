<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>用户管理</h3>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新建用户
          </el-button>
        </div>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        stripe
      >
        <el-table-column prop="username" label="用户名" width="200" sortable />
        <el-table-column prop="role" label="角色" width="150" sortable>
          <template #default="scope">
            <el-tag
              :type="roleTagType(scope.row.role)"
              effect="light"
              size="small"
            >
              {{ roleLabel(scope.row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="200" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="220" fixed="right">
          <template #default="scope">
            <div class="table-actions">
              <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
              <el-button size="small" type="warning" @click="showResetPasswordDialog(scope.row)">重置密码</el-button>
              <el-button size="small" type="danger" plain @click="handleDelete(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><User /></el-icon>
            <p>暂无用户数据</p>
            <el-button type="primary" size="small" @click="showAddDialog">立即新建</el-button>
          </div>
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 新建/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新建用户'"
      width="500px"
    >
      <el-form
        :model="formData"
        :rules="rules"
        ref="formRef"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="formData.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="操作员" value="operator" />
            <el-option label="查看者" value="viewer" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetPasswordVisible"
      title="重置密码"
      width="500px"
    >
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-position="top"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword" :loading="resetLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import request from '../utils/api'

const loading = ref(false)
const submitLoading = ref(false)
const resetLoading = ref(false)
const dialogVisible = ref(false)
const resetPasswordVisible = ref(false)
const isEdit = ref(false)
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const formRef = ref(null)
const passwordFormRef = ref(null)

const formData = reactive({
  id: null,
  username: '',
  password: '',
  role: ''
})

const passwordForm = reactive({
  id: null,
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const roleTagType = (role) => {
  const map = {
    admin: 'primary',
    operator: 'success',
    viewer: 'info'
  }
  return map[role] || 'info'
}

const roleLabel = (role) => {
  const map = {
    admin: '管理员',
    operator: '操作员',
    viewer: '查看者'
  }
  return map[role] || role
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    const response = await request.get('/users', { params })
    tableData.value = response.data
    total.value = response.total
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    username: '',
    password: '',
    role: ''
  })
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    username: row.username,
    password: '',
    role: row.role
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value) {
        await request.put(`/users/${formData.id}`, {
          username: formData.username,
          role: formData.role
        })
        ElMessage.success('更新成功')
      } else {
        await request.post('/users', formData)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadUsers()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const showResetPasswordDialog = (row) => {
  Object.assign(passwordForm, {
    id: row.id,
    newPassword: '',
    confirmPassword: ''
  })
  resetPasswordVisible.value = true
}

const handleResetPassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    resetLoading.value = true
    try {
      await request.put(`/users/${passwordForm.id}/password`, {
        newPassword: passwordForm.newPassword
      })
      ElMessage.success('密码重置成功')
      resetPasswordVisible.value = false
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '密码重置失败')
    } finally {
      resetLoading.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await request.delete(`/users/${row.id}`)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.page-container {
  width: 100%;
}

.page-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-xl);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-right {
  display: flex;
  gap: var(--space-md);
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: var(--radius-md);
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f8fafc;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 12px;
  padding: var(--space-md) var(--space-lg);
}

:deep(.el-table th.el-table-fixed-column--right) {
  background: #f8fafc !important;
}

:deep(.el-table td) {
  padding: var(--space-md) var(--space-lg);
  font-size: 14px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #f8fafc;
}

/* 分页 */
.pagination {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

/* 操作列 */
.table-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: nowrap;
}

/* 按钮样式优化 */
:deep(.el-button--primary) {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

:deep(.el-button--primary:hover) {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: var(--radius-xl);
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 20px var(--space-xl);
  border-bottom: 1px solid var(--color-border);
}

:deep(.el-dialog__body) {
  padding: var(--space-xl);
}

:deep(.el-dialog__footer) {
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid var(--color-border);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin: var(--space-md) 0;
  font-size: 14px;
}
</style>
