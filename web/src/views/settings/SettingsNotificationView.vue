<template>
  <div class="settings-page">
    <div class="header">
      <h2>通知设置</h2>
      <div class="header-actions">
        <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
      </div>
    </div>

    <el-card class="section-card" shadow="never">
      <div class="section-title">基础通知</div>
      <el-form label-width="140px">
        <el-form-item label="开启通知">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="喂食提醒">
          <el-switch v-model="form.feedingReminder" />
        </el-form-item>
        <el-form-item label="清洁提醒">
          <el-switch v-model="form.cleaningReminder" />
        </el-form-item>
        <el-form-item label="健康提醒">
          <el-switch v-model="form.healthReminder" />
        </el-form-item>
        <el-form-item label="用药提醒">
          <el-switch v-model="form.medicationReminder" />
        </el-form-item>
        <el-form-item label="繁育提醒">
          <el-switch v-model="form.breedingReminder" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="section-card" shadow="never">
      <div class="section-title">提醒时间</div>
      <el-form label-width="140px">
        <el-form-item label="喂食提醒时间">
          <el-time-picker
            v-model="form.feedingReminderTime"
            placeholder="选择时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>
        <el-form-item label="清洁提醒时间">
          <el-time-picker
            v-model="form.cleaningReminderTime"
            placeholder="选择时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="section-card" shadow="never">
      <div class="section-title">健康提醒类型</div>
      <div class="health-types">
        <el-checkbox v-model="form.healthAlertPreferences.chick_care">雏鸟护理</el-checkbox>
        <el-checkbox v-model="form.healthAlertPreferences.incubation_advice">孵化建议</el-checkbox>
        <el-checkbox v-model="form.healthAlertPreferences.feeding_gap">喂食间隔异常</el-checkbox>
        <el-checkbox v-model="form.healthAlertPreferences.feeding_frequency_low">喂食频率偏低</el-checkbox>
        <el-checkbox v-model="form.healthAlertPreferences.weight_decline">体重下降</el-checkbox>
        <el-checkbox v-model="form.healthAlertPreferences.care_general_topic">通用健康提示</el-checkbox>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'

const loading = ref(false)
const saving = ref(false)

const form = ref({
  enabled: false,
  feedingReminder: true,
  healthReminder: true,
  cleaningReminder: true,
  medicationReminder: true,
  breedingReminder: true,
  feedingReminderTime: '08:00',
  cleaningReminderTime: '18:00',
  medicationReminderTime: '09:00',
  healthAlertPreferences: {
    chick_care: true,
    incubation_advice: true,
    feeding_gap: true,
    feeding_frequency_low: true,
    weight_decline: true,
    care_general_topic: true
  }
})

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await api.get('/reminders/settings')
    const data = (res.data && res.data.data) || res.data || {}
    const next = { ...form.value }
    if (typeof data.enabled !== 'undefined') next.enabled = !!data.enabled
    if (typeof data.feedingReminder !== 'undefined') next.feedingReminder = !!data.feedingReminder
    if (typeof data.healthReminder !== 'undefined') next.healthReminder = !!data.healthReminder
    if (typeof data.cleaningReminder !== 'undefined') next.cleaningReminder = !!data.cleaningReminder
    if (typeof data.medicationReminder !== 'undefined') next.medicationReminder = !!data.medicationReminder
    if (typeof data.breedingReminder !== 'undefined') next.breedingReminder = !!data.breedingReminder
    if (data.feedingReminderTime) next.feedingReminderTime = data.feedingReminderTime
    if (data.cleaningReminderTime) next.cleaningReminderTime = data.cleaningReminderTime
    if (data.medicationReminderTime) next.medicationReminderTime = data.medicationReminderTime
    if (data.healthAlertPreferences && typeof data.healthAlertPreferences === 'object') {
      next.healthAlertPreferences = {
        ...next.healthAlertPreferences,
        ...data.healthAlertPreferences
      }
    }
    form.value = next
  } catch (_) {
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  try {
    const payload = { ...form.value }
    try {
      const res = await api.put('/reminders/settings', payload)
      const ok = (res.data && res.data.success) || res.status === 200
      if (ok) ElMessage.success('已保存通知设置')
      else ElMessage.error((res.data && res.data.message) || '保存失败')
    } catch (e) {
      ElMessage.error('保存失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
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
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.health-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}
</style>

