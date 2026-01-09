<template>
  <div class="page-container">
    <div class="page-header">
      <h2>创建团队</h2>
    </div>
    <div class="content">
      <el-form :model="form" label-width="100px" class="form">
        <el-form-item label="团队名称">
          <el-input v-model="form.name" maxlength="20" show-word-limit placeholder="请输入团队名称" />
        </el-form-item>
        <el-form-item label="团队描述">
          <el-input v-model="form.description" type="textarea" maxlength="100" show-word-limit placeholder="请输入团队描述（可选）" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :disabled="submitting || !valid" @click="submit">{{ submitting ? '创建中...' : '创建团队' }}</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()
const form = ref({ name: '', description: '' })
const submitting = ref(false)
const valid = computed(() => String(form.value.name || '').trim().length > 0)

const submit = async () => {
  if (!valid.value || submitting.value) return
  submitting.value = true
  try {
    const r = await api.post('/teams', { name: form.value.name.trim(), description: String(form.value.description || '') })
    if (r.data && r.data.success) {
      ElMessage.success('团队创建成功')
      router.push('/team/manage')
    } else {
      ElMessage.error((r.data && r.data.message) || '创建失败')
    }
  } catch (_) { ElMessage.error('网络错误，请重试') } finally { submitting.value = false }
}
</script>

<style scoped>
.content { background:#fff; border-radius:8px; padding:16px; }
.form { max-width: 560px; }
</style>
