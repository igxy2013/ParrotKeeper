# ParrotKeeper 项目色彩体系文档

本文档详细记录了 ParrotKeeper 项目中使用的色彩体系，包括主色调、辅助色、状态色、渐变色等，方便团队成员在设计和开发中保持视觉一致性。

## 1. 主色调 (Primary Colors)

项目主色调以绿色系为主，体现鹦鹉养护的自然、健康理念：

| 颜色名称 | 色值 | 用途说明 |
|---------|------|----------|
| Primary Green | `#4CAF50` | 主要品牌色，用于重要按钮、导航栏等 |
| Darker Green | `#26A69A` | 主色调的深色变体，用于渐变、悬停状态 |
| Accent Green | `#00BCD4` | 主色调的亮色变体，用于渐变、强调元素 |
| Emerald | `#10b981` | 翠绿色，用于健康相关元素 |
| Light Green | `#81C784` | 浅绿色，用于次要按钮、背景等 |

## 2. 辅助色 (Secondary Colors)

辅助色用于区分不同类型的内容和功能：

| 颜色名称 | 色值 | 用途说明 |
|---------|------|----------|
| Orange | `#FF9800` | 警告色，用于提醒、注意状态 |
| Blue | `#2196F3` | 信息色，用于通知、链接等 |
| Purple | `#9C27B0` | 特殊功能色，用于繁殖相关元素 |
| Pink | `#f472b6` | 粉色，用于清洁记录等 |
| Teal | `#06b6d4` | 青色，用于清洁记录等 |

## 3. 状态色 (Status Colors)

用于表示不同状态的视觉反馈：

| 状态 | 色值 | 用途说明 |
|------|------|----------|
| Healthy | `#4CAF50` | 健康状态，绿色表示正常 |
| Sick | `#f44336` | 生病状态，红色表示异常 |
| Recovering | `#ff9800` | 恢复中状态，橙色表示注意 |
| Observation | `#2196F3` | 观察中状态，蓝色表示关注 |

## 4. 文本色 (Text Colors)

| 类型 | 色值 | 用途说明 |
|------|------|----------|
| Primary Text | `#333333` | 主要文本颜色 |
| Secondary Text | `#666666` | 次要文本颜色 |
| Hint Text | `#999999` | 提示文本颜色 |
| White Text | `#ffffff` | 白色文本，用于深色背景 |
| Success Text | `#4CAF50` | 成功状态文本 |
| Warning Text | `#ff9800` | 警告状态文本 |
| Danger Text | `#f44336` | 危险状态文本 |

## 5. 背景色 (Background Colors)

| 类型 | 色值 | 用途说明 |
|------|------|----------|
| Page Background | `linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)` | 页面背景渐变 |
| Card Background | `#ffffff` | 卡片背景色 |
| Glass Background | `rgba(255, 255, 255, 0.8)` | 玻璃拟态卡片背景 |
| Dark Gradient | `linear-gradient(135deg, #10b981 0%, #06b6d4 100%)` | 深色渐变背景 |

## 6. 渐变色 (Gradients)

项目中大量使用渐变色增强视觉效果：

| 渐变名称 | 渐变定义 | 用途说明 |
|----------|----------|----------|
| Primary Gradient | `linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%)` | 主要渐变，用于导航栏、重要按钮 |
| Health Gradient | `linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #81C784 100%)` | 健康状态渐变 |
| Sick Gradient | `linear-gradient(135deg, #f44336 0%, #e53935 50%, #d32f2f 100%)` | 生病状态渐变 |
| Warning Gradient | `linear-gradient(135deg, #ff9800 0%, #f57c00 100%)` | 警告状态渐变 |
| Info Gradient | `linear-gradient(135deg, #2196F3 0%, #1976D2 100%)` | 信息状态渐变 |
| Expense Gradient | `linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)` | 支出相关渐变 |
| Feeding Gradient | `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)` | 喂食相关渐变 |

## 7. 按钮色 (Button Colors)

| 按钮类型 | 色值 | 用途说明 |
|----------|------|----------|
| Primary Button | `linear-gradient(135deg, #4CAF50 0%, #26A69A 50%, #00BCD4 100%)` | 主要操作按钮 |
| Secondary Button | `linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)` | 次要操作按钮 |
| Danger Button | `linear-gradient(135deg, #f44336 0%, #e53935 50%, #d32f2f 100%)` | 危险操作按钮 |
| Success Button | `linear-gradient(135deg, #4CAF50 0%, #45a049 100%)` | 成功状态按钮 |

## 8. 性别标识色 (Gender Colors)

| 性别 | 色值 | 用途说明 |
|------|------|----------|
| Male | `#e0f2fe` | 雄性标识背景色 |
| Female | `#fde7f3` | 雌性标识背景色 |
| Unknown | `#f3f4f6` | 未知性别标识背景色 |

## 9. 图标色 (Icon Colors)

| 图标类型 | 色值 | 用途说明 |
|----------|------|----------|
| White Icon | `#ffffff` | 白色图标，用于深色背景 |
| Emerald Icon | `#26A69A` | 翠绿图标 |
| Orange Icon | `#FF9800` | 橙色图标 |
| Blue Icon | `#2196F3` | 蓝色图标 |
| Purple Icon | `#9C27B0` | 紫色图标 |

## 10. 边框和阴影 (Borders & Shadows)

| 类型 | 值 | 用途说明 |
|------|----|----------|
| Card Border | `1rpx solid #f0f0f0` | 卡片边框 |
| Glass Border | `1rpx solid rgba(255, 255, 255, 0.5)` | 玻璃卡片边框 |
| Shadow | `0 12rpx 32rpx rgba(0, 0, 0, 0.08)` | 标准阴影 |
| Strong Shadow | `0 16rpx 48rpx rgba(0, 0, 0, 0.16)` | 强阴影 |

## 11. 透明度和遮罩 (Transparency & Masks)

| 类型 | 值 | 用途说明 |
|------|----|----------|
| Glass Background | `rgba(255, 255, 255, 0.8)` | 玻璃拟态背景 |
| Overlay | `rgba(0, 0, 0, 0.5)` | 遮罩层 |
| Disabled State | `opacity: 0.5` | 禁用状态透明度 |

## 12. 使用规范 (Usage Guidelines)

1. **主色调使用**：`#4CAF50` 作为品牌主色，应广泛应用于核心操作按钮、导航栏等重要元素
2. **状态色一致性**：健康(`#4CAF50`)、生病(`#f44336`)、恢复中(`#ff9800`)、观察中(`#2196F3`)状态色应保持一致性
3. **渐变色应用**：重要按钮和卡片应使用对应的渐变色增强视觉层次
4. **文本对比度**：确保文本与背景有足够的对比度，符合可访问性标准
5. **玻璃拟态效果**：使用 `rgba(255, 255, 255, 0.8)` 背景配合 `backdrop-filter: blur(20rpx)` 实现玻璃拟态效果

---
*文档版本：1.0 | 最后更新：2025年11月*