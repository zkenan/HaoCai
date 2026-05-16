<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>耗材管理</h3>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增耗材
          </el-button>
          <el-button @click="downloadTemplate">
            <el-icon><Download /></el-icon>
            下载模板
          </el-button>
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :data="{ reporter: userStore.user?.username }"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            accept=".xlsx,.xls"
            :show-file-list="false"
          >
            <el-button>
              <el-icon><Upload /></el-icon>
              Excel导入
            </el-button>
          </el-upload>
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
      </div>

      <el-table 
        :data="tableData" 
        v-loading="loading"
        style="width: 100%"
        stripe
      >
        <el-table-column prop="product_code" label="产品编号" width="120" sortable />
        <el-table-column prop="name" label="耗材名称" width="150" sortable />
        <el-table-column prop="spec_model" label="规格型号" width="180" sortable />
        <el-table-column prop="quantity" label="数量" width="100" sortable />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="unit_price" label="单价" width="100" sortable>
          <template #default="scope">
            ¥{{ scope.row.unit_price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="总价" width="120" sortable>
          <template #default="scope">
            ¥{{ (scope.row.quantity * scope.row.unit_price).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="reporter" label="提报人" width="120" sortable />
        <el-table-column prop="created_at" label="创建时间" width="180" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
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
        label-width="100px"
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
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
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

const uploadUrl = '/api/consumables/batch'
const uploadHeaders = {
  Authorization: `Bearer ${userStore.token}`
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
    ElMessage.success('删除成功')
    loadConsumables()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const downloadTemplate = async () => {
  try {
    const response = await request.get('/files/template', {
      responseType: 'blob'
    })
    // 拦截器返回完整response对象，使用response.data获取blob
    const blob = response.data
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '耗材导入模板.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error) {
    console.error('下载模板失败:', error)
    // 尝试从错误响应中提取blob
    if (error.response && error.response.data instanceof Blob) {
      const url = window.URL.createObjectURL(error.response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', '耗材导入模板.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      ElMessage.success('下载成功')
    } else {
      ElMessage.error('下载模板失败: ' + (error.message || '未知错误'))
    }
  }
}

const handleUploadSuccess = (response) => {
  ElMessage.success(`成功导入 ${response.count} 条耗材记录`)
  loadConsumables()
}

const handleUploadError = (error) => {
  ElMessage.error('导入失败')
  console.error('导入错误:', error)
}

onMounted(() => {
  loadConsumables()
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.page-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 10px;
}

.search-bar {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
