<template>
  <div class="page-container">
    <div class="page-header">
      <h2>团队管理</h2>
    </div>
    
    <div class="content-wrapper" v-loading="loading">
      <div v-if="!team" class="empty-state">
        <el-empty description="暂无团队信息">
          <el-button type="primary" @click="$router.push('/team/current')">返回我的团队</el-button>
        </el-empty>
      </div>
      
      <div v-else class="manage-container">
        <!-- 团队概览卡片 -->
        <el-card class="team-overview-card" shadow="never">
          <div class="overview-content">
            <div class="avatar-section">
              <el-avatar :size="80" :src="team.avatar_url || '/group-line-gray.png'" shape="square" />
            </div>
            <div class="info-section">
              <div class="info-header">
                <h1 class="team-name">{{ team.name || '未命名团队' }}</h1>
                <el-tag :type="roleTagType" effect="dark" size="small">{{ roleLabel }}</el-tag>
              </div>
              <p class="team-desc">{{ team.description || '暂无描述' }}</p>
              <div class="meta-row">
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>{{ members.length }} 成员</span>
                </div>
                <div class="meta-item invite-code-wrapper" @click="copyInvite">
                  <span class="label">邀请码:</span>
                  <span class="code">{{ team.invite_code || '—' }}</span>
                  <el-icon class="copy-icon"><CopyDocument /></el-icon>
                </div>
              </div>
            </div>
            <div class="action-section">
              <el-button type="primary" :icon="Edit" @click="showEdit=true" :disabled="!isOwner">编辑资料</el-button>
            </div>
          </div>
        </el-card>

        <!-- 管理功能 Tabs -->
        <el-card class="management-tabs-card" shadow="never">
          <el-tabs v-model="activeTab" class="custom-tabs">
            <!-- 成员管理 Tab -->
            <el-tab-pane label="成员管理" name="members">
              <div class="tab-pane-content">
                <div class="pane-header">
                  <div class="pane-title">团队成员 ({{ members.length }})</div>
                  <div class="pane-actions">
                    <!-- 预留搜索框位置 -->
                  </div>
                </div>
                
                <el-table :data="members" style="width:100%" class="custom-table">
                  <el-table-column label="成员信息" min-width="200">
                    <template #default="scope">
                      <div class="user-cell">
                        <el-avatar :size="36" :src="scope.row.avatar_url || '/profile.png'" />
                        <div class="user-info">
                          <div class="nickname">{{ scope.row.nickname || '未命名用户' }}</div>
                          <div class="user-id">ID: {{ scope.row.id }}</div>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  
                  <el-table-column label="所属分组" min-width="180">
                    <template #default="scope">
                      <el-select 
                        v-model="memberGroupMap[scope.row.id]" 
                        placeholder="选择分组" 
                        size="default" 
                        :disabled="!canManageGroup" 
                        @change="val=>assignMemberGroup(scope.row, val)"
                        class="group-select"
                      >
                        <el-option label="未分组" value="" />
                        <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
                      </el-select>
                    </template>
                  </el-table-column>
                  
                  <el-table-column label="角色" width="120">
                    <template #default="scope">
                      <el-tag :type="getRoleTagType(scope.row.role)" size="small" effect="plain">
                        {{ roleDisplay(scope.row.role) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  
                  <el-table-column label="操作" width="120" align="right">
                    <template #default="scope">
                      <el-button 
                        size="small" 
                        type="danger" 
                        plain
                        :disabled="!isOwner || scope.row.role==='owner'" 
                        @click="removeMember(scope.row)"
                      >移除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <!-- 分组权限 Tab -->
            <el-tab-pane label="分组与权限" name="groups">
              <div class="tab-pane-content">
                <div class="pane-header">
                  <div class="pane-title">分组列表</div>
                  <div class="pane-actions">
                    <el-button type="primary" :icon="Plus" :disabled="!canManageGroup" @click="openCreateGroup">新建分组</el-button>
                  </div>
                </div>

                <div v-if="groups.length === 0" class="empty-groups">
                  <el-empty description="暂无分组，创建分组以管理成员权限" :image-size="100" />
                </div>
                
                <div v-else class="groups-grid">
                  <el-card v-for="g in groups" :key="g.id" class="group-card" shadow="hover">
                    <div class="group-card-header">
                      <div class="group-name">{{ g.name }}</div>
                      <el-tag size="small" :type="g.permission_scope === 'team' ? 'warning' : 'info'">
                        {{ g.permission_scope === 'team' ? '全队权限' : '组内权限' }}
                      </el-tag>
                    </div>
                    <div class="group-desc">{{ g.description || '暂无描述' }}</div>
                    
                    <div class="group-members-preview">
                      <div class="preview-label">成员 ({{ getGroupMembers(g.id).length }})</div>
                      <div class="member-list">
                        <template v-if="getGroupMembers(g.id).length > 0">
                          <div class="member-item" v-for="m in getGroupMembers(g.id)" :key="m.id">
                            <el-avatar :size="20" :src="m.avatar_url || '/profile.png'" />
                            <span class="member-name">{{ m.nickname || ('用户'+m.id) }}</span>
                          </div>
                        </template>
                        <span v-else class="no-members-text">暂无</span>
                      </div>
                    </div>

                    <div class="group-card-actions">
                      <el-button size="small" type="primary" :disabled="!canManageGroup" @click="openEditGroup(g)">编辑设置</el-button>
                      <el-button size="small" type="danger" :disabled="!canManageGroup" @click="deleteGroup(g)">删除</el-button>
                    </div>
                  </el-card>
                </div>
              </div>
            </el-tab-pane>

            <!-- 高级设置 Tab -->
            <el-tab-pane label="设置" name="settings">
              <div class="tab-pane-content settings-pane">
                <div class="settings-section">
                  <h3>危险区域</h3>
                  <div class="danger-zone">
                    <div class="danger-item">
                      <div class="danger-info">
                        <h4>离开团队</h4>
                        <p>放弃团队成员身份，将无法访问团队内容</p>
                      </div>
                      <el-button type="warning" plain :disabled="isOwner" @click="leaveTeam">离开团队</el-button>
                    </div>
                    <el-divider />
                    <div class="danger-item">
                      <div class="danger-info">
                        <h4>解散团队</h4>
                        <p>永久删除团队及其所有数据，此操作不可恢复</p>
                      </div>
                      <el-button type="danger" plain :disabled="!isOwner && !isSuperAdmin" @click="dissolveTeam">解散团队</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </div>
    </div>

    <!-- 编辑团队弹窗 -->
    <el-dialog v-model="showEdit" title="编辑团队资料" width="500px" align-center destroy-on-close>
      <div class="edit-dialog-content">
        <div class="avatar-edit">
          <div class="avatar-wrapper" @click="triggerTeamAvatarUpload">
            <el-avatar :size="80" :src="edit.avatar_url || '/group-line-gray.png'" shape="square" />
            <div class="avatar-overlay">
              <el-icon><Camera /></el-icon>
            </div>
          </div>
          <div class="photo-tip">点击更换头像</div>
          <input ref="teamAvatarInput" type="file" accept="image/*" class="hidden-input" @change="handleTeamAvatarChange" />
        </div>
        <el-form :model="edit" label-position="top">
          <el-form-item label="团队名称">
            <el-input v-model="edit.name" maxlength="20" show-word-limit />
          </el-form-item>
          <el-form-item label="团队描述">
            <el-input type="textarea" v-model="edit.description" :rows="3" maxlength="100" show-word-limit />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showEdit=false">取消</el-button>
        <el-button type="primary" @click="confirmUpdate">保存更改</el-button>
      </template>
    </el-dialog>

    <!-- 分组编辑/新建弹窗 -->
    <el-dialog v-model="showGroupDialog" :title="groupDialogTitle" width="680px" align-center top="5vh">
      <div class="group-dialog-body">
        <el-form :model="groupForm" label-position="top">
          <el-row :gutter="20">
            <el-col :span="16">
              <el-form-item label="分组名称">
                <el-input v-model="groupForm.name" placeholder="例如：保育员、财务" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="权限范围">
                <el-select v-model="groupForm.permission_scope" style="width:100%">
                  <el-option label="本组信息" value="group" />
                  <el-option label="团队所有信息" value="team" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="分组描述">
            <el-input v-model="groupForm.description" placeholder="简要描述该分组的职责" />
          </el-form-item>

          <el-form-item label="添加成员">
            <el-select 
              v-model="selectedGroupMemberIds" 
              multiple 
              filterable 
              placeholder="搜索并选择成员加入" 
              style="width:100%"
              collapse-tags
              collapse-tags-tooltip
            >
              <el-option v-for="m in groupMemberCandidates" :key="m.id" :label="m.nickname || ('用户'+m.id)" :value="m.id">
                <div class="user-select-item">
                  <el-avatar :size="20" :src="m.avatar_url || '/profile.png'" />
                  <span class="nickname">{{ m.nickname || '未命名' }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          
          <div class="perm-section">
            <div class="perm-section-header">
              <span class="perm-title">权限配置</span>
              <span class="perm-tip">勾选该分组拥有的操作权限</span>
            </div>
            <div class="perm-grid">
              <div v-for="cat in permissionCatalog" :key="cat.key" class="perm-category-card">
                <div class="cat-header">{{ cat.label }}</div>
                <div class="cat-items">
                  <el-checkbox 
                    v-for="ch in cat.children" 
                    :key="ch.key"
                    v-model="permissionSelections[ch.key]"
                    :label="ch.label"
                    class="perm-checkbox"
                  />
                </div>
              </div>
            </div>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showGroupDialog=false">取消</el-button>
        <el-button type="primary" :disabled="!canManageGroup || !groupForm.name.trim()" @click="saveGroup">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, User, CopyDocument, Plus, Camera } from '@element-plus/icons-vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const activeTab = ref('members')
const loading = ref(false)
const team = ref(null)
const members = ref([])
const groups = ref([])
const memberGroupMap = ref({})
const showEdit = ref(false)
const edit = ref({ name: '', description: '', avatar_url: '' })
const isAdmin = computed(() => String((team.value || {}).user_role || (team.value || {}).role || '') === 'admin')

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
  return '未加入'
})

