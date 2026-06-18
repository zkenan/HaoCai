<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>出库管理</h3>
        </div>
        <div class="header-right">
          <el-button type="danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
            批量删除 ({{ selectedRows.length }})
          </el-button>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            创建出库单
          </el-button>
        </div>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索出库单号或领用人"
          prefix-icon="Search"
          clearable
          @clear="loadStockOutRecords"
          @keyup.enter="loadStockOutRecords"
          style="width: 300px"
        >
          <template #append>
            <el-button @click="loadStockOutRecords">搜索</el-button>
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
        <el-table-column prop="record_code" label="出库单号" width="180" sortable />
        <el-table-column prop="recipient" label="领用人" width="150" sortable />
        <el-table-column prop="purpose" label="用途说明" min-width="220" show-overflow-tooltip />
        <el-table-column prop="stock_out_date" label="出库日期" width="140" sortable>
          <template #default="scope">
            {{ scope.row.stock_out_date ? new Date(scope.row.stock_out_date).toLocaleDateString('zh-CN') : '' }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" width="140" sortable>
          <template #default="scope">
            ¥{{ Number(scope.row.total_amount || 0).toFixed(2) }}
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
            <el-icon :size="48" color="#cbd5e1"><Download /></el-icon>
            <p>暂无出库记录</p>
            <el-button type="primary" size="small" @click="showCreateDialog">创建出库单</el-button>
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
          @size-change="loadStockOutRecords"
          @current-change="loadStockOutRecords"
        />
      </div>
    </el-card>

    <!-- 创建出库单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="创建出库单"
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
            <el-form-item label="领用人" prop="recipient">
              <el-input v-model="formData.recipient" placeholder="请输入领用人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库日期">
              <el-date-picker
                v-model="formData.stock_out_date"
                type="date"
                placeholder="选择出库日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="用途说明">
          <el-input 
            v-model="formData.purpose" 
            type="textarea" 
            :rows="3"
            placeholder="请输入用途说明"
          />
        </el-form-item>
        
        <el-divider>选择耗材</el-divider>
        
        <div class="consumable-select-container">
          <!-- 可选耗材 -->
          <div class="panel top-panel">
            <div class="panel-header">
              <span>可选耗材</span>
              <el-input
                v-model="availableSearch"
                placeholder="搜索耗材..."
                size="small"
                clearable
                prefix-icon="Search"
              />
            </div>
            <div class="panel-body">
              <el-table
                :data="filteredAvailableConsumables"
                height="250"
                border
                @row-click="addToSelected"
                highlight-current-row
              >
                <el-table-column prop="product_code" label="产品编号" width="158" />
                <el-table-column prop="name" label="耗材名称" width="293" show-overflow-tooltip />
                <el-table-column prop="spec_model" label="规格型号" width="293" show-overflow-tooltip />
                <el-table-column prop="quantity" label="数量" width="108" />
                <el-table-column label="单价" width="108">
                  <template #default="scope">
                    ¥{{ Number(scope.row.unit_price || 0).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="113">
                  <template #default="scope">
                    <el-button
                      type="primary"
                      size="small"
                      @click="addToSelected(scope.row)"
                    >
                      添加
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="panel-footer">
                <span>共 {{ filteredAvailableConsumables.length }} 项</span>
              </div>
            </div>
          </div>

          <!-- 已选耗材 -->
          <div class="panel bottom-panel">
            <div class="panel-header">
              <span>已选耗材 ({{ selectedItems.length }})</span>
            </div>
            <div class="panel-body">
              <el-table
                :data="selectedItems"
                height="250"
                border
              >
                <el-table-column prop="product_code" label="产品编号" min-width="108" />
                <el-table-column prop="name" label="耗材名称" min-width="108" show-overflow-tooltip />
                <el-table-column prop="spec_model" label="规格型号" min-width="108" show-overflow-tooltip />
                <el-table-column label="出库数量" min-width="128">
                  <template #default="scope">
                    <el-input-number
                      v-model="scope.row.out_quantity"
                      :min="1"
                      :max="scope.row.quantity"
                      size="small"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="单价" min-width="108">
                  <template #default="scope">
                    <el-input-number
                      v-model="scope.row.unit_price"
                      :min="0"
                      :precision="2"
                      size="small"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="小计" min-width="98">
                  <template #default="scope">
                    ¥{{ (scope.row.out_quantity * scope.row.unit_price).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="88">
                  <template #default="scope">
                    <el-button
                      type="danger"
                      size="small"
                      @click="removeFromSelected(scope.row.id)"
                    >
                      移除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="panel-footer" v-if="selectedItems.length > 0">
                <el-button
                  type="danger"
                  size="small"
                  @click="clearAllSelected"
                >
                  清空全部
                </el-button>
              </div>
              <div class="panel-footer empty-footer" v-else>
                <span>暂无已选耗材</span>
              </div>
            </div>
          </div>
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

    <!-- 出库单详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="出库单详情"
      width="900px"
    >
      <div v-if="detailData" class="detail-content">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="出库单号">{{ detailData.record_code }}</el-descriptions-item>
          <el-descriptions-item label="出库日期">{{ formatDate(detailData.stock_out_date) }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ parseFloat(detailData.total_amount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="领用人">{{ detailData.recipient }}</el-descriptions-item>
          <el-descriptions-item label="用途说明" :span="2">{{ detailData.purpose }}</el-descriptions-item>
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
        <el-button type="primary" @click="downloadPDF(detailData)">打印出库单</el-button>
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

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}条出库单吗？删除后耗材库存将恢复。`, '提示', {
      type: 'warning'
    })

    const ids = selectedRows.value.map(row => row.id)
    await request.post('/stock-out/batch-delete', { ids })
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadStockOutRecords()
    loadConsumables()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const formData = reactive({
  recipient: '',
  purpose: '',
  stock_out_date: new Date()
})

const selectedItems = ref([])
const availableConsumables = ref([])
const availableSearch = ref('')

const filteredAvailableConsumables = computed(() => {
  let items = availableConsumables.value
  if (availableSearch.value) {
    const keyword = availableSearch.value.toLowerCase()
    items = items.filter(item =>
      item.name.toLowerCase().includes(keyword) ||
      item.product_code.toLowerCase().includes(keyword) ||
      item.spec_model.toLowerCase().includes(keyword)
    )
  }
  return items.filter(item => !selectedItems.value.find(i => i.id === item.id))
})

const addToSelected = (row) => {
  if (!selectedItems.value.find(item => item.id === row.id)) {
    selectedItems.value.push({ ...row, out_quantity: row.quantity || 1, unit_price: row.unit_price })
  }
}

const removeFromSelected = (id) => {
  selectedItems.value = selectedItems.value.filter(item => item.id !== id)
}

const clearAllSelected = () => {
  selectedItems.value = []
}

const rules = {
  recipient: [{ required: true, message: '请输入领用人', trigger: 'blur' }]
}

const totalAmount = computed(() => {
  return selectedItems.value.reduce((sum, item) => {
    return sum + (item.out_quantity * item.unit_price)
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

const loadStockOutRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    
    const response = await request.get('/stock-out', { params })
    tableData.value = response.data
    total.value = response.total
  } catch (error) {
    ElMessage.error('加载出库单列表失败')
  } finally {
    loading.value = false
  }
}

const loadConsumables = async () => {
  try {
    const response = await request.get('/consumables', {
      params: { page: 1, limit: 1000 }
    })
    availableConsumables.value = response.data
  } catch (error) {
    ElMessage.error('加载耗材列表失败')
  }
}

const showCreateDialog = () => {
  Object.assign(formData, {
    recipient: '',
    purpose: '',
    stock_out_date: new Date()
  })
  selectedItems.value = []
  dialogVisible.value = true
}

const calculateTotal = () => {
  // 计算总金额
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请选择耗材')
      return
    }

    submitLoading.value = true
    try {
      const items = selectedItems.value.map(item => ({
        consumable_id: item.id,
        quantity: item.out_quantity,
        unit_price: item.unit_price
      }))

      await request.post('/stock-out', {
        recipient: formData.recipient,
        purpose: formData.purpose,
        stock_out_date: formData.stock_out_date.toISOString().split('T')[0],
        items
      })

      ElMessage.success('创建出库单成功')
      dialogVisible.value = false
      loadStockOutRecords()
      loadConsumables()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const showDetailDialog = async (row) => {
  try {
    const response = await request.get(`/stock-out/${row.id}`)
    detailData.value = response.data
    detailVisible.value = true
  } catch (error) {
    ElMessage.error('加载详情失败')
  }
}

const downloadPDF = async (row) => {
  try {
    const response = await request.get(`/files/stock-out/${row.id}/data`)
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
  <title>出库单_${esc(record.record_code)}</title>
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
      font-size: 13px;
      color: #666;
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
      <h1>出库单</h1>
      <div class="sub-title">人工智能学院实习实训教研室</div>
    </div>

    <div class="record-meta">
      <div>单号: <span>${esc(record.record_code)}</span></div>
      <div>日期: <span>${formatDate(record.stock_out_date)}</span></div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <span class="label">领用人:</span>
        <span class="value">${esc(record.recipient)}</span>
      </div>
      <div class="info-item">
        <span class="label">创建人:</span>
        <span class="value">${esc(record.created_by_name)}</span>
      </div>
      <div class="info-item full">
        <span class="label">用途说明:</span>
        <span class="value">${esc(record.purpose)}</span>
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
        <p>领用人签字</p>
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

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该出库单吗？删除后耗材库存将恢复。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request.delete(`/stock-out/${row.id}`)
    ElMessage.success('删除成功')
    loadStockOutRecords()
    loadConsumables()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadStockOutRecords()
  loadConsumables()
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

:deep(.el-transfer) {
  --el-transfer-panel-width: 200px;
}

/* 耗材选择容器 */
.consumable-select-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 16px 0;
}

.panel {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.panel-header .el-input {
  width: 180px;
}

.panel-body {
  padding: 0;
}

.panel-footer {
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
}

.panel-footer.empty-footer {
  justify-content: center;
  color: var(--color-text-muted);
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

@media (max-width: 1400px) {
  .consumable-select-container {
    flex-direction: column;
  }
}
</style>
