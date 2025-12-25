<template>
  <div class="admin-page">
    <div class="header">
      <h2>用户与角色管理</h2>
      <div class="header-actions">
        <el-input v-model="keyword" placeholder="按昵称/用户名搜索" style="width:280px" />
        <el-button @click="fetchUsers" :loading="loading">搜索</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <div class="growth-card">
        <div class="growth-header">
          <div class="growth-title">用户增长趋势</div>
          <div class="growth-actions">
            <el-radio-group v-model="growthDays" size="small">
              <el-radio-button :label="30">近30天</el-radio-button>
              <el-radio-button :label="365">近1年</el-radio-button>
              <el-radio-button label="all">全部</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="growth-chart-wrapper">
          <canvas ref="growthCanvas" class="growth-canvas" @mousemove="onChartMouseMove" @mouseleave="onChartMouseLeave"></canvas>
        </div>
      </div>
      <div class="stats-grid" v-if="!loading">
        <div class="stat-card total">
          <div class="stat-label">总用户</div>
          <div class="stat-value">{{ totalCount }}</div>
        </div>
        <div class="stat-card admin">
          <div class="stat-label">管理员</div>
          <div class="stat-value">{{ adminCount }}</div>
        </div>
        <div class="stat-card user">
          <div class="stat-label">普通用户</div>
          <div class="stat-value">{{ userCount }}</div>
        </div>
        <div class="stat-card team">
          <div class="stat-label">团队用户</div>
          <div class="stat-value">{{ teamUserCount }}</div>
        </div>
      </div>
      <el-table
        :data="users"
        v-loading="loading"
        style="width:100%"
        :default-sort="{ prop: 'created_at', order: 'descending' }"
        @sort-change="onSortChange"
      >
        <el-table-column prop="id" label="ID" width="80" sortable="custom" />
        <el-table-column label="头像" width="80">
          <template #default="s"><img :src="avatar(s.row)" class="avatar"/></template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="160" sortable="custom" />
        <el-table-column prop="username" label="用户名" width="160" sortable="custom" />
        <el-table-column prop="role" label="角色" width="160">
          <template #default="s">
            <div v-if="!editingRole[s.row.id]" @click="startEditRole(s.row.id)" style="cursor:pointer">
              <el-tag :type="getRoleType(s.row.role)">
                {{ getRoleLabel(s.row.role) }} <el-icon class="el-icon--right"><Edit /></el-icon>
              </el-tag>
            </div>
            <el-select 
              v-else 
              v-model="roleMap[s.row.id]" 
              @change="val=>updateRole(s.row.id,val)" 
              @blur="editingRole[s.row.id]=false"
              style="width:140px"
              ref="roleSelect"
            >
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="parrot_count" label="鹦鹉数量" width="120" sortable="custom" :sort-orders="['descending', 'ascending', null]" />
        <el-table-column prop="total_expense" label="总支出" width="120" sortable="custom" :sort-orders="['descending', 'ascending', null]" />
        <el-table-column prop="created_at" label="加入时间" width="180" sortable="custom" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="s">
            <el-button type="danger" link size="small" @click="deleteUser(s.row)" v-if="s.row.id !== authStore.user?.id">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination layout="prev, pager, next" :total="total" :page-size="perPage" :current-page="page" @current-change="changePage" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const users = ref([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const roleMap = ref({})
const totalCount = ref(0)
const adminCount = ref(0)
const userCount = ref(0)
const teamUserCount = ref(0)
const sortBy = ref('created_at')
const sortOrder = ref('desc')
const growthPoints = ref([])
const growthTotalUsers = ref(0)
const growthDays = ref(30)
const growthCanvas = ref(null)
const hoverIndex = ref(-1)
const editingRole = ref({})

const getRoleLabel = (r) => {
  if (r === 'super_admin') return '超级管理员'
  if (r === 'admin') return '管理员'
  return '普通用户'
}
const getRoleType = (r) => {
  if (r === 'super_admin') return 'danger'
  if (r === 'admin') return 'primary'
  return 'info'
}
const startEditRole = (id) => {
  editingRole.value[id] = true
  // Force focus next tick?
}

const avatar = (u) => { const s = String(u.avatar_url||''); if (!s) return '/profile.png'; if (/^https?:\/\//.test(s)) return s; if (s.startsWith('/uploads/')) return s; return '/uploads/'+s.replace(/^\/?uploads\/?/,'') }

onMounted(() => {
  if (isSuperAdmin.value) {
    fetchUsers()
    fetchUserGrowth()
    window.addEventListener('resize', drawGrowthChart)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', drawGrowthChart)
})

const onChartMouseMove = (e) => {
  const el = growthCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const pts = growthPoints.value || []
  if (pts.length < 2) return

  const mouseX = e.clientX - rect.left
  const width = rect.width
  const paddingLeft = 40 // CSS pixels, roughly matching the ratio logic
  const paddingRight = 16
  const innerWidth = width - paddingLeft - paddingRight
  const xStep = innerWidth / (pts.length - 1)
  
  // Convert mouseX to index
  // x = paddingLeft + idx * xStep
  // idx = (x - paddingLeft) / xStep
  let idx = Math.round((mouseX - paddingLeft) / xStep)
  if (idx < 0) idx = 0
  if (idx >= pts.length) idx = pts.length - 1
  
  if (hoverIndex.value !== idx) {
    hoverIndex.value = idx
    drawGrowthChart()
  }
}

const onChartMouseLeave = () => {
  if (hoverIndex.value !== -1) {
    hoverIndex.value = -1
    drawGrowthChart()
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/users', {
      params: {
        page: page.value,
        per_page: perPage.value,
        q: keyword.value || undefined,
        sort_by: sortBy.value || undefined,
        sort_order: sortOrder.value || undefined
      }
    })
    if (r.data?.success) {
      const d = r.data.data || {}
      users.value = d.users || []
      total.value = d.total || 0
      roleMap.value = {}
      for (const u of users.value) roleMap.value[u.id] = u.role
      const stats = d.role_stats || {}
      totalCount.value = stats.total_count || d.total || 0
      adminCount.value = stats.admin_count || 0
      userCount.value = stats.user_count || 0
      teamUserCount.value = stats.team_user_count || 0
    } else ElMessage.error(r.data?.message||'加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const changePage = (p) => { page.value = p; fetchUsers() }
const updateRole = async (id, role) => {
  try {
    const r = await api.put(`/admin/users/${id}/role`, { role })
    if (r.data?.success) {
      ElMessage.success('角色更新成功')
      // Update local user list role
      const u = users.value.find(x => x.id === id)
      if (u) u.role = role
    } else ElMessage.error(r.data?.message||'更新失败')
  } catch (_) { ElMessage.error('更新失败') }
  editingRole.value[id] = false
}

const deleteUser = (row) => {
  ElMessageBox.confirm(
    `确定要删除用户 "${row.nickname || row.username}" 吗？此操作不可恢复。`,
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const r = await api.delete(`/admin/users/${row.id}`)
      if (r.data?.success) {
        ElMessage.success('用户删除成功')
        fetchUsers()
        // If deleted user affects growth chart or stats, maybe refresh those too?
        // fetchUserGrowth() // Optional, but good for consistency
      } else {
        ElMessage.error(r.data?.message || '删除失败')
      }
    } catch (_) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const fetchUserGrowth = async () => {
  try {
    const r = await api.get('/admin/reports/user-growth', { params: { days: growthDays.value } })
    if (r.data?.success) {
      const d = r.data.data || {}
      growthPoints.value = d.points || []
      growthTotalUsers.value = d.total_users || 0
      await nextTick()
      drawGrowthChart()
    }
  } catch (_) {}
}

const drawGrowthChart = () => {
  const el = growthCanvas.value
  const pts = growthPoints.value || []
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  const width = rect.width || 0
  const height = rect.height || 0
  const w = Math.max(width * ratio, 1)
  const h = Math.max(height * ratio, 1)
  el.width = w
  el.height = h
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  if (!pts.length) return
  
  const paddingLeft = 48 * ratio
  const paddingRight = 16 * ratio
  const paddingTop = 20 * ratio
  const paddingBottom = 28 * ratio
  const maxVal = Math.max.apply(null, pts.map(p => Number(p.count || 0))) || 1
  // Make maxVal slightly larger for breathing room
  const yMax = Math.ceil(maxVal * 1.1)
  const innerWidth = w - paddingLeft - paddingRight
  const innerHeight = h - paddingTop - paddingBottom
  const xStep = pts.length > 1 ? innerWidth / (pts.length - 1) : 0
  const yScale = yMax > 0 ? innerHeight / yMax : 0
  
  // Draw Grid & Y-Axis Labels
  ctx.beginPath()
  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1 * ratio
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `${10 * ratio}px sans-serif`
  
  const gridCount = 5
  for (let i = 0; i <= gridCount; i++) {
    const val = Math.round(yMax * i / gridCount)
    const y = paddingTop + innerHeight - (val * yScale)
    
    // Grid line
    ctx.moveTo(paddingLeft, y)
    ctx.lineTo(paddingLeft + innerWidth, y)
    
    // Label
    ctx.fillText(val, paddingLeft - 8 * ratio, y)
  }
  ctx.stroke()

  // Helper for coordinates
  const getX = (i) => paddingLeft + xStep * i
  const getY = (v) => paddingTop + innerHeight - v * yScale
  
  // Helper for smooth bezier control points (Catmull-Rom spline)
  const getControlPoints = (p0, p1, p2, t = 0.2) => {
    const d1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2))
    const d2 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    const fa = t * d1 / (d1 + d2)
    const fb = t * d2 / (d1 + d2)
    const p1x = p1.x - fa * (p2.x - p0.x)
    const p1y = p1.y - fa * (p2.y - p0.y)
    const p2x = p1.x + fb * (p2.x - p0.x)
    const p2y = p1.y + fb * (p2.y - p0.y)
    return [{x: p1x, y: p1y}, {x: p2x, y: p2y}]
  }

  // Prepare points with coordinates
  const coords = pts.map((p, i) => ({
    x: getX(i),
    y: getY(Number(p.count || 0))
  }))

  if (coords.length > 1) {
    // Fill Area
    ctx.beginPath()
    ctx.moveTo(coords[0].x, paddingTop + innerHeight) // Start bottom-left
    ctx.lineTo(coords[0].x, coords[0].y) // Up to first point
    
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[i + 2] || p2
      
      const cp1 = getControlPoints(p0, p1, p2)[1]
      const cp2 = getControlPoints(p1, p2, p3)[0]
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y)
    }
    
    ctx.lineTo(coords[coords.length - 1].x, paddingTop + innerHeight) // Down to bottom-right
    ctx.closePath()
    
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + innerHeight)
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)')
    ctx.fillStyle = gradient
    ctx.fill()
    
    // Draw Stroke
    ctx.beginPath()
    ctx.moveTo(coords[0].x, coords[0].y)
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[i + 2] || p2
      
      const cp1 = getControlPoints(p0, p1, p2)[1]
      const cp2 = getControlPoints(p1, p2, p3)[0]
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y)
    }
    ctx.strokeStyle = '#10b981' // Theme Green
    ctx.lineWidth = 2 * ratio
    ctx.stroke()
  }

  // X-Axis Labels
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = 10 * ratio + 'px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  const labelIndexes = []
  if (pts.length >= 1) labelIndexes.push(0)
  if (pts.length >= 3) labelIndexes.push(Math.floor((pts.length - 1) / 2))
  if (pts.length >= 2) labelIndexes.push(pts.length - 1)
  const used = {}
  labelIndexes.forEach(i => {
    if (i < 0 || i >= pts.length) return
    if (used[i]) return
    used[i] = true
    const p = pts[i]
    const x = paddingLeft + xStep * i
    const text = String(p.date || '')
    ctx.fillText(text, x, h - paddingBottom + 8 * ratio)
  })

  // Draw hover effect
  if (hoverIndex.value >= 0 && hoverIndex.value < pts.length) {
    const p = pts[hoverIndex.value]
    const val = Number(p.count || 0)
    const x = paddingLeft + xStep * hoverIndex.value
    const y = paddingTop + innerHeight - val * yScale
    
    // Vertical line
    ctx.beginPath()
    ctx.moveTo(x, paddingTop)
    ctx.lineTo(x, paddingTop + innerHeight)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)' // Theme Green light
    ctx.lineWidth = 1 * ratio
    ctx.setLineDash([4 * ratio, 4 * ratio])
    ctx.stroke()
    ctx.setLineDash([])
    
    // Highlight circle
    ctx.beginPath()
    ctx.arc(x, y, 6 * ratio, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2 * ratio
    ctx.stroke()
    
    // Tooltip
    const text = `${p.date} 增长: ${val}`
    ctx.font = `${12 * ratio}px sans-serif`
    const textMetrics = ctx.measureText(text)
    const textWidth = textMetrics.width
    const textHeight = 12 * ratio
    const padding = 8 * ratio
    const boxWidth = textWidth + padding * 2
    const boxHeight = textHeight + padding * 2
    let boxY = y - boxHeight - 8 * ratio
    if (boxY < 0) {
      boxY = y + 8 * ratio
    }
    
    // Ensure tooltip stays within bounds
    let boxX = x - boxWidth / 2
    if (boxX < 0) boxX = 0
    if (boxX + boxWidth > w) boxX = w - boxWidth
    
    // Draw tooltip box
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
    ctx.shadowBlur = 4 * ratio
    ctx.shadowOffsetY = 2 * ratio
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4 * ratio)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    
    // Draw tooltip text
    ctx.fillStyle = '#374151'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, boxX + padding, boxY + boxHeight / 2)
  }
}

