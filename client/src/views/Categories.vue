<template>
  <div class="page-container">
    <el-card class="page-card">
      <div class="page-header">
        <div class="header-left">
          <h3>耗材分类与归属管理</h3>
        </div>
        <div class="header-right">
          <el-radio-group v-model="activeTab" size="default">
            <el-radio-button label="category">分类管理</el-radio-button>
            <el-radio-button label="ownership">归属管理</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- ==================== 分类管理 ==================== -->
      <div v-if="activeTab === 'category'">
        <div class="toolbar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索大类或小类名称"
            prefix-icon="Search"
            clearable
            style="width: 260px"
          />
          <span class="sort-btn" @click="cycleBigSort">
            <el-icon :class="{ active: bigSortOrder !== 'default' }">
              <CaretTop v-if="bigSortOrder === 'asc'" />
              <CaretBottom v-else-if="bigSortOrder === 'desc'" />
              <Sort v-else />
            </el-icon>
            <span>大类排序</span>
          </span>
          <el-button @click="expandAll">展开全部</el-button>
          <el-button @click="collapseAll">折叠全部</el-button>
          <div class="toolbar-spacer"></div>
          <el-button type="primary" @click="showAddBig">
            <el-icon><Plus /></el-icon>
            新增大类
          </el-button>
        </div>

        <div v-loading="loading">
          <div v-if="displayTree.length === 0" class="empty-state">
            <el-icon :size="48" color="#cbd5e1"><Folder /></el-icon>
            <p>{{ searchKeyword ? '未找到匹配的分类' : '暂无分类，请先添加一个大类' }}</p>
          </div>

          <div v-for="big in displayTree" :key="big.id" class="category-group">
            <div class="big-category">
              <div class="big-category-name">
                <el-icon
                  class="collapse-icon"
                  :class="{ rotated: !isExpanded(big.id) }"
                  @click="toggleExpand(big.id)"
                >
                  <ArrowDown />
                </el-icon>
                <el-icon><FolderOpened /></el-icon>
                <span>{{ big.name }}</span>
                <el-tag size="small" type="info">{{ big.children.length }} 个小类</el-tag>
              </div>
              <div class="big-category-actions">
                <el-button size="small" @click="showAddChild(big)">添加小类</el-button>
                <el-button size="small" @click="showEdit(big)">重命名</el-button>
                <el-button size="small" type="danger" @click="handleDelete(big)">删除</el-button>
              </div>
            </div>
            <div v-show="isExpanded(big.id)" class="child-categories">
              <div class="child-header">
                <span class="child-count">共 {{ big.children.length }} 个小类</span>
                <span class="sort-btn small" @click="cycleChildSort(big.id)">
                  <el-icon :class="{ active: childSortOrder(big.id) !== 'default' }">
                    <CaretTop v-if="childSortOrder(big.id) === 'asc'" />
                    <CaretBottom v-else-if="childSortOrder(big.id) === 'desc'" />
                    <Sort v-else />
                  </el-icon>
                  <span>小类排序</span>
                </span>
              </div>
              <div v-for="child in big.children" :key="child.id" class="child-category">
                <span class="child-name">{{ child.name }}</span>
                <div class="child-actions">
                  <el-button size="small" @click="showEdit(child)">重命名</el-button>
                  <el-button size="small" type="danger" @click="handleDelete(child)">删除</el-button>
                </div>
              </div>
              <div v-if="big.children.length === 0" class="child-empty">暂无小类</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 归属管理 ==================== -->
      <div v-else>
        <div class="toolbar">
          <div class="toolbar-spacer"></div>
          <el-button type="primary" @click="showAddOwnership">
            <el-icon><Plus /></el-icon>
            新增归属
          </el-button>
        </div>

        <el-table v-loading="ownershipLoading" :data="ownershipList" style="width: 100%">
          <el-table-column prop="name" label="归属名称" min-width="200" />
          <el-table-column prop="sort" label="排序" width="100" />
          <el-table-column label="参与补货建议" width="160">
            <template #default="scope">
              <el-switch
                v-model="scope.row.need_replenish"
                :active-value="1"
                :inactive-value="0"
                @change="toggleReplenish(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button size="small" @click="showEditOwnership(scope.row)">重命名</el-button>
              <el-button size="small" type="danger" @click="handleDeleteOwnership(scope.row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="empty-state">
              <p>暂无归属，请先添加</p>
            </div>
          </template>
        </el-table>
      </div>
    </el-card>

    <!-- 新增/编辑分类对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="420px"
    >
      <el-form :model="formData" ref="formRef" label-position="top">
        <el-form-item label="分类名称" required>
          <el-input v-model="formData.name" placeholder="请输入分类名称" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑归属对话框 -->
    <el-dialog
      v-model="ownershipDialogVisible"
      :title="ownershipDialogTitle"
      width="420px"
    >
      <el-form :model="ownershipForm" ref="ownershipFormRef" label-position="top">
        <el-form-item label="归属名称" required>
          <el-input v-model="ownershipForm.name" placeholder="请输入归属名称（如：办公室、实验室）" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ownershipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitOwnership" :loading="ownershipSubmitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Folder, FolderOpened, ArrowDown, Sort, CaretTop, CaretBottom } from '@element-plus/icons-vue'
