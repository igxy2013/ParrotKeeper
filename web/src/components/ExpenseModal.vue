<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
      <div class="modal-card">
        <div class="modal-header-gradient">
          <div class="modal-header-row">
            <span class="modal-title">{{ isEdit ? '编辑收支记录' : '添加收支记录' }}</span>
            <div class="modal-close-btn" @click="handleClose">
              <el-icon class="modal-close-icon"><Close /></el-icon>
            </div>
          </div>
        </div>

        <div class="modal-scroll">
          <div class="form-section">
            <div class="form-item">
              <label class="form-label">记录类型 *</label>
              <div class="type-row">
                <div 
                  class="type-btn type-expense" 
                  :class="{ active: form.type === '支出' }"
                  @click="form.type = '支出'"
                >支出</div>
                <div 
                  class="type-btn type-income" 
                  :class="{ active: form.type === '收入' }"
                  @click="form.type = '收入'"
                >收入</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-item half">
                <label class="form-label">类别 *</label>
                <div class="category-grid">
                  <div
                    v-for="opt in formCategoryOptions"
                    :key="opt.value"
                    class="category-item"
                    :class="{ active: form.category === opt.value }"
                    @click="form.category = opt.value"
                  >
                    <div class="category-icon-wrapper">
                      <img v-if="opt.icon" :src="opt.icon" alt="" class="category-icon" />
                      <span v-else class="category-icon-text">{{ opt.iconText }}</span>
                    </div>
                    <div class="category-label">{{ opt.label }}</div>
                  </div>
                </div>
              </div>
              <div class="form-item half">
                <label class="form-label">金额 (¥) *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  v-model="form.amount"
                  class="text-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-item half">
                <label class="form-label">日期 *</label>
                <el-date-picker
                  v-model="form.date"
                  type="date"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  :editable="false"
                  :clearable="false"
                  placeholder="选择日期"
                  style="width: 100%"
                />
              </div>
              <div class="form-item half">
                <label class="form-label">备注</label>
                <input 
                  v-model="form.description"
                  class="text-input"
                  placeholder="可填写用途、来源等说明"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" @click="handleClose">取消</button>
          <button 
            class="btn-primary" 
            :class="{ 'is-disabled': saving }" 
            @click="handleSubmit"
            :disabled="saving"
          >{{ isEdit ? '保存修改' : '立即添加' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'

const props = defineProps({
  modelValue: Boolean,
  record: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])

const saving = ref(false)

const form = ref({
  id: '',
  type: '支出',
  category: 'food',
  amount: '',
  date: '',
  description: ''
})

const expenseCategoryOptionsForDialog = [
	{ label: '食物', value: 'food', icon: '/ri-restaurant-fill-orange.png' },
	{ label: '医疗', value: 'medical', icon: '/ri-nurse-line-purple.png' },
	{ label: '玩具', value: 'toys', icon: '/ri-heart-fill-red.png' },
	{ label: '笼具', value: 'cage', icon: '/ri-home-5-fill-green.png' },
	{ label: '幼鸟', value: 'baby_bird', icon: '/parrot-avatar-yellow.svg' },
	{ label: '种鸟', value: 'breeding_bird', icon: '/parrot-avatar-green.svg' },
	{ label: '其他', value: 'other', icon: '/ri-information-fill-amber.png' }
]

const incomeCategoryOptionsForDialog = [
	{ label: '繁殖销售', value: 'breeding_sale', icon: '/ri-shopping-bag-fill-blue.png' },
	{ label: '鸟类销售', value: 'bird_sale', icon: '/parrot-avatar-yellow.svg' },
	{ label: '服务收入', value: 'service', icon: '/service-line.png' },
	{ label: '比赛奖金', value: 'competition', icon: '/trophy-line-orange.png' },
	{ label: '其他收入', value: 'other', icon: '/ri-information-fill-green.png' }
]

const formCategoryOptions = computed(() => {
  return form.value.type === '收入' ? incomeCategoryOptionsForDialog : expenseCategoryOptionsForDialog
})

const isEdit = computed(() => !!props.record)

const getToday = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  return `${y}-${m}-${day}`
}

const resetForm = () => {
  form.value = {
    id: '',
    type: '支出',
    category: 'food',
    amount: '',
    date: getToday(),
    description: ''
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.record) {
      form.value = {
        id: props.record.id || '',
        type: props.record.type || '支出',
        category: props.record.category || (props.record.type === '收入' ? 'breeding_sale' : 'food'),
        amount: String(props.record.amount ?? ''),
        date: props.record.date || getToday(),
        description: props.record.description || ''
      }
    } else {
      resetForm()
    }
  }
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = async () => {
  if (!form.value.amount || !form.value.category || !form.value.date) {
    ElMessage.error('请填写完整的记录信息')
    return
  }
  let amountNumber
  try {
    amountNumber = parseFloat(form.value.amount)
  } catch (e) {
    ElMessage.error('金额格式不正确')
    return
  }
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    ElMessage.error('金额必须大于0')
    return
  }

  const isIncome = form.value.type === '收入'
  const payload = {
    category: form.value.category,
    amount: amountNumber,
    description: form.value.description || ''
  }
  if (isIncome) {
    payload.income_date = form.value.date
  } else {
    payload.expense_date = form.value.date
  }

  saving.value = true
  try {
    if (isEdit.value && form.value.id) {
      const actualId = String(form.value.id).replace(/^(expense_|income_)/, '')
      const url = isIncome ? `/expenses/incomes/${actualId}` : `/expenses/${actualId}`
      const res = await api.put(url, payload)
      if (res.data && res.data.success) {
        ElMessage.success('更新成功')
        handleClose()
        emit('success')
      } else {
        ElMessage.error(res.data?.message || '更新失败')
      }
    } else {
      const url = isIncome ? '/expenses/incomes' : '/expenses'
      const res = await api.post(url, payload)
      if (res.data && res.data.success) {
        ElMessage.success('添加成功')
        handleClose()
        emit('success')
      } else {
        ElMessage.error(res.data?.message || '添加失败')
      }
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  resetForm()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.modal-header-gradient {
  background: linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%);
  padding: 16px 20px;
  flex-shrink: 0;
}
.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
}
.modal-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.modal-close-btn:hover { background: rgba(255,255,255,0.3); }
.modal-close-icon { color: #ffffff; font-size: 16px; }

.modal-scroll { flex: 1; overflow-y: auto; min-height: 0; }

.form-section { padding: 24px; }
.form-row { display: flex; gap: 12px; margin-bottom: 16px; }
.form-item { margin-bottom: 16px; }
.form-item.half { flex: 1; margin-bottom: 0; }
.form-label { font-size: 13px; color: #374151; font-weight: 600; margin-bottom: 6px; display: block; }

.text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0 12px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  color: #1f2937;
}
.text-input:focus { outline: none; border-color: #26A69A; box-shadow: 0 0 0 2px rgba(38, 166, 154, 0.1); }

.full-width-select { width: 100%; }
:deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #d1d5db !important; border-radius: 12px; height: 32px; }
:deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #26A69A, 0 0 0 4px rgba(38, 166, 154, 0.1) !important; }
:deep(.el-select .el-input__wrapper),
:deep(.el-date-editor .el-input__wrapper) { border-radius: 12px; height: 32px; }

.type-row { display: flex; background: #f3f4f6; padding: 4px; border-radius: 8px; }
.type-btn { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; color: #6b7280; border-radius: 6px; cursor: pointer; }
.type-btn.active { background: #ffffff; color: #1f2937; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.type-income.active { color: #16a34a; }
.type-expense.active { color: #dc2626; }

.category-grid {
	display: flex;
	flex-wrap: wrap;
	margin: 0 -6px;
}

.category-item {
	width: 25%;
	box-sizing: border-box;
	padding: 4px 6px 12px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	opacity: 0.6;
	transition: all 0.2s ease;
}

.category-item.active {
	opacity: 1;
	transform: scale(1.04);
}

.category-icon-wrapper {
	width: 44px;
	height: 44px;
	border-radius: 999px;
	background-color: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 6px;
	border: 2px solid transparent;
	transition: all 0.2s ease;
}

.category-item.active .category-icon-wrapper {
	background-color: #e0f2fe;
	border-color: #38bdf8;
}

.category-icon {
	width: 24px;
	height: 24px;
	display: block;
}

.category-icon-text {
	font-size: 14px;
	color: #4b5563;
}

.category-label {
	font-size: 12px;
	color: #6b7280;
	text-align: center;
	line-height: 1.2;
}

.category-item.active .category-label {
	color: #2563eb;
	font-weight: 500;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #ffffff;
}
.btn-secondary { padding: 8px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #ffffff; color: #374151; font-size: 14px; cursor: pointer; }
.btn-secondary:hover { background: #f9fafb; border-color: #9ca3af; }
.btn-primary { padding: 8px 24px; border-radius: 8px; border: none; background: linear-gradient(135deg, #4CAF50, #26A69A); color: #ffffff; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { box-shadow: 0 4px 12px rgba(38, 166, 154, 0.3); transform: translateY(-1px); }
.is-disabled { opacity: 0.7; cursor: not-allowed; }

@media (max-width: 768px) {
  .modal-card { width: 100%; height: 100%; max-width: 100%; max-height: 100%; border-radius: 0; }
  .form-row { flex-direction: column; gap: 16px; }
}
</style>
