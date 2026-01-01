<template>
  <div class="admin-page page-container">
    <div class="page-header">
      <div class="header-left">
        <h2>邀请码管理</h2>
      </div>
    </div>

    <div v-if="!isSuperAdmin" class="no-access">
      仅超级管理员可访问该页面
    </div>
    <div v-else>
      <el-card class="toolbar" shadow="never">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="单个邀请码可用次数">
            <el-input-number v-model="newMaxUses" :min="1" :max="999" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="creating" @click="handleCreate">生成邀请码</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <el-table :data="items" style="width: 100%">
          <el-table-column prop="code" label="邀请码" min-width="200" />
          <el-table-column prop="used_count" label="已使用次数" width="120" />
          <el-table-column prop="max_uses" label="最大次数" width="120" />
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.is_active ? 'success' : 'info'">
                {{ scope.row.is_active ? '可用' : '已停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" min-width="180" />
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <el-button type="success" link @click="copyCode(scope.row.code)">复制</el-button>
              <el-button
                type="warning"
                link
                @click="toggleActive(scope.row)"
              >{{ scope.row.is_active ? '停用' : '启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const items = ref([])
const loading = ref(false)
const creating = ref(false)
const newMaxUses = ref(30)

const isSuperAdmin = computed(
  () => String((authStore.user || {}).role || 'user') === 'super_admin'
)

const fetchList = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin/invitation-codes')
    if (r.data && r.data.success) {
      const d = r.data.data || {}
      items.value = d.items || []
    } else {
      ElMessage.error(r.data?.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  creating.value = true
  try {
    const r = await api.post('/admin/invitation-codes', {
      max_uses: newMaxUses.value
    })
    if (r.data && r.data.success) {
      ElMessage.success('邀请码已生成')
      await fetchList()
    } else {
      ElMessage.error(r.data?.message || '生成失败')
    }
  } catch (e) {
    ElMessage.error('生成失败')
  } finally {
    creating.value = false
  }
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制')
  }
}

const toggleActive = async (row) => {
  const target = !row.is_active
  try {
    const r = await api.put(`/admin/invitation-codes/${row.id}`, {
      is_active: target
    })
    if (r.data && r.data.success) {
      row.is_active = target
      ElMessage.success('状态已更新')
    } else {
      ElMessage.error(r.data?.message || '更新失败')
    }
  } catch (e) {
    ElMessage.error('更新失败')
  }
}

onMounted(async () => {
  await (authStore.refreshProfile && authStore.refreshProfile())
  if (isSuperAdmin.value) {
    await fetchList()
  }
})
</script>

<style scoped>
.admin-page { padding-bottom: 20px; }
.no-access { background: #fff; border-radius: 8px; padding: 16px; color: #909399; }
.toolbar { margin-bottom: 12px; }
</style>
