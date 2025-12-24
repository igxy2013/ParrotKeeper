<template>
  <div class="settings-page">
    <div class="header">
      <h2>收支类别</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openAdd">新增类别</el-button>
      </div>
    </div>

    <el-card class="section-card" shadow="never">
      <div class="tabs">
        <el-radio-group v-model="activeTab" @change="handleTabChange">
          <el-radio-button value="expense">支出类别</el-radio-button>
          <el-radio-button value="income">收入类别</el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="categories" v-loading="loading" style="width: 100%; margin-top: 16px;">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.type === 'expense' ? 'danger' : 'success'">
              {{ scope.row.type === 'expense' ? '支出' : '收入' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_custom" label="系统内置" width="120">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.is_custom ? 'info' : 'success'">
              {{ scope.row.is_custom ? '自定义' : '系统' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button
              v-if="scope.row.is_custom"
              link
              type="danger"
              size="small"
              @click="handleDelete(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDialog" title="新增类别" width="400px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="newName" placeholder="请输入类别名称" />
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

const activeTab = ref('expense')
const categories = ref([])
const loading = ref(false)
const showDialog = ref(false)
const newName = ref('')
const saving = ref(false)

const translateSystemCategory = (name) => {
  const map = {
    food: '餐饮',
    medical: '医疗',
    toys: '玩具',
    cage: '笼舍',
    baby_bird: '雏鸟',
    breeding_bird: '种鸟',
    other: '其他',
    breeding_sale: '繁殖出售',
    bird_sale: '鸟类出售',
    service: '服务',
    competition: '比赛',
    supplies: '用品'
  }
  return map[name] || name
}

const fetchCategories = async () => {
  loading.value = true
  try {
    const res = await api.get('/categories/transactions', {
      params: { type: activeTab.value }
    })
    const data = (res.data && res.data.data) || res.data || []
    const list = Array.isArray(data) ? data : []
    categories.value = list.map(item => {
      const next = { ...item }
      if (!next.is_custom && typeof next.name === 'string') {
        next.name = translateSystemCategory(next.name)
      }
      return next
    })
  } catch (_) {
    categories.value = []
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  fetchCategories()
}

const openAdd = () => {
  newName.value = ''
  showDialog.value = true
}

const save = async () => {
  if (!newName.value.trim()) {
    ElMessage.warning('请输入名称')
    return
  }
  saving.value = true
  try {
    const res = await api.post('/categories/transactions', {
      name: newName.value,
      type: activeTab.value
    })
    const ok = res.data && res.data.success
    if (ok) {
      ElMessage.success('添加成功')
      showDialog.value = false
      fetchCategories()
    } else {
      ElMessage.error((res.data && res.data.message) || '添加失败')
    }
  } catch (_) {
    ElMessage.error('添加失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该类别吗？', '提示', {
      type: 'warning'
    })
  } catch (_) {
    return
  }
  try {
    const res = await api.delete(`/categories/transactions/${row.id}`)
    const ok = res.data && res.data.success
    if (ok) {
      ElMessage.success('删除成功')
      fetchCategories()
    } else {
      ElMessage.error((res.data && res.data.message) || '删除失败')
    }
  } catch (_) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-card {
  margin-bottom: 16px;
}
.tabs {
  margin-bottom: 8px;
}
</style>
