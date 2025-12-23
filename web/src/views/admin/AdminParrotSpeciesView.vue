<template>
  <div class="admin-page">
    <div class="header">
      <div class="header-left">
        <el-button link @click="goBack">返回</el-button>
        <h2>鹦鹉品种管理</h2>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate">新增品种</el-button>
      </div>
    </div>
    <div v-if="!isSuperAdmin" class="no-access">仅超级管理员可访问该页面</div>
    <div v-else>
      <el-table :data="items" v-loading="loading" style="width:100%">
        <el-table-column prop="name" label="名称" width="180" />
        <el-table-column prop="care_level" label="养护难度" width="120" />
        <el-table-column prop="avg_lifespan_min" label="寿命最短" width="120" />
        <el-table-column prop="avg_lifespan_max" label="寿命最长" width="120" />
        <el-table-column prop="avg_size_min_cm" label="体长最短(cm)" width="140" />
        <el-table-column prop="avg_size_max_cm" label="体长最长(cm)" width="140" />
        <el-table-column prop="reference_weight_min_g" label="参考重最轻(g)" width="160" />
        <el-table-column prop="reference_weight_max_g" label="参考重最重(g)" width="160" />
        <el-table-column label="操作" width="160">
          <template #default="scope">
            <el-button link type="success" @click="openEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="showDialog" :title="editing?'编辑品种':'新增品种'" width="600px">
        <el-form :model="form" label-width="140px">
          <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="养护难度">
            <el-select v-model="form.care_level">
              <el-option label="容易" value="easy" />
              <el-option label="中等" value="medium" />
              <el-option label="困难" value="hard" />
            </el-select>
          </el-form-item>
          <el-form-item label="寿命范围(年)">
            <div class="row-2">
              <el-input-number v-model="form.avg_lifespan_min" :min="0" />
              <el-input-number v-model="form.avg_lifespan_max" :min="form.avg_lifespan_min||0" />
            </div>
          </el-form-item>
          <el-form-item label="体长范围(cm)">
            <div class="row-2">
              <el-input-number v-model="form.avg_size_min_cm" :min="0" />
              <el-input-number v-model="form.avg_size_max_cm" :min="form.avg_size_min_cm||0" />
            </div>
          </el-form-item>
          <el-form-item label="参考体重范围(g)">
            <div class="row-2">
              <el-input-number v-model="form.reference_weight_min_g" :min="0" />
              <el-input-number v-model="form.reference_weight_max_g" :min="form.reference_weight_min_g||0" />
            </div>
          </el-form-item>
          <el-form-item label="描述"><el-input type="textarea" v-model="form.description" :rows="3" /></el-form-item>
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
const showDialog = ref(false)
const editing = ref(false)
const form = ref({ name:'', care_level:'medium', avg_lifespan_min:null, avg_lifespan_max:null, avg_size_min_cm:null, avg_size_max_cm:null, reference_weight_min_g:null, reference_weight_max_g:null, description:'' })

const fetchList = async () => {
  loading.value = true
  try { const r = await api.get('/parrots/species'); if (r.data?.success) items.value = r.data.data || []; else ElMessage.error(r.data?.message||'加载失败') } catch (_) { ElMessage.error('加载失败') } finally { loading.value = false }
}
const openCreate = () => { editing.value=false; form.value={ name:'', care_level:'medium', avg_lifespan_min:null, avg_lifespan_max:null, avg_size_min_cm:null, avg_size_max_cm:null, reference_weight_min_g:null, reference_weight_max_g:null, description:'' }; showDialog.value=true }
const openEdit = (row) => { editing.value=true; form.value={ ...row }; showDialog.value=true }
const save = async () => {
  try { const payload = { ...form.value }; if (editing.value) { const r = await api.put(`/parrots/species/${payload.id}`, payload); if (r.data?.success) { ElMessage.success('更新成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'更新失败') } else { const r = await api.post('/parrots/species', payload); if (r.data?.success) { ElMessage.success('创建成功'); showDialog.value=false; fetchList() } else ElMessage.error(r.data?.message||'创建失败') } } catch (_) { ElMessage.error('保存失败') }
}
const remove = async (id) => { try { await ElMessageBox.confirm('确认删除该品种？若存在引用将失败', '提示', { type:'warning' }); const r = await api.delete(`/parrots/species/${id}`); if (r.data?.success) { ElMessage.success('已删除'); fetchList() } else ElMessage.error(r.data?.message||'删除失败') } catch (_) {} }

const goBack = () => { router.push('/admin') }

onMounted(async () => { await (authStore.refreshProfile && authStore.refreshProfile()); if (isSuperAdmin.value) fetchList() })
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; color: var(--text-primary); }
.header-left { display:flex; align-items:center; gap:8px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.row-2 { display:flex; align-items:center; gap:8px; }
</style>