import request from '../utils/api'

const activeTab = ref('category')

// ============ 分类相关 ============
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const categoryTree = ref([])
const formRef = ref(null)
const searchKeyword = ref('')
// 大类排序（三态：default/asc/desc）
const bigSortOrder = ref('default')
// 每个大类的小类排序（三态），key 为大类 id
const childSortMap = ref({})
const expandedIds = ref(new Set())

const formData = reactive({
  id: null,
  name: '',
  parent_id: 0
})

const loadCategories = async () => {
  loading.value = true
  try {
    const response = await request.get('/categories')
    categoryTree.value = response.data || []
    // 默认展开所有大类
    expandedIds.value = new Set(categoryTree.value.map(b => b.id))
  } catch (error) {
    ElMessage.error('加载分类失败')
  } finally {
    loading.value = false
  }
}

// 三态循环：default -> asc -> desc -> default
const cycleBigSort = () => {
  const order = ['default', 'asc', 'desc']
  const i = order.indexOf(bigSortOrder.value)
  bigSortOrder.value = order[(i + 1) % order.length]
}

const cycleChildSort = (bigId) => {
  const order = ['default', 'asc', 'desc']
  const cur = childSortMap.value[bigId] || 'default'
  const i = order.indexOf(cur)
  childSortMap.value = { ...childSortMap.value, [bigId]: order[(i + 1) % order.length] }
}

const childSortOrder = (bigId) => childSortMap.value[bigId] || 'default'

// 搜索过滤 + 独立排序后的树
const displayTree = computed(() => {
  let tree = categoryTree.value.map(big => ({
    ...big,
    children: big.children || []
  }))

  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    tree = tree
      .map(big => {
        const bigMatch = big.name.toLowerCase().includes(kw)
        if (bigMatch) return big
        const children = big.children.filter(c => c.name.toLowerCase().includes(kw))
        return children.length > 0 ? { ...big, children } : null
      })
      .filter(Boolean)
  }

  // 大类排序（独立）
  if (bigSortOrder.value !== 'default') {
    const dir = bigSortOrder.value === 'asc' ? 1 : -1
    tree = [...tree].sort((a, b) => dir * a.name.localeCompare(b.name, 'zh'))
  }

  // 小类排序（每个大类独立，互不影响）
  tree = tree.map(big => {
    const childOrder = childSortMap.value[big.id] || 'default'
    if (childOrder !== 'default') {
      const dir = childOrder === 'asc' ? 1 : -1
      return {
        ...big,
        children: [...big.children].sort((a, b) => dir * a.name.localeCompare(b.name, 'zh'))
      }
    }
    return big
  })

  return tree
})

const isExpanded = (id) => {
  // 搜索时强制展开所有匹配的大类
  if (searchKeyword.value.trim()) return true
  return expandedIds.value.has(id)
}

const toggleExpand = (id) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedIds.value = next
}

const expandAll = () => {
  expandedIds.value = new Set(categoryTree.value.map(b => b.id))
}

const collapseAll = () => {
  expandedIds.value = new Set()
}

const showAddBig = () => {
  formData.id = null
  formData.name = ''
  formData.parent_id = 0
  dialogTitle.value = '新增大类'
  dialogVisible.value = true
}