const handleResize = () => {
  drawGrowthChart()
}

const onSortChange = ({ prop, order }) => {
  if (!prop || !order) {
    sortBy.value = 'created_at'
    sortOrder.value = 'desc'
  } else {
    sortBy.value = prop
    sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
  }
  page.value = 1
  fetchUsers()
}

watch(growthPoints, () => {
  nextTick(() => {
    drawGrowthChart()
  })
})

watch(growthDays, fetchUserGrowth)

onMounted(async () => {
  await (authStore.refreshProfile && authStore.refreshProfile())
  if (isSuperAdmin.value) {
    fetchUsers()
    fetchUserGrowth()
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.pager { margin-top: 12px; display:flex; justify-content:center; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04);
  border: 1px solid #f3f4f6;
}

.stat-card.total { border-top: 3px solid #3b82f6; }
.stat-card.admin { border-top: 3px solid #f97316; }
.stat-card.user { border-top: 3px solid #10b981; }
.stat-card.team { border-top: 3px solid #8b5cf6; }

.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.growth-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px 8px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04);
  border: 1px solid #f3f4f6;
  margin-bottom: 16px;
}

.growth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.growth-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.growth-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: #6b7280;
}

.meta-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.growth-chart-wrapper {
  width: 100%;
  height: 160px;
}

.growth-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
