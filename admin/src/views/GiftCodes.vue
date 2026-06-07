<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">礼包码</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">生成礼包码</el-button>
    </div>

    <div class="card">
      <el-table :data="giftCodes" border stripe>
        <el-table-column prop="code" label="礼包码" width="180">
          <template #default="{ row }">
            <span class="gift-code">{{ row.code }}</span>
            <el-button size="small" text type="primary" @click="copyCode(row.code)">复制</el-button>
          </template>
        </el-table-column>
        <el-table-column label="奖励内容" min-width="250">
          <template #default="{ row }">
            <span v-for="reward in row.rewards" :key="reward.item_id" class="reward-item">
              {{ getItemName(reward.item_id) }} x{{ reward.count }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="使用情况" width="120" align="center">
          <template #default="{ row }">
            {{ row.used_count }} / {{ row.max_uses }}
          </template>
        </el-table-column>
        <el-table-column prop="expire_time" label="过期时间" width="180">
          <template #default="{ row }">
            <span v-if="row.expire_time">{{ row.expire_time }}</span>
            <span v-else class="text-gray">永久</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status" size="small" type="success">有效</el-tag>
            <el-tag v-else size="small" type="info">已失效</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
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

    <el-dialog v-model="dialogVisible" title="生成礼包码" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="礼包码">
          <el-input v-model="form.code" placeholder="留空自动生成" />
          <div class="form-tip">可自定义礼包码，留空则自动生成</div>
        </el-form-item>
        <el-form-item label="使用次数">
          <el-input-number v-model="form.max_uses" :min="1" :max="99999" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="form.expire_time"
            type="datetime"
            placeholder="选择过期时间"
            style="width: 100%;"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="奖励">
          <div class="rewards-list">
            <div v-for="(reward, idx) in form.rewards" :key="idx" class="reward-row">
              <el-select v-model="reward.item_id" placeholder="选择道具" style="width: 200px;">
                <el-option v-for="item in items" :key="item.item_id" :label="item.name" :value="item.item_id" />
              </el-select>
              <el-input-number v-model="reward.count" :min="1" :max="9999" style="width: 100px; margin-left: 10px;" />
              <el-button type="danger" :icon="Delete" circle size="small" style="margin-left: 10px;" @click="removeReward(idx)" />
            </div>
            <el-button type="primary" plain :icon="Plus" size="small" @click="addReward">添加奖励</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import request from '../utils/request'

const giftCodes = ref([])
const items = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const form = reactive({
  code: '',
  rewards: [{ item_id: '', count: 1 }],
  max_uses: 1,
  expire_time: '',
  status: 1
})

const generateCode = () => {
  return 'GIFT' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

const getItemName = (itemId) => {
  const item = items.value.find(i => i.item_id === itemId)
  return item?.name || itemId
}

const loadGiftCodes = async () => {
  const res = await request.get(`/admin/gift-codes?page=${page.value}&pageSize=${pageSize.value}`)
  giftCodes.value = res.data.list
  total.value = res.data.total
}

const loadItems = async () => {
  const res = await request.get('/config/items')
  items.value = res.data
}

const openDialog = () => {
  Object.assign(form, {
    code: generateCode(),
    rewards: [{ item_id: '', count: 1 }],
    max_uses: 1,
    expire_time: '',
    status: 1
  })
  dialogVisible.value = true
}

const addReward = () => {
  form.rewards.push({ item_id: '', count: 1 })
}

const removeReward = (idx) => {
  form.rewards.splice(idx, 1)
}

const copyCode = (code) => {
  navigator.clipboard.writeText(code)
  ElMessage.success('已复制')
}

const handleSave = async () => {
  if (!form.rewards.some(r => r.item_id && r.count > 0)) {
    ElMessage.warning('请至少添加一个有效奖励')
    return
  }

  const validRewards = form.rewards.filter(r => r.item_id && r.count > 0)

  saving.value = true
  try {
    await request.post('/admin/gift-codes', {
      code: form.code || generateCode(),
      rewards: validRewards,
      max_uses: form.max_uses,
      expire_time: form.expire_time || null
    })
    ElMessage.success('礼包码生成成功')
    dialogVisible.value = false
    loadGiftCodes()
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除礼包码【${row.code}】吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await request.delete(`/admin/gift-codes/${row.id}`)
    ElMessage.success('删除成功')
    loadGiftCodes()
  }).catch(() => {})
}

const handlePageChange = (p) => {
  page.value = p
  loadGiftCodes()
}

onMounted(() => {
  loadGiftCodes()
  loadItems()
})
</script>

<style scoped>
.gift-code {
  font-family: monospace;
  font-weight: bold;
  margin-right: 8px;
}

.reward-item {
  display: inline-block;
  padding: 2px 8px;
  background: #fdf6ec;
  border-radius: 4px;
  margin-right: 4px;
  margin-bottom: 4px;
  font-size: 13px;
  color: #E6A23C;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.rewards-list {
  width: 100%;
}

.reward-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.text-gray {
  color: #909399;
}
</style>
