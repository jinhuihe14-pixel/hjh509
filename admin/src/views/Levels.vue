<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">关卡奖励</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增关卡</el-button>
    </div>

    <div class="card">
      <el-table :data="levels" border stripe>
        <el-table-column prop="level" label="等级" width="100" align="center" />
        <el-table-column prop="name" label="名称" width="140" />
        <el-table-column prop="exp_required" label="所需经验" width="120" align="center" />
        <el-table-column label="通关奖励" min-width="300">
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑关卡' : '新增关卡'" width="550px">
      <el-form :model="form" ref="formRef" label-width="100px">
        <el-form-item label="等级" prop="level">
          <el-input-number v-model="form.level" :min="1" :max="999" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="关卡名称" />
        </el-form-item>
        <el-form-item label="所需经验">
          <el-input-number v-model="form.exp_required" :min="0" :max="999999" />
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

const levels = ref([])
const items = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const saving = ref(false)

const form = reactive({
  level: 1,
  name: '',
  exp_required: 0,
  rewards: [],
  status: 1
})

const getItemName = (itemId) => {
  const item = items.value.find(i => i.item_id === itemId)
  return item?.name || itemId
}

const loadData = async () => {
  const [levelRes, itemRes] = await Promise.all([
    request.get('/config/levels'),
    request.get('/config/items')
  ])
  levels.value = levelRes.data
  items.value = itemRes.data
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, {
      level: row.level,
      name: row.name,
      exp_required: row.exp_required,
      rewards: JSON.parse(JSON.stringify(row.rewards)),
      status: row.status
    })
  } else {
    Object.assign(form, {
      level: levels.value.length > 0 ? Math.max(...levels.value.map(l => l.level)) + 1 : 1,
      name: '',
      exp_required: 0,
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
  if (!form.level || form.level < 1) {
    ElMessage.warning('请填写等级')
    return
  }
  if (form.rewards.some(r => !r.item_id)) {
    ElMessage.warning('请填写完整的奖励列表')
    return
  }

  saving.value = true
  try {
    await request.post('/config/levels', form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除等级 ${row.level}【${row.name}】吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await request.delete(`/config/levels/${row.level}`)
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
  background: #ecf5ff;
  border-radius: 4px;
  margin-right: 4px;
  margin-bottom: 4px;
  font-size: 13px;
  color: #409EFF;
}

.rewards-list {
  width: 100%;
}

.reward-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
</style>
