<template>
  <div class="ann-page">
    <div class="header">
      <h2>公告中心</h2>
      <div class="header-actions">
        <el-button @click="loadMore" :loading="loading" :disabled="!hasMore">加载更多</el-button>
      </div>
    </div>
    <div class="content">
      <div v-if="loading" class="tips">加载中...</div>
      <div v-else>
        <div v-if="items.length === 0" class="empty">暂无已发布公告</div>
        <div v-else class="list">
          <el-card v-for="a in items" :key="a.id" class="ann-item" shadow="hover" @click="openDetail(a)">
            <div class="ann-title">{{ a.title }}</div>
            <div class="ann-meta">{{ formatTime(a.created_at) }}</div>
            <div class="ann-preview">{{ preview(a.content) }}</div>
          </el-card>
          <div class="load-more" v-if="hasMore">
            <el-button type="primary" @click="loadMore" :loading="loading">加载更多</el-button>
          </div>
          <div class="no-more" v-else>已全部加载</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showDetail" :title="current?.title || '公告详情'" width="600px">
      <div v-if="current" class="detail-body">
        <div class="detail-time">{{ formatTime(current.created_at) }}</div>
        <div class="detail-text">{{ current.content }}</div>
      </div>
      <template #footer>
        <el-button @click="showDetail=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'

const route = useRoute()
const loading = ref(false)
const items = ref([])
const limit = ref(20)
const hasMore = ref(true)
const showDetail = ref(false)
const current = ref(null)

const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/announcements', { params: { limit: limit.value } })
    const list = (r.data && r.data.data && r.data.data.announcements) || []
    items.value = list
    hasMore.value = list.length >= limit.value
  } catch (_) { hasMore.value = false } finally { loading.value = false }
}

const loadMore = async () => {
  if (loading.value) return
  limit.value += 20
  await fetchList()
}

const openDetail = (a) => {
  current.value = a
  showDetail.value = true
}

const preview = (s) => {
  const t = String(s || '')
  return t.length > 60 ? t.slice(0, 60) + '…' : t
}

const formatTime = (iso) => {
  try { return new Date(iso).toLocaleString('zh-CN') } catch (_) { return '' }
}

onMounted(async () => {
  await fetchList()
  const id = route.query && route.query.id ? Number(route.query.id) : null
  if (id && Array.isArray(items.value)) {
    const a = items.value.find(x => Number(x.id) === id)
    if (a) openDetail(a)
    else {
      // 若未在当前列表中，尝试单独拉取更多
      limit.value = Math.max(limit.value, 50)
      await fetchList()
      const b = items.value.find(x => Number(x.id) === id)
      if (b) openDetail(b)
    }
  }
})
</script>

<style scoped>
.ann-page { padding-bottom: 20px; }
.header { display:flex; justify-content: space-between; align-items:center; margin-bottom:16px; }
.header h2 { margin:0; color: var(--text-primary); }
.content { background:#fff; border-radius:8px; padding: 16px; }
.tips { color:#909399; }
.empty { color:#909399; text-align:center; padding: 24px 0; }
.list { display:flex; flex-direction:column; gap:12px; }
.ann-item { cursor:pointer; }
.ann-title { font-weight:600; color: var(--text-primary); margin-bottom:6px; }
.ann-meta { color:#909399; font-size:13px; margin-bottom:6px; }
.ann-preview { color:#606266; font-size:14px; }
.load-more { display:flex; justify-content:center; margin-top:8px; }
.no-more { color:#909399; text-align:center; margin-top:8px; }
.detail-body { display:flex; flex-direction:column; gap:8px; }
.detail-time { color:#909399; font-size:13px; }
.detail-text { white-space:pre-wrap; }
</style>
