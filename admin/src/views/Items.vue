<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">道具配置</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增道具</el-button>
    </div>

    <div class="card">
      <el-table :data="items" border stripe>
        <el-table-column prop="icon" label="图标" width="80" align="center">
          <template #default="{ row }">
            <span style="font-size: 24px;">{{ row.icon }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="item_id" label="道具ID" width="120" />
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="rarity" label="稀有度" width="100">
          <template #default="{ row }">
            <el-tag :type="rarityTypeMap[row.rarity]">{{ rarityMap[row.rarity] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            {{ typeMap[row.type] }}
          </template>
        </el-table-column>
        <el-table-column prop="daily_limit" label="每日产出上限" width="120" align="center">
          <template #default="{ row }">
            {{ row.daily_limit > 0 ? row.daily_limit : '无限' }}
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="80" align="center" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑道具' : '新增道具'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="道具ID" prop="item_id">
          <el-input v-model="form.item_id" placeholder="item_id" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="道具名称" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="form.icon" placeholder="emoji 或 图标" maxlength="10" />
          <div style="margin-top: 8px;">
            <span v-for="emoji in emojiList" :key="emoji" @click="form.icon = emoji" class="emoji-option">{{ emoji }}</span>
          </div>
        </el-form-item>
        <el-form-item label="稀有度" prop="rarity">
          <el-select v-model="form.rarity" style="width: 100%;">
            <el-option label="普通" value="common" />
            <el-option label="优秀" value="uncommon" />
            <el-option label="稀有" value="rare" />
            <el-option label="史诗" value="epic" />
            <el-option label="传说" value="legendary" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" style="width: 100%;">
            <el-option label="材料" value="material" />
            <el-option label="装备" value="equipment" />
            <el-option label="消耗品" value="consumable" />
            <el-option label="货币" value="currency" />
          </el-select>
        </el-form-item>
        <el-form-item label="每日产出上限" prop="daily_limit">
          <el-input-number v-model="form.daily_limit" :min="0" :max="10000" style="width: 100%;" />
          <div class="form-tip">设为0表示不限制。稀有及以上道具建议设置上限。</div>
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" />
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
import { Plus } from '@element-plus/icons-vue'
import request from '../utils/request'

const items = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const saving = ref(false)

const form = reactive({
  item_id: '',
  name: '',
  icon: '',
  rarity: 'common',
  type: 'material',
  daily_limit: 0,
  sort_order: 0,
  description: '',
  status: 1
})

const rules = {
  item_id: [{ required: true, message: '请输入道具ID', trigger: 'blur' }],
  name: [{ required: true, message: '请输入道具名称', trigger: 'blur' }]
}

const rarityMap = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
}

const rarityTypeMap = {
  common: 'info',
  uncommon: 'success',
  rare: 'primary',
  epic: '',
  legendary: 'warning'
}

const typeMap = {
  material: '材料',
  equipment: '装备',
  consumable: '消耗品',
  currency: '货币'
}

const emojiList = ['🪵', '🪨', '⛏️', '🥇', '🟫', '🧱', '⚔️', '🛡️', '💎', '🐉', '💰', '🎁', '⚗️', '🔮', '👑', '🏆']

const loadItems = async () => {
  const res = await request.get('/config/items')
  items.value = res.data
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, {
      item_id: '',
      name: '',
      icon: '',
      rarity: 'common',
      type: 'material',
      daily_limit: 0,
      sort_order: 0,
      description: '',
      status: 1
    })
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.item_id || !form.name) {
    ElMessage.warning('请填写必填项')
    return
  }

  if (['epic', 'legendary'].includes(form.rarity) && (form.daily_limit === 0 || form.daily_limit > 100)) {
    ElMessage.warning('稀有/史诗/传说道具单日产出上限必须设置且不超过100')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await request.put(`/config/items/${form.item_id}`, form)
      ElMessage.success('更新成功')
    } else {
      await request.post('/config/items', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadItems()
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除道具【${row.name}】吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await request.delete(`/config/items/${row.item_id}`)
    ElMessage.success('删除成功')
    loadItems()
  }).catch(() => {})
}

onMounted(() => {
  loadItems()
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.emoji-option {
  display: inline-block;
  font-size: 20px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin-right: 4px;
  margin-bottom: 4px;
}

.emoji-option:hover {
  background: #f0f2f5;
}
</style>
