<template>
  <div class="page-container">
    <div class="create-card-wrapper">
      <el-card class="create-card" shadow="hover">
        <div class="card-header">
          <div class="icon-bg">
            <el-icon :size="32" color="#67C23A"><Plus /></el-icon>
          </div>
          <h2>创建新团队</h2>
          <p class="subtitle">创建一个新的团队空间，开始协作管理</p>
        </div>

        <div class="form-section">
          <el-form :model="form" label-position="top" class="form">
            <el-form-item label="团队名称">
              <el-input 
                v-model="form.name" 
                maxlength="20" 
                show-word-limit 
                placeholder="给你的团队起个名字" 
                size="large"
              >
                <template #prefix>
                  <el-icon><Flag /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item label="团队描述">
              <el-input 
                v-model="form.description" 
                type="textarea" 
                :rows="4"
                maxlength="100" 
                show-word-limit 
                placeholder="简单介绍一下这个团队（可选）" 
                resize="none"
              />
            </el-form-item>

            <div class="actions">
              <el-button 
                type="primary" 
                size="large" 
                class="submit-btn" 
                :disabled="submitting || !valid" 
                :loading="submitting"
                @click="submit"
              >
                {{ submitting ? '创建中...' : '立即创建' }}
              </el-button>
            </div>
          </el-form>
        </div>
      </el-card>

      <div class="tips-section">
        <p><el-icon><InfoFilled /></el-icon> 创建团队后，您将自动成为该团队的管理员</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { Plus, Flag, InfoFilled } from '@element-plus/icons-vue'
import api from '@/api/axios'

const router = useRouter()
const form = ref({ name: '', description: '' })
const submitting = ref(false)
const valid = computed(() => String(form.value.name || '').trim().length > 0)

onMounted(async () => {
  try {
    const r = await api.get('/teams')
    if (r.data && r.data.success) {
      const teams = r.data.data || []
      const hasTeam = teams.length > 0
      if (hasTeam) {
        ElMessage.warning('您已在团队中，无法创建团队')
        router.replace('/team/current')
      }
    }
  } catch (_) {}
})

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
.page-container {
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.create-card-wrapper {
  width: 100%;
  max-width: 520px;
}

.create-card {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
}

.card-header {
  text-align: center;
  padding: 24px 0 16px;
}

.icon-bg {
  width: 64px;
  height: 64px;
  background: #f0f9eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.card-header h2 {
  font-size: 24px;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.subtitle {
  color: #ffffff;
  font-size: 14px;
  margin: 0;
}

.form-section {
  padding: 0 20px 20px;
}

.form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #1a1a1a;
}

.submit-btn {
  width: 100%;
  border-radius: 8px;
  font-size: 16px;
  padding: 20px 0;
  margin-top: 12px;
}

.tips-section {
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.tips-section p {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
}
</style>
