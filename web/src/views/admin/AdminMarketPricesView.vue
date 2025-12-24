<template>
  <div class="admin-page">
    <div class="header">
      <h2>参考价格管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate">新增参考价</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <div class="toolbar">
        <el-input v-model="filterSpecies" placeholder="品种关键字" style="width:200px"/>
        <el-select v-model="filterGender" placeholder="性别" clearable style="width:140px">
          <el-option label="公" value="male" />
          <el-option label="母" value="female" />
        </el-select>
        <el-button @click="fetchList" :loading="loading">查询</el-button>
      </div>
      <el-table :data="items" v-loading="loading" style="width: 100%">
        <el-table-column prop="species" label="品种" width="160" />
        <el-table-column prop="color_name" label="羽色" width="160" />
        <el-table-column prop="gender" label="性别" width="100">
          <template #default="s">{{ s.row.gender==='male'?'公':(s.row.gender==='female'?'母':'—') }}</template>
        </el-table-column>
        <el-table-column prop="reference_price" label="参考价" width="120" />
        <el-table-column prop="currency" label="币种" width="100" />
        <el-table-column prop="source" label="来源" />
        <el-table-column label="操作" width="160">
          <template #default="scope">
            <el-button link type="success" @click="openEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="showDialog" :title="editing?'编辑参考价':'新增参考价'" width="600px">
        <el-form :model="form" label-width="120px">
          <el-form-item label="品种"><el-input v-model="form.species" /></el-form-item>
          <el-form-item label="羽色"><el-input v-model="form.color_name" /></el-form-item>
          <el-form-item label="性别">
            <el-select v-model="form.gender" clearable placeholder="不限">
              <el-option label="公" value="male" />
              <el-option label="母" value="female" />
            </el-select>
          </el-form-item>
          <el-form-item label="币种"><el-input v-model="form.currency" placeholder="CNY" /></el-form-item>
          <el-form-item label="参考价"><el-input-number v-model="form.reference_price" :min="0" /></el-form-item>
          <el-form-item label="来源"><el-input v-model="form.source" /></el-form-item>
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
const isSuperAdmin = computed(() => String((authStore.user || {}).role || 'user') === 'super_admin')
const items = ref([])
const loading = ref(false)
const filterSpecies = ref('')
const filterGender = ref()
const showDialog = ref(false)
const editing = ref(false)
const form = ref({ species: '', color_name: '', gender: '', currency: 'CNY', reference_price: 0, source: '' })

const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/market/prices', { params: { species: filterSpecies.value || undefined, gender: filterGender.value || undefined } })
    if (r.data?.success) items.value = (r.data.data?.prices)||[]; else ElMessage.error(r.data?.message||'加载失败')
  } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const openCreate = () => { editing.value=false; form.value={ species:'', color_name:'', gender:'', currency:'CNY', reference_price:0, source:'' }; showDialog.value=true }
const openEdit = (row) => { editing.value=true; form.value={ ...row }; showDialog.value=true }
const save = async () => {
  try {
    const payload = { ...form.value }
    if (editing.value) {
      const r = await api.put(`/market/prices/${payload.id}`, payload)
      if (r.data?.success) { ElMessage.success('更新成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'更新失败')
    } else {
      const r = await api.post('/market/prices', payload)
      if (r.data?.success) { ElMessage.success('创建成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'创建失败')
    }
  } catch (_) { ElMessage.error('保存失败') }
}
const remove = async (id) => {
  try { await ElMessageBox.confirm('确认删除该参考价？', '提示', { type:'warning' }); const r = await api.delete(`/market/prices/${id}`); if (r.data?.success) { ElMessage.success('已删除'); fetchList() } else ElMessage.error(r.data?.message||'删除失败') } catch (_) {}
}

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchList() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.toolbar { display:flex; gap:12px; margin-bottom:12px; }
</style>
