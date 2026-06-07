<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">配置版本</h2>
      <el-button type="primary" :icon="Refresh" @click="generateConfig">生成最新配置</el-button>
    </div>

    <div class="card">
      <el-table :data="versions" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="version" label="版本号" width="260" />
        <el-table-column prop="config_type" label="配置类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ typeMap[row.config_type] || row.config_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
            <el-button size="small" type="warning" @click="handleRollback(row)">回滚</el-button>
          </template>
        </el-table-column>
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

    <el-dialog v-model="detailDialogVisible" title="配置详情" width="800px">
      <div class="config-detail">
        <div class="detail-header">
          <div><strong>版本号：</strong>{{ currentVersion?.version }}</div>
          <div><strong>操作人：</strong>{{ currentVersion?.operator }}</div>
          <div><strong>创建时间：</strong>{{ currentVersion?.created_at }}</div>
        </div>
        <div class="json-viewer">
          <pre>{{ formattedConfig }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import request from '../utils/request'

const versions = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const detailDialogVisible = ref(false)
const currentVersion = ref(null)
const currentConfigData = ref(null)

const typeMap = {
  full: '完整配置',
  items: '道具配置',
  recipes: '配方配置',
  levels: '关卡配置',
  checkin: '签到配置',
  activity: '活动配置'
}

const formattedConfig = computed(() => {
  if (!currentConfigData.value) return ''
  try {
    return JSON.stringify(currentConfigData.value, null, 2)
  } catch (e) {
    return currentConfigData.value
  }
})

const loadVersions = async () => {
  const res = await request.get(`/config/versions?page=${page.value}&pageSize=${pageSize.value}`)
  versions.value = res.data.list
  total.value = res.data.total
}

const generateConfig = async () => {
  await ElMessageBox.confirm('确定要生成最新的配置文件吗？', '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })

  const res = await request.post('/config/generate')
  ElMessage.success(`配置生成成功，版本：${res.data.version}`)
  loadVersions()
}

const viewDetail = async (row) => {
  currentVersion.value = row
  try {
    const res = await request.get(`/config/versions?page=1&pageSize=100`)
    const version = res.data.list.find(v => v.id === row.id)
    if (version) {
      currentConfigData.value = version.config_data ? JSON.parse(version.config_data) : {}
    }
  } catch (e) {
    currentConfigData.value = {}
  }
  detailDialogVisible.value = true
}

const handleRollback = (row) => {
  ElMessageBox.confirm(
    `确定回滚到版本【${row.version}】吗？\n此操作将覆盖当前所有配置，且不可撤销！`,
    '版本回滚',
    {
      type: 'warning',
      confirmButtonText: '确认回滚',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    await request.post(`/config/rollback/${row.id}`)
    ElMessage.success('配置回滚成功')
    loadVersions()
  }).catch(() => {})
}

const handlePageChange = (p) => {
  page.value = p
  loadVersions()
}

onMounted(() => {
  loadVersions()
})
</script>

<style scoped>
.config-detail {
  max-height: 60vh;
  overflow: hidden;
}

.detail-header {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.json-viewer {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 6px;
  max-height: 400px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
}

.json-viewer pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
