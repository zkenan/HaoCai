<template>
  <div class="inventory-page">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon blue">
            <el-icon><Box /></el-icon>
          </div>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalTypes }}</div>
          <div class="stat-label">库存总量</div>
          <div class="stat-trend success">
            <el-icon><Top /></el-icon>
            <span>较上周增长 12%</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon green">
            <el-icon><Upload /></el-icon>
          </div>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalStockIn }}</div>
          <div class="stat-label">本月入库</div>
          <div class="stat-trend success">
            <el-icon><Top /></el-icon>
            <span>较上月增长 8%</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon orange">
            <el-icon><Download /></el-icon>
          </div>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalStockOut }}</div>
          <div class="stat-label">本月出库</div>
          <div class="stat-trend danger">
            <el-icon><Bottom /></el-icon>
            <span>较上月减少 3%</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon red">
            <el-icon><Warning /></el-icon>
          </div>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.lowStockCount }}</div>
          <div class="stat-label">库存预警</div>
          <div class="stat-trend warning">
            <el-icon><Warning /></el-icon>
            <span>低于安全库存</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="action-grid">
      <div class="action-card" @click="$router.push('/stock-in')">
        <div class="action-icon blue">
          <el-icon><Upload /></el-icon>
        </div>
        <div class="action-content">
          <div class="action-title">耗材入库</div>
          <div class="action-desc">登记新入库耗材信息</div>
        </div>
      </div>
      
      <div class="action-card" @click="$router.push('/stock-out')">
        <div class="action-icon orange">
          <el-icon><Download /></el-icon>
        </div>
        <div class="action-content">
          <div class="action-title">耗材出库</div>
          <div class="action-desc">登记耗材领用出库</div>
        </div>
      </div>
      
      <div class="action-card" @click="$router.push('/consumables')">
        <div class="action-icon green">
          <el-icon><DataAnalysis /></el-icon>
        </div>
        <div class="action-content">
          <div class="action-title">库存盘点</div>
          <div class="action-desc">查看当前库存详情</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <el-icon class="icon-info"><DataLine /></el-icon>
            <span>库存分布</span>
          </div>
        </div>
        <div class="chart-container">
          <v-chart :option="pieChartOption" autoresize style="height: 300px" />
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <el-icon class="icon-info"><DataAnalysis /></el-icon>
            <span>入出库趋势</span>
          </div>
          <el-radio-group v-model="trendPeriod" size="small" @change="loadTrendData">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="week">周</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
          </el-radio-group>
        </div>
        <div class="chart-container">
          <v-chart :option="barChartOption" autoresize style="height: 300px" />
        </div>
      </div>
    </div>

    <!-- 库存预警列表 -->
    <div class="content-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <el-icon class="icon-warning"><Warning /></el-icon>
            <span>库存预警</span>
          </div>
          <el-button text size="small">查看全部</el-button>
        </div>
        <el-table 
          :data="lowStockData" 
          v-loading="loading"
          style="width: 100%"
          :show-header="true"
        >
          <el-table-column prop="name" label="耗材名称" />
          <el-table-column prop="current_stock" label="当前库存">
            <template #default="scope">
              {{ scope.row.current_stock }} {{ scope.row.unit }}
            </template>
          </el-table-column>
          <el-table-column label="安全库存">
            <template #default="scope">
              {{ scope.row.safety_stock || 10 }} {{ scope.row.unit }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStockStatusType(scope.row)">{{ getStockStatusText(scope.row) }}</el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <div class="empty-state">
              <el-icon :size="48" color="#cbd5e1"><Warning /></el-icon>
              <p>暂无库存预警</p>
            </div>
          </template>
        </el-table>
      </div>

      <!-- 最近动态 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <el-icon class="icon-info"><DataLine /></el-icon>
            <span>最近动态</span>
          </div>
          <el-button text size="small">全部记录</el-button>
        </div>
        <div class="activity-list" v-loading="loading">
          <template v-if="recentActivities.length > 0">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon" :class="activity.type">
                <el-icon>
                  <Upload v-if="activity.type === 'in'" />
                  <Download v-else />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-meta">
                  <span>{{ activity.user }}</span>
                  <span class="dot">·</span>
                  <span>{{ activity.department }}</span>
                  <span class="dot">·</span>
                  <span>{{ activity.time }}</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><DataLine /></el-icon>
            <p>暂无出入库动态</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 完整库存列表 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <el-icon><Goods /></el-icon>
          <span>完整库存列表</span>
        </div>
        <div class="card-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索耗材名称或产品编号"
            :prefix-icon="Search"
            clearable
            @clear="loadInventory"
            @keyup.enter="loadInventory"
            style="width: 240px"
          />
          <el-button type="primary" @click="loadInventory">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>
      </div>

      <el-table 
        :data="tableData" 
        v-loading="loading"
        style="width: 100%"
        stripe
      >
        <el-table-column prop="product_code" label="产品编号" width="140" sortable />
        <el-table-column prop="name" label="耗材名称" width="160" sortable />
        <el-table-column prop="spec_model" label="规格型号" width="200" sortable />
        <el-table-column prop="unit" label="单位" width="100" sortable />
        <el-table-column prop="current_stock" label="当前库存" width="140" sortable>
          <template #default="scope">
            <el-tag :type="getStockType(scope.row.current_stock)">
              {{ scope.row.current_stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total_stock_in" label="累计入库" width="140" sortable />
        <el-table-column prop="total_stock_out" label="累计出库" width="140" sortable />
        <el-table-column prop="unit_price" label="单价" width="160" sortable>
          <template #default="scope">
            ¥{{ parseFloat(scope.row.unit_price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="库存金额" width="160" sortable>
          <template #default="scope">
            ¥{{ (scope.row.current_stock * parseFloat(scope.row.unit_price || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="reporter" label="提报人" width="140" sortable />
        <el-table-column prop="created_at" label="首次入库时间" width="200" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><Goods /></el-icon>
            <p>暂无库存数据</p>
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
          @size-change="loadInventory"
          @current-change="loadInventory"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Box, Upload, Download, Warning, Top, Bottom, DataAnalysis, Search, Goods, DataLine } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import request from '../utils/api'

use([CanvasRenderer, PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

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
  totalStockOut: 0,
  lowStockCount: 0
})

const lowStockData = ref([])
const recentActivities = ref([])
const trendData = ref({ stockIn: [], stockOut: [] })
const trendPeriod = ref('day')

const pieChartOption = computed(() => {
  const data = tableData.value.map(item => ({
    name: item.name,
    value: item.current_stock
  }))
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }]
    }],
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  }
})

const barChartOption = computed(() => {
  const dates = [...new Set([...trendData.value.stockIn.map(i => i.date), ...trendData.value.stockOut.map(i => i.date)])].sort()
  const inMap = Object.fromEntries(trendData.value.stockIn.map(i => [i.date, i.quantity || 0]))
  const outMap = Object.fromEntries(trendData.value.stockOut.map(i => [i.date, i.quantity || 0]))

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['入库', '出库'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '入库', type: 'line', data: dates.map(d => inMap[d] || 0), smooth: true, itemStyle: { color: '#10b981' } },
      { name: '出库', type: 'line', data: dates.map(d => outMap[d] || 0), smooth: true, itemStyle: { color: '#ef4444' } }
    ]
  }
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
    const sd = statsResponse.data || statsResponse
    stats.value = {
      ...sd,
      totalTypes: response.total,
      lowStockCount: response.data.filter(item => item.current_stock < 10).length
    }
    
    // 加载低库存数据
    lowStockData.value = response.data
      .filter(item => item.current_stock < (item.safety_stock || 10))
      .slice(0, 5)
    
    // 加载最近动态
    const activitiesResponse = await request.get('/consumables/stock/activities', { 
      params: { limit: 10 } 
    })
    recentActivities.value = activitiesResponse.data
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

const getStockStatusType = (row) => {
  if (row.current_stock === 0) return 'danger'
  if (row.current_stock < (row.safety_stock || 10)) return 'warning'
  return 'success'
}

const getStockStatusText = (row) => {
  if (row.current_stock === 0) return '缺货'
  if (row.current_stock < (row.safety_stock || 10)) return '预警'
  return '充足'
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

const loadTrendData = async () => {
  try {
    const response = await request.get('/consumables/stock/trends', {
      params: { period: trendPeriod.value, days: 30 }
    })
    trendData.value = response.data
  } catch (error) {
    console.error('加载趋势数据失败:', error)
  }
}

onMounted(() => {
  loadInventory()
  loadTrendData()
})
</script>

<style scoped>
.inventory-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stat-header {
  margin-bottom: 16px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-icon.blue {
  background: #3b82f6;
}

.stat-icon.green {
  background: #10b981;
}

.stat-icon.orange {
  background: #f59e0b;
}

.stat-icon.red {
  background: #ef4444;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.stat-trend.success {
  color: #10b981;
}

.stat-trend.danger {
  color: #ef4444;
}

.stat-trend.warning {
  color: #f59e0b;
}

.stat-trend .el-icon {
  font-size: 14px;
}

/* 快捷操作网格 */
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.action-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.action-icon.blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.action-icon.orange {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.action-icon.green {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 14px;
  color: #64748b;
}

/* 内容网格 */
.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.chart-container {
  padding: 16px;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.card-title .el-icon {
  font-size: 16px;
}

.card-title .icon-warning {
  color: #f59e0b;
}

.card-title .icon-info {
  color: #3b82f6;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 活动列表 */
.activity-list {
  padding: 16px 24px;
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.activity-icon.in {
  background: #dbeafe;
  color: #3b82f6;
}

.activity-icon.out {
  background: #fee2e2;
  color: #ef4444;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.activity-meta .dot {
  color: #cbd5e1;
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 0;
}

:deep(.el-table th) {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  font-size: 13px;
  padding: 12px 16px;
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
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .stat-card {
    padding: 12px;
  }
  .stat-value {
    font-size: 20px;
  }
  .action-grid {
    grid-template-columns: 1fr;
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
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
