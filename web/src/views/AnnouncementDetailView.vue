<template>
  <div class="ann-detail page-container">
    <div class="page-header">
      <h2>公告详情</h2>
    </div>
    <div class="content">
      <div v-if="loading" class="tips">加载中...</div>
      <div v-else>
        <div v-if="!item" class="empty">公告不存在或未发布</div>
        <div v-else class="detail">
          <div class="title">{{ item.title }}</div>
          <div class="meta">{{ formatTime(item.created_at) }}</div>
          <div class="text">{{ item.content }}</div>
          <div v-if="images.length" class="image-list">
            <el-image
              v-for="(img, i) in images"
              :key="i"
              :src="img"
              :preview-src-list="images"
              fit="contain"
              class="full"
              preview-teleported
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'

const route = useRoute()
const loading = ref(false)
const item = ref(null)
const images = ref([])

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

const formatTime = (iso) => {
  try { return new Date(iso).toLocaleString('zh-CN') } catch (_) { return '' }
}

const loadDetail = async () => {
  const id = route.params.id
  if (!id) { item.value = null; return }
  loading.value = true
  try {
    const r = await api.get(`/announcements/${id}`)
    const a = (r.data && r.data.data && r.data.data.announcement) || null
    item.value = a
    const raws = Array.isArray(a?.image_urls) ? a.image_urls : (a?.image_url ? [a.image_url] : [])
    images.value = raws.map(u => resolveUpload(u))
  } catch (_) {
    item.value = null
    images.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.content { background:#fff; border-radius:8px; padding: 16px; }
.tips { color:#909399; }
.empty { color:#909399; text-align:center; padding: 24px 0; }
.detail { display:flex; flex-direction:column; gap:10px; }
.title { font-weight:600; font-size:18px; color: var(--text-primary); }
.meta { color:#909399; font-size:13px; }
.text { white-space: pre-wrap; color:#606266; }
.image-list { display:flex; flex-direction:column; gap:12px; margin-top:8px; }
.full { display: inline-block; max-width: 100%; border-radius: 8px; overflow: hidden; }
.full :deep(img) { display:block; width:auto; max-width:100%; height:auto; }
</style>
