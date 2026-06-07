<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">操作日志</h2>
      <div>
        <el-input v-model="filter.action" placeholder="搜索操作类型" style="width: 200px; margin-right: 10px;" clearable />
        <el-input v-model="filter.operator" placeholder="搜索操作人" style="width: 200px; margin-right: 10px;" clearable />
        <el-button type="primary" @click="loadLogs">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="card">
      <el-table :data="logs" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="action" label="操作类型" width="150">
          <template #default="{ row }">
            <el-tag size="small" :type="actionTypeMap[row.action] || 'info'">
              {{ actionMap[row.action] || row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_type" label="目标类型" width="100">
          <template #default="{ row }">
            {{ targetTypeMap[row.target_type] || row.target_type }}
          </template>
        </el-table-column>
        <el-table-column prop="target_id" label="目标ID" width="140" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.detail" class="detail-text" @click="showDetail(row)">
              {{ formatDetail(row.detail) }}
              <el-button size="small" text type="primary">查看</el-button>
            </span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="180" />
      </el-table>

      <el-pagination
        style="margin-top: 20px; justify-content: flex-end; display: flex;"
        background
        layout="prev, pager, next, total"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="handlePageChange"
      />
    </div>

    <el-dialog v-model="detailDialogVisible" title="操作详情" width="600px">
      <div class="detail-content">
        <pre>{{ formattedDetail }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import request from '../utils/request'

const logs = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filter = reactive({
  action: '',
  operator: ''
})

const detailDialogVisible = ref(false)
const currentDetail = ref('')

const actionMap = {
  create_item: '新增道具',
  update_item: '更新道具',
  delete_item: '删除道具',
  create_recipe: '新增配方',
  update_recipe: '更新配方',
  delete_recipe: '删除配方',
  save_level: '保存关卡',
  delete_level: '删除关卡',
  save_checkin: '保存签到',
  delete_checkin: '删除签到',
  rollback_config: '回滚配置',
  send_gift: '发送礼包',
  create_activity: '创建活动',
  update_activity: '更新活动'
}

const actionTypeMap = {
  create_item: 'success',
  update_item: 'primary',
  delete_item: 'danger',
  create_recipe: 'success',
  update_recipe: 'primary',
  delete_recipe: 'danger',
  rollback_config: 'warning',
  send_gift: 'success'
}

const targetTypeMap = {
  item: '道具',
  recipe: '配方',
  level: '关卡',
  checkin: '签到',
  player: '玩家',
  activity: '活动',
  config_version: '配置版本'
}

const formattedDetail = computed(() => {
  try {
    const obj = JSON.parse(currentDetail.value)
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return currentDetail.value
  }
})

const formatDetail = (detail) => {
  if (!detail) return ''
  try {
    const obj = JSON.parse(detail)
    return `包含 ${Object.keys(obj).length} 个字段`
  } catch (e) {
    return detail.substring(0, 30) + (detail.length > 30 ? '...' : '')
  }
}

const showDetail = (row) => {
  currentDetail.value = row.detail || ''
  detailDialogVisible.value = true
}

const loadLogs = async () => {
  const params = new URLSearchParams({
    page: page.value,
    pageSize: pageSize.value,
    ...filter
  })
  const res = await request.get(`/config/logs?${params.toString()}`)
  logs.value = res.data.list
  total.value = res.data.total
}

const resetFilter = () => {
  filter.action = ''
  filter.operator = ''
  page.value = 1
  loadLogs()
}

const handlePageChange = (p) => {
  page.value = p
  loadLogs()
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.detail-text {
  cursor: pointer;
  color: #606266;
}

.text-gray {
  color: #909399;
}

.detail-content {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  max-height: 400px;
  overflow: auto;
}

.detail-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  line-height: 1.6;
  font-family: monospace;
}
</style>
