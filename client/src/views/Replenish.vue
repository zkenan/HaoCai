<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>补货建议</h3>
          <span class="subtitle">以下耗材当前库存低于安全库存，建议及时补货</span>
        </div>
        <div class="header-right">
          <el-button @click="loadReplenish">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <el-table :data="replenishData" v-loading="loading" style="width: 100%" stripe>
        <el-table-column prop="product_code" label="产品编号" width="150" />
        <el-table-column prop="name" label="耗材名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="spec_model" label="规格型号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="category_name" label="分类" width="110">
          <template #default="scope">
            {{ scope.row.category_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ownership_name" label="归属" width="100">
          <template #default="scope">
            <el-tag size="small">{{ scope.row.ownership_name || '部门公用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前库存" width="100">
          <template #default="scope">
            <el-tag type="danger">{{ scope.row.current_stock }} {{ scope.row.unit }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="safety_stock" label="安全库存" width="100" />
        <el-table-column label="建议补货量" width="120">
          <template #default="scope">
            <span class="need-quantity">{{ scope.row.need_quantity }} {{ scope.row.unit }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><SuccessFilled /></el-icon>
            <p>所有耗材库存充足，无需补货</p>
          </div>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, SuccessFilled } from '@element-plus/icons-vue'
import request from '../utils/api'

const loading = ref(false)
const replenishData = ref([])

const loadReplenish = async () => {
  loading.value = true
  try {
    const response = await request.get('/consumables/stock/replenish')
    replenishData.value = response.data || []
  } catch (error) {
    ElMessage.error('加载补货建议失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReplenish()
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

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: #94a3b8;
}

.header-right {
  display: flex;
  gap: 12px;
}

.need-quantity {
  color: #ef4444;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #94a3b8;
}

.empty-state p {
  margin: 12px 0;
  font-size: 14px;
}
</style>
