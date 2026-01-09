<template>
  <div class="page-container">
    <div class="page-header">
      <h2>团队管理</h2>
    </div>
    <div class="content" v-loading="loading">
      <div v-if="!team" class="empty">暂无团队，请先加入或创建团队</div>
      <div v-else class="manage">
        <el-card class="overview" shadow="never">
          <div class="overview-row">
            <el-avatar :size="64" :src="team.avatar_url || '/images/remix/group-line-gray.png'" />
            <div class="info">
              <div class="name">{{ team.name || '未命名团队' }}</div>
              <div class="desc">{{ team.description || '暂无描述' }}</div>
              <div class="meta">
                <el-tag>{{ roleLabel }}</el-tag>
                <span class="meta-item">成员 {{ members.length }}</span>
                <span class="meta-item">邀请码 {{ team.invite_code || '—' }}</span>
                <el-button size="small" @click="copyInvite">复制邀请码</el-button>
              </div>
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="showEdit=true" :disabled="!isOwner">编辑</el-button>
            </div>
          </div>
        </el-card>

        <el-card class="members" shadow="never">
          <div class="section-title">成员管理</div>
          <el-table :data="members" style="width:100%" size="small">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="成员" min-width="180">
              <template #default="scope">
                <div class="user-cell">
                  <el-avatar :size="28" :src="scope.row.avatar_url || '/profile.png'" />
                  <span class="nickname">{{ scope.row.nickname || '未命名' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="分组" width="200">
              <template #default="scope">
                <el-select v-model="memberGroupMap[scope.row.id]" placeholder="未分组" size="small" :disabled="!canManageGroup" @change="val=>assignMemberGroup(scope.row, val)">
                  <el-option label="未分组" :value="null" />
                  <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="角色" width="120">
              <template #default="scope">
                <el-tag size="small">{{ roleDisplay(scope.row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template #default="scope">
                <el-button size="small" type="danger" :disabled="!isOwner || scope.row.role==='owner'" @click="removeMember(scope.row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card class="groups" shadow="never">
          <div class="section-title">权限管理</div>
          <div class="group-actions">
            <el-button type="primary" :disabled="!canManageGroup" @click="openCreateGroup">新建分组</el-button>
          </div>
          <el-table :data="groups" style="width:100%" size="small">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="分组" min-width="180" prop="name" />
            <el-table-column label="描述" min-width="200" prop="description" />
            <el-table-column label="范围" width="120">
              <template #default="scope">
                <el-tag size="small">{{ scope.row.permission_scope === 'team' ? '团队所有信息' : '本组信息' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="成员" min-width="220">
              <template #default="scope">
                <div class="group-members-list">
                  <div v-for="m in getGroupMembers(scope.row.id)" :key="m.id" class="member-tag">
                    <el-avatar :size="20" :src="m.avatar_url || '/profile.png'" />
                    <span class="nickname">{{ m.nickname || '未命名' }}</span>
                  </div>
                  <span v-if="getGroupMembers(scope.row.id).length === 0" class="no-members">暂无成员</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template #default="scope">
                <el-button size="small" :disabled="!canManageGroup" @click="openEditGroup(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" :disabled="!canManageGroup" @click="deleteGroup(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <div class="footer-actions">
          <el-button type="warning" :disabled="isOwner" @click="leaveTeam">离开团队</el-button>
          <el-button type="danger" :disabled="!isOwner && !isSuperAdmin" @click="dissolveTeam">解散团队</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showEdit" title="编辑团队" width="500px">
      <div class="avatar-edit">
        <div class="avatar-wrapper" @click="triggerTeamAvatarUpload">
          <img v-if="edit.avatar_url" :src="edit.avatar_url" class="avatar-img" />
          <div v-else class="upload-area">
            <span class="upload-text">点击上传头像</span>
          </div>
        </div>
        <div class="photo-tip">点击图片更换</div>
        <input ref="teamAvatarInput" type="file" accept="image/*" class="hidden-input" @change="handleTeamAvatarChange" />
      </div>
      <el-form :model="edit" label-width="90px">
        <el-form-item label="团队名称"><el-input v-model="edit.name" /></el-form-item>
        <el-form-item label="团队描述"><el-input type="textarea" v-model="edit.description" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit=false">取消</el-button>
        <el-button type="primary" @click="confirmUpdate">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showGroupDialog" :title="groupDialogTitle" width="640px">
      <el-form :model="groupForm" label-width="100px">
        <el-form-item label="分组名称"><el-input v-model="groupForm.name" /></el-form-item>
        <el-form-item label="分组描述"><el-input v-model="groupForm.description" /></el-form-item>
        <el-form-item label="权限范围">
          <el-select v-model="groupForm.permission_scope" style="width:200px">
            <el-option label="查看/编辑本组所有信息" value="group" />
            <el-option label="查看/编辑团队所有信息" value="team" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组成员">
          <el-select v-model="selectedGroupMemberIds" multiple filterable placeholder="选择成员加入该分组" style="width:100%">
            <el-option v-for="m in groupMemberCandidates" :key="m.id" :label="m.nickname || ('用户'+m.id)" :value="m.id">
              <div class="user-cell">
                <el-avatar :size="20" :src="m.avatar_url || '/profile.png'" />
                <span class="nickname">{{ m.nickname || '未命名' }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <div class="perm-section">
          <div class="perm-title">权限清单</div>
          <div class="perm-grid">
            <div v-for="cat in permissionCatalog" :key="cat.key" class="perm-group">
              <div class="perm-group-title">{{ cat.label }}</div>
              <div class="perm-items">
                <el-checkbox 
                  v-for="ch in cat.children" 
                  :key="ch.key"
                  v-model="permissionSelections[ch.key]"
                >{{ ch.label }}</el-checkbox>
              </div>
            </div>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showGroupDialog=false">取消</el-button>
        <el-button type="primary" :disabled="!canManageGroup || !groupForm.name.trim()" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const loading = ref(false)
const team = ref(null)
const members = ref([])
const groups = ref([])
const memberGroupMap = ref({})
const showEdit = ref(false)
const edit = ref({ name: '', description: '', avatar_url: '' })
const isAdmin = computed(() => String((team.value || {}).user_role || (team.value || {}).role || '') === 'admin')
const canManageGroup = computed(() => isOwner.value || isAdmin.value)

const showGroupDialog = ref(false)
const groupDialogMode = ref('create')
const groupDialogTitle = computed(() => groupDialogMode.value === 'create' ? '新建分组' : '编辑分组')
const groupForm = ref({ id: null, name: '', description: '', permission_scope: 'group' })
const permissionCatalog = ref([])
const permissionSelections = ref({})
const selectedGroupMemberIds = ref([])
const originalGroupMemberIds = ref([])
const groupMemberCandidates = computed(() => {
  const gid = groupForm.value && groupForm.value.id
  const list = Array.isArray(members.value) ? members.value : []
  if (groupDialogMode.value === 'create') return list.filter(m => !m.group_id)
  return list.filter(m => !m.group_id || String(m.group_id) === String(gid))
})

const authStore = useAuthStore()
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')

const roleLabel = computed(() => {
  const r = String((team.value || {}).user_role || (team.value || {}).role || '')
  if (r === 'owner') return '创建者'
  if (r === 'admin') return '管理员'
  if (r) return '成员'
  return '未加入团队'
})
const isOwner = computed(() => String((team.value || {}).user_role || (team.value || {}).role || '') === 'owner')

const roleDisplay = (r) => r === 'owner' ? '创建者' : (r === 'admin' ? '管理员' : '成员')

const fetchCurrent = async () => {
  loading.value = true
  try {
    const r = await api.get('/teams/current')
    if (r.data && r.data.success) {
      team.value = r.data.data
      edit.value.name = team.value.name || ''
      edit.value.description = team.value.description || ''
      edit.value.avatar_url = team.value.avatar_url || ''
      const id = team.value.id
      if (id) {
        const membersRes = await api.get(`/teams/${id}/members`)
        if (membersRes.data && membersRes.data.success) {
          members.value = (membersRes.data.data || []).map(m => ({
            id: m.id,
            nickname: m.nickname,
            avatar_url: m.avatar_url,
            role: m.role,
            group_id: m.group_id,
            group_name: m.group_name
          }))
          memberGroupMap.value = {}
          members.value.forEach(m => { memberGroupMap.value[m.id] = m.group_id || null })
        }
        const d = await api.get(`/teams/${id}`)
        if (d.data && d.data.success) {
          team.value = Object.assign({}, team.value || {}, d.data.data || {})
          edit.value.avatar_url = team.value.avatar_url || edit.value.avatar_url
        }
        await fetchGroups()
        await fetchPermissionCatalog()
      }
    } else { team.value = null }
  } catch (_) { team.value = null } finally { loading.value = false }
}

const fetchGroups = async () => {
  try {
    const id = team.value && team.value.id
    if (!id) return
    const r = await api.get(`/teams/${id}/groups`)
    if (r.data && r.data.success) { groups.value = r.data.data || [] } else { groups.value = [] }
  } catch (_) { groups.value = [] }
}

const fetchPermissionCatalog = async () => {
  try {
    const id = team.value && team.value.id
    if (!id) return
    const r = await api.get(`/teams/${id}/permissions/catalog`)
    if (r.data && r.data.success) { permissionCatalog.value = r.data.data || [] }
  } catch (_) { permissionCatalog.value = [] }
}

const copyInvite = async () => {
  const code = team.value && team.value.invite_code
  if (!code) return
  try {
    await navigator.clipboard.writeText(String(code))
    ElMessage.success('已复制')
  } catch (_) { ElMessage.success('已复制') }
}

const confirmUpdate = async () => {
  const id = team.value && team.value.id
  if (!id || !isOwner.value) return
  try {
    const r = await api.put(`/teams/${id}`, { name: edit.value.name, description: edit.value.description, avatar_url: edit.value.avatar_url })
    if (r.data && r.data.success) { ElMessage.success('已更新'); showEdit.value = false; fetchCurrent() } else { ElMessage.error((r.data && r.data.message) || '更新失败') }
  } catch (_) { ElMessage.error('更新失败') }
}


const removeMember = async (row) => {
  if (!isOwner.value || row.role === 'owner') return
  const ok = await ElMessageBox.confirm('确认移除此成员？', '移除成员', { type: 'warning' }).catch(() => false)
  if (!ok) return
  try {
    const id = team.value && team.value.id
    const r = await api.delete(`/teams/${id}/members/${row.id}`)
    if (r.data && r.data.success) { ElMessage.success('已移除'); fetchCurrent() } else { ElMessage.error((r.data && r.data.message) || '操作失败') }
  } catch (_) { ElMessage.error('操作失败') }
}

const assignMemberGroup = async (row, gid) => {
  if (!canManageGroup.value) return
  try {
    const id = team.value && team.value.id
    const r = await api.put(`/teams/${id}/members/${row.id}/group`, { group_id: gid })
    if (r.data && r.data.success) { ElMessage.success('分组已更新'); await fetchCurrent() } else { ElMessage.error((r.data && r.data.message) || '更新失败') }
  } catch (_) { ElMessage.error('更新失败') }
}

const leaveTeam = async () => {
  if (isOwner.value) { ElMessage.warning('创建者无法离开团队，请先解散或转让') ; return }
  const ok = await ElMessageBox.confirm('确认离开当前团队？', '离开团队', { type: 'warning' }).catch(() => false)
  if (!ok) return
  try {
    const id = team.value && team.value.id
    const r = await api.post(`/teams/${id}/leave`)
    if (r.data && r.data.success) { ElMessage.success('已离开团队') } else { ElMessage.error((r.data && r.data.message) || '操作失败') }
  } catch (_) { ElMessage.error('操作失败') }
}

const dissolveTeam = async () => {
  if (!(isOwner.value || isSuperAdmin.value)) return
  const ok = await ElMessageBox.confirm('解散后不可恢复，确认解散？', '解散团队', { type: 'error' }).catch(() => false)
  if (!ok) return
  try {
    const id = team.value && team.value.id
    const r = await api.delete(`/teams/${id}`)
    if (r.data && r.data.success) { ElMessage.success('已解散团队') } else { ElMessage.error((r.data && r.data.message) || '操作失败') }
  } catch (_) { ElMessage.error('操作失败') }
}

onMounted(fetchCurrent)

const teamAvatarInput = ref(null)
const triggerTeamAvatarUpload = () => { if (teamAvatarInput.value) teamAvatarInput.value.click() }
const handleTeamAvatarChange = async (e) => {
  const files = e.target && e.target.files
  if (!files || !files[0]) return
  const file = files[0]
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', 'teams')
  try {
    const res = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data && res.data.success && res.data.data && res.data.data.url) {
      edit.value.avatar_url = '/uploads/' + res.data.data.url
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error((res.data && res.data.message) || '上传失败')
    }
  } catch (_) { ElMessage.error('上传失败') } finally { if (teamAvatarInput.value) teamAvatarInput.value.value = '' }
}

const getGroupMembers = (gid) => {
  const list = Array.isArray(members.value) ? members.value : []
  return list.filter(m => String(m.group_id || '') === String(gid))
}

const buildDefaultSelections = (scope) => {
  const result = {}
  const list = Array.isArray(permissionCatalog.value) ? permissionCatalog.value : []
  list.forEach(group => {
    const isTeam = String(group.key) === 'team'
    const children = group.children || []
    children.forEach(ch => { result[ch.key] = scope === 'team' ? false : (!isTeam) })
  })
  return result
}

const openCreateGroup = () => {
  groupDialogMode.value = 'create'
  showGroupDialog.value = true
  groupForm.value = { id: null, name: '', description: '', permission_scope: 'group' }
  permissionSelections.value = buildDefaultSelections('group')
  selectedGroupMemberIds.value = []
  originalGroupMemberIds.value = []
}

const openEditGroup = (g) => {
  groupDialogMode.value = 'edit'
  showGroupDialog.value = true
  groupForm.value = { id: g.id, name: g.name || '', description: g.description || '', permission_scope: g.permission_scope || 'group' }
  const perms = g.permissions || {}
  permissionSelections.value = Object.assign(buildDefaultSelections(groupForm.value.permission_scope), perms)
  const selected = (Array.isArray(members.value) ? members.value : []).filter(m => m.group_id && String(m.group_id) === String(g.id))
  selectedGroupMemberIds.value = selected.map(x => x.id)
  originalGroupMemberIds.value = selected.map(x => x.id)
}

const saveGroup = async () => {
  if (!canManageGroup.value) return
  const id = team.value && team.value.id
  if (!id) return
  const payload = { name: groupForm.value.name, description: groupForm.value.description, permission_scope: groupForm.value.permission_scope, permissions: permissionSelections.value }
  try {
    let r
    if (groupDialogMode.value === 'create') r = await api.post(`/teams/${id}/groups`, payload)
    else r = await api.put(`/teams/${id}/groups/${groupForm.value.id}`, payload)
    if (r.data && r.data.success) {
      const gid = groupDialogMode.value === 'create' ? (r.data.data && r.data.data.id) : groupForm.value.id
      const selectedIds = Array.isArray(selectedGroupMemberIds.value) ? selectedGroupMemberIds.value : []
      for (const uid of selectedIds) {
        try { await api.put(`/teams/${id}/members/${uid}/group`, { group_id: gid }) } catch (e) {}
      }
      if (groupDialogMode.value === 'edit') {
        const toRemove = (Array.isArray(originalGroupMemberIds.value) ? originalGroupMemberIds.value : []).filter(uid => !selectedIds.includes(uid))
        for (const uid of toRemove) {
          try { await api.put(`/teams/${id}/members/${uid}/group`, { group_id: null }) } catch (e) {}
        }
      }
      ElMessage.success('已保存')
      showGroupDialog.value = false
      await fetchGroups()
      await fetchCurrent()
    } else { ElMessage.error((r.data && r.data.message) || '保存失败') }
  } catch (_) { ElMessage.error('保存失败') }
}

const deleteGroup = async (g) => {
  if (!canManageGroup.value) return
  const ok = await ElMessageBox.confirm('确认删除该分组？', '删除分组', { type: 'warning' }).catch(() => false)
  if (!ok) return
  try {
    const id = team.value && team.value.id
    const r = await api.delete(`/teams/${id}/groups/${g.id}`)
    if (r.data && r.data.success) { ElMessage.success('已删除'); await fetchGroups(); await fetchCurrent() } else { ElMessage.error((r.data && r.data.message) || '删除失败') }
  } catch (_) { ElMessage.error('删除失败') }
}
</script>

<style scoped>
.content { background:#fff; border-radius:8px; padding:16px; }
.empty { color:#909399; text-align:center; padding:24px 0; }
.manage { display:flex; flex-direction:column; gap:16px; }
.overview-row { display:flex; align-items:center; gap:16px; }
.info { display:flex; flex-direction:column; gap:6px; }
.name { font-weight:600; color: var(--text-primary); font-size:18px; }
.desc { color:#606266; }
.meta { display:flex; align-items:center; gap:12px; color:#909399; }
.meta-item { font-size:13px; }
.right-actions { margin-left:auto; }
.section-title { font-weight:600; margin-bottom:8px; }
.user-cell { display:flex; align-items:center; gap:8px; }
.nickname { color:#1a1a1a; }
.footer-actions { display:flex; gap:8px; justify-content:flex-end; }
.group-actions { margin-bottom:8px; }
.perm-section { margin-top:8px; }
.perm-title { font-weight:600; margin-bottom:8px; }
.perm-grid { display:flex; flex-wrap:wrap; gap:16px; }
.perm-group { min-width:240px; }
.perm-group-title { font-weight:500; margin-bottom:6px; }
.perm-items { display:flex; flex-direction:column; gap:6px; }
.group-members-cell { display:flex; align-items:center; gap:8px; color: #303133; font-weight: 500; }
.member-list { display:flex; flex-direction:column; gap:6px; min-width:220px; }
.member-item { display:flex; align-items:center; gap:8px; }
.member-list .nickname { color:#333333; font-weight:500; font-size:14px; }
.member-list, .member-item { background: transparent; }
.group-members-list { display:flex; flex-wrap:wrap; gap:8px; }
.member-tag { display:flex; align-items:center; gap:6px; background-color:#f0f2f5; padding:4px 8px 4px 4px; border-radius:14px; border:1px solid #dcdfe6; }
.member-tag .nickname { font-size:12px; color:#303133; }
.no-members { color:#909399; font-size:12px; }
.avatar-edit { display:flex; flex-direction:column; align-items:center; gap:8px; margin-bottom:8px; }
.avatar-wrapper { width:120px; height:120px; border-radius:12px; overflow:hidden; border:2px dashed #d1d5db; background:#f3f4f6; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.avatar-img { width:100%; height:100%; object-fit:cover; }
.upload-area { display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af; }
.upload-text { font-size:12px; }
.photo-tip { text-align:center; font-size:12px; color:#9ca3af; }
.hidden-input { display:none; }
</style>
