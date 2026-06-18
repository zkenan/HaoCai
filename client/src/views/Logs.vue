<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>操作日志</h3>
        </div>
      </div>

      <div class="search-bar">
        <el-select
          v-model="filterAction"
          placeholder="操作类型"
          clearable
          style="width: 160px; margin-right: 12px"
          @change="loadLogs"
        >
          <el-option label="创建" value="创建" />
          <el-option label="更新" value="更新" />
          <el-option label="删除" value="删除" />
          <el-option label="导入" value="导入" />
          <el-option label="重置密码" value="重置密码" />
          <el-option label="恢复" value="恢复" />
        </el-select>
        <el-select
          v-model="filterModule"
          placeholder="模块"
          clearable
          style="width: 160px"
          @change="loadLogs"
        >
          <el-option label="耗材" value="耗材" />
          <el-option label="入库" value="入库" />
          <el-option label="出库" value="出库" />
          <el-option label="用户" value="用户" />
          <el-option label="库存" value="库存" />
        </el-select>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        stripe
      >
        <el-table-column prop="created_at" label="时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="scope">
            <el-tag :type="getActionTagType(scope.row.action)" size="small">
              {{ scope.row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="username" label="用户" width="120" />
        <template #empty>
          <div class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><Document /></el-icon>
            <p>暂无日志数据</p>
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
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import request from '../utils/api'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterAction = ref('')
const filterModule = ref('')

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const getActionTagType = (action) => {
  if (!action) return 'info'
  if (action.includes('创建')) return 'success'
  if (action.includes('删除')) return 'danger'
  if (action.includes('更新') || action.includes('重置')) return 'warning'
  return 'info'
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (filterAction.value) params.action = filterAction.value
    if (filterModule.value) params.module = filterModule.value

    const response = await request.get('/logs', { params })
    tableData.value = response.data
    total.value = response.total
  } catch (error) {
    console.error('加载日志列表失败:', error)
    ElMessage.error('加载日志列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.page-container {
  width: 100%;
}

.page-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.page-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.search-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f8fafc;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 12px;
  padding: 12px 16px;
}

:deep(.el-table td) {
  padding: 12px 16px;
  font-size: 14px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #f8fafc;
}

.pagination {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
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
