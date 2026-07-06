<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>数据备份与还原</h3>
        </div>
        <div class="header-right">
          <el-tag type="info">仅管理员可用</el-tag>
        </div>
      </div>

      <el-alert
        title="操作说明"
        type="info"
        :closable="false"
        show-icon
        class="alert-info"
      >
        <p><strong>数据备份：</strong>导出系统所有数据（用户、耗材、入库单、出库单等）为JSON文件，可用于数据迁移或灾难恢复。</p>
        <p><strong>数据还原：</strong>从备份文件中导入数据，将覆盖当前所有数据。操作不可逆，请谨慎使用！</p>
      </el-alert>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="operation-card">
            <template #header>
              <div class="card-title">
                <el-icon :size="24" color="#67c23a"><Download /></el-icon>
                <span>数据备份</span>
              </div>
            </template>
            
            <div class="operation-content">
              <p class="description">
                将系统所有数据导出为JSON格式的备份文件
              </p>
              
              <el-button
                type="success"
                size="large"
                :loading="exporting"
                @click="handleExport"
                icon="Download"
              >
                {{ exporting ? '正在导出...' : '导出数据' }}
              </el-button>

              <div class="tips">
                <el-icon><InfoFilled /></el-icon>
                <span>导出的文件包含：用户、耗材、入库记录、出库记录等全部数据</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="hover" class="operation-card">
            <template #header>
              <div class="card-title">
                <el-icon :size="24" color="#e6a23c"><Upload /></el-icon>
                <span>数据还原</span>
              </div>
            </template>
            
            <div class="operation-content">
              <p class="description">
                从备份文件中导入数据，恢复系统状态
              </p>
              
              <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :on-change="handleFileChange"
                :limit="1"
                accept=".json"
                drag
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                  拖拽文件到此处或 <em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    只能上传 .json 格式的备份文件
                  </div>
                </template>
              </el-upload>

              <el-button
                type="warning"
                size="large"
                :loading="importing"
                :disabled="!selectedFile"
                @click="handleImport"
                icon="Upload"
                class="import-btn"
              >
                {{ importing ? '正在导入...' : '导入数据' }}
              </el-button>

              <div class="tips warning">
                <el-icon><WarningFilled /></el-icon>
                <span>警告：导入操作将覆盖现有数据，且不可撤销！</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="hover" class="backup-list-card">
        <template #header>
          <div class="card-title">
            <el-icon><Document /></el-icon>
            <span>最近备份记录</span>
            <el-button
              type="primary"
              size="small"
              @click="loadBackupList"
              icon="Refresh"
              class="refresh-btn"
            >
              刷新
            </el-button>
          </div>
        </template>

        <el-table
          v-loading="loadingList"
          :data="backupList"
          border
          stripe
          style="width: 100%"
          empty-text="暂无备份记录"
        >
          <template #empty>
            <div class="empty-state">
              <el-icon :size="48" color="#cbd5e1"><Document /></el-icon>
              <p>暂无备份记录</p>
              <el-button type="success" size="small" @click="handleExport">导出第一份备份</el-button>
            </div>
          </template>
          <el-table-column prop="filename" label="文件名" min-width="250" />
          <el-table-column label="文件大小" width="120">
            <template #default="scope">
              {{ formatFileSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column prop="modifyTime" label="备份时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.modifyTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="downloadBackup(scope.row.filename)"
              >
                下载
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteBackup(scope.row.filename)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload, InfoFilled, WarningFilled, Document, Refresh, UploadFilled } from '@element-plus/icons-vue'
import api from '../utils/api'

const exporting = ref(false)
const importing = ref(false)
const loadingList = ref(false)
const selectedFile = ref(null)
const backupList = ref([])
const uploadRef = ref(null)

// 导出数据
const handleExport = async () => {
  try {
    exporting.value = true

    const token = localStorage.getItem('token')
    const response = await fetch('/api/backup/export', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) throw new Error('导出失败')

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // 从响应头获取文件名
    const contentDisposition = response.headers.get('content-disposition')
    let filename = `backup_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) {
        filename = match[1]
      }
    }

    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('数据导出成功')

    // 刷新备份列表
    loadBackupList()
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('数据导出失败')
  } finally {
    exporting.value = false
  }
}

// 处理文件选择
const handleFileChange = (file) => {
  selectedFile.value = file.raw
  ElMessage.info(`已选择文件: ${file.name}`)
}

// 导入数据
const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择备份文件')
    return
  }

  try {
    // 二次确认
    await ElMessageBox.confirm(
      '此操作将覆盖当前所有数据，且不可撤销！确定要继续吗？',
      '危险操作警告',
      {
        confirmButtonText: '确定导入',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    importing.value = true

    // 读取文件内容
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result)
        
        // 发送导入请求
        const response = await api.post('/backup/import', backupData)
        
        // api.js 已返回 response.data，所以直接取 message
        ElMessage.success(response.message || '数据还原成功')
        
        // 清空选择的文件
        selectedFile.value = null
        if (uploadRef.value) {
          uploadRef.value.clearFiles()
        }
        
        // 刷新页面以显示最新数据
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } catch (parseError) {
        // 区分解析错误和API错误
        if (parseError instanceof SyntaxError) {
          console.error('JSON解析失败:', parseError)
          ElMessage.error('备份文件格式错误，请检查文件是否有效')
        } else {
          console.error('导入请求失败:', parseError)
          // api.js 已返回 response.data，所以直接取 message
          ElMessage.error(parseError.message || parseError.response?.data?.message || '数据还原失败')
        }
      }
    }
    
    reader.onerror = () => {
      ElMessage.error('文件读取失败')
    }
    
    reader.readAsText(selectedFile.value)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导入失败:', error)
      ElMessage.error(error.response?.data?.message || '数据还原失败')
    }
  } finally {
    importing.value = false
  }
}

// 加载备份列表
const loadBackupList = async () => {
  try {
    loadingList.value = true
    const response = await api.get('/backup/list')
    // api.js 的响应拦截器已经返回了 response.data，所以这里直接取 data
    backupList.value = response.data || []
    console.log('备份列表加载成功:', backupList.value)
  } catch (error) {
    console.error('加载备份列表失败:', error)
    // 如果是认证错误，不显示错误提示（可能token过期）
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      ElMessage.error('加载备份列表失败')
    }
  } finally {
    loadingList.value = false
  }
}

// 下载备份文件
const downloadBackup = async (filename) => {
  try {
    const response = await api.get(`/backup/download/${filename}`, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

// 删除备份文件
const deleteBackup = async (filename) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份文件 "${filename}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.delete(`/backup/delete/${filename}`)
    ElMessage.success('删除成功')
    loadBackupList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  loadBackupList()
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

.page-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-right {
  display: flex;
  gap: var(--space-md);
}

.alert-info {
  margin-bottom: var(--space-xl);
}

.operation-card {
  height: 100%;
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 16px;
  font-weight: 600;
}

.operation-content {
  padding: var(--space-sm) 0;
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
  line-height: 1.6;
}

.import-btn {
  margin-top: var(--space-lg);
  width: 100%;
}

.backup-list-card {
  margin-top: var(--space-xl);
}

.refresh-btn {
  margin-left: auto;
}

.tips {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: #f0f9ff;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.tips.warning {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.tips .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

:deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
}

:deep(.el-upload__tip) {
  margin-top: 10px;
  color: var(--color-text-muted);
  font-size: 12px;
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
  margin: 12px 0;
  font-size: 14px;
}
</style>
