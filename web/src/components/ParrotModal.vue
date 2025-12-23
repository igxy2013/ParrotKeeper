<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
      <div class="modal-card">
        <!-- Header -->
        <div class="modal-header-gradient">
          <div class="modal-header-row">
            <span class="modal-title">{{ isEdit ? '编辑鹦鹉' : '添加新鹦鹉' }}</span>
            <div class="modal-close-btn" @click="handleClose">
              <el-icon class="modal-close-icon"><Close /></el-icon>
            </div>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="modal-scroll">
          <!-- Mode Switch (Only in Add Mode) -->
          <div v-if="!isEdit" class="mode-switch-row">
            <div 
              class="mode-btn" 
              :class="{ active: createMode === 'form' }"
              @click="createMode = 'form'"
            >
              填写信息
            </div>
            <div 
              class="mode-btn" 
              :class="{ active: createMode === 'claim' }"
              @click="createMode = 'claim'"
            >
              过户码认领
            </div>
          </div>

          <!-- Form Mode -->
          <div v-if="createMode === 'form'" class="form-section">
            <div class="form-layout">
              <!-- Left Side: Photo -->
              <div class="form-left">
                <div class="photo-upload">
                  <div class="photo-wrapper" @click="handlePhotoClick">
                    <img v-if="form.avatar_url" :src="getPreviewImage(form.avatar_url)" class="preview-image" />
                    <div v-else class="upload-area">
                      <el-icon class="upload-icon"><Camera /></el-icon>
                      <span class="upload-text">点击上传照片</span>
                    </div>
                  </div>
                  <div class="photo-tip">点击图片更换</div>
                </div>
              </div>

              <!-- Right Side: Fields -->
              <div class="form-right">
                <!-- Row 1: Name & Species -->
                <div class="form-row">
                  <div class="form-item half">
                    <label class="form-label">鹦鹉名称 *</label>
                    <input 
                      v-model="form.name" 
                      class="text-input" 
                      placeholder="给您的鹦鹉起个可爱的名字" 
                    />
                  </div>
                  <div class="form-item half">
                    <label class="form-label">鹦鹉品种 *</label>
                    <el-select 
                      v-model="form.species_id" 
                      placeholder="请选择品种" 
                      filterable 
                      clearable
                      class="full-width-select"
                    >
                      <el-option
                        v-for="item in speciesList"
                        :key="item.id"
                        :label="item.name"
                        :value="item.id"
                      />
                    </el-select>
                  </div>
                </div>

                <!-- Row 2: Gender & Health Status -->
                <div class="form-row">
                  <div class="form-item half">
                    <label class="form-label">性别</label>
                    <div class="gender-row">
                      <div 
                        class="gender-btn gender-male" 
                        :class="{ active: form.gender === 'male' }"
                        @click="form.gender = 'male'"
                      >
                        公
                      </div>
                      <div 
                        class="gender-btn gender-female" 
                        :class="{ active: form.gender === 'female' }"
                        @click="form.gender = 'female'"
                      >
                        母
                      </div>
                      <div 
                        class="gender-btn gender-unknown" 
                        :class="{ active: form.gender === 'unknown' }"
                        @click="form.gender = 'unknown'"
                      >
                        未知
                      </div>
                    </div>
                  </div>
                  <div class="form-item half">
                    <label class="form-label">健康状态</label>
                    <el-select 
                      v-model="form.health_status" 
                      placeholder="请选择状态"
                      class="full-width-select"
                    >
                      <el-option label="健康" value="healthy" />
                      <el-option label="生病" value="sick" />
                      <el-option label="康复中" value="recovering" />
                      <el-option label="观察中" value="observation" />
                    </el-select>
                  </div>
                </div>

                <!-- Row 3: Dates -->
                <div class="form-row">
                  <div class="form-item half">
                    <label class="form-label">出生日期</label>
                    <el-date-picker
                      v-model="form.birth_date"
                      type="date"
                      placeholder="选择日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      class="custom-date-picker"
                      :editable="false"
                      :clearable="false"
                      style="width: 100%"
                    />
                  </div>
                  <div class="form-item half">
                    <label class="form-label">入住日期</label>
                    <el-date-picker
                      v-model="form.acquisition_date"
                      type="date"
                      placeholder="选择日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      class="custom-date-picker"
                      :editable="false"
                      :clearable="false"
                      style="width: 100%"
                    />
                  </div>
                </div>

                <!-- Row 4: Weight & Plumage -->
                <div class="form-row">
                  <div class="form-item half">
                    <label class="form-label">体重 (g)</label>
                    <input 
                      type="number"
                      v-model="form.weight" 
                      class="text-input" 
                      placeholder="0" 
                    />
                  </div>
                  <div class="form-item half">
                    <label class="form-label">羽色</label>
                    <div class="plumage-selector-wrapper" v-if="plumageColors.length">
                      <el-select
                        v-model="form.color"
                        placeholder="请选择羽色"
                        class="full-width-select"
                      >
                        <el-option
                          v-for="c in plumageColors"
                          :key="c"
                          :label="c"
                          :value="c"
                        />
                      </el-select>
                    </div>
                    <input
                      v-else
                      v-model="form.color"
                      class="text-input"
                      placeholder="例如：原始灰"
                    />
                  </div>
                </div>

                <!-- Row 5: Numbers -->
                <div class="form-row">
                  <div class="form-item half">
                    <label class="form-label">鹦鹉编号</label>
                    <input 
                      v-model="form.parrot_number" 
                      class="text-input" 
                      placeholder="选填" 
                    />
                  </div>
                  <div class="form-item half">
                    <label class="form-label">脚环号</label>
                    <input 
                      v-model="form.ring_number" 
                      class="text-input" 
                      placeholder="选填" 
                    />
                  </div>
                </div>
                
                <!-- Notes -->
                <div class="form-item">
                  <label class="form-label">备注信息</label>
                  <textarea 
                    v-model="form.notes" 
                    class="textarea-input" 
                    placeholder="记录一些关于它的故事..." 
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Claim Mode -->
          <div v-else class="claim-section">
            <div class="form-item">
              <label class="form-label">过户码 *</label>
              <input 
                v-model="claimCode" 
                class="text-input" 
                placeholder="输入 8 位过户码" 
                style="text-transform: uppercase;"
              />
              <p class="tip-text">提示：当前主人在详情页生成过户码后，你可在此认领。</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-secondary" @click="handleClose">取消</button>
          <button 
            class="btn-primary" 
            :class="{ 'is-disabled': loading }" 
            @click="handleSubmit"
            :disabled="loading"
          >
            {{ createMode === 'claim' ? '立即认领' : (isEdit ? '保存修改' : '立即添加') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { Close, Camera } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api/axios'

const props = defineProps({
  modelValue: Boolean,
  parrot: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const createMode = ref('form') // 'form' or 'claim'
const claimCode = ref('')
const loading = ref(false)
const speciesList = ref([])
const plumageColors = ref([])

const isEdit = computed(() => !!props.parrot)

onMounted(() => {
  fetchSpeciesList()
})

const fetchSpeciesList = async () => {
  try {
    const res = await api.get('/parrots/species')
    if (res.data.success) {
      speciesList.value = res.data.data || []
      // If editing, trigger plumage update after list is loaded
      if (form.value.species_id) {
        updatePlumageOptions(form.value.species_id)
      }
    }
  } catch (e) {
    console.error('Failed to fetch species list', e)
  }
}

const form = ref({
  name: '',
  species_id: '',
  gender: 'unknown',
  birth_date: '',
  acquisition_date: '',
  ring_number: '',
  parrot_number: '',
  weight: '',
  health_status: 'healthy',
  color: '',
  notes: '',
  avatar_url: ''
})

const updatePlumageOptions = (speciesId) => {
	plumageColors.value = []
	if (!speciesId) return

	const species = speciesList.value.find(s => s.id === speciesId)
	if (species && species.plumage_json) {
		try {
			// Handle both string and object (if already parsed by axios/backend)
			const json = typeof species.plumage_json === 'string'
				? JSON.parse(species.plumage_json)
				: species.plumage_json
			
			if (json && Array.isArray(json.colors)) {
				plumageColors.value = json.colors
					.map(c => c.name)
					.filter(Boolean)
			}
		} catch (e) {
			console.error('Failed to parse plumage_json', e)
		}
	}
}

watch(() => form.value.species_id, (newVal) => {
  updatePlumageOptions(newVal)
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.parrot) {
      // Try to find species_id
      let sId = props.parrot.species_id
      // If species_id is missing but we have name, try to map it
      if (!sId && (props.parrot.species_name || props.parrot.species)) {
        const name = props.parrot.species_name || props.parrot.species
        const match = speciesList.value.find(s => s.name === name)
        if (match) sId = match.id
      }

      // Map existing parrot data to form
      form.value = {
        name: props.parrot.name || '',
        species_id: sId || '',
        gender: props.parrot.gender || 'unknown',
        birth_date: props.parrot.birth_date || '',
        acquisition_date: props.parrot.acquisition_date || '',
        ring_number: props.parrot.ring_number || '',
        parrot_number: props.parrot.parrot_number || '',
        weight: props.parrot.weight || '',
        health_status: props.parrot.health_status || 'healthy',
        color: props.parrot.color || '',
        notes: props.parrot.notes || '',
        avatar_url: props.parrot.avatar_url || props.parrot.photo_url || ''
      }
      
      // Update plumage options for existing species
      if (sId) {
        updatePlumageOptions(sId)
      }
    } else {
      resetForm()
    }
  }
})

const resetForm = () => {
  createMode.value = 'form'
  claimCode.value = ''
	form.value = {
    name: '',
    species_id: '',
    gender: 'unknown',
    birth_date: '',
    acquisition_date: '',
    ring_number: '',
    parrot_number: '',
    weight: '',
    health_status: 'healthy',
    color: '',
    notes: '',
		avatar_url: ''
	}
	plumageColors.value = []
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const getPreviewImage = (url) => {
	if (!url) return ''
	let u = String(url).replace(/\\/g, '/').trim()
	if (/^https?:\//.test(u)) return u
	if (u.startsWith('data:')) return u
	if (/\/uploads\//.test(u)) {
		const suffix = u.split('/uploads/')[1] || ''
		return `/uploads/${suffix.replace(/^images\//, '')}`
	}
	if (/^\/?uploads\//.test(u)) {
		const normalized = u.replace(/^\//, '').replace(/^uploads\/images\//, 'uploads/').replace(/^uploads\//, 'uploads/')
		return `/${normalized}`
	}
	if (/^\/?images\/parrot-avatar-/.test(u)) return `/${u.replace(/^\/?images\//, '')}`
	if (/^\/?images\//.test(u)) return `/${u.replace(/^\/?images\//, '')}`
	if (/^\/?parrot-avatar-/.test(u)) return u.startsWith('/') ? u : `/${u}`
	return `/uploads/${u.replace(/^\//, '').replace(/^images\//, '')}`
}

let fileInput = null
let fileInputHandler = null

const ensureFileInput = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  if (fileInput) return fileInput

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'

  fileInputHandler = async (event) => {
    const target = event.target
    if (!target || !target.files || !target.files.length) return
    const file = target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'parrots')
    loading.value = true
    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data && res.data.success && res.data.data && res.data.data.url) {
        const url = res.data.data.url
        form.value.avatar_url = url
        ElMessage.success('上传成功')
      } else {
        ElMessage.error(res.data && res.data.message ? res.data.message : '上传失败')
      }
    } catch (error) {
      console.error('上传照片失败', error)
      ElMessage.error('上传照片失败')
    } finally {
      loading.value = false
      if (target) target.value = ''
    }
  }

  input.addEventListener('change', fileInputHandler)
  document.body.appendChild(input)
  fileInput = input
  return fileInput
}

const handlePhotoClick = () => {
  const input = ensureFileInput()
  if (input) input.click()
}

onUnmounted(() => {
  if (fileInput && fileInputHandler && typeof fileInput.removeEventListener === 'function') {
    fileInput.removeEventListener('change', fileInputHandler)
  }
  if (fileInput && fileInput.parentNode) {
    fileInput.parentNode.removeChild(fileInput)
  }
  fileInput = null
  fileInputHandler = null
})

const handleSubmit = async () => {
  if (createMode.value === 'claim') {
    if (!claimCode.value) {
      ElMessage.warning('请输入过户码')
      return
    }
    loading.value = true
    try {
      await new Promise(r => setTimeout(r, 1000))
      ElMessage.success('认领功能暂未对接后端')
      handleClose()
      emit('success')
    } catch (e) {
      ElMessage.error('认领失败')
    } finally {
      loading.value = false
    }
    return
  }

  if (!form.value.name) {
    ElMessage.warning('请输入鹦鹉名称')
    return
  }

  loading.value = true
  try {
    const payload = { ...form.value }
    // Ensure numeric values are numbers or null
    if (payload.weight === '') payload.weight = null
    
    // API expects species_id directly, no need for manual mapping if using dropdown
    
    if (isEdit.value) {
      await api.put(`/parrots/${props.parrot.id}`, payload)
      ElMessage.success('修改成功')
    } else {
      await api.post('/parrots', payload)
      ElMessage.success('添加成功')
    }
    handleClose()
    emit('success')
  } catch (error) {
    console.error(error)
    ElMessage.error(isEdit.value ? '修改失败' : '添加失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Modal Overlay */
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

/* Modal Card */
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

/* Header */
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
  transition: background 0.2s;
}
.modal-close-btn:hover {
  background: rgba(255,255,255,0.3);
}
.modal-close-icon {
  color: #ffffff;
  font-size: 16px;
}

/* Scroll Content */
.modal-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Mode Switch */
.mode-switch-row {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}
.mode-btn {
  flex: 1;
  text-align: center;
  padding: 8px;
  border-radius: 999px;
  font-size: 13px;
  background: #e5e7eb;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn.active {
  background: linear-gradient(135deg, #4CAF50, #26A69A, #00BCD4);
  color: #ffffff;
  font-weight: 500;
}

/* Form Section */
.form-section, .claim-section {
  padding: 24px;
}

.form-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.form-left {
  width: 200px;
  flex-shrink: 0;
}

.form-right {
  flex: 1;
  min-width: 0;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item.half {
  flex: 1;
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #374151;
  font-weight: 600;
  margin-bottom: 6px;
}
.required {
  color: #ef4444;
}
.tip-text {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

/* Inputs */
.text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0 12px;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s;
}
.text-input:focus {
  outline: none;
  border-color: #26A69A;
  box-shadow: 0 0 0 2px rgba(38, 166, 154, 0.1);
}

.textarea-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  height: 80px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  resize: none;
  font-family: inherit;
  transition: all 0.2s;
}
.textarea-input:focus {
  outline: none;
  border-color: #26A69A;
  box-shadow: 0 0 0 2px rgba(38, 166, 154, 0.1);
}

/* Full Width Select */
.full-width-select {
  width: 100%;
}
:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #d1d5db !important;
  border-radius: 8px;
  height: 36px;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #26A69A !important;
  ring: 2px rgba(38, 166, 154, 0.1);
}

/* Gender Toggle */
.gender-row {
  display: flex;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
}
.gender-btn {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  font-size: 13px;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.gender-btn.active {
  background: #ffffff;
  color: #1f2937;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.gender-male.active { color: #3b82f6; }
.gender-female.active { color: #ec4899; }
.gender-unknown.active { color: #9ca3af; }

/* Photo Upload */
.photo-wrapper {
  width: 100%;
  aspect-ratio: 1;
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.photo-wrapper:hover {
  border-color: #26A69A;
  background: #f0fdf9;
}
.upload-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
.upload-icon {
  font-size: 32px;
  margin-bottom: 8px;
}
.upload-text {
  font-size: 12px;
}
.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-tip {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

/* Footer */
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #ffffff;
}
.btn-secondary {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
.btn-primary {
  padding: 8px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #4CAF50, #26A69A);
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(38, 166, 154, 0.3);
  transform: translateY(-1px);
}
.is-disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-card {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
  .form-layout {
    flex-direction: column;
    align-items: stretch;
  }
  .form-left {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .photo-upload {
    width: 140px;
  }
  .form-row {
    flex-direction: column;
    gap: 16px;
  }
  .form-item.half {
    margin-bottom: 0;
  }
}
</style>
