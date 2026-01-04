<template>
  <div class="about-page page-container">
    <div class="page-header">
      <h2>关于我们</h2>
    </div>

    <el-card class="about-card" shadow="never">
      <div class="about-content">
        <div class="left-block">
          <div class="intro-block">
          <div class="intro-title">鹦鹉管家是谁</div>
          <div class="intro-text">
            <p>鹦鹉管家是一款面向繁育者与爱好者的智能化饲养管理平台。我们提供喂食记录、体重趋势、孵化建议、护理指南、团队协作与数据统计等功能，帮助提升饲养效率与健康管理体验。</p>
            <p>我们的愿景是通过数据驱动与行业经验，让养宠更科学、简单、有趣。欢迎通过微信或邮箱与我们联系，提交反馈或洽谈合作。</p>
          </div>
          </div>
          <div class="info-block">
          <div class="info-item">
            <span class="label">邮箱</span>
            <a class="value" href="mailto:acbim@qq.com">acbim@qq.com</a>
          </div>
          <div class="info-item">
            <span class="label">网页版</span>
            <a class="value" href="https://parrot.acbim.cn" target="_blank">parrot.acbim.cn</a>
          </div>
          <div class="info-item">
            <span class="label">微信号</span>
            <span class="value">parrotkeeper</span>
          </div>
          </div>
        </div>
        <div class="qr-grid">
          <div class="qrcode-block">
            <img :src="kefuQr" @error="onKefuError" alt="微信客服二维码" class="qrcode-img" />
            <div class="qrcode-tip">微信客服二维码</div>
          </div>
          <div class="qrcode-block">
            <img :src="gzhQr" @error="onGzhError" alt="微信公众号二维码" class="qrcode-img" />
            <div class="qrcode-tip">微信公众号二维码</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const kefuQr = ref('/WXcode.png')
const gzhQr = ref('/qrcode.jpg')
const onKefuError = (e) => { if (e && e.target) e.target.src = '/qrcode.jpg' }
const onGzhError = (e) => { if (e && e.target) e.target.src = '/qrcode.jpg' }
</script>

<style scoped>
.about-page { padding-bottom: 20px; }
.about-card { }
.about-content { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; align-items: start; }
.left-block { display: flex; flex-direction: column; gap: 16px; }
.intro-block { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.intro-title { font-size: 18px; font-weight: 600; color: #303133; }
.intro-text { color: #4c4d4f; line-height: 1.8; }
.intro-text p { margin: 0; }
.info-block { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.info-item { display: flex; align-items: center; gap: 12px; font-size: 16px; }
.label { color: #606266; width: 72px; }
.value { color: #303133; }
.qr-grid { display: flex; gap: 16px; flex-wrap: wrap; }
.qrcode-block { width: 200px; text-align: center; }
.qrcode-img { width: 120px; height: 120px; object-fit: contain; border-radius: 8px; border: 1px solid #ebeef5; background: #fff; }
.qrcode-tip { margin-top: 8px; color: #909399; font-size: 12px; }
@media (max-width: 768px) {
  .about-content { display: flex; flex-direction: column; }
  .qr-grid { width: 100%; }
  .qrcode-block { width: 100%; }
  .qrcode-img { width: 120px; height: 120px; }
}
</style>
