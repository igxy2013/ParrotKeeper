<template>
  <div class="settings-page page-container">
    <div class="page-header">
      <h2>食物类型</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openAdd">新增食物类型</el-button>
      </div>
    </div>

    <el-card class="section-card" shadow="never">
      <el-table :data="items" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="typeLabel" label="类型" width="120" />
        <el-table-column prop="unit" label="计量单位" width="120" />
        <el-table-column label="操作" width="160">
          <template #default="scope">
            <el-button link type="success" size="small" @click="openEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDialog" :title="isEditing ? '编辑食物类型' : '新增食物类型'" width="480px">
      <el-form label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" placeholder="请选择类型" @change="handleTypeChange">
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="计量单位">
          <el-radio-group v-model="form.unit">
            <el-radio-button value="g">克(g)</el-radio-button>
            <el-radio-button value="ml">毫升(ml)</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/axios'

const items = ref([])
const loading = ref(false)
const showDialog = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const saving = ref(false)

const typeOptions = [
  { value: 'seed', label: '种子' },
  { value: 'pellet', label: '颗粒' },
  { value: 'fruit', label: '水果' },
  { value: 'vegetable', label: '蔬菜' },
  { value: 'nut', label: '坚果' },
  { value: 'supplement', label: '保健品' },
  { value: 'milk_powder', label: '奶粉' }
]

const form = ref({
  name: '',
  type: '',
  unit: 'g'
})

const decorateList = (list) => {
  return (list || []).map(item => {
    const t = item.type || ''
    const opt = typeOptions.find(o => o.value === t)
    return {
      ...item,
      typeLabel: opt ? opt.label : t
    }
  })
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.get('/categories/feed-types')
    const data = (res.data && res.data.data) || res.data || []
    items.value = decorateList(Array.isArray(data) ? data : [])
  } catch (_) {
    items.value = []
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    name: '',
    type: '',
    unit: 'g'
  }
}

const openAdd = () => {
  isEditing.value = false
  editingId.value = null
  resetForm()
  showDialog.value = true
}

const openEdit = (row) => {
  isEditing.value = true
  editingId.value = row.id
  form.value = {
    name: row.name || '',
    type: row.type || '',
    unit: row.unit === 'ml' ? 'ml' : 'g'
  }
  showDialog.value = true
}

const handleTypeChange = (val) => {
  if (val === 'milk_powder' || val === 'supplement') {
    form.value.unit = 'ml'
  }
}

const save = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入名称')
    return
  }
  saving.value = true
  const payload = {
    name: form.value.name,
    type: form.value.type,
    unit: form.value.unit || 'g'
  }
  try {
    if (isEditing.value && editingId.value) {
      const res = await api.put(`/categories/feed-types/${editingId.value}`, payload)
      const ok = res.data && res.data.success
      if (ok) {
        ElMessage.success('更新成功')
        showDialog.value = false
        fetchList()
      } else {
        ElMessage.error((res.data && res.data.message) || '更新失败')
      }
    } else {
      const res = await api.post('/categories/feed-types', payload)
      const ok = res.data && res.data.success
      if (ok) {
        ElMessage.success('添加成功')
        showDialog.value = false
        fetchList()
      } else {
        ElMessage.error((res.data && res.data.message) || '添加失败')
      }
    }
  } catch (_) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该食物类型吗？', '提示', {
      type: 'warning'
    })
  } catch (_) {
    return
  }
  try {
    const res = await api.delete(`/categories/feed-types/${row.id}`)
    const ok = res.data && res.data.success
    if (ok) {
      ElMessage.success('删除成功')
      fetchList()
    } else {
      ElMessage.error((res.data && res.data.message) || '删除失败')
    }
  } catch (_) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.settings-page {}
.section-card {
  margin-bottom: 16px;
}
</style>
