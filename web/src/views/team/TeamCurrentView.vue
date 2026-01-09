<template>
  <div class="page-container">
    <div class="page-header">
      <h2>当前团队</h2>
    </div>
    <div class="content" v-loading="loading">
      <div v-if="!team" class="empty">
        <div>暂无团队，您可以加入或创建团队</div>
        <div v-if="teams.length > 0" class="team-list">
          <div class="list-title">您已加入的团队</div>
          <el-table :data="teams" size="small" style="width:100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="团队" min-width="180">
              <template #default="scope">
                <div class="row-mini">
                  <el-avatar :size="24" :src="scope.row.avatar_url || '/images/remix/group-line-gray.png'" />
                  <span class="name-mini">{{ scope.row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="成员" width="100" prop="member_count" />
            <el-table-column label="操作" width="160">
              <template #default="scope">
                <el-button size="small" type="primary" @click="switchTo(scope.row.id)">设为当前团队</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <div v-else class="team-card">
        <div class="row">
          <el-avatar :size="64" :src="team.avatar_url || '/images/remix/group-line-gray.png'" />
          <div class="info">
            <div class="name">{{ team.name || '未命名团队' }}</div>
            <div class="desc">{{ team.description || '暂无描述' }}</div>
            <div class="meta">
              <el-tag>{{ roleLabel }}</el-tag>
              <span class="meta-item">成员 {{ (team.members || []).length }}</span>
              <span class="meta-item">邀请码 {{ team.invite_code || '—' }}</span>
            </div>
          </div>
        </div>
        <div class="actions">
          <el-button type="primary" @click="goManage">团队管理</el-button>
          <el-button @click="goJoin">加入团队</el-button>
          <el-button @click="goCreate">创建团队</el-button>
        </div>
      </div>
    </div>
  </div>
  </template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()
const loading = ref(false)
const team = ref(null)
const teams = ref([])

const roleLabel = computed(() => {
  const r = String((team.value || {}).user_role || (team.value || {}).role || '')
  if (r === 'owner') return '创建者'
  if (r === 'admin') return '管理员'
  if (r) return '成员'
  return '未加入团队'
})

const fetchCurrent = async () => {
  loading.value = true
  try {
    const r = await api.get('/teams/current')
    if (r.data && r.data.success) {
      team.value = r.data.data
    } else {
      team.value = null
    }
  } catch (_) { team.value = null } finally { loading.value = false }
}

const fetchTeams = async () => {
  try {
    const r = await api.get('/teams')
    if (r.data && r.data.success) {
      teams.value = r.data.data || []
      if (!team.value && teams.value.length === 1) {
        await switchTo(teams.value[0].id)
      }
    } else { teams.value = [] }
  } catch (_) { teams.value = [] }
}

const goManage = () => router.push('/team/manage')
const goJoin = () => router.push('/team/join')
const goCreate = () => router.push('/team/create')

const switchTo = async (id) => {
  try {
    const r = await api.post(`/teams/${id}/switch`)
    if (r.data && r.data.success) {
      await fetchCurrent()
    }
  } catch (_) {}
}

onMounted(async () => { await fetchCurrent(); if (!team.value) await fetchTeams() })
</script>

<style scoped>
.content { background:#fff; border-radius:8px; padding:16px; }
.empty { color:#909399; text-align:center; padding:24px 0; }
.team-list { margin-top: 12px; }
.list-title { text-align:left; font-weight:600; color: var(--text-primary); margin-bottom:8px; }
.team-card { display:flex; flex-direction:column; gap:12px; }
.row { display:flex; align-items:center; gap:16px; }
.row-mini { display:flex; align-items:center; gap:8px; }
.info { display:flex; flex-direction:column; gap:6px; }
.name { font-weight:600; color: var(--text-primary); font-size:18px; }
.name-mini { color:#1a1a1a; }
.desc { color:#606266; }
.meta { display:flex; align-items:center; gap:12px; color:#909399; }
.meta-item { font-size:13px; }
.actions { display:flex; gap:8px; }
</style>
