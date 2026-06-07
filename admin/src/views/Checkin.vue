<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">签到礼包</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增签到奖励</el-button>
    </div>

    <div class="card">
      <el-table :data="checkins" border stripe>
        <el-table-column prop="day" label="第几天" width="100" align="center">
          <template #default="{ row }">
            <span :class="{ 'special-day': row.is_special }">第 {{ row.day }} 天</span>
          </template>
        </el-table-column>
        <el-table-column label="是否特殊" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_special" type="warning" size="small">特殊</el-tag>
            <span v-else class="text-gray">普通</span>
          </template>
        </el-table-column>
        <el-table-column label="签到奖励" min-width="300">
          <template #default="{ row }">
            <span v-for="reward in row.rewards" :key="reward.item_id" class="reward-item">
              {{ getItemName(reward.item_id) }} x{{ reward.count }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑签到奖励' : '新增签到奖励'" width="550px">
      <el-form :model="form" ref="formRef" label-width="100px">
        <el-form-item label="第几天" prop="day">
          <el-input-number v-model="form.day" :min="1" :max="30" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="特殊奖励">
          <el-switch v-model="form.is_special" />
          <span style="margin-left: 8px; font-size: 12px; color: #909399;">特殊奖励会有特殊标识展示</span>
        </el-form-item>
        <el-form-item label="奖励">
          <div class="rewards-list">
            <div v-for="(reward, idx) in form.rewards" :key="idx" class="reward-row">
              <el-select v-model="reward.item_id" placeholder="选择道具" style="width: 200px;">
                <el-option v-for="item in items" :key="item.item_id" :label="item.name" :value="item.item_id" />
              </el-select>
              <el-input-number v-model="reward.count" :min="1" :max="9999" style="width: 120px; margin-left: 10px;" />
              <el-button type="danger" :icon="Delete" circle size="small" style="margin-left: 10px;" @click="removeReward(idx)" />
            </div>
            <el-button type="primary" plain :icon="Plus" size="small" @click="addReward">添加奖励</el-button>
          </div>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import request from '../utils/request'

const checkins = ref([])
const items = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const saving = ref(false)

const form = reactive({
  day: 1,
  rewards: [],
  is_special: 0,
  status: 1
})

const getItemName = (itemId) => {
  const item = items.value.find(i => i.item_id === itemId)
  return item?.name || itemId
}

const loadData = async () => {
  const [checkinRes, itemRes] = await Promise.all([
    request.get('/config/checkin'),
    request.get('/config/items')
  ])
  checkins.value = checkinRes.data
  items.value = itemRes.data
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, {
      day: row.day,
      is_special: row.is_special,
      rewards: JSON.parse(JSON.stringify(row.rewards)),
      status: row.status
    })
  } else {
    Object.assign(form, {
      day: checkins.value.length > 0 ? Math.max(...checkins.value.map(c => c.day)) + 1 : 1,
      is_special: 0,
      rewards: [{ item_id: '', count: 1 }],
      status: 1
    })
  }
  dialogVisible.value = true
}

const addReward = () => {
  form.rewards.push({ item_id: '', count: 1 })
}

const removeReward = (idx) => {
  form.rewards.splice(idx, 1)
}

const handleSave = async () => {
  if (!form.day || form.day < 1) {
    ElMessage.warning('请填写天数')
    return
  }
  if (form.rewards.length === 0 || form.rewards.some(r => !r.item_id)) {
    ElMessage.warning('请填写完整的奖励列表')
    return
  }

  saving.value = true
  try {
    await request.post('/config/checkin', form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除第 ${row.day} 天的签到奖励吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await request.delete(`/config/checkin/${row.day}`)
    ElMessage.success('删除成功')
    loadData()
  }).catch(() => {})
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.reward-item {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f9eb;
  border-radius: 4px;
  margin-right: 4px;
  margin-bottom: 4px;
  font-size: 13px;
  color: #67C23A;
}

.rewards-list {
  width: 100%;
}

.reward-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.special-day {
  color: #E6A23C;
  font-weight: bold;
}

.text-gray {
  color: #909399;
  font-size: 13px;
}
</style>
