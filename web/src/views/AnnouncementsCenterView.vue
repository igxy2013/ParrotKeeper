<template>
  <div class="ann-page page-container">
    <div class="page-header">
      <h2>公告中心</h2>
    </div>
    <div class="content">
      <div v-if="loading" class="tips">加载中...</div>
      <div v-else>
        <div v-if="items.length === 0" class="empty">暂无公告</div>
        <div v-else class="list">
          <el-card v-for="a in items" :key="a.id" class="ann-item" shadow="hover" @click="openDetail(a)">
            <div class="ann-title">{{ a.title }}</div>
            <div class="ann-meta">{{ formatTime(a.created_at) }}</div>
            <div class="ann-preview">{{ preview(a.content) }}</div>
            <div v-if="a.images && a.images.length" class="thumbs">
              <el-image
                v-for="(img, idx) in a.images.slice(0,3)"
                :key="idx"
                :src="img"
                :preview-src-list="a.images"
                fit="cover"
                class="thumb"
                preview-teleported
              />
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const items = ref([])

const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/announcements', { params: { limit: 50 } })
    const list = (r.data && r.data.data && r.data.data.announcements) || []
    // 映射图片数组，兼容 image_url 与 image_urls
    items.value = list.map(a => {
      const raws = Array.isArray(a.image_urls) ? a.image_urls : (a.image_url ? [a.image_url] : [])
      const images = raws.map(u => resolveUpload(u))
      return { ...a, images }
    })
  } catch (_) { items.value = [] } finally { loading.value = false }
}

const openDetail = (a) => {
  router.push({ name: 'announcement-detail', params: { id: a.id } })

  // Mark as read in localStorage
  try {
    const readIds = JSON.parse(localStorage.getItem('read_announcements') || '[]')
    if (!readIds.includes(a.id)) {
      readIds.push(a.id)
      localStorage.setItem('read_announcements', JSON.stringify(readIds))
      // Dispatch event to update SideNav badge
      window.dispatchEvent(new Event('announcement-read'))
    }
  } catch (e) {
    console.error('Failed to mark announcement as read', e)
  }
}

const preview = (s) => {
  const t = String(s || '')
  return t.length > 60 ? t.slice(0, 60) + '…' : t
}

const formatTime = (iso) => {
  try { return new Date(iso).toLocaleString('zh-CN') } catch (_) { return '' }
}

const resolveUpload = (url) => {
  if (!url) return ''
  const s = String(url).replace(/\\/g, '/').trim()
  if (/^https?:\/\//.test(s)) return s
  if (s.startsWith('/uploads/')) return s
  if (s.includes('/uploads/')) {
    const suffix = s.split('/uploads/')[1] || ''
    return '/uploads/' + suffix.replace(/^images\//, '')
  }
  return '/uploads/' + s.replace(/^\/?uploads\/?/, '').replace(/^images\//, '')
}

onMounted(async () => {
  await fetchList()
  const id = route.query && route.query.id ? Number(route.query.id) : null
  if (id && Array.isArray(items.value)) {
    const a = items.value.find(x => Number(x.id) === id)
    if (a) openDetail(a)
  }
})
</script>

<style scoped>
.ann-page { padding-bottom: 20px; }
.content { background:#fff; border-radius:8px; padding: 16px; }
.tips { color:#909399; }
.empty { color:#909399; text-align:center; padding: 24px 0; }
.list { display:flex; flex-direction:column; gap:12px; }
.ann-item { cursor:pointer; }
.ann-title { font-weight:600; color: var(--text-primary); margin-bottom:6px; }
.ann-meta { color:#909399; font-size:13px; margin-bottom:6px; }
.ann-preview { color:#606266; font-size:14px; }
.thumbs { display:flex; gap:8px; margin-top:8px; }
.thumb { width: 80px; height: 80px; border-radius: 8px; overflow: hidden; }
.load-more { display:flex; justify-content:center; margin-top:8px; }
.no-more { color:#909399; text-align:center; margin-top:8px; }
</style>
