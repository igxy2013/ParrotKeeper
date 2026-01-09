<template>
  <el-dialog v-model="visible" width="460px" class="limit-dialog" :show-close="false">
    <template #header>
      <div class="limit-header-gradient">
        <div class="limit-header-row">
          <span class="limit-title">{{ titleComputed }}</span>
        </div>
      </div>
    </template>
    <div class="limit-body" v-if="mode === 'limit'">
      <div class="limit-tip">已达到当前版本可添加的鹦鹉数量上限</div>
      <div class="limit-count-pill" v-if="limitCount">当前上限：{{ limitCount }} 只</div>
      <div class="limit-hint">升级会员或切换高级团队后可继续添加</div>
      <div class="limit-actions">
        <el-button v-if="showUpgrade" type="primary" class="limit-action-btn" @click="onUpgrade">查看会员权益</el-button>
      </div>
      <div class="limit-divider" v-if="showRedeem">或者</div>
      <div class="limit-redeem" v-if="showRedeem">
        <el-input v-model="code" placeholder="输入兑换码" class="redeem-input" />
        <el-button class="redeem-btn" :disabled="!code" @click="onRedeem">兑换</el-button>
      </div>
    </div>
    <div class="limit-body" v-else>
      <div class="limit-tip">{{ message || '提示' }}</div>
    </div>
    <template #footer>
      <el-button class="limit-btn" @click="onCancel">{{ cancelText }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'limit' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  limitCount: { type: Number, default: 0 },
  cancelText: { type: String, default: '我知道了' },
  showUpgrade: { type: Boolean, default: true },
  showRedeem: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'cancel', 'upgrade', 'redeem'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = !!v })
watch(visible, v => emit('update:modelValue', !!v))

const titleComputed = computed(() => props.title || (props.mode === 'limit' ? '数量限制提示' : '提示'))
const code = ref('')

const onCancel = () => { emit('cancel'); visible.value = false }
const onUpgrade = () => emit('upgrade')
const onRedeem = () => emit('redeem', { code: code.value })
</script>

<style scoped>
.limit-dialog :deep(.el-dialog__header) { padding: 0; }
.limit-header-gradient { background: linear-gradient(135deg, #60a5fa, #34d399); padding: 12px 16px; }
.limit-header-row { display: flex; align-items: center; justify-content: space-between; }
.limit-title { color: #fff; font-weight: 600; }
.limit-body { padding: 12px 16px; }
.limit-tip { color: #303133; font-weight: 600; margin-bottom: 8px; }
.limit-count-pill { display: inline-block; background: #f9fafb; color: #374151; border: 1px solid #e5e7eb; border-radius: 999px; padding: 4px 12px; margin-bottom: 8px; }
.limit-hint { color: #606266; margin-bottom: 12px; }
.limit-actions { display: flex; gap: 8px; margin-bottom: 8px; }
.limit-action-btn { border-radius: 12px; }
.limit-divider { color: #909399; font-size: 12px; text-align: center; margin: 8px 0; }
.limit-redeem { display: flex; gap: 8px; align-items: center; }
.redeem-input { flex: 1; }
.redeem-btn { border-radius: 12px; }
.limit-btn { border-radius: 12px; }
</style>
