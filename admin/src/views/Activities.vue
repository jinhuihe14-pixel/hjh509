<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">活动管理</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增活动</el-button>
    </div>

    <div class="card">
      <el-table :data="activities" border stripe>
        <el-table-column prop="activity_id" label="活动ID" width="140" />
        <el-table-column prop="name" label="活动名称" width="160" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTagMap[row.type]">{{ typeMap[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="活动时间" width="280">
          <template #default="{ row }">
            <div v-if="row.start_time || row.end_time">
              <div>{{ row.start_time || '不限' }} ~ {{ row.end_time || '不限' }}</div>
            </div>
            <span v-else class="text-gray">永久有效</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="toggleActivity(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑活动' : '新增活动'" width="600px">
      <el-form :model="form" ref="formRef" label-width="100px">
        <el-form-item label="活动ID">
          <el-input v-model="form.activity_id" placeholder="activity_id" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="活动名称">
          <el-input v-model="form.name" placeholder="活动名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%;">
            <el-option label="限时活动" value="limited" />
            <el-option label="节日活动" value="festival" />
            <el-option label="日常活动" value="daily" />
            <el-option label="签到活动" value="checkin" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动时间">
          <el-date-picker
            v-model="form.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%;"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          <span style="margin-left: 8px;">{{ form.status ? '开启' : '关闭' }}</span>
        </el-form-item>
        <el-form-item label="活动配置">
          <el-input v-model="formConfigText" type="textarea" :rows="8" placeholder="JSON格式的活动配置" />
          <div class="form-tip">请输入JSON格式的配置，如 {"rate_multiplier": 2, "bonus_items": [...]} </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '../utils/request'

const activities = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const formConfigText = ref('')

const form = reactive({
  activity_id: '',
  name: '',
  type: 'limited',
  start_time: '',
  end_time: '',
  dateRange: [],
  config: {},
  status: 0
})

const typeMap = {
  limited: '限时活动',
  festival: '节日活动',
  daily: '日常活动',
  checkin: '签到活动'
}

const typeTagMap = {
  limited: 'warning',
  festival: 'danger',
  daily: 'success',
  checkin: 'primary'
}

const loadActivities = async () => {
  const res = await request.get(`/activity?page=${page.value}&pageSize=${pageSize.value}`)
  activities.value = res.data.list
  total.value = res.data.total
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, {
      activity_id: row.activity_id,
      name: row.name,
      type: row.type,
      start_time: row.start_time,
      end_time: row.end_time,
      dateRange: row.start_time && row.end_time ? [row.start_time, row.end_time] : [],
      config: row.config || {},
      status: row.status
    })
    formConfigText.value = JSON.stringify(row.config || {}, null, 2)
  } else {
    Object.assign(form, {
      activity_id: '',
      name: '',
      type: 'limited',
      start_time: '',
      end_time: '',
      dateRange: [],
      config: {},
      status: 0
    })
    formConfigText.value = '{\n  \n}'
  }
  dialogVisible.value = true
}

const toggleActivity = async (row) => {
  try {
    await request.post(`/activity/${row.activity_id}/toggle`, { status: row.status })
    ElMessage.success(row.status ? '活动已开启' : '活动已关闭')
  } catch (e) {
    row.status = row.status ? 0 : 1
  }
}

const handleSave = async () => {
  if (!form.activity_id || !form.name) {
    ElMessage.warning('请填写活动ID和名称')
    return
  }

  let config = {}
  try {
    if (formConfigText.value.trim()) {
      config = JSON.parse(formConfigText.value)
    }
  } catch (e) {
    ElMessage.error('活动配置JSON格式错误')
    return
  }

  const data = {
    activity_id: form.activity_id,
    name: form.name,
    type: form.type,
    config,
    status: form.status
  }

  if (form.dateRange && form.dateRange.length === 2) {
    data.start_time = form.dateRange[0]
    data.end_time = form.dateRange[1]
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await request.put(`/activity/${form.activity_id}`, data)
      ElMessage.success('更新成功')
    } else {
      await request.post('/activity', data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadActivities()
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除活动【${row.name}】吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await request.delete(`/activity/${row.activity_id}`)
    ElMessage.success('删除成功')
    loadActivities()
  }).catch(() => {})
}

const handlePageChange = (p) => {
  page.value = p
  loadActivities()
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.text-gray {
  color: #909399;
}
</style>
