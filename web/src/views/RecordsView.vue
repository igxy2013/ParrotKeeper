<template>
  <div class="page-container">
    <div class="page-header">
      <h2>饲养记录</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">添加记录</el-button>
      </div>
    </div>
    <div class="records-stats">
      <div class="stats-grid" v-if="activeTab === 'feeding'">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-green"><el-icon><Dish /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">当前范围喂食次数</div>
              <div class="stat-value">{{ total }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-blue"><el-icon><Calendar /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">今日喂食次数</div>
              <div class="stat-value">{{ feedingStats.today }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-purple"><el-icon><User /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">涉及鹦鹉数</div>
              <div class="stat-value">{{ feedingStats.parrotCount }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-orange"><el-icon><Timer /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">最近喂食时间</div>
              <div class="stat-value">{{ feedingStats.lastTimeStr }}</div>
            </div>
          </div>
        </el-card>
      </div>

      <div class="stats-grid" v-else-if="activeTab === 'health'">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-green"><el-icon><FirstAidKit /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">当前范围健康记录</div>
              <div class="stat-value">{{ total }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-blue"><el-icon><Calendar /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">今日健康记录</div>
              <div class="stat-value">{{ healthStats.today }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-purple"><el-icon><User /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">涉及鹦鹉数</div>
              <div class="stat-value">{{ healthStats.parrotCount }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-orange"><el-icon><Timer /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">最近检查时间</div>
              <div class="stat-value">{{ healthStats.lastTimeStr }}</div>
            </div>
          </div>
        </el-card>
      </div>

      <div class="stats-grid" v-else-if="activeTab === 'cleaning'">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-green"><el-icon><Brush /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">当前范围清洁记录</div>
              <div class="stat-value">{{ total }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-blue"><el-icon><Calendar /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">今日清洁记录</div>
              <div class="stat-value">{{ cleaningStats.today }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-purple"><el-icon><List /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">本页类型数</div>
              <div class="stat-value">{{ cleaningStats.typeCount }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-orange"><el-icon><Timer /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">最近清洁时间</div>
              <div class="stat-value">{{ cleaningStats.lastTimeStr }}</div>
            </div>
          </div>
        </el-card>
      </div>

      <div class="stats-grid" v-else>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-green"><el-icon><Calendar /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">当前范围繁殖记录</div>
              <div class="stat-value">{{ total }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-blue"><el-icon><Calendar /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">今日配对记录</div>
              <div class="stat-value">{{ breedingStats.today }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-purple"><el-icon><User /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">涉及鹦鹉数</div>
              <div class="stat-value">{{ breedingStats.parrotCount }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content-wrapper">
            <div class="stat-icon-box icon-orange"><el-icon><Timer /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">最近配对时间</div>
              <div class="stat-value">{{ breedingStats.lastTimeStr }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    <div class="toolbar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        class="filter-item"
        @change="handleFilterChange"
      />
      <el-select
        v-model="selectedParrotId"
        placeholder="全部鹦鹉"
        clearable
        filterable
        class="filter-item"
        @change="handleFilterChange"
      >
        <el-option label="全部鹦鹉" value="" />
        <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-input
        v-model="searchQuery"
        placeholder="搜索鹦鹉名称、鹦鹉编号、脚环号或备注"
        class="search-input"
        @input="handleSearch"
      />
      <div class="toolbar-right">
        <el-button @click="refresh" :loading="loading">刷新</el-button>
      </div>
    </div>
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="喂食" name="feeding">
        <el-table :data="feedingRecordsFiltered" v-loading="loading" @row-click="handleRowClick">
          <el-table-column prop="feeding_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.feeding_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="feed_type_name" label="食物类型" width="180">
            <template #default="scope">{{ scope.row.feed_type?.name || scope.row.feed_type_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="amount" label="数量" width="120">
            <template #default="scope">{{ scope.row.amount ? scope.row.amount + (scope.row.feed_type?.unit || 'g') : '-' }}</template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <el-button link type="info" @click="openDetail(scope.row, 'feeding')">详情</el-button>
              <el-button link type="success" @click="openEditDialog(scope.row, 'feeding')">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(scope.row, 'feeding')">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="健康" name="health">
        <el-table :data="healthRecordsFiltered" v-loading="loading" @row-click="handleRowClick">
          <el-table-column prop="record_date" label="日期" width="120">
             <template #default="scope">
              {{ formatDate(scope.row.record_date, 'YYYY-MM-DD') }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="weight" label="体重(g)" width="120">
            <template #default="scope">{{ scope.row.weight ? scope.row.weight + ' g' : '-' }}</template>
          </el-table-column>
          <el-table-column prop="health_status" label="状态" width="120">
             <template #default="scope">
                <el-tag :type="getHealthType(scope.row.health_status)">{{ getHealthLabel(scope.row.health_status) }}</el-tag>
             </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <el-button link type="info" @click="openDetail(scope.row, 'health')">详情</el-button>
              <el-button link type="success" @click="openEditDialog(scope.row, 'health')">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(scope.row, 'health')">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="清洁" name="cleaning">
        <el-table :data="cleaningRecordsFiltered" v-loading="loading" @row-click="handleRowClick">
          <el-table-column prop="cleaning_time" label="时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.cleaning_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="parrot.name" label="鹦鹉" width="160">
            <template #default="scope">{{ scope.row.parrot?.name || scope.row.parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="cleaning_type_text" label="类型" width="180">
            <template #default="scope">{{ scope.row.cleaning_type_text || scope.row.cleaning_type || '-' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <el-button link type="info" @click="openDetail(scope.row, 'cleaning')">详情</el-button>
              <el-button link type="success" @click="openEditDialog(scope.row, 'cleaning')">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(scope.row, 'cleaning')">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="繁殖" name="breeding">
        <el-table :data="breedingRecordsFiltered" v-loading="loading" @row-click="handleRowClick">
          <el-table-column prop="mating_date" label="配对日期" width="140">
            <template #default="scope">{{ formatDate(scope.row.mating_date, 'YYYY-MM-DD') }}</template>
          </el-table-column>
          <el-table-column prop="male_parrot_name" label="公鸟" width="160">
            <template #default="scope">{{ scope.row.male_parrot?.name || scope.row.male_parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="female_parrot_name" label="母鸟" width="160">
            <template #default="scope">{{ scope.row.female_parrot?.name || scope.row.female_parrot_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="egg_count" label="产蛋数" width="100" />
          <el-table-column prop="chick_count" label="雏鸟数" width="100" />
          <el-table-column prop="success_rate" label="成功率(%)" width="120">
            <template #default="scope">{{ scope.row.success_rate ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <el-button link type="info" @click="openDetail(scope.row, 'breeding')">详情</el-button>
              <el-button link type="success" @click="openEditDialog(scope.row, 'breeding')">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(scope.row, 'breeding')">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-pagination
      v-if="total > 0"
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="handlePageChange"
      class="pagination"
    />

    <el-dialog
      v-model="addDialogVisible"
      :title="addDialogTitle"
      width="640px"
    >
      <el-form :model="addForm" label-width="96px">
        <el-form-item label="记录类型">
          <el-radio-group v-model="addFormType" @change="onAddTypeChange">
            <el-radio-button value="feeding">喂食</el-radio-button>
            <el-radio-button value="cleaning">清洁</el-radio-button>
            <el-radio-button value="health">健康</el-radio-button>
            <el-radio-button value="breeding">繁殖</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="addFormType === 'breeding'" label="公鸟" required>
          <el-select
            v-model="addForm.male_parrot_id"
            filterable
            placeholder="选择公鸟"
            style="width: 100%"
          >
            <el-option v-for="p in maleParrots" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="addFormType === 'breeding'" label="母鸟" required>
          <el-select
            v-model="addForm.female_parrot_id"
            filterable
            placeholder="选择母鸟"
            style="width: 100%"
          >
            <el-option v-for="p in femaleParrots" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-else label="鹦鹉" required>
          <el-select
            v-model="addForm.parrot_ids"
            :multiple="isMultiParrot"
            filterable
            placeholder="选择鹦鹉"
            style="width: 100%"
          >
            <el-option v-for="p in parrots" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="showRecordTimePicker" label="记录时间" required>
          <el-date-picker
            v-model="addFormDateTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择日期时间"
            style="width: 100%"
          />
        </el-form-item>

        <template v-if="addFormType === 'feeding'">
          <el-form-item label="食物类型" required>
            <el-select
              v-model="addForm.food_types"
              multiple
              filterable
              placeholder="选择食物类型"
              style="width: 100%"
            >
              <el-option
                v-for="f in feedTypes"
                :key="f.id"
                :label="f.name"
                :value="f.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            v-for="ftId in addForm.food_types"
            :key="ftId"
            :label="getFeedTypeLabel(ftId)"
          >
            <el-input
              v-model="addForm.food_amounts[ftId]"
              placeholder="输入分量"
            >
              <template #append>{{ getFeedTypeUnit(ftId) }}</template>
            </el-input>
          </el-form-item>
        </template>

        <template v-if="addFormType === 'cleaning'">
          <el-form-item label="清洁类型" required>
            <el-select
              v-model="addForm.cleaning_types"
              multiple
              placeholder="选择清洁类型"
              style="width: 100%"
            >
              <el-option
                v-for="c in cleaningTypeOptions"
                :key="c.value"
                :label="c.label"
                :value="c.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="清洁内容">
            <el-input
              v-model="addForm.description"
              type="textarea"
              :rows="3"
              placeholder="例如：清洗笼底、更换饮用水等"
            />
          </el-form-item>
        </template>

        <template v-if="addFormType === 'health'">
          <el-form-item label="健康状态">
            <el-select
              v-model="addForm.health_status"
              placeholder="选择健康状态"
              style="width: 100%"
            >
              <el-option
                v-for="s in healthStatusOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="体重">
            <el-input v-model="addForm.weight" placeholder="输入体重">
              <template #append>g</template>
            </el-input>
          </el-form-item>
          <el-form-item label="检查内容">
            <el-input
              v-model="addForm.description"
              type="textarea"
              :rows="3"
              placeholder="记录症状、治疗方案等"
            />
          </el-form-item>
        </template>

        <template v-if="addFormType === 'breeding'">
          <el-form-item label="配对日期">
            <el-date-picker
              v-model="addForm.mating_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择配对日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="产蛋日期">
            <el-date-picker
              v-model="addForm.egg_laying_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择产蛋日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="产蛋数量">
            <el-input v-model="addForm.egg_count" placeholder="输入产蛋数量" />
          </el-form-item>
          <el-form-item label="孵化日期">
            <el-date-picker
              v-model="addForm.hatching_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择孵化日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="雏鸟数量">
            <el-input v-model="addForm.chick_count" placeholder="输入雏鸟数量" />
          </el-form-item>
          <el-form-item label="成功率">
            <el-input v-model="addForm.success_rate" placeholder="输入成功率">
              <template #append>%</template>
            </el-input>
          </el-form-item>
        </template>

        <el-form-item label="备注">
          <el-input
            v-model="addForm.notes"
            type="textarea"
            :rows="3"
            placeholder="可记录补充说明，例如喂食偏好、健康观察等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button type="primary" @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addSubmitting" @click="submitAdd">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      :title="detailDialogTitle"
      width="680px"
    >
      <div v-if="detailLoading" class="detail-loading">加载中...</div>
      <div v-else>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="类型">{{ detailTypeLabel }}</el-descriptions-item>
          <el-descriptions-item label="记录时间">{{ detailDisplayTime }}</el-descriptions-item>
          <el-descriptions-item v-if="detailRecorderName" label="记录人">{{ detailRecorderName }}</el-descriptions-item>
          <el-descriptions-item v-if="detailParrotName" label="鹦鹉">{{ detailParrotName }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section" v-if="Array.isArray(detailRecord.photos) && detailRecord.photos.length">
          <div class="photos-title">相关照片</div>
          <div class="photos-grid">
            <el-image
              v-for="(url, idx) in detailRecord.photos"
              :key="idx"
              :src="url"
              :preview-src-list="detailRecord.photos"
              fit="cover"
              class="photo-item"
            />
          </div>
        </div>

        <div class="detail-section" v-if="detailRecordType === 'feeding'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="食物类型">{{ detailRecord.feed_type_name || (detailRecord.feed_type && detailRecord.feed_type.name) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ detailAmountText }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section" v-if="detailRecordType === 'health'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="体重(g)">{{ detailRecord.weight ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ getHealthLabel(detailRecord.health_status) }}</el-descriptions-item>
            <el-descriptions-item label="描述" v-if="detailRecord.description">{{ detailRecord.description }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section" v-if="detailRecordType === 'cleaning'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="类型">{{ detailRecord.cleaning_type_text || detailRecord.cleaning_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="描述" v-if="detailRecord.description">{{ detailRecord.description }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section" v-if="detailRecordType === 'breeding'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="公鸟">{{ detailRecord.male_parrot_name || (detailRecord.male_parrot && detailRecord.male_parrot.name) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="母鸟">{{ detailRecord.female_parrot_name || (detailRecord.female_parrot && detailRecord.female_parrot.name) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="配对日期">{{ formatDate(detailRecord.mating_date, 'YYYY-MM-DD') }}</el-descriptions-item>
            <el-descriptions-item label="产蛋日期">{{ formatDate(detailRecord.egg_laying_date, 'YYYY-MM-DD') }}</el-descriptions-item>
            <el-descriptions-item label="孵化日期">{{ formatDate(detailRecord.hatching_date, 'YYYY-MM-DD') }}</el-descriptions-item>
            <el-descriptions-item label="产蛋数">{{ detailRecord.egg_count ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="出壳数">{{ detailRecord.chick_count ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="成功率">{{ detailRecord.success_rate !== undefined && detailRecord.success_rate !== null ? detailRecord.success_rate + '%' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" v-if="detailRecord.notes">{{ detailRecord.notes }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="oplogs-section">
          <div class="oplogs-title">操作日志</div>
          <div v-if="detailOperationLogs && detailOperationLogs.length" class="oplog-list">
            <div class="oplog-item" v-for="item in detailOperationLogs" :key="item.id">
              <div class="oplog-header">
                <span class="oplog-action">{{ item.actionText }}</span>
                <span class="oplog-time">{{ item.timeText }}</span>
              </div>
              <div class="oplog-meta">操作人：{{ item.operatorName || '—' }}</div>
              <div class="oplog-diff" v-if="item.changeLines && item.changeLines.length">
                <div class="oplog-diff-item" v-for="line in item.changeLines" :key="line">{{ line }}</div>
              </div>
              <div class="oplog-notes" v-if="item.note">{{ item.note }}</div>
            </div>
          </div>
          <div class="oplogs-empty" v-else>暂无操作日志</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="editCurrentRecord" type="primary">编辑</el-button>
        <el-button @click="deleteCurrentRecord" type="danger">删除</el-button>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Dish, FirstAidKit, Brush, Calendar, Timer, User, List } from '@element-plus/icons-vue'
import api from '../api/axios'
import { getCache, setCache } from '@/utils/cache'

const route = useRoute()
const activeTab = ref('feeding')
const loading = ref(false)
const feedingRecords = ref([])
const healthRecords = ref([])
const cleaningRecords = ref([])
const breedingRecords = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const parrots = ref([])
const selectedParrotId = ref(null)
const dateRange = ref([])
const searchQuery = ref('')
const addDialogVisible = ref(false)
const addSubmitting = ref(false)
const addFormType = ref('feeding')
const addFormDateTime = ref('')
const editingRecordId = ref(null)
const recordsCache = reactive({})
const cacheTTL = 30000
const RECORDS_CACHE_TTL = 60000
const addForm = reactive({
  parrot_ids: [],
  notes: '',
  food_types: [],
  food_amounts: {},
  amount: '',
  cleaning_types: [],
  description: '',
  weight: '',
  health_status: 'healthy',
  male_parrot_id: null,
  female_parrot_id: null,
  mating_date: '',
  egg_laying_date: '',
  egg_count: '',
  hatching_date: '',
  chick_count: '',
  success_rate: ''
})
const feedTypes = ref([])
const healthStatusOptions = [
  { value: 'healthy', label: '健康' },
  { value: 'sick', label: '生病' },
  { value: 'recovering', label: '康复中' },
  { value: 'observation', label: '观察中' }
]
const cleaningTypeOptions = [
  { value: 'cage', label: '笼子清洁' },
  { value: 'toys', label: '玩具清洁' },
  { value: 'perches', label: '栖木清洁' },
  { value: 'food_water', label: '食物和水清洁' },
  { value: 'disinfection', label: '消毒' },
  { value: 'water_change', label: '饮用水更换' },
  { value: 'water_bowl_clean', label: '水碗清洁' },
  { value: 'bath', label: '鹦鹉洗澡' }
]
const maleParrots = computed(() => (Array.isArray(parrots.value) ? parrots.value.filter(p => p.gender === 'male') : []))
const femaleParrots = computed(() => (Array.isArray(parrots.value) ? parrots.value.filter(p => p.gender === 'female') : []))
const typeLabelMap = {
  feeding: '喂食',
  health: '健康',
  cleaning: '清洁',
  breeding: '繁殖'
}
const isEditMode = computed(() => !!editingRecordId.value)
const addDialogTitle = computed(() => {
  const text = typeLabelMap[addFormType.value] || ''
  return `${isEditMode.value ? '编辑' : '添加'}${text}记录`
})
const recordTypeLabel = computed(() => typeLabelMap[addFormType.value] || '')
const isMultiParrot = computed(() => addFormType.value === 'feeding' || addFormType.value === 'cleaning')
const showRecordTimePicker = computed(() => addFormType.value === 'feeding' || addFormType.value === 'cleaning' || addFormType.value === 'health' || addFormType.value === 'breeding')
const singleFeedUnit = computed(() => {
  if (!addForm.food_types || addForm.food_types.length === 0) return 'g'
  const id = addForm.food_types[0]
  const item = feedTypes.value.find(f => f.id === id)
  return item && item.unit ? item.unit : 'g'
})

const getNowDateTimeString = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

const normalizeToDateTimeString = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

const buildRecordsCacheKey = () => {
  const mode = localStorage.getItem('user_mode') || 'personal'
  const range = Array.isArray(dateRange.value) ? dateRange.value.join(',') : ''
  const parrot = selectedParrotId.value || ''
  return `records_list|${mode}|${activeTab.value}|${currentPage.value}|${pageSize.value}|${parrot}|${range}`
}

const fetchRecords = async () => {
  const cacheKey = buildRecordsCacheKey()
  const now = Date.now()
  const cached = recordsCache[cacheKey]
  if (cached && now - cached.timestamp < cacheTTL) {
    const d = cached.data
    if (activeTab.value === 'feeding') {
      feedingRecords.value = d.items || d.records || []
    } else if (activeTab.value === 'health') {
      healthRecords.value = d.items || d.records || []
    } else if (activeTab.value === 'cleaning') {
      cleaningRecords.value = d.items || d.records || []
    } else if (activeTab.value === 'breeding') {
      breedingRecords.value = d.items || d.records || []
    }
    total.value = d.total || 0
    return
  }

  loading.value = true
  try {
    let url = `/records/${activeTab.value}`
    const params = {
      page: currentPage.value,
      per_page: pageSize.value
    }
    if (activeTab.value === 'feeding' || activeTab.value === 'health' || activeTab.value === 'cleaning') {
      if (selectedParrotId.value) params.parrot_id = selectedParrotId.value
    }
    if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    if (activeTab.value === 'breeding') {
      if (selectedParrotId.value) params.male_parrot_id = selectedParrotId.value
    }
    const forceNetwork = (localStorage.getItem('user_mode') || 'personal') === 'team'
    const persisted = !forceNetwork ? getCache(cacheKey, RECORDS_CACHE_TTL) : null
    if (persisted && typeof persisted === 'object') {
      const d = persisted
      recordsCache[cacheKey] = { data: d, timestamp: now }
      if (activeTab.value === 'feeding') {
        feedingRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'health') {
        healthRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'cleaning') {
        cleaningRecords.value = d.items || d.records || []
      } else if (activeTab.value === 'breeding') {
        breedingRecords.value = d.items || d.records || []
      }
      total.value = d.total || 0
    } else {
      const res = await api.get(url, { params })
      
      if (res.data.success) {
        const d = res.data.data
        recordsCache[cacheKey] = { data: d, timestamp: now }
        setCache(cacheKey, d)
        if (activeTab.value === 'feeding') {
          feedingRecords.value = d.items || d.records || []
        } else if (activeTab.value === 'health') {
          healthRecords.value = d.items || d.records || []
        } else if (activeTab.value === 'cleaning') {
          cleaningRecords.value = d.items || d.records || []
        } else if (activeTab.value === 'breeding') {
          breedingRecords.value = d.items || d.records || []
        }
        total.value = d.total || 0
      }
    }
  } catch (e) {
    if (!(e && e.response && e.response.status === 403)) {
      console.error(e)
    }
  } finally {
    loading.value = false
  }
}

const handleTabClick = () => {
  currentPage.value = 1
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchRecords()
}

const handleFilterChange = () => {
  currentPage.value = 1
  Object.keys(recordsCache).forEach(k => { delete recordsCache[k] })
  fetchRecords()
}

const handleSearch = () => {
  applyClientFilter()
}

const resetAddForm = () => {
  addForm.parrot_ids = []
  addForm.notes = ''
  addForm.food_types = []
  addForm.food_amounts = {}
  addForm.amount = ''
  addForm.cleaning_types = []
  addForm.description = ''
  addForm.weight = ''
  addForm.health_status = 'healthy'
  addForm.male_parrot_id = null
  addForm.female_parrot_id = null
  addForm.mating_date = ''
  addForm.egg_laying_date = ''
  addForm.egg_count = ''
  addForm.hatching_date = ''
  addForm.chick_count = ''
  addForm.success_rate = ''
  addFormDateTime.value = ''
}

const loadFeedTypes = async () => {
  try {
    const cacheKey = 'feed_types_cache'
    const now = Date.now()
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && Array.isArray(cached.items) && now - cached.timestamp < 3600000) {
        feedTypes.value = cached.items
        return
      }
    } catch (_) {}

    const res = await api.get('/records/feed-types')
    if (res.data && res.data.success) {
      const data = res.data.data || res.data
      const arr = Array.isArray(data) ? data : []
      feedTypes.value = arr
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ items: arr, timestamp: now }))
      } catch (_) {}
    }
  } catch (e) {
    console.error(e)
  }
}

const onAddTypeChange = async (val) => {
  addFormType.value = val || 'feeding'
  resetAddForm()
  if (addFormType.value === 'feeding' && feedTypes.value.length === 0) {
    await loadFeedTypes()
  }
  if (showRecordTimePicker.value) {
    addFormDateTime.value = getNowDateTimeString()
  }
}

const getFeedTypeLabel = (id) => {
  const item = feedTypes.value.find(f => f.id === id)
  return item ? item.name : '食物'
}

const getFeedTypeUnit = (id) => {
  const item = feedTypes.value.find(f => f.id === id)
  return item && item.unit ? item.unit : 'g'
}

const openAddDialog = async () => {
  editingRecordId.value = null
  addFormType.value = activeTab.value || 'feeding'
  resetAddForm()
  if (addFormType.value === 'feeding' && feedTypes.value.length === 0) {
    await loadFeedTypes()
  }
  if (showRecordTimePicker.value) {
    addFormDateTime.value = getNowDateTimeString()
  }
  addDialogVisible.value = true
}

const openEditDialog = async (row, type) => {
  if (!row || !row.id) return
  editingRecordId.value = row.id
  addFormType.value = type || 'feeding'
  resetAddForm()
  if (addFormType.value === 'feeding' && feedTypes.value.length === 0) {
    await loadFeedTypes()
  }
  const parrotId = row.parrot_id || (row.parrot && row.parrot.id)
  if (type === 'feeding') {
    if (parrotId) {
      addForm.parrot_ids = [parrotId]
    }
    const feedTypeId = row.feed_type_id || (row.feed_type && row.feed_type.id)
    const amountVal = row.amount !== undefined && row.amount !== null ? String(row.amount) : ''
    if (feedTypeId) {
      addForm.food_types = [feedTypeId]
      addForm.food_amounts = { [feedTypeId]: amountVal }
    }
    addForm.amount = amountVal
    if (row.notes) {
      addForm.notes = row.notes
    }
    addFormDateTime.value = normalizeToDateTimeString(row.feeding_time)
  } else if (type === 'cleaning') {
    if (parrotId) {
      addForm.parrot_ids = [parrotId]
    }
    if (row.cleaning_types && Array.isArray(row.cleaning_types) && row.cleaning_types.length > 0) {
      addForm.cleaning_types = row.cleaning_types.slice()
    } else if (row.cleaning_type) {
      addForm.cleaning_types = [row.cleaning_type]
    }
    if (row.description) {
      addForm.description = row.description
    }
    addFormDateTime.value = normalizeToDateTimeString(row.cleaning_time)
  } else if (type === 'health') {
    if (parrotId) {
      addForm.parrot_ids = [parrotId]
    }
    addForm.health_status = row.health_status || 'healthy'
    if (row.weight !== undefined && row.weight !== null) {
      addForm.weight = String(row.weight)
    }
    if (row.description) {
      addForm.description = row.description
    }
    if (row.notes) {
      addForm.notes = row.notes
    }
    addFormDateTime.value = normalizeToDateTimeString(row.record_date || row.record_time)
  } else if (type === 'breeding') {
    const maleId = row.male_parrot_id || (row.male_parrot && row.male_parrot.id) || null
    const femaleId = row.female_parrot_id || (row.female_parrot && row.female_parrot.id) || null
    addForm.male_parrot_id = maleId
    addForm.female_parrot_id = femaleId
    addForm.mating_date = row.mating_date || ''
    addForm.egg_laying_date = row.egg_laying_date || ''
    addForm.egg_count = row.egg_count !== undefined && row.egg_count !== null ? String(row.egg_count) : ''
    addForm.hatching_date = row.hatching_date || ''
    addForm.chick_count = row.chick_count !== undefined && row.chick_count !== null ? String(row.chick_count) : ''
    addForm.success_rate = row.success_rate !== undefined && row.success_rate !== null ? String(row.success_rate) : ''
    if (row.notes) {
      addForm.notes = row.notes
    }
    addFormDateTime.value = normalizeToDateTimeString(row.record_time)
  }
  if (showRecordTimePicker.value && !addFormDateTime.value) {
    addFormDateTime.value = getNowDateTimeString()
  }
  addDialogVisible.value = true
}

const formatDate = (dateStr, format) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (format === 'YYYY-MM-DD') {
    return date.toLocaleDateString()
  }
  return date.toLocaleString()
}

const getHealthType = (status) => {
  if (status === 'healthy') return 'success'
  if (status === 'sick') return 'danger'
  if (status === 'recovering') return 'warning'
  return 'info'
}

const getHealthLabel = (status) => {
  const map = {
    healthy: '健康',
    sick: '生病',
    recovering: '康复中',
    observation: '观察中'
  }
  return map[status] || status
}

const refresh = () => fetchRecords()

const feedingRecordsFiltered = ref([])
const healthRecordsFiltered = ref([])
const cleaningRecordsFiltered = ref([])
const breedingRecordsFiltered = ref([])

const applyClientFilter = () => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (activeTab.value === 'feeding') {
    const list = Array.isArray(feedingRecords.value) ? feedingRecords.value : []
    feedingRecordsFiltered.value = q
      ? list.filter(r => {
          const notes = String(r.notes || '').toLowerCase()
          const feedTypeName = String(r.feed_type_name || (r.feed_type && (r.feed_type.name || '')) || '').toLowerCase()
          const parrotName = String(r.parrot_name || (r.parrot && (r.parrot.name || '')) || '').toLowerCase()
          const parrotNumber = String(r.parrot_number || (r.parrot && (r.parrot.parrot_number || '')) || '').toLowerCase()
          const ringNumber = String(r.ring_number || (r.parrot && (r.parrot.ring_number || '')) || '').toLowerCase()
          return (
            notes.includes(q) ||
            feedTypeName.includes(q) ||
            parrotName.includes(q) ||
            parrotNumber.includes(q) ||
            ringNumber.includes(q)
          )
        })
      : list
  } else if (activeTab.value === 'health') {
    const list = Array.isArray(healthRecords.value) ? healthRecords.value : []
    healthRecordsFiltered.value = q
      ? list.filter(r => {
          const description = String(r.description || '').toLowerCase()
          const parrotName = String(r.parrot_name || (r.parrot && (r.parrot.name || '')) || '').toLowerCase()
          const parrotNumber = String(r.parrot_number || (r.parrot && (r.parrot.parrot_number || '')) || '').toLowerCase()
          const ringNumber = String(r.ring_number || (r.parrot && (r.parrot.ring_number || '')) || '').toLowerCase()
          return (
            description.includes(q) ||
            parrotName.includes(q) ||
            parrotNumber.includes(q) ||
            ringNumber.includes(q)
          )
        })
      : list
  } else if (activeTab.value === 'cleaning') {
    const list = Array.isArray(cleaningRecords.value) ? cleaningRecords.value : []
    cleaningRecordsFiltered.value = q
      ? list.filter(r => {
          const description = String(r.description || '').toLowerCase()
          const cleaningTypeText = String(r.cleaning_type_text || r.cleaning_type || '').toLowerCase()
          const parrotName = String(r.parrot_name || (r.parrot && (r.parrot.name || '')) || '').toLowerCase()
          const parrotNumber = String(r.parrot_number || (r.parrot && (r.parrot.parrot_number || '')) || '').toLowerCase()
          const ringNumber = String(r.ring_number || (r.parrot && (r.parrot.ring_number || '')) || '').toLowerCase()
          return (
            description.includes(q) ||
            cleaningTypeText.includes(q) ||
            parrotName.includes(q) ||
            parrotNumber.includes(q) ||
            ringNumber.includes(q)
          )
        })
      : list
  } else if (activeTab.value === 'breeding') {
    const list = Array.isArray(breedingRecords.value) ? breedingRecords.value : []
    breedingRecordsFiltered.value = q
      ? list.filter(r => {
          const notes = String(r.notes || '').toLowerCase()
          const maleName = String(r.male_parrot_name || (r.male_parrot && (r.male_parrot.name || '')) || '').toLowerCase()
          const femaleName = String(r.female_parrot_name || (r.female_parrot && (r.female_parrot.name || '')) || '').toLowerCase()
          return notes.includes(q) || maleName.includes(q) || femaleName.includes(q)
        })
      : list
  }
}

const todayLabel = new Date().toLocaleDateString()

const formatRelativeTime = (date) => {
  if (!date) return '--'
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

const feedingStats = computed(() => {
  const list = Array.isArray(feedingRecordsFiltered.value) ? feedingRecordsFiltered.value : []
  const today = list.filter(r => formatDate(r.feeding_time, 'YYYY-MM-DD') === todayLabel).length
  const ids = new Set(list.map(r => r.parrot_id || (r.parrot && r.parrot.id)))
  let last = null
  list.forEach(r => { const d = r.feeding_time ? new Date(r.feeding_time) : null; if (d && (!last || d > last)) last = d })
  const lastStr = last ? formatRelativeTime(last) : '--'
  return { today, parrotCount: ids.size, lastTimeStr: lastStr }
})

const healthStats = computed(() => {
  const list = Array.isArray(healthRecordsFiltered.value) ? healthRecordsFiltered.value : []
  const today = list.filter(r => formatDate(r.record_date, 'YYYY-MM-DD') === todayLabel).length
  const ids = new Set(list.map(r => r.parrot_id || (r.parrot && r.parrot.id)))
  let last = null
  list.forEach(r => { const d = r.record_date ? new Date(r.record_date) : null; if (d && (!last || d > last)) last = d })
  const lastStr = last ? formatRelativeTime(last) : '--'
  return { today, parrotCount: ids.size, lastTimeStr: lastStr }
})

const cleaningStats = computed(() => {
  const list = Array.isArray(cleaningRecordsFiltered.value) ? cleaningRecordsFiltered.value : []
  const today = list.filter(r => formatDate(r.cleaning_time, 'YYYY-MM-DD') === todayLabel).length
  const types = new Set(list.map(r => r.cleaning_type_text || r.cleaning_type).filter(Boolean))
  let last = null
  list.forEach(r => { const d = r.cleaning_time ? new Date(r.cleaning_time) : null; if (d && (!last || d > last)) last = d })
  const lastStr = last ? formatRelativeTime(last) : '--'
  return { today, typeCount: types.size, lastTimeStr: lastStr }
})

const breedingStats = computed(() => {
  const list = Array.isArray(breedingRecordsFiltered.value) ? breedingRecordsFiltered.value : []
  const today = list.filter(r => formatDate(r.mating_date, 'YYYY-MM-DD') === todayLabel).length
  const ids = new Set()
  list.forEach(r => { if (r.male_parrot_id) ids.add(r.male_parrot_id); if (r.female_parrot_id) ids.add(r.female_parrot_id) })
  let last = null
  list.forEach(r => {
    const candidates = [r.mating_date, r.egg_laying_date, r.hatching_date].filter(Boolean).map(d => new Date(d))
    candidates.forEach(d => { if (d && (!last || d > last)) last = d })
  })
  const lastStr = last ? formatRelativeTime(last) : '--'
  return { today, parrotCount: ids.size, lastTimeStr: lastStr }
})

const handleDelete = async (row, type) => {
  if (!row || !row.id) return
  try {
    await ElMessageBox.confirm('确认删除该记录？', '提示', {
      type: 'warning'
    })
  } catch (_) {
    return
  }
  try {
    let url = ''
    if (type === 'feeding') {
      url = `/records/feeding/${row.id}`
    } else if (type === 'health') {
      url = `/records/health/${row.id}`
    } else if (type === 'cleaning') {
      url = `/records/cleaning/${row.id}`
    } else if (type === 'breeding') {
      url = `/records/breeding/${row.id}`
    }
    if (!url) return
    const res = await api.delete(url)
    if (res.data && res.data.success) {
      ElMessage.success('删除成功')
      Object.keys(recordsCache).forEach(k => { delete recordsCache[k] })
      refresh()
    } else {
      ElMessage.error((res.data && res.data.message) || '删除失败')
    }
  } catch (_) {
    ElMessage.error('删除失败')
  }
}

const detailDialogVisible = ref(false)
const detailDialogTitle = computed(() => '记录详情')
const detailLoading = ref(false)
const detailRecordType = ref('')
const detailRecordId = ref(null)
const detailRecord = ref({})
const detailOperationLogs = ref([])
const detailTypeLabel = computed(() => typeLabelMap[detailRecordType.value] || '')
const detailParrotName = computed(() => {
  const r = detailRecord.value || {}
  return r.parrot_name || (r.parrot && r.parrot.name) || ''
})
const detailRecorderName = computed(() => {
  const r = detailRecord.value || {}
  const nick = r.created_by_nickname || (r.created_by && r.created_by.nickname) || ''
  if (nick) return nick
  return r.created_by_username || (r.created_by && r.created_by.username) || ''
})
const detailAmountText = computed(() => {
  const r = detailRecord.value || {}
  const unit = (r.feed_type && r.feed_type.unit) || r.amountUnit || 'g'
  return r.amount !== undefined && r.amount !== null ? `${r.amount}${unit}` : '-'
})
const detailDisplayTime = computed(() => {
  const r = detailRecord.value || {}
  const t = r.record_time || r.feeding_time || r.record_date || r.cleaning_time || r.created_at || ''
  return formatDate(t)
})

const openDetail = async (row, type) => {
  const id = row && row.id
  if (!id) return
  detailRecordType.value = type
  detailRecordId.value = id
  detailDialogVisible.value = true
  await fetchDetailRecord()
  await fetchOperationLogs()
}

const handleRowClick = (row) => {
  const type = activeTab.value
  if (!type) return
  openDetail(row, type)
}

const fetchDetailRecord = async () => {
  detailLoading.value = true
  try {
    const url = `/records/${detailRecordType.value}/${detailRecordId.value}`
    const res = await api.get(url)
    if (res.data && res.data.success) {
      detailRecord.value = res.data.data || {}
    } else {
      detailRecord.value = {}
    }
  } catch (_) {
    detailRecord.value = {}
  } finally {
    detailLoading.value = false
  }
}

const mapActionToCN = (s) => {
  const v = String(s || '').toLowerCase()
  if (v.includes('create') || v === 'created') return '创建'
  if (v.includes('update') || v.includes('edit')) return '编辑'
  if (v.includes('delete')) return '删除'
  if (v.includes('transfer')) return '过户'
  if (v.includes('feed')) return '喂食'
  if (v.includes('clean')) return '清洁'
  if (v.includes('health')) return '健康检查'
  if (v.includes('breed')) return '繁殖'
  return '操作'
}

const formatOperationLogTime = (t) => {
  if (!t) return ''
  return formatDate(t)
}

const formatChangeSummary = (it, type, record) => {
  return []
}

const deriveOperationLogs = (record) => {
  const logs = []
  const cAt = record.created_at || ''
  const uAt = record.updated_at || ''
  const cBy = record.created_by_nickname || (record.created_by && record.created_by.nickname) || record.created_by_username || (record.created_by && record.created_by.username) || ''
  const uBy = record.updated_by_nickname || (record.updated_by && record.updated_by.nickname) || record.updated_by_username || (record.updated_by && record.updated_by.username) || ''
  const dcText = formatOperationLogTime(cAt)
  const duText = formatOperationLogTime(uAt)
  const rid = record.id || ''
  if (dcText) logs.push({ id: `created-${cAt}-${cBy}-${rid}`, actionText: '创建', operatorName: cBy, timeText: dcText, note: '', changeLines: [] })
  if (duText && (!dcText || duText !== dcText)) logs.push({ id: `updated-${uAt}-${uBy}-${rid}`, actionText: '编辑', operatorName: (uBy || cBy), timeText: duText, note: '', changeLines: [] })
  return logs
}

const fetchOperationLogs = async () => {
  try {
    const type = detailRecordType.value
    const id = detailRecordId.value
    const tryEndpoints = [
      `/records/${type}/${id}/operations`,
      `/records/${type}/${id}/logs`,
      `/records/${type}/${id}/history`,
      `/records/${type}/operations?id=${encodeURIComponent(id)}`,
      `/records/operations?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    ]
    let list = []
    for (let i = 0; i < tryEndpoints.length; i++) {
      const url = tryEndpoints[i]
      try {
        const res = await api.get(url)
        if (res.data && res.data.success) {
          const raw = (res.data.data && (res.data.data.operations || res.data.data.logs || res.data.data.items)) || (Array.isArray(res.data.data) ? res.data.data : [])
          if (Array.isArray(raw) && raw.length) { list = raw; break }
        }
      } catch (_) {}
    }
    const mapped = (list || []).map(it => {
      const actionRaw = String(it.action || it.operation || it.type || it.event || '').toLowerCase()
      const actionText = mapActionToCN(actionRaw)
      let operatorName = (
        it.operator_nickname ||
        (it.operator && it.operator.nickname) ||
        it.created_by_nickname ||
        it.updated_by_nickname ||
        it.operator_name ||
        (it.operator && it.operator.name) ||
        it.created_by_name ||
        it.updated_by_name ||
        (it.operator && it.operator.username) ||
        it.created_by_username ||
        it.updated_by_username ||
        ''
      )
      operatorName = String(operatorName || '').trim()
      if (!operatorName) {
        const r = detailRecord.value || {}
        operatorName = String(
          r.created_by_nickname || (r.created_by && r.created_by.nickname) || ''
        ).trim()
      }
      const t = it.time || it.created_at || it.updated_at || it.operation_time || it.record_time || ''
      const timeText = formatOperationLogTime(t)
      const note = it.note || it.notes || it.description || ''
      const changeLines = formatChangeSummary(it, type, detailRecord.value || {})
      return { id: it.id || `${actionRaw}-${t}-${operatorName}`, actionText, operatorName, timeText, note, changeLines }
    })
    if (mapped.length) {
      detailOperationLogs.value = mapped
    } else {
      detailOperationLogs.value = deriveOperationLogs(detailRecord.value || {})
    }
  } catch (_) {
    detailOperationLogs.value = deriveOperationLogs(detailRecord.value || {})
  }
}

const editCurrentRecord = () => {
  if (!detailRecord.value || !detailRecordId.value) return
  openEditDialog(detailRecord.value, detailRecordType.value)
}

const deleteCurrentRecord = () => {
  if (!detailRecord.value || !detailRecordId.value) return
  handleDelete(detailRecord.value, detailRecordType.value)
}

const submitAdd = async () => {
  const type = addFormType.value
  if (type !== 'breeding') {
    if (!addForm.parrot_ids || addForm.parrot_ids.length === 0) {
      ElMessage.error('请选择鹦鹉')
      return
    }
  } else {
    if (!addForm.male_parrot_id || !addForm.female_parrot_id) {
      ElMessage.error('请选择公鸟和母鸟')
      return
    }
  }

  if (showRecordTimePicker.value && !addFormDateTime.value) {
    ElMessage.error('请选择记录时间')
    return
  }

  const payload = { type }
  const isEdit = !!editingRecordId.value

  if (type === 'feeding') {
    if (!addForm.food_types || addForm.food_types.length === 0) {
      ElMessage.error('请选择食物类型')
      return
    }
    payload.parrot_ids = addForm.parrot_ids
    payload.feeding_time = addFormDateTime.value
    payload.food_types = addForm.food_types.slice()
    const foodAmounts = {}
    if (Array.isArray(addForm.food_types)) {
      addForm.food_types.forEach(id => {
        const raw = addForm.food_amounts[id]
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
          foodAmounts[id] = String(raw).trim()
        }
      })
    }
    payload.food_amounts = foodAmounts
    if (addForm.food_types.length > 1) {
      if (Object.keys(foodAmounts).length !== addForm.food_types.length) {
        ElMessage.error('请为每种食物类型填写分量')
        return
      }
    } else if (addForm.food_types.length === 1) {
      if (addForm.amount && String(addForm.amount).trim() !== '') {
        payload.amount = String(addForm.amount).trim()
      } else if (!foodAmounts[addForm.food_types[0]]) {
        ElMessage.error('请输入分量')
        return
      }
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  } else if (type === 'cleaning') {
    if (!addForm.cleaning_types || addForm.cleaning_types.length === 0) {
      ElMessage.error('请选择清洁类型')
      return
    }
    payload.parrot_ids = addForm.parrot_ids
    payload.cleaning_time = addFormDateTime.value
    payload.cleaning_types = addForm.cleaning_types.slice()
    if (addForm.description && String(addForm.description).trim() !== '') {
      payload.description = String(addForm.description).trim()
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  } else if (type === 'health') {
    payload.parrot_ids = addForm.parrot_ids
    payload.record_date = addFormDateTime.value
    payload.health_status = addForm.health_status || 'healthy'
    if (addForm.weight && String(addForm.weight).trim() !== '') {
      payload.weight = String(addForm.weight).trim()
    }
    if (addForm.description && String(addForm.description).trim() !== '') {
      payload.description = String(addForm.description).trim()
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  } else if (type === 'breeding') {
    payload.male_parrot_id = addForm.male_parrot_id
    payload.female_parrot_id = addForm.female_parrot_id
    if (addForm.mating_date) payload.mating_date = addForm.mating_date
    if (addForm.egg_laying_date) payload.egg_laying_date = addForm.egg_laying_date
    if (addForm.egg_count && String(addForm.egg_count).trim() !== '') {
      payload.egg_count = parseInt(String(addForm.egg_count).trim(), 10) || 0
    }
    if (addForm.hatching_date) payload.hatching_date = addForm.hatching_date
    if (addForm.chick_count && String(addForm.chick_count).trim() !== '') {
      payload.chick_count = parseInt(String(addForm.chick_count).trim(), 10) || 0
    }
    if (addForm.success_rate && String(addForm.success_rate).trim() !== '') {
      payload.success_rate = parseFloat(String(addForm.success_rate).trim())
    }
    if (addFormDateTime.value) {
      payload.record_time = addFormDateTime.value
    }
    if (addForm.notes && String(addForm.notes).trim() !== '') {
      payload.notes = String(addForm.notes).trim()
    }
  }

  addSubmitting.value = true
  try {
    let url = '/records'
    let method = 'post'
    if (isEdit && editingRecordId.value) {
      url = `/records/${editingRecordId.value}`
      method = 'put'
    }
    const res = await api[method](url, payload)
    if (res.data && res.data.success) {
      ElMessage.success('保存成功')
      editingRecordId.value = null
      addDialogVisible.value = false
      Object.keys(recordsCache).forEach(k => { delete recordsCache[k] })
      refresh()
    } else {
      ElMessage.error((res.data && res.data.message) || '保存失败')
    }
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.message
      ? e.response.data.message
      : (e.message || '保存失败')
    ElMessage.error(msg)
  } finally {
    addSubmitting.value = false
  }
}

watch([feedingRecords, healthRecords, cleaningRecords, breedingRecords, activeTab], () => {
  applyClientFilter()
})

watch(activeTab, () => {
  currentPage.value = 1
  fetchRecords()
})

const loadParrots = async () => {
  try {
    const cacheKey = 'parrots_cache'
    const now = Date.now()
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && Array.isArray(cached.items) && now - cached.timestamp < 3600000) {
        parrots.value = cached.items
        return
      }
    } catch (_) {}

    const r = await api.get('/parrots')
    if (r.data && r.data.success) {
      const data = r.data.data || {}
      let arr = []
      if (Array.isArray(data)) {
        arr = data
      } else if (Array.isArray(data.parrots)) {
        arr = data.parrots
      } else if (Array.isArray(data.items)) {
        arr = data.items
      }
      parrots.value = arr
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ items: arr, timestamp: now }))
      } catch (_) {}
    }
  } catch (_) {}
}

onMounted(() => {
  loadParrots()
  if (route.query.tab && route.query.tab !== activeTab.value) {
    activeTab.value = route.query.tab
  } else {
    fetchRecords()
  }
})
</script>

<style scoped>
h2 { color: var(--text-primary); }
.header-actions { display: inline-flex; align-items: center; gap: 8px; }
:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}
:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
}
:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  --el-table-header-bg-color: #f8f9fa;
}
:deep(.el-tag--small) {
  border-radius: 6px;
}
.pagination {
  margin-top: 20px;
  justify-content: center;
}

.records-stats { margin-bottom: 16px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card :deep(.el-card__body) {
  padding: 16px;
}

.stat-card.clickable {
  cursor: pointer;
  transition: transform 0.1s;
}
.stat-card.clickable:active {
  transform: translateY(1px);
}

.stat-content-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.icon-green { background: #f0fdf4; color: #16a34a; }
.icon-blue { background: #eff6ff; color: #2563eb; }
.icon-purple { background: #faf5ff; color: #9333ea; }
.icon-orange { background: #fff7ed; color: #ea580c; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: nowrap;
}
.search-input { flex: 2 1 420px; min-width: 260px; }
.toolbar-right { display: flex; gap: 12px; align-items: center; flex-wrap: nowrap; }
.filter-item { min-width: 140px; flex: 0 0 140px; }

.detail-loading { padding: 24px; text-align: center; color: #909399; }
.detail-section { margin-top: 16px; }
.photos-title { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.photo-item { width: 100%; height: 88px; border-radius: 6px; overflow: hidden; }
.oplogs-section { margin-top: 16px; }
.oplogs-title { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.oplog-list { display: flex; flex-direction: column; gap: 12px; }
.oplog-item { padding: 12px; border: 1px solid #ebeef5; border-radius: 8px; }
.oplog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.oplog-action { color: #409eff; font-weight: 600; }
.oplog-time { color: #909399; }
.oplog-meta { color: #606266; margin-bottom: 6px; }
.oplog-diff-item { color: #606266; }
.oplog-notes { color: #303133; }
.oplogs-empty { color: #909399; }
</style>