const roleTagType = computed(() => {
  const r = String((team.value || {}).user_role || (team.value || {}).role || '')
  if (r === 'owner') return 'warning'
  if (r === 'admin') return 'success'
  return 'info'
})

const isOwner = computed(() => String((team.value || {}).user_role || (team.value || {}).role || '') === 'owner')
const canManageGroup = computed(() => isOwner.value || isAdmin.value)

const roleDisplay = (r) => r === 'owner' ? '创建者' : (r === 'admin' ? '管理员' : '成员')
const getRoleTagType = (r) => r === 'owner' ? 'warning' : (r === 'admin' ? 'success' : 'info')

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
          members.value.forEach(m => { memberGroupMap.value[m.id] = m.group_id || '' })
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
    ElMessage.success('邀请码已复制')
  } catch (_) { ElMessage.success('邀请码已复制') }
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
    const payload = { group_id: gid === '' ? null : gid }
    const r = await api.put(`/teams/${id}/members/${row.id}/group`, payload)
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
    if (r.data && r.data.success) { 
      ElMessage.success('已离开团队')
      window.location.reload()
    } else { ElMessage.error((r.data && r.data.message) || '操作失败') }
  } catch (_) { ElMessage.error('操作失败') }
}

const dissolveTeam = async () => {
  if (!(isOwner.value || isSuperAdmin.value)) return
  const ok = await ElMessageBox.confirm('解散后不可恢复，确认解散？', '解散团队', { type: 'error' }).catch(() => false)
  if (!ok) return
  try {
    const id = team.value && team.value.id
    const r = await api.delete(`/teams/${id}`)
    if (r.data && r.data.success) { 
      ElMessage.success('已解散团队')
      window.location.reload()
    } else { ElMessage.error((r.data && r.data.message) || '操作失败') }
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
.page-container {
  padding: 0 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.manage-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 团队概览 */
.team-overview-card {
  border: none;
  background: #fff;
  border-radius: 12px;
}

.overview-content {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.action-section {
  align-self: flex-start;
}

.avatar-section {
  flex-shrink: 0;
}

.info-section {
  flex: 1;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.team-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.team-desc {
  color: #606266;
  font-size: 14px;
  margin: 0 0 16px;
  max-width: 600px;
}

.meta-row {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.invite-code-wrapper {
  cursor: pointer;
  padding: 2px 8px;
  background: #f4f4f5;
  border-radius: 4px;
  transition: all 0.2s;
}

.invite-code-wrapper:hover {
  background: #ecf5ff;
  color: var(--el-color-primary);
}

.invite-code-wrapper .code {
  font-family: monospace;
  font-weight: 600;
}

/* Tabs */
.management-tabs-card {
  border: none;
  border-radius: 12px;
  min-height: 500px;
}

.custom-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.custom-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #ebeef5;
}

.tab-pane-content {
  padding: 24px 0;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pane-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 表格 */
.custom-table {
  --el-table-header-bg-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nickname {
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-id {
  font-size: 12px;
  color: #909399;
}

/* 分组网格 */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.group-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.group-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.group-name {
  font-weight: 600;
  font-size: 16px;
  color: #1a1a1a;
}

.group-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 16px;
  height: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.group-members-preview {
  margin-bottom: 16px;
}

.preview-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.stack-avatar {
  border: 2px solid #fff;
  margin-right: -8px;
}

.more-count {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.no-members-text {
  font-size: 12px;
  color: #c0c4cc;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f4f4f5;
  color: #606266;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}

.member-name {
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-card-actions {
  border-top: 1px solid #ebeef5;
  margin: 0 -20px -20px;
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: #fafafa;
}

/* 设置 */
.settings-section {
  max-width: 800px;
}

.settings-section h3 {
  margin-bottom: 16px;
  color: #1a1a1a;
}

.danger-zone {
  border: 1px solid #fde2e2;
  border-radius: 8px;
  background: #fef0f0;
  padding: 24px;
}

.danger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.danger-info h4 {
  margin: 0 0 4px;
  color: #f56c6c;
}

.danger-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

/* 弹窗 */
.avatar-edit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: #fff;
  font-size: 24px;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.photo-tip {
  font-size: 12px;
  color: #909399;
}

.hidden-input {
  display: none;
}

.user-select-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 权限卡片 */
.perm-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.perm-section-header {
  margin-bottom: 12px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.perm-title {
  font-weight: 600;
  color: #1a1a1a;
}

.perm-tip {
  font-size: 12px;
  color: #909399;
}

.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.perm-category-card {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  padding: 12px;
}

.cat-header {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f0f2f5;
}

.cat-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.perm-checkbox {
  margin-right: 0;
  height: 24px;
}

.perm-checkbox :deep(.el-checkbox__label) {
  font-size: 13px;
}
</style>
