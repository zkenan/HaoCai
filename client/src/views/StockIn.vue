<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>入库管理</h3>
        </div>
        <div class="header-right">
          <el-button type="danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
            批量删除 ({{ selectedRows.length }})
          </el-button>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            创建入库单
          </el-button>
        </div>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索入库单号或供货商"
          prefix-icon="Search"
          clearable
          @clear="loadStockInRecords"
          @keyup.enter="loadStockInRecords"
          style="width: 300px"
        >
          <template #append>
            <el-button @click="loadStockInRecords">搜索</el-button>
          </template>
        </el-input>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="record_code" label="入库单号" width="180" sortable />
        <el-table-column prop="supplier_name" label="供货商" width="220" sortable />
        <el-table-column prop="contact_phone" label="联系电话" width="150" />
        <el-table-column prop="delivery_person" label="送货人" width="140" />
        <el-table-column prop="warehouse_manager" label="库房负责人" width="150" />
        <el-table-column prop="stock_in_date" label="入库日期" width="140" sortable>
          <template #default="scope">
            {{ scope.row.stock_in_date ? new Date(scope.row.stock_in_date).toLocaleDateString('zh-CN') : '' }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" width="140" sortable>
          <template #default="scope">
            ¥{{ Number(scope.row.total_amount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="200" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showDetailDialog(scope.row)">详情</el-button>
            <el-button size="small" type="primary" @click="downloadPDF(scope.row)">打印</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><Upload /></el-icon>
            <p>暂无入库记录</p>
            <el-button type="primary" size="small" @click="showCreateDialog">创建入库单</el-button>
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
          @size-change="loadStockInRecords"
          @current-change="loadStockInRecords"
        />
      </div>
    </el-card>

    <!-- 创建入库单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="创建入库单"
      width="90%"
    >
      <el-form
        :model="formData"
        :rules="rules"
        ref="formRef"
        label-position="top"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供货商名称" prop="supplier_name">
              <el-input v-model="formData.supplier_name" placeholder="请输入供货商名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contact_phone">
              <el-input v-model="formData.contact_phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="供货商地址">
          <el-input v-model="formData.supplier_address" placeholder="请输入供货商地址" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="formData.contact_person" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送货人" prop="delivery_person">
              <el-input v-model="formData.delivery_person" placeholder="请输入送货人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="库房负责人" prop="warehouse_manager">
          <el-input v-model="formData.warehouse_manager" placeholder="请输入库房负责人" />
        </el-form-item>

        <el-divider>耗材明细</el-divider>

        <!-- 操作按钮区 -->
        <div class="items-toolbar">
          <el-button type="primary" size="small" @click="addManualItem">
            <el-icon><Plus /></el-icon> 手动添加
          </el-button>
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleExcelSuccess"
            :on-error="handleExcelError"
            accept=".xlsx,.xls"
          >
            <el-button size="small" type="success">
              <el-icon><Upload /></el-icon> Excel导入
            </el-button>
          </el-upload>
          <el-button size="small" @click="downloadTemplate">
            <el-icon><Download /></el-icon> 下载模板
          </el-button>
        </div>

        <!-- 已选耗材表格 -->
        <el-table
          :data="selectedItems"
          border
          style="width: 100%; margin-top: 12px"
          max-height="400"
        >
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="耗材名称" min-width="160">
            <template #default="scope">
              <el-input
                v-model="scope.row.consumable_name"
                size="small"
                placeholder="请输入名称"
              />
            </template>
          </el-table-column>
          <el-table-column label="规格型号" min-width="160">
            <template #default="scope">
              <el-input
                v-model="scope.row.spec_model"
                size="small"
                placeholder="请输入规格"
              />
            </template>
          </el-table-column>
          <el-table-column label="单位" width="90">
            <template #default="scope">
              <el-input
                v-model="scope.row.unit"
                size="small"
                placeholder="个"
              />
            </template>
          </el-table-column>
          <el-table-column label="数量" width="120">
            <template #default="scope">
              <el-input-number
                v-model="scope.row.quantity"
                :min="1"
                size="small"
                controls-position="right"
              />
            </template>
          </el-table-column>
          <el-table-column label="单价(元)" width="140">
            <template #default="scope">
              <el-input-number
                v-model="scope.row.unit_price"
                :min="0"
                :precision="2"
                size="small"
                controls-position="right"
              />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="110">
            <template #default="scope">
              ¥{{ (scope.row.quantity * scope.row.unit_price).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="提报人" width="120">
            <template #default="scope">
              <el-input
                v-model="scope.row.reporter"
                size="small"
                placeholder="提报人"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="scope">
              <el-button
                type="danger"
                size="small"
                link
                @click="removeItem(scope.$index)"
              >
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="empty-items-tip" v-if="selectedItems.length === 0">
          暂无耗材，请点击"手动添加"或"Excel导入"
        </div>

        <div class="total-amount">
          总金额: ¥{{ totalAmount.toFixed(2) }}
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 入库单详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="入库单详情"
      width="900px"
    >
      <div v-if="detailData" class="detail-content">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="入库单号">{{ detailData.record_code }}</el-descriptions-item>
          <el-descriptions-item label="入库日期">{{ formatDate(detailData.stock_in_date) }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ parseFloat(detailData.total_amount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="供货商">{{ detailData.supplier_name }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailData.contact_phone }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detailData.contact_person }}</el-descriptions-item>
          <el-descriptions-item label="供货商地址" :span="3">{{ detailData.supplier_address }}</el-descriptions-item>
          <el-descriptions-item label="送货人">{{ detailData.delivery_person }}</el-descriptions-item>
          <el-descriptions-item label="库房负责人">{{ detailData.warehouse_manager }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detailData.created_by_name }}</el-descriptions-item>
        </el-descriptions>

        <el-table
          :data="detailData.items"
          style="width: 100%; margin-top: 20px"
          border
        >
          <el-table-column prop="product_code" label="产品编号" width="120" />
          <el-table-column prop="name" label="产品名称" width="150" />
          <el-table-column prop="spec_model" label="规格型号" width="180" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column label="单价" width="120">
            <template #default="scope">
              ¥{{ parseFloat(scope.row.unit_price || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="总价" width="120">
            <template #default="scope">
              ¥{{ ((scope.row.quantity || 0) * parseFloat(scope.row.unit_price || 0)).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="success" @click="downloadPDF(detailData)">导出PDF</el-button>
        <el-button type="primary" @click="downloadPDF(detailData)">打印入库单</el-button>
      </template>
    </el-dialog>

    <!-- 二次确认删除对话框 -->
    <el-dialog
      v-model="deleteConfirmVisible"
      title="二次确认删除"
      width="480px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div style="margin-bottom: 12px; color: #ef4444; font-weight: 600;">
        此操作不可撤销！将删除以下内容：
      </div>
      <ul style="margin: 0 0 16px 20px; color: #64748b; font-size: 13px; line-height: 2;">
        <li>入库单及其明细</li>
        <li>关联的耗材记录</li>
        <li>引用这些耗材的出库单</li>
      </ul>
      <div v-if="deleteConfirmBatch" style="color: #0f172a; margin-bottom: 8px;">
        将删除 <strong>{{ selectedRows.length }}</strong> 条入库单，请输入 <code style="background:#fee2e2;padding:2px 6px;border-radius:4px;color:#dc2626;">确认删除</code> 继续：
      </div>
      <div v-else style="color: #0f172a; margin-bottom: 8px;">
        请输入入库单号 <code style="background:#fee2e2;padding:2px 6px;border-radius:4px;color:#dc2626;">{{ deleteConfirmRecord?.record_code }}</code> 确认删除：
      </div>
      <el-input
        v-model="deleteConfirmInput"
        placeholder="请输入确认文字"
        @keyup.enter="confirmDeleteInput === (deleteConfirmBatch ? '确认删除' : deleteConfirmRecord?.record_code) && executeDelete()"
      />
      <template #footer>
        <el-button @click="deleteConfirmVisible = false">取消</el-button>
        <el-button
          type="danger"
          :disabled="deleteConfirmInput !== (deleteConfirmBatch ? '确认删除' : deleteConfirmRecord?.record_code)"
          :loading="deleteConfirmLoading"
          @click="executeDelete"
        >
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../store/user'
import request from '../utils/api'

const userStore = useUserStore()

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const searchKeyword = ref('')
const tableData = ref([])
const detailData = ref(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const formRef = ref(null)
const selectedRows = ref([])

// 二次确认删除
const deleteConfirmVisible = ref(false)
const deleteConfirmInput = ref('')
const deleteConfirmRecord = ref(null) // 当前待删除的入库单
const deleteConfirmBatch = ref(false) // 是否批量删除
const deleteConfirmLoading = ref(false)

// Excel 上传配置
const uploadUrl = '/api/stock-in/parse-excel'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的${selectedRows.value.length}条入库单吗？`,
      '删除入库单',
      {
        confirmButtonText: '是，删除库存数据',
        cancelButtonText: '否，保留库存数据',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    )
    // 用户点击"是" → 弹出二次确认
    deleteConfirmBatch.value = true
    deleteConfirmRecord.value = null
    deleteConfirmInput.value = ''
    deleteConfirmVisible.value = true
  } catch (action) {
    if (action === 'cancel') {
      // 用户点击"否，保留库存数据"
      const ids = selectedRows.value.map(row => row.id)
      try {
        await request.post('/stock-in/batch-delete', { ids, deleteStock: false })
        ElMessage.success('批量删除成功，库存数据已保留')
        selectedRows.value = []
        loadStockInRecords()
      } catch (error) {
        ElMessage.error('批量删除失败')
      }
    } else if (action !== 'close') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该入库单吗？',
      '删除入库单',
      {
        confirmButtonText: '是，删除库存数据',
        cancelButtonText: '否，保留库存数据',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    )
    // 用户点击"是" → 弹出二次确认
    deleteConfirmBatch.value = false
    deleteConfirmRecord.value = row
    deleteConfirmInput.value = ''
    deleteConfirmVisible.value = true
  } catch (action) {
    if (action === 'cancel') {
      // 用户点击"否，保留库存数据"
      try {
        await request.delete(`/stock-in/${row.id}?deleteStock=false`)
        ElMessage.success('删除成功，库存数据已保留')
        loadStockInRecords()
      } catch (error) {
        ElMessage.error('删除失败')
      }
    } else if (action !== 'close') {
      ElMessage.error('删除失败')
    }
  }
}

// 二次确认：执行删除
const executeDelete = async () => {
  deleteConfirmLoading.value = true
  try {
    if (deleteConfirmBatch.value) {
      const ids = selectedRows.value.map(row => row.id)
      await request.post('/stock-in/batch-delete', { ids, deleteStock: true })
      ElMessage.success('批量删除成功，库存数据已清除')
      selectedRows.value = []
    } else {
      const row = deleteConfirmRecord.value
      await request.delete(`/stock-in/${row.id}?deleteStock=true`)
      ElMessage.success('删除成功，库存数据已清除')
    }
    deleteConfirmVisible.value = false
    loadStockInRecords()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除失败')
  } finally {
    deleteConfirmLoading.value = false
  }
}

const formData = reactive({
  supplier_name: '',
  supplier_address: '',
  contact_phone: '',
  contact_person: '',
  delivery_person: '',
  warehouse_manager: ''
})

const selectedItems = ref([])

const rules = {
  supplier_name: [{ required: true, message: '请输入供货商名称', trigger: 'blur' }],
  delivery_person: [{ required: true, message: '请输入送货人', trigger: 'blur' }],
  warehouse_manager: [{ required: true, message: '请输入库房负责人', trigger: 'blur' }]
}

const totalAmount = computed(() => {
  return selectedItems.value.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)
})

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const toChineseAmount = (num) => {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿']
  if (num === 0) return '零元整'
  let intPart = Math.floor(num)
  let decPart = Math.round((num - intPart) * 100)
  let result = ''
  let groupIdx = 0
  while (intPart > 0) {
    let group = intPart % 10000
    let groupStr = ''
    for (let i = 0; i < 4; i++) {
      let d = group % 10
      if (d !== 0) groupStr = digits[d] + units[i] + groupStr
      else if (groupStr && groupStr[0] !== '零') groupStr = '零' + groupStr
      group = Math.floor(group / 10)
    }
    if (groupStr) result = groupStr + bigUnits[groupIdx] + result
    groupIdx++
    intPart = Math.floor(intPart / 10000)
  }
  result = result + '元'
  if (decPart === 0) {
    result += '整'
  } else {
    let jiao = Math.floor(decPart / 10)
    let fen = decPart % 10
    if (jiao > 0) result += digits[jiao] + '角'
    if (fen > 0) result += digits[fen] + '分'
  }
  return result
}

const loadStockInRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    const response = await request.get('/stock-in', { params })
    tableData.value = response.data
    total.value = response.total
  } catch (error) {
    ElMessage.error('加载入库单列表失败')
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  Object.assign(formData, {
    supplier_name: '',
    supplier_address: '',
    contact_phone: '',
    contact_person: '',
    delivery_person: '',
    warehouse_manager: ''
  })
  selectedItems.value = []
  dialogVisible.value = true
}

// 手动添加空耗材行
const addManualItem = () => {
  selectedItems.value.push({
    consumable_name: '',
    spec_model: '',
    unit: '个',
    quantity: 1,
    unit_price: 0,
    reporter: userStore.user?.username || ''
  })
}

// Excel 导入成功回调
const handleExcelSuccess = (response) => {
  if (response.data && response.data.length > 0) {
    response.data.forEach(item => {
      selectedItems.value.push({
        consumable_name: item.consumable_name || '',
        spec_model: item.spec_model || '',
        unit: item.unit || '个',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        reporter: item.reporter || userStore.user?.username || ''
      })
    })
    ElMessage.success(`成功导入 ${response.data.length} 条耗材`)
  } else {
    ElMessage.warning('Excel中没有有效数据')
  }
}

const handleExcelError = () => {
  ElMessage.error('Excel导入失败')
}

// 下载模板
const downloadTemplate = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/files/template', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '耗材导入模板.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error('下载模板失败')
  }
}

// 移除耗材行
const removeItem = (index) => {
  selectedItems.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    if (selectedItems.value.length === 0) {
      ElMessage.warning('请添加耗材')
      return
    }

    // 校验每行耗材名称
    for (let i = 0; i < selectedItems.value.length; i++) {
      if (!selectedItems.value[i].consumable_name || !selectedItems.value[i].consumable_name.trim()) {
        ElMessage.warning(`第 ${i + 1} 行耗材名称不能为空`)
        return
      }
    }

    submitLoading.value = true
    try {
      const items = selectedItems.value.map(item => ({
        consumable_name: item.consumable_name.trim(),
        spec_model: item.spec_model || '',
        unit: item.unit || '个',
        quantity: item.quantity,
        unit_price: item.unit_price,
        reporter: item.reporter || ''
      }))

      await request.post('/stock-in', {
        ...formData,
        items
      })

      ElMessage.success('创建入库单成功')
      dialogVisible.value = false
      loadStockInRecords()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const showDetailDialog = async (row) => {
  try {
    const response = await request.get(`/stock-in/${row.id}`)
    detailData.value = response.data
    detailVisible.value = true
  } catch (error) {
    ElMessage.error('加载详情失败')
  }
}

const downloadPDF = async (row) => {
  try {
    const response = await request.get(`/files/stock-in/${row.id}/data`)
    const { record, items } = response.data

    let totalAmount = 0
    items.forEach(item => {
      totalAmount += (item.quantity || 0) * parseFloat(item.unit_price || 0)
    })

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      ElMessage.error('请允许弹出窗口')
      return
    }

    const esc = (s) => {
      if (!s) return ''
      const d = document.createElement('div')
      d.textContent = String(s)
      return d.innerHTML
    }

    const now = new Date()
    const printTime = now.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>耗材入库单_${esc(record.record_code)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
      padding: 30px;
      background: #fff;
      color: #333;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container { max-width: 800px; margin: 0 auto; }

    .print-header {
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .print-header h1 {
      font-size: 22px;
      letter-spacing: 4px;
      color: #1a1a1a;
    }
    .print-header .sub-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 4px;
      margin-top: 5px;
    }

    .record-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 13px;
      color: #444;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
    }
    .record-meta span { font-weight: 600; }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 0;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .info-item {
      display: flex;
    }
    .info-item .label {
      font-weight: 600;
      color: #555;
      white-space: nowrap;
    }
    .info-item .value {
      margin-left: 6px;
      color: #1a1a1a;
      word-break: break-all;
    }
    .info-item.full { grid-column: 1 / -1; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #999;
      padding: 7px 8px;
      text-align: center;
      font-size: 12px;
    }
    th {
      background-color: #e8e8e8;
      font-weight: 700;
      color: #1a1a1a;
    }
    td { color: #333; }
    .total-row {
      font-weight: 700;
      background-color: #f0f0f0;
    }
    .total-row td { border-top: 2px solid #333; }

    .amount-section {
      text-align: right;
      font-size: 14px;
      margin: 15px 0;
      padding: 10px 0;
      border-top: 1px solid #ddd;
    }
    .amount-section .label { font-weight: 600; }
    .amount-section .amount { font-size: 16px; font-weight: 700; color: #c00; }

    .sign-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      padding: 0 10px;
    }
    .sign-item {
      width: 220px;
    }
    .sign-item p {
      font-size: 13px;
      margin-top: 60px;
      border-top: 1px solid #999;
      padding-top: 8px;
      text-align: center;
    }

    .print-footer {
      margin-top: 30px;
      text-align: right;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }

    .no-print { display: none; }

    @media print {
      body { padding: 15px; font-size: 12px; }
      .no-print { display: none !important; }
      .container { max-width: 100%; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      .sign-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-header">
      <h1>耗材入库单</h1>
      <div class="sub-title">人工智能学院实习实训教研室</div>
    </div>

    <div class="record-meta">
      <div>单号: <span>${esc(record.record_code)}</span></div>
      <div>日期: <span>${formatDate(record.stock_in_date)}</span></div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <span class="label">供货商:</span>
        <span class="value">${esc(record.supplier_name)}</span>
      </div>
      <div class="info-item">
        <span class="label">联系人:</span>
        <span class="value">${esc(record.contact_person)}</span>
      </div>
      <div class="info-item">
        <span class="label">联系电话:</span>
        <span class="value">${esc(record.contact_phone)}</span>
      </div>
      <div class="info-item">
        <span class="label">库房负责人:</span>
        <span class="value">${esc(record.warehouse_manager)}</span>
      </div>
      <div class="info-item full">
        <span class="label">供货商地址:</span>
        <span class="value">${esc(record.supplier_address)}</span>
      </div>
      <div class="info-item">
        <span class="label">送货人:</span>
        <span class="value">${esc(record.delivery_person)}</span>
      </div>
      <div class="info-item">
        <span class="label">创建人:</span>
        <span class="value">${esc(record.created_by_name)}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>产品编号</th>
          <th>产品名称</th>
          <th>规格型号</th>
          <th>单位</th>
          <th>数量</th>
          <th>单价(元)</th>
          <th>金额(元)</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${esc(item.product_code)}</td>
          <td>${esc(item.name)}</td>
          <td>${esc(item.spec_model)}</td>
          <td>${esc(item.unit)}</td>
          <td>${item.quantity || 0}</td>
          <td>${parseFloat(item.unit_price || 0).toFixed(2)}</td>
          <td>${((item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}</td>
          <td></td>
        </tr>`).join('')}
        <tr class="total-row">
          <td colspan="5">合计</td>
          <td>${items.reduce((s, i) => s + (i.quantity || 0), 0)}</td>
          <td></td>
          <td>${totalAmount.toFixed(2)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="amount-section">
      <span class="label">总金额:</span>
      <span class="amount">¥${totalAmount.toFixed(2)}</span>
      <span style="margin-left:20px;font-size:12px;color:#666">（大写: ${toChineseAmount(totalAmount)}）</span>
    </div>

    <div class="sign-section">
      <div class="sign-item">
        <p>送货人签字</p>
      </div>
      <div class="sign-item">
        <p>库房负责人签字</p>
      </div>
    </div>

    <div class="print-footer">
      打印时间: ${printTime}
    </div>
  </div>

  <script>
    function formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return y + '-' + m + '-' + day
    }

    function toChineseAmount(num) {
      const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
      const units = ['', '拾', '佰', '仟']
      const bigUnits = ['', '万', '亿']
      if (num === 0) return '零元整'
      let intPart = Math.floor(num)
      let decPart = Math.round((num - intPart) * 100)
      let result = ''
      let groupIdx = 0
      while (intPart > 0) {
        let group = intPart % 10000
        let groupStr = ''
        for (let i = 0; i < 4; i++) {
          let d = group % 10
          if (d !== 0) groupStr = digits[d] + units[i] + groupStr
          else if (groupStr && groupStr[0] !== '零') groupStr = '零' + groupStr
          group = Math.floor(group / 10)
        }
        if (groupStr) result = groupStr + bigUnits[groupIdx] + result
        groupIdx++
        intPart = Math.floor(intPart / 10000)
      }
      result = result + '元'
      if (decPart === 0) {
        result += '整'
      } else {
        let jiao = Math.floor(decPart / 10)
        let fen = decPart % 10
        if (jiao > 0) result += digits[jiao] + '角'
        if (fen > 0) result += digits[fen] + '分'
      }
      return result
    }

    window.onload = function() {
      setTimeout(function() {
        window.print()
      }, 300)
    }
  <\/script>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    ElMessage.success('正在打印...')
  } catch (error) {
    console.error('打印失败:', error)
    ElMessage.error('打印失败: ' + (error.message || '未知错误'))
  }
}

onMounted(() => {
  loadStockInRecords()
})
</script>

<style scoped>
.page-container {
  height: 100%;
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
  margin-bottom: 20px;
}

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 10px;
}

.search-bar {
  margin-bottom: 20px;
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

:deep(.el-table th.el-table-fixed-column--right) {
  background: #f8fafc !important;
}

:deep(.el-table td) {
  padding: 12px 16px;
  color: #0f172a;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #fafafa;
}

:deep(.el-table__row:hover > td) {
  background: #f1f5f9 !important;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-pagination) {
  --el-pagination-button-bg-color: transparent;
}

:deep(.el-button--primary) {
  background: #3b82f6;
  border-color: #3b82f6;
}

:deep(.el-button--primary:hover) {
  background: #2563eb;
  border-color: #2563eb;
}

.total-amount {
  margin-top: 20px;
  text-align: right;
  font-size: 18px;
  font-weight: 600;
  color: #3b82f6;
}

.items-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.empty-items-tip {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 14px;
}

.detail-content {
  margin-top: 20px;
}

:deep(.el-descriptions__label) {
  background: #f8fafc;
  color: #64748b;
  font-weight: 500;
}

:deep(.el-descriptions__content) {
  color: #0f172a;
}

:deep(.el-input-number) {
  width: 100%;
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