const showAddChild = (big) => {
  formData.id = null
  formData.name = ''
  formData.parent_id = big.id
  dialogTitle.value = `在「${big.name}」下添加小类`
  dialogVisible.value = true
}

const showEdit = (row) => {
  formData.id = row.id
  formData.name = row.name
  formData.parent_id = row.parent_id || 0
  dialogTitle.value = '重命名分类'
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formData.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  submitLoading.value = true
  try {
    if (formData.id) {
      await request.put(`/categories/${formData.id}`, { name: formData.name })
      ElMessage.success('更新成功')
    } else {
      await request.post('/categories', { name: formData.name, parent_id: formData.parent_id })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadCategories()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除分类「${row.name}」吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/categories/${row.id}`)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// ============ 归属相关 ============
const ownershipLoading = ref(false)
const ownershipSubmitLoading = ref(false)
const ownershipDialogVisible = ref(false)
const ownershipDialogTitle = ref('')
const ownershipList = ref([])
const ownershipFormRef = ref(null)
const ownershipForm = reactive({
  id: null,
  name: ''
})

const loadOwnerships = async () => {
  ownershipLoading.value = true
  try {
    const response = await request.get('/ownerships')
    ownershipList.value = response.data || []
  } catch (error) {
    ElMessage.error('加载归属失败')
  } finally {
    ownershipLoading.value = false
  }
}

const showAddOwnership = () => {
  ownershipForm.id = null
  ownershipForm.name = ''
  ownershipDialogTitle.value = '新增归属'
  ownershipDialogVisible.value = true
}

const showEditOwnership = (row) => {
  ownershipForm.id = row.id
  ownershipForm.name = row.name
  ownershipDialogTitle.value = '重命名归属'
  ownershipDialogVisible.value = true
}

const handleSubmitOwnership = async () => {
  if (!ownershipForm.name.trim()) {
    ElMessage.warning('请输入归属名称')
    return
  }
  ownershipSubmitLoading.value = true
  try {
    if (ownershipForm.id) {
      await request.put(`/ownerships/${ownershipForm.id}`, { name: ownershipForm.name })
      ElMessage.success('更新成功')
    } else {
      await request.post('/ownerships', { name: ownershipForm.name })
      ElMessage.success('创建成功')
    }
    ownershipDialogVisible.value = false
    loadOwnerships()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    ownershipSubmitLoading.value = false
  }
}

// 切换补货开关（只更新 need_replenish，name 必传、sort 保留）
const toggleReplenish = async (row) => {
  try {
    await request.put(`/ownerships/${row.id}`, {
      name: row.name,
      need_replenish: row.need_replenish
    })
    ElMessage.success(row.need_replenish ? '已开启补货建议' : '已关闭补货建议')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '更新失败')
    loadOwnerships()
  }
}

const handleDeleteOwnership = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除归属「${row.name}」吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/ownerships/${row.id}`)
    ElMessage.success('删除成功')
    loadOwnerships()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

onMounted(() => {
  loadCategories()
  loadOwnerships()
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

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.toolbar-spacer {
  flex: 1;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #64748b;
  user-select: none;
  transition: color 0.2s;
}

.sort-btn:hover {
  color: #3b82f6;
}

.sort-btn .el-icon {
  color: #94a3b8;
  transition: color 0.2s;
}

.sort-btn .el-icon.active {
  color: #3b82f6;
}

.sort-btn.small {
  font-size: 12px;
}

.category-group {
  margin-bottom: 16px;
}

.big-category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.big-category-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.collapse-icon {
  cursor: pointer;
  transition: transform 0.2s ease;
  color: #64748b;
}

.collapse-icon.rotated {
  transform: rotate(-90deg);
}

.big-category-actions {
  display: flex;
  gap: 8px;
}

.child-categories {
  padding: 8px 0 8px 32px;
}

.child-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px 8px;
}

.child-count {
  font-size: 12px;
  color: #94a3b8;
}

.child-category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.child-name {
  font-size: 14px;
  color: #334155;
}

.child-actions {
  display: flex;
  gap: 8px;
}

.child-empty {
  padding: 12px 16px;
  color: #94a3b8;
  font-size: 13px;
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
