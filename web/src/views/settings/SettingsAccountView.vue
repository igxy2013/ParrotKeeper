<template>
  <SettingsAccountModal v-model="visible" />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SettingsAccountModal from '@/components/SettingsAccountModal.vue'

const router = useRouter()
const visible = ref(true)
watch(visible, v => { if (!v) router.push('/settings') })
</script>

<style scoped></style>
