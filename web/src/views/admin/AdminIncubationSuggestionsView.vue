<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <h2>孵化建议管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate">新增建议</el-button>
      </div>
    </div>
    <div v-if="!isAdminOrSuper" class="no-access">仅管理员或超级管理员可访问该页面</div>
    <div v-else>
      <div class="toolbar">
        <el-select v-model="filterSpeciesId" placeholder="全部品种" clearable filterable style="width: 220px">
          <el-option v-for="s in speciesList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-button @click="fetchList" :loading="loading">刷新</el-button>
      </div>
      <el-table :data="items" v-loading="loading" style="width: 100%">
        <el-table-column prop="species_name" label="品种" width="160" />
        <el-table-column prop="day_start" label="开始天" width="90" />
        <el-table-column prop="day_end" label="结束天" width="90" />
        <el-table-column prop="temperature_target" label="目标温度" width="110" />
        <el-table-column prop="humidity_low" label="最低湿度" width="110" />
        <el-table-column prop="humidity_high" label="最高湿度" width="110" />
        <el-table-column prop="turning_required" label="需翻蛋" width="90">
          <template #default="s"><el-tag size="small" :type="s.row.turning_required ? 'success' : 'info'">{{ s.row.turning_required ? '是' : '否' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="candling_required" label="需照蛋" width="90">
          <template #default="s"><el-tag size="small" :type="s.row.candling_required ? 'success' : 'info'">{{ s.row.candling_required ? '是' : '否' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="tips" label="提示" />
        <el-table-column label="操作" width="140">
          <template #default="scope">
            <el-button link type="success" @click="openEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="showDialog" :title="editing ? '编辑建议' : '新增建议'" width="600px">
        <el-form :model="form" label-width="120px">
          <el-form-item label="品种">
            <el-select v-model="form.species_id" filterable clearable placeholder="选择品种">
              <el-option v-for="s in speciesList" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="天数范围">
            <div class="row-2">
              <el-input-number v-model="form.day_start" :min="1" />
              <span class="dash">—</span>
              <el-input-number v-model="form.day_end" :min="form.day_start || 1" />
            </div>
          </el-form-item>
          <el-form-item label="温度目标/低/高">
            <div class="row-3">
              <el-input v-model="form.temperature_target" placeholder="目标" />
              <el-input v-model="form.temperature_low" placeholder="低" />
              <el-input v-model="form.temperature_high" placeholder="高" />
            </div>
          </el-form-item>
          <el-form-item label="湿度低/高">
            <div class="row-2">
              <el-input v-model="form.humidity_low" placeholder="低" />
              <el-input v-model="form.humidity_high" placeholder="高" />
            </div>
          </el-form-item>
          <el-form-item label="需翻蛋/照蛋">
            <el-switch v-model="form.turning_required" active-text="翻蛋" />
            <el-switch v-model="form.candling_required" active-text="照蛋" style="margin-left:12px" />
          </el-form-item>
          <el-form-item label="提示">
            <el-input type="textarea" v-model="form.tips" :rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showDialog=false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const isAdminOrSuper = computed(() => ['admin','super_admin'].includes(String((authStore.user||{}).role||'user')))
const items = ref([])
const loading = ref(false)
const filterSpeciesId = ref()
const speciesList = ref([])
const showDialog = ref(false)
const editing = ref(false)
const form = ref({ species_id: null, day_start: 1, day_end: 21, temperature_target: '', temperature_low: '', temperature_high: '', humidity_low: '', humidity_high: '', turning_required: true, candling_required: true, tips: '' })

const fetchSpecies = async () => {
  try { const r = await api.get('/parrots/species'); if (r.data?.success) speciesList.value = r.data.data || [] } catch (_) {}
}
const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/incubation/suggestions', { params: { species_id: filterSpeciesId.value || undefined } })
    if (r.data?.success) { const d = r.data.data || {}; items.value = d.items || [] } else ElMessage.error(r.data?.message||'加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const openCreate = () => { editing.value = false; form.value = { species_id: null, day_start: 1, day_end: 21, temperature_target: '', temperature_low: '', temperature_high: '', humidity_low: '', humidity_high: '', turning_required: true, candling_required: true, tips: '' }; showDialog.value = true }
const openEdit = (row) => { editing.value = true; form.value = { ...row }; showDialog.value = true }
const save = async () => {
  try {
    const payload = { ...form.value }
    if (editing.value) {
      const r = await api.put(`/incubation/suggestions/${payload.id}`, payload)
      if (r.data?.success) { ElMessage.success('更新成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'更新失败')
    } else {
      const r = await api.post('/incubation/suggestions', payload)
      if (r.data?.success) { ElMessage.success('创建成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'创建失败')
    }
  } catch (_) { ElMessage.error('保存失败') }
}
const remove = async (id) => {
  try { await ElMessageBox.confirm('确认删除该建议？', '提示', { type: 'warning' }); const r = await api.delete(`/incubation/suggestions/${id}`); if (r.data?.success) { ElMessage.success('已删除'); fetchList() } else ElMessage.error(r.data?.message||'删除失败') } catch (_) {}
}

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); await fetchSpecies(); if (isAdminOrSuper.value) fetchList() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.toolbar { display:flex; gap:12px; margin-bottom:12px; }
.row-2 { display:flex; align-items:center; gap:8px; }
.row-3 { display:flex; align-items:center; gap:8px; }
.dash { color:#909399; }
</style>
