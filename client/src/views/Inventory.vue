<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <h3>库存看板</h3>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                <el-icon><Goods /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalTypes }}</div>
                <div class="stat-label">耗材种类</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalQuantity }}</div>
                <div class="stat-label">总库存数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                <el-icon><Upload /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalStockIn }}</div>
                <div class="stat-label">累计入库</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
                <el-icon><Download /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalStockOut }}</div>
                <div class="stat-label">累计出库</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 库存列表 -->
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索耗材名称或产品编号"
          prefix-icon="Search"
          clearable
          @clear="loadInventory"
          @keyup.enter="loadInventory"
          style="width: 300px"
        >
          <template #append>
            <el-button @click="loadInventory">搜索</el-button>
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
        <el-table-column prop="unit" label="单位" width="80" sortable />
        <el-table-column prop="current_stock" label="当前库存" width="100" sortable>
          <template #default="scope">
            <el-tag :type="getStockType(scope.row.current_stock)">
              {{ scope.row.current_stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total_stock_in" label="累计入库" width="100" sortable />
        <el-table-column prop="total_stock_out" label="累计出库" width="100" sortable />
        <el-table-column prop="unit_price" label="单价" width="100" sortable>
          <template #default="scope">
            ¥{{ parseFloat(scope.row.unit_price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="库存金额" width="120" sortable>
          <template #default="scope">
            ¥{{ (scope.row.current_stock * parseFloat(scope.row.unit_price || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="reporter" label="提报人" width="120" sortable />
        <el-table-column prop="created_at" label="首次入库时间" width="180" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
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
          @size-change="loadInventory"
          @current-change="loadInventory"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../utils/api'

const loading = ref(false)
const searchKeyword = ref('')
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const stats = ref({
  totalTypes: 0,
  totalQuantity: 0,
  totalStockIn: 0,
  totalStockOut: 0
})

const loadInventory = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    
    const response = await request.get('/consumables/stock/inventory', { params })
    tableData.value = response.data
    total.value = response.total
    
    // 加载统计数据
    const statsResponse = await request.get('/consumables/stock/stats')
    stats.value = statsResponse
  } catch (error) {
    console.error('加载库存数据失败:', error)
    ElMessage.error('加载库存数据失败')
  } finally {
    loading.value = false
  }
}

const getStockType = (stock) => {
  if (stock === 0) return 'danger'
  if (stock < 10) return 'warning'
  return 'success'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadInventory()
})
</script>

<style scoped>
.page-container {
  width: 100%;
}

.page-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
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
