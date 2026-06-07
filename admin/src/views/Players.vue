<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">玩家管理</h2>
      <div>
        <el-input v-model="keyword" placeholder="搜索玩家ID或昵称" style="width: 250px; margin-right: 10px;" clearable @keyup.enter="loadPlayers">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="loadPlayers">搜索</el-button>
      </div>
    </div>

    <div class="card">
      <el-table :data="players" border stripe>
        <el-table-column prop="player_id" label="玩家ID" width="180" />
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column prop="level" label="等级" width="80" align="center" />
        <el-table-column prop="exp" label="经验" width="100" align="center" />
        <el-table-column prop="checkin_days" label="签到天数" width="100" align="center" />
        <el-table-column label="道具数量" width="120" align="center">
          <template #default="{ row }">
            {{ Object.keys(row.items || {}).length }} 种
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewPlayer(row)">详情</el-button>
            <el-button size="small" type="primary" @click="sendGift(row)">发礼包</el-button>
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

    <el-dialog v-model="giftDialogVisible" title="发放礼包" width="500px">
      <div class="gift-target">
        <span>目标玩家：</span>
        <el-tag type="info">{{ giftTarget?.nickname }} ({{ giftTarget?.player_id }})</el-tag>
      </div>
      <el-form label-width="80px" style="margin-top: 16px;">
        <el-form-item label="原因">
          <el-input v-model="giftReason" placeholder="如：BUG补偿、节日福利等" />
        </el-form-item>
        <el-form-item label="奖励">
          <div class="rewards-list">
            <div v-for="(reward, idx) in giftRewards" :key="idx" class="reward-row">
              <el-select v-model="reward.item_id" placeholder="选择道具" style="width: 180px;">
                <el-option v-for="item in items" :key="item.item_id" :label="item.name" :value="item.item_id" />
              </el-select>
              <el-input-number v-model="reward.count" :min="1" :max="9999" style="width: 100px; margin-left: 8px;" />
              <el-button type="danger" :icon="Delete" circle size="small" style="margin-left: 8px;" @click="removeGiftReward(idx)" />
            </div>
            <el-button type="primary" plain :icon="Plus" size="small" @click="addGiftReward">添加奖励</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="giftDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="giftSending" @click="handleSendGift">确认发放</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="玩家详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="玩家ID">{{ currentPlayer?.player_id }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ currentPlayer?.nickname }}</el-descriptions-item>
        <el-descriptions-item label="等级">{{ currentPlayer?.level }}</el-descriptions-item>
        <el-descriptions-item label="经验">{{ currentPlayer?.exp }}</el-descriptions-item>
        <el-descriptions-item label="签到天数">{{ currentPlayer?.checkin_days }}</el-descriptions-item>
        <el-descriptions-item label="最近签到">{{ currentPlayer?.last_checkin_date || '未签到' }}</el-descriptions-item>
        <el-descriptions-item label="注册时间" :span="2">{{ currentPlayer?.created_at }}</el-descriptions-item>
      </el-descriptions>

      <h4 style="margin: 20px 0 12px;">背包道具</h4>
      <div class="items-grid">
        <div v-for="(count, itemId) in currentPlayer?.items" :key="itemId" class="item-cell">
          <span class="item-icon">{{ getItemIcon(itemId) }}</span>
          <span class="item-name">{{ getItemName(itemId) }}</span>
          <span class="item-count">x{{ count }}</span>
        </div>
        <div v-if="!currentPlayer?.items || Object.keys(currentPlayer.items).length === 0" class="empty-items">
          暂无道具
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import request from '../utils/request'

const players = ref([])
const items = ref([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const giftDialogVisible = ref(false)
const giftTarget = ref(null)
const giftRewards = ref([])
const giftReason = ref('')
const giftSending = ref(false)

const detailDialogVisible = ref(false)
const currentPlayer = ref(null)

const loadPlayers = async () => {
  const res = await request.get(`/admin/players?page=${page.value}&pageSize=${pageSize.value}&keyword=${keyword.value}`)
  players.value = res.data.list
  total.value = res.data.total
}

const loadItems = async () => {
  const res = await request.get('/config/items')
  items.value = res.data
}

const getItemName = (itemId) => {
  const item = items.value.find(i => i.item_id === itemId)
  return item?.name || itemId
}

const getItemIcon = (itemId) => {
  const item = items.value.find(i => i.item_id === itemId)
  return item?.icon || '📦'
}

const viewPlayer = (row) => {
  currentPlayer.value = row
  detailDialogVisible.value = true
}

const sendGift = (row) => {
  giftTarget.value = row
  giftRewards.value = [{ item_id: '', count: 1 }]
  giftReason.value = ''
  giftDialogVisible.value = true
}

const addGiftReward = () => {
  giftRewards.value.push({ item_id: '', count: 1 })
}

const removeGiftReward = (idx) => {
  giftRewards.value.splice(idx, 1)
}

const handleSendGift = async () => {
  if (!giftRewards.value.some(r => r.item_id && r.count > 0)) {
    ElMessage.warning('请至少添加一个有效奖励')
    return
  }

  const validRewards = giftRewards.value.filter(r => r.item_id && r.count > 0)

  giftSending.value = true
  try {
    await request.post('/admin/players/send-gift', {
      player_id: giftTarget.value.player_id,
      rewards: validRewards,
      reason: giftReason.value
    })
    ElMessage.success('礼包发放成功')
    giftDialogVisible.value = false
    loadPlayers()
  } finally {
    giftSending.value = false
  }
}

const handlePageChange = (p) => {
  page.value = p
  loadPlayers()
}

onMounted(() => {
  loadPlayers()
  loadItems()
})
</script>

<style scoped>
.gift-target {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.rewards-list {
  width: 100%;
}

.reward-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.item-cell {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.item-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 4px;
}

.item-name {
  font-size: 12px;
  color: #606266;
  display: block;
  margin-bottom: 2px;
}

.item-count {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.empty-items {
  grid-column: span 4;
  text-align: center;
  padding: 30px;
  color: #909399;
}
</style>
