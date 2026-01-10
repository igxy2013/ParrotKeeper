<template>
  <router-view />
  <LimitModal 
    v-model="permissionVisible" 
    mode="info" 
    title="权限不足" 
    :message="permissionMessage" 
    :show-redeem="false" 
    :show-upgrade="false" 
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import LimitModal from '@/components/LimitModal.vue'

const permissionVisible = ref(false)
const permissionMessage = ref('您没有权限进行此操作')
let lastShownAt = 0

const onPermissionDenied = (e) => {
  const now = Date.now()
  if (permissionVisible.value) return
  if (now - lastShownAt < 800) return
  permissionMessage.value = (e && e.detail && e.detail.message) || '您没有权限进行此操作'
  permissionVisible.value = true
  lastShownAt = now
}

onMounted(() => {
  window.addEventListener('permission-denied', onPermissionDenied)
})
onBeforeUnmount(() => {
  window.removeEventListener('permission-denied', onPermissionDenied)
})
</script>
