<template>
  <div class="page-container">
    <div class="join-card-wrapper">
      <el-card class="join-card" shadow="hover">
        <div class="card-header">
          <div class="icon-bg">
            <el-icon :size="32" color="#409EFF"><UserFilled /></el-icon>
          </div>
          <h2>加入团队</h2>
          <p class="subtitle">请输入8位团队邀请码加入现有团队</p>
        </div>
        
        <div class="form-section">
          <div class="input-wrapper">
            <el-input 
              v-model="inviteCode" 
              placeholder="请输入邀请码" 
              maxlength="8" 
              @input="onInput"
              class="code-input"
              size="large"
            >
              <template #prefix>
                <el-icon><Key /></el-icon>
              </template>
            </el-input>
          </div>
          
          <div class="actions">
            <el-button 
              type="primary" 
              size="large" 
              class="submit-btn" 
              :disabled="inviteCode.length !== 8 || joining" 
              :loading="joining"
              @click="join"
            >
              {{ joining ? '加入中...' : '立即加入' }}
            </el-button>
          </div>
        </div>

        <div class="divider">
          <span>如何获取邀请码？</span>
        </div>

        <div class="help-section">
          <div class="help-item">
            <el-icon class="help-icon"><ChatDotRound /></el-icon>
            <div class="help-text">
              <h4>联系管理员</h4>
              <p>直接联系团队创建者或管理员获取</p>
            </div>
          </div>
          <div class="help-item">
            <el-icon class="help-icon"><Setting /></el-icon>
            <div class="help-text">
              <h4>查看设置</h4>
              <p>管理员可在“团队管理”页面查看邀请码</p>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, Key, ChatDotRound, Setting } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()
const inviteCode = ref('')
const joining = ref(false)

const onInput = (v) => { inviteCode.value = String(v || '').toUpperCase() }

const join = async () => {
  if (joining.value) return
  if (inviteCode.value.length !== 8) { ElMessage.warning('请输入8位邀请码'); return }
  joining.value = true
  try {
    const r = await api.post('/teams/join', { invite_code: inviteCode.value })
    if (r.data && r.data.success) {
      ElMessage.success('加入团队成功')
      router.push('/team/manage')
    } else {
      ElMessage.error((r.data && r.data.message) || '加入失败')
    }
  } catch (e) {
    ElMessage.error('网络错误，请重试')
  } finally { joining.value = false }
}

onMounted(async () => {
  try {
    const r = await api.get('/teams')
    if (r.data && r.data.success) {
      const teams = r.data.data || []
      if (teams.length > 0) {
        ElMessage.warning('您已在团队中，无法加入新团队')
        router.replace('/team/current')
      }
    }
  } catch (_) {}
})
</script>

<style scoped>
.page-container {
  min-height: calc(100vh - 120px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.join-card-wrapper {
  width: 100%;
  max-width: 480px;
}

.join-card {
  border-radius: 16px;
  overflow: hidden;
}

.card-header {
  text-align: center;
  padding: 24px 0 16px;
}

.icon-bg {
  width: 64px;
  height: 64px;
  background: #ecf5ff;
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
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.form-section {
  padding: 0 20px;
  margin-bottom: 24px;
}

.input-wrapper {
  margin-bottom: 20px;
}

.code-input :deep(.el-input__wrapper) {
  padding: 4px 12px;
  border-radius: 8px;
}

.code-input :deep(.el-input__inner) {
  font-size: 18px;
  letter-spacing: 2px;
  text-align: center;
  font-weight: 600;
}

.submit-btn {
  width: 100%;
  border-radius: 8px;
  font-size: 16px;
  padding: 20px 0;
}

.divider {
  position: relative;
  text-align: center;
  margin: 0 20px 24px;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #ebeef5;
  z-index: 0;
}

.divider span {
  position: relative;
  background: #fff;
  padding: 0 12px;
  color: #909399;
  font-size: 12px;
  z-index: 1;
}

.help-section {
  background: #f8f9fa;
  margin: 0 -20px -20px;
  padding: 20px 30px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.help-icon {
  margin-top: 2px;
  color: #909399;
}

.help-text h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #1a1a1a;
}

.help-text p {
  margin: 0;
  font-size: 12px;
  color: #606266;
}
</style>
