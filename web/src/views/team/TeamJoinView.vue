<template>
  <div class="page-container">
    <div class="page-header">
      <h2>加入团队</h2>
    </div>
    <div class="content">
      <div class="form-row">
        <el-input v-model="inviteCode" placeholder="请输入8位邀请码" maxlength="8" @input="onInput" />
        <el-button type="primary" :disabled="inviteCode.length !== 8 || joining" @click="join">{{ joining ? '加入中...' : '加入团队' }}</el-button>
        <el-button @click="inviteCode=''">清空</el-button>
      </div>
      <el-card class="help-card" shadow="never">
        <div class="help-title">如何获取邀请码？</div>
        <div class="help-list">
          <div>1. 联系团队管理员或创建者</div>
          <div>2. 管理员在团队设置中获取邀请码</div>
          <div>3. 输入8位邀请码即可加入团队</div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'

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
    } else {
      ElMessage.error((r.data && r.data.message) || '加入失败')
    }
  } catch (e) {
    ElMessage.error('网络错误，请重试')
  } finally { joining.value = false }
}
</script>

<style scoped>
.content { background:#fff; border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:16px; }
.form-row { display:flex; gap:8px; }
.help-card { }
.help-title { font-weight:600; margin-bottom:8px; }
.help-list { color:#606266; display:flex; flex-direction:column; gap:4px; }
</style>
