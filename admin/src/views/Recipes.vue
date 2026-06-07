<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">合成配方</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增配方</el-button>
    </div>

    <div class="card">
      <el-table :data="recipes" border stripe>
        <el-table-column prop="recipe_id" label="配方ID" width="140" />
        <el-table-column prop="name" label="名称" width="140" />
        <el-table-column label="材料" min-width="250">
          <template #default="{ row }">
            <span v-for="(mat, idx) in row.materials" :key="mat.item_id" class="material-item">
              {{ getItemName(mat.item_id) }} x{{ mat.count }}
              <span v-if="idx < row.materials.length - 1"> + </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="产出" width="160">
          <template #default="{ row }">
            {{ getItemName(row.result_item_id) }} x{{ row.result_count }}
          </template>
        </el-table-column>
        <el-table-column prop="success_rate" label="成功率" width="100" align="center">
          <template #default="{ row }">
            <span :class="row.success_rate < 50 ? 'text-danger' : 'text-success'">{{ row.success_rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="unlock_level" label="解锁等级" width="100" align="center" />
        <el-table-column prop="sort_order" label="排序" width="80" align="center" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑配方' : '新增配方'" width="600px">
      <el-form :model="form" ref="formRef" label-width="100px">
        <el-form-item label="配方ID" prop="recipe_id">
          <el-input v-model="form.recipe_id" placeholder="recipe_id" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="配方名称" />
        </el-form-item>
        <el-form-item label="材料">
          <div class="materials-list">
            <div v-for="(mat, idx) in form.materials" :key="idx" class="material-row">
              <el-select v-model="mat.item_id" placeholder="选择道具" style="width: 200px;">
                <el-option v-for="item in items" :key="item.item_id" :label="item.name" :value="item.item_id" />
              </el-select>
              <el-input-number v-model="mat.count" :min="1" :max="999" style="width: 120px; margin-left: 10px;" />
              <el-button type="danger" :icon="Delete" circle size="small" style="margin-left: 10px;" @click="removeMaterial(idx)" />
            </div>
            <el-button type="primary" plain :icon="Plus" size="small" @click="addMaterial">添加材料</el-button>
          </div>
        </el-form-item>
        <el-form-item label="产出道具">
          <el-select v-model="form.result_item_id" placeholder="选择产出道具" style="width: 200px;">
            <el-option v-for="item in items" :key="item.item_id" :label="item.name" :value="item.item_id" />
          </el-select>
          <el-input-number v-model="form.result_count" :min="1" :max="99" style="width: 120px; margin-left: 10px;" />
        </el-form-item>
        <el-form-item label="成功率">
          <el-slider v-model="form.success_rate" :min="1" :max="100" show-input style="width: 300px;" />
          <span style="margin-left: 10px;">%</span>
        </el-form-item>
        <el-form-item label="解锁等级">
          <el-input-number v-model="form.unlock_level" :min="1" :max="999" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
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

const recipes = ref([])
const items = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const saving = ref(false)

const form = reactive({
  recipe_id: '',
  name: '',
  materials: [],
  result_item_id: '',
  result_count: 1,
  success_rate: 100,
  unlock_level: 1,
  sort_order: 0,
  status: 1
})

const getItemName = (itemId) => {
  const item = items.value.find(i => i.item_id === itemId)
  return item?.name || itemId
}

const loadData = async () => {
  const [recipeRes, itemRes] = await Promise.all([
    request.get('/config/recipes'),
    request.get('/config/items')
  ])
  recipes.value = recipeRes.data
  items.value = itemRes.data
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, {
      ...row,
      materials: JSON.parse(JSON.stringify(row.materials))
    })
  } else {
    Object.assign(form, {
      recipe_id: '',
      name: '',
      materials: [{ item_id: '', count: 1 }],
      result_item_id: '',
      result_count: 1,
      success_rate: 100,
      unlock_level: 1,
      sort_order: 0,
      status: 1
    })
  }
  dialogVisible.value = true
}

const addMaterial = () => {
  form.materials.push({ item_id: '', count: 1 })
}

const removeMaterial = (idx) => {
  form.materials.splice(idx, 1)
}

const handleSave = async () => {
  if (!form.recipe_id || !form.name || !form.result_item_id) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (form.materials.length === 0 || form.materials.some(m => !m.item_id)) {
    ElMessage.warning('请填写完整的材料列表')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await request.put(`/config/recipes/${form.recipe_id}`, form)
      ElMessage.success('更新成功')
    } else {
      await request.post('/config/recipes', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除配方【${row.name}】吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await request.delete(`/config/recipes/${row.recipe_id}`)
    ElMessage.success('删除成功')
    loadData()
  }).catch(() => {})
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.material-item {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f2f5;
  border-radius: 4px;
  margin-right: 4px;
  margin-bottom: 4px;
  font-size: 13px;
}

.materials-list {
  width: 100%;
}

.material-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.text-danger {
  color: #F56C6C;
  font-weight: bold;
}

.text-success {
  color: #67C23A;
}
</style>
