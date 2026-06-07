<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-blue">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="label">总玩家数</div>
            <div class="value">{{ overview.total_players || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-green">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="label">今日活跃</div>
            <div class="value">{{ overview.today_active || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-orange">
            <el-icon><Goods /></el-icon>
          </div>
          <div class="stat-info">
            <div class="label">今日道具产出</div>
            <div class="value">{{ totalProduced }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-purple">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="label">道具种类</div>
            <div class="value">{{ itemProductionStats.items?.length || 0 }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <div class="card">
          <h3 class="chart-title">用户留存趋势</h3>
          <div ref="retentionChartRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card">
          <h3 class="chart-title">道具产出消耗统计</h3>
          <div ref="itemChartRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="24">
        <div class="card">
          <h3 class="chart-title">各道具今日产出/消耗</h3>
          <div ref="todayItemChartRef" class="chart today-chart"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import request from '../utils/request'

const overview = reactive({})
const retentionStats = ref([])
const itemProductionStats = ref({ items: [], stats: [] })

const retentionChartRef = ref(null)
const itemChartRef = ref(null)
const todayItemChartRef = ref(null)

let retentionChart = null
let itemChart = null
let todayItemChart = null

const totalProduced = computed(() => {
  const stats = overview.today_item_stats || {}
  return Object.values(stats).reduce((sum, s) => sum + (s.produced || 0), 0)
})

const loadData = async () => {
  const [overviewRes, retentionRes, itemRes] = await Promise.all([
    request.get('/stats/overview'),
    request.get('/stats/retention?days=7'),
    request.get('/stats/items?days=7')
  ])

  Object.assign(overview, overviewRes.data)
  retentionStats.value = retentionRes.data
  itemProductionStats.value = itemRes.data

  await nextTick()
  renderCharts()
}

const renderCharts = () => {
  renderRetentionChart()
  renderItemChart()
  renderTodayItemChart()
}

const renderRetentionChart = () => {
  if (!retentionChartRef.value) return
  if (retentionChart) retentionChart.dispose()

  retentionChart = echarts.init(retentionChartRef.value)

  const dates = retentionStats.value.map(d => d.date)
  const newUsers = retentionStats.value.map(d => d.new_users)
  const activeUsers = retentionStats.value.map(d => d.active_users)
  const retention = retentionStats.value.map(d => d.d1_retention)

  retentionChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '活跃用户', '次日留存率(%)'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates },
    yAxis: [
      { type: 'value', name: '人数' },
      { type: 'value', name: '留存率(%)', max: 100 }
    ],
    series: [
      { name: '新增用户', type: 'bar', data: newUsers, itemStyle: { color: '#409EFF' } },
      { name: '活跃用户', type: 'bar', data: activeUsers, itemStyle: { color: '#67C23A' } },
      { name: '次日留存率(%)', type: 'line', yAxisIndex: 1, data: retention, itemStyle: { color: '#E6A23C' } }
    ]
  })
}

const renderItemChart = () => {
  if (!itemChartRef.value) return
  if (itemChart) itemChart.dispose()

  itemChart = echarts.init(itemChartRef.value)

  const dates = itemProductionStats.value.stats?.map(d => d.date) || []
  const items = itemProductionStats.value.items?.slice(0, 5) || []
  const series = items.map(item => ({
    name: item.name,
    type: 'line',
    smooth: true,
    data: itemProductionStats.value.stats?.map(d => d[item.item_id]?.produced || 0) || []
  }))

  itemChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: items.map(i => i.name) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', name: '产出数量' },
    series
  })
}

const renderTodayItemChart = () => {
  if (!todayItemChartRef.value) return
  if (todayItemChart) todayItemChart.dispose()

  todayItemChart = echarts.init(todayItemChartRef.value)

  const items = itemProductionStats.value.items || []
  const todayData = itemProductionStats.value.stats?.[itemProductionStats.value.stats.length - 1] || {}
  const itemNames = items.map(i => i.name)
  const produced = items.map(i => todayData[i.item_id]?.produced || 0)
  const consumed = items.map(i => todayData[i.item_id]?.consumed || 0)

  todayItemChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['产出', '消耗'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: itemNames },
    yAxis: { type: 'value' },
    series: [
      { name: '产出', type: 'bar', data: produced, itemStyle: { color: '#67C23A' } },
      { name: '消耗', type: 'bar', data: consumed, itemStyle: { color: '#F56C6C' } }
    ]
  })
}

const handleResize = () => {
  retentionChart?.resize()
  itemChart?.resize()
  todayItemChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

watch(() => itemProductionStats.value, () => {
  nextTick(renderCharts)
}, { deep: true })
</script>

<style scoped>
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}

.icon-blue { background: linear-gradient(135deg, #667eea, #764ba2); }
.icon-green { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.icon-orange { background: linear-gradient(135deg, #fa709a, #fee140); }
.icon-purple { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }

.stat-info .label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-info .value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.charts-row {
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.chart {
  width: 100%;
  height: 300px;
}

.today-chart {
  height: 350px;
}
</style>
