<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>耗材管理</h3>
        </div>
        <div class="header-right">
          <el-button v-if="deletedItem" type="warning" size="small" @click="handleUndo">
            撤销删除
          </el-button>
          <el-button type="danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
            批量删除 ({{ selectedRows.length }})
          </el-button>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增耗材
          </el-button>
        </div>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索耗材名称或产品编号"
          prefix-icon="Search"
          clearable
          @clear="loadConsumables"
          @keyup.enter="loadConsumables"
          style="width: 300px"
        >
          <template #append>
            <el-button @click="loadConsumables">搜索</el-button>
          </template>
        </el-input>
        <el-tooltip content="E-编辑 Delete-删除" placement="top">
          <el-tag size="small" type="info" style="margin-left: 8px">快捷键</el-tag>
        </el-tooltip>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        stripe
        highlight-current-row
        @selection-change="handleSelectionChange"
        @row-click="handleTableRowClick"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="product_code" label="产品编号" width="150" sortable />
        <el-table-column prop="name" label="耗材名称" min-width="100" sortable show-overflow-tooltip />
        <el-table-column prop="spec_model" label="规格型号" min-width="100" sortable show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="80" sortable />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="unit_price" label="单价" width="130" sortable>
          <template #default="scope">
            ¥{{ scope.row.unit_price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="总价" width="130" sortable>
          <template #default="scope">
            <span class="total-price">¥{{ (scope.row.quantity * scope.row.unit_price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reporter" label="提报人" width="110" sortable />
        <el-table-column prop="created_at" label="创建时间" width="120" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><Goods /></el-icon>
            <p>暂无耗材数据</p>
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
          @size-change="loadConsumables"
          @current-change="loadConsumables"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑耗材' : '新增耗材'"
      width="500px"
    >
      <el-form 
        :model="formData" 
        :rules="rules" 
        ref="formRef"
        label-position="top"
      >
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="规格型号" prop="spec_model">
          <el-input v-model="formData.spec_model" placeholder="请输入规格型号" />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number 
            v-model="formData.quantity" 
            :min="1" 
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="formData.unit" placeholder="请输入单位（如：个、条、块等）" />
        </el-form-item>
        <el-form-item label="单价" prop="unit_price">
          <el-input-number 
            v-model="formData.unit_price" 
            :min="0" 
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="总价">
          <el-input 
            :value="((formData.quantity || 0) * (formData.unit_price || 0)).toFixed(2)" 
            disabled
          />
        </el-form-item>
        <el-form-item label="提报人" prop="reporter">
          <el-input v-model="formData.reporter" placeholder="请输入提报人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../store/user'
import request from '../utils/api'

const userStore = useUserStore()

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const searchKeyword = ref('')
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const formRef = ref(null)
const selectedRows = ref([])
const deletedItem = ref(null)
const undoTimer = ref(null)
const selectedRow = ref(null)

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

const handleTableRowClick = (row) => {
  selectedRow.value = row
}

const handleKeyDown = (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  if (!selectedRow.value) return

  switch (e.key) {
    case 'e':
    case 'E':
      e.preventDefault()
      showEditDialog(selectedRow.value)
      break
    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      handleDelete(selectedRow.value)
      break
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}条耗材吗？`, '提示', {
      type: 'warning'
    })

    const ids = selectedRows.value.map(row => row.id)
    await request.post('/consumables/batch-delete', { ids })
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadConsumables()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const formData = reactive({
  id: null,
  name: '',
  spec_model: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  reporter: ''
})

const rules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  unit_price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  reporter: [{ required: true, message: '请输入提报人', trigger: 'blur' }]
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadConsumables = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    
    const response = await request.get('/consumables', { params })
    
    // 转换数据类型：将字符串类型的数字转换为真正的数字
    tableData.value = response.data.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0
    }))
    
    total.value = response.total
  } catch (error) {
    console.error('加载耗材列表失败:', error)
    ElMessage.error('加载耗材列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    name: '',
    spec_model: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    reporter: ''
  })
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    spec_model: row.spec_model,
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unit_price,
    reporter: row.reporter
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
        await request.put(`/consumables/${formData.id}`, formData)
        ElMessage.success('更新成功')
      } else {
        await request.post('/consumables', formData)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadConsumables()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该耗材吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await request.delete(`/consumables/${row.id}`)
    deletedItem.value = row
    ElMessage.success({
      message: '已删除，30秒内可撤销',
      duration: 30000,
      showClose: true
    })
    loadConsumables()

    if (undoTimer.value) {
      clearTimeout(undoTimer.value)
    }
    undoTimer.value = setTimeout(() => {
      deletedItem.value = null
    }, 30000)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleUndo = async () => {
  if (!deletedItem.value) return
  try {
    await request.post(`/consumables/restore/${deletedItem.value.id}`)
    ElMessage.success('已撤销删除')
    deletedItem.value = null
    if (undoTimer.value) {
      clearTimeout(undoTimer.value)
      undoTimer.value = null
    }
    loadConsumables()
  } catch (error) {
    ElMessage.error('撤销失败')
  }
}

onMounted(() => {
  loadConsumables()
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (undoTimer.value) {
    clearTimeout(undoTimer.value)
  }
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

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.search-bar {
  margin-bottom: 20px;
}

/* 表格样式优化 */
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

:deep(.el-table th.el-table-fixed-column--right) {
  background: #f8fafc !important;
}

:deep(.el-table td) {
  padding: 12px 16px;
  font-size: 14px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #f8fafc;
}

/* 分页 */
.pagination {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

/* 按钮样式优化 */
:deep(.el-button--primary) {
  background: #3b82f6;
  border-color: #3b82f6;
}

:deep(.el-button--primary:hover) {
  background: #2563eb;
  border-color: #2563eb;
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: var(--radius-xl);
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
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

.total-price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
