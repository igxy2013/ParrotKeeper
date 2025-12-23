<template>
  <div class="settings-container">
    <h2>模式设置</h2>
    <div class="settings-content">
      <el-form label-width="120px">
        <el-form-item label="当前模式">
          <el-radio-group v-model="mode">
            <el-radio-button label="personal">个人模式</el-radio-button>
            <el-radio-button label="team">团队模式</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <div class="mode-description">
          <p v-if="mode === 'personal'">
            当前处于<strong>个人模式</strong>。您将看到您个人的鹦鹉数据和记录。
          </p>
          <p v-else>
            当前处于<strong>团队模式</strong>。您将看到团队共享的鹦鹉数据和记录。
          </p>
        </div>

        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="saving">保存并应用</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const mode = ref('personal')
const saving = ref(false)

onMounted(() => {
  const savedMode = localStorage.getItem('user_mode')
  if (savedMode && ['personal', 'team'].includes(savedMode)) {
    mode.value = savedMode
  }
})

const saveSettings = () => {
  saving.value = true
  try {
    // Save to local storage
    localStorage.setItem('user_mode', mode.value)
    
    ElMessage.success('设置已保存，正在切换模式...')
    
    // Reload page to ensure all API requests use the new mode
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  min-height: 400px;
}
.settings-content {
  margin-top: 24px;
  max-width: 600px;
}
.mode-description {
  margin-left: 120px;
  margin-bottom: 24px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
}
</style>
