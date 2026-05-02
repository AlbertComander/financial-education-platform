<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Building2, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-vue-next'
import { API_BASE_URL } from '@/api/http'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { demoInstrumentMetricDefinitions } from '@/lib/demo-instrument-metrics'
import { useAdminDemoInstrumentsStore } from '@/stores/admin-demo-instruments'
import type { AdminDemoInstrument } from '@/types/admin-demo-instruments'

type MetricDraft = {
  draftKey: string
  section: string
  label: string
  value: string
  hint: string
  orderIndex: number
}

type DividendDraft = {
  draftKey: string
  recordDate: string
  amount: number | ''
  currency: string
  yieldPercent: number | ''
  period: string
  declaredAt: string
  orderIndex: number
}

const adminInstruments = useAdminDemoInstrumentsStore()
const searchQuery = ref('')
const selectedInstrumentId = ref('')
const noticeText = ref('')
const noticeTone = ref<'success' | 'error'>('success')
let draftCounter = 0

const form = reactive({
  name: '',
  sector: '',
  country: '',
  isin: '',
  websiteUrl: '',
  logoUrl: '',
  description: '',
  metrics: [] as MetricDraft[],
  dividends: [] as DividendDraft[],
})

const filteredInstruments = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('ru-RU')
  if (!query) return adminInstruments.instruments

  return adminInstruments.instruments.filter((instrument) =>
    [instrument.name, instrument.symbol, instrument.exchange, instrument.sector, instrument.country]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('ru-RU').includes(query)),
  )
})

const selectedInstrument = computed(() =>
  adminInstruments.instruments.find((instrument) => instrument.id === selectedInstrumentId.value) ?? null,
)
const metricGroups = computed(() => {
  const groups = new Map<string, MetricDraft[]>()

  for (const metric of form.metrics) {
    groups.set(metric.section, [...(groups.get(metric.section) ?? []), metric])
  }

  return [...groups.entries()].map(([section, items]) => ({ section, items }))
})

function nextDraftKey(prefix: string) {
  draftCounter += 1
  return `${prefix}-${draftCounter}`
}

function showNotice(message: string, tone: 'success' | 'error' = 'success') {
  noticeText.value = message
  noticeTone.value = tone
}

function assetUrl(value: string | null | undefined) {
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return value.startsWith('/') ? `${API_BASE_URL}${value}` : value
}

function instrumentInitials(instrument: AdminDemoInstrument) {
  return instrument.symbol.slice(0, 2).toUpperCase()
}

function syncForm(instrument: AdminDemoInstrument | null) {
  if (!instrument) {
    form.name = ''
    form.sector = ''
    form.country = ''
    form.isin = ''
    form.websiteUrl = ''
    form.logoUrl = ''
    form.description = ''
    form.metrics = []
    form.dividends = []
    return
  }

  form.name = instrument.name
  form.sector = instrument.sector ?? ''
  form.country = instrument.country ?? ''
  form.isin = instrument.isin ?? ''
  form.websiteUrl = instrument.website_url ?? ''
  form.logoUrl = instrument.logo_url ?? ''
  form.description = instrument.description ?? ''
  const metricByLabel = new Map(instrument.demo_instrument_metrics.map((metric) => [metric.label, metric]))
  form.metrics = demoInstrumentMetricDefinitions.map((definition, index) => {
    const metric = metricByLabel.get(definition.label)

    return {
      draftKey: nextDraftKey('metric'),
      section: definition.section,
      label: definition.label,
      value: metric?.value ?? '',
      hint: metric?.hint ?? definition.hint,
      orderIndex: index + 1,
    }
  })
  form.dividends = instrument.demo_instrument_dividends.map((dividend, index) => ({
    draftKey: nextDraftKey('dividend'),
    recordDate: dateInputValue(dividend.record_date),
    amount: Number(dividend.amount),
    currency: dividend.currency,
    yieldPercent: dividend.yield_percent === null ? '' : Number(dividend.yield_percent),
    period: dividend.period ?? '',
    declaredAt: dateInputValue(dividend.declared_at),
    orderIndex: dividend.order_index || index + 1,
  }))
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function addDividend() {
  form.dividends.push({
    draftKey: nextDraftKey('dividend'),
    recordDate: new Date().toISOString().slice(0, 10),
    amount: '',
    currency: selectedInstrument.value?.currency ?? 'RUB',
    yieldPercent: '',
    period: '',
    declaredAt: '',
    orderIndex: form.dividends.length + 1,
  })
}

function removeDividend(draftKey: string) {
  form.dividends = form.dividends
    .filter((dividend) => dividend.draftKey !== draftKey)
    .map((dividend, index) => ({ ...dividend, orderIndex: index + 1 }))
}

async function saveInstrument() {
  const instrument = selectedInstrument.value
  if (!instrument) return

  try {
    await adminInstruments.updateInstrument(instrument.id, {
      name: form.name.trim(),
      sector: form.sector.trim(),
      country: form.country.trim(),
      isin: form.isin.trim(),
      websiteUrl: form.websiteUrl.trim(),
      logoUrl: form.logoUrl.trim(),
      description: form.description.trim(),
      metrics: form.metrics
        .map((metric, index) => ({
          section: metric.section.trim(),
          label: metric.label.trim(),
          value: metric.value.trim(),
          hint: metric.hint.trim(),
          orderIndex: index + 1,
        }))
        .filter((metric) => metric.label && metric.value),
      dividends: form.dividends
        .map((dividend, index) => ({
          recordDate: dividend.recordDate,
          amount: Number(dividend.amount),
          currency: dividend.currency.trim() || instrument.currency,
          yieldPercent:
            dividend.yieldPercent === ''
              ? undefined
              : Number(dividend.yieldPercent),
          period: dividend.period.trim(),
          declaredAt: dividend.declaredAt || undefined,
          orderIndex: index + 1,
        }))
        .filter((dividend) => dividend.recordDate && Number.isFinite(dividend.amount)),
    })
    showNotice('Карточка актива сохранена.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось сохранить актив', 'error')
  }
}

async function importMarketData() {
  try {
    const result = await adminInstruments.importMarketData()
    showNotice(`Данные загружены: ${result.instruments} активов, ${result.metrics} показателей, ${result.dividends} дивидендных записей.`)
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось загрузить данные из API', 'error')
  }
}

async function onLogoSelected(event: Event) {
  const instrument = selectedInstrument.value
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!instrument || !file) return

  try {
    const result = await adminInstruments.uploadLogo(instrument.id, file)
    form.logoUrl = result.instrument.logo_url ?? result.logoUrl
    showNotice('Логотип загружен.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось загрузить логотип', 'error')
  } finally {
    if (input) input.value = ''
  }
}

watch(selectedInstrument, syncForm, { immediate: true })

onMounted(async () => {
  try {
    await adminInstruments.loadInstruments()
    if (!selectedInstrumentId.value && adminInstruments.instruments[0]) {
      selectedInstrumentId.value = adminInstruments.instruments[0].id
    }
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось загрузить активы', 'error')
  }
})
</script>

<template>
  <section class="admin-instruments">
    <header class="admin-instruments__header">
      <div>
        <p class="admin-instruments__eyebrow">Демо-счет</p>
        <h1>Карточки активов</h1>
      </div>
      <div class="admin-instruments__header-actions">
        <Button variant="secondary" :disabled="adminInstruments.isSaving" @click="importMarketData">
          <RefreshCw />
          Загрузить из API
        </Button>
        <Button :disabled="!selectedInstrument || adminInstruments.isSaving" @click="saveInstrument">
          <Save />
          Сохранить
        </Button>
      </div>
    </header>

    <div
      v-if="noticeText || adminInstruments.error"
      class="admin-instruments__notice"
      :class="`admin-instruments__notice--${noticeTone}`"
    >
      {{ noticeText || adminInstruments.error }}
    </div>

    <div class="admin-instruments__shell">
      <Card class="admin-instruments__list">
        <div class="admin-instruments__list-head">
          <Label for="admin-instruments-search">Поиск</Label>
          <Input id="admin-instruments-search" v-model="searchQuery" placeholder="Название, тикер, сектор" />
        </div>

        <div v-if="adminInstruments.isLoading" class="admin-instruments__skeleton-list">
          <Skeleton v-for="item in 8" :key="item" class="admin-instruments__skeleton-row" />
        </div>
        <div v-else-if="filteredInstruments.length === 0" class="admin-instruments__state">
          Активы не найдены.
        </div>
        <template v-else>
          <button
            v-for="instrument in filteredInstruments"
            :key="instrument.id"
            type="button"
            class="admin-instruments__instrument-button"
            :class="{ 'admin-instruments__instrument-button--active': selectedInstrumentId === instrument.id }"
            @click="selectedInstrumentId = instrument.id"
          >
            <span class="admin-instruments__logo" :class="{ 'admin-instruments__logo--image': instrument.logo_url }">
              <img v-if="instrument.logo_url" :src="assetUrl(instrument.logo_url)" :alt="instrument.name" />
              <template v-else>{{ instrumentInitials(instrument) }}</template>
            </span>
            <span>
              <strong>{{ instrument.name }}</strong>
              <small>{{ instrument.symbol }} · {{ instrument.exchange ?? '—' }}</small>
            </span>
          </button>
        </template>
      </Card>

      <Card v-if="selectedInstrument" class="admin-instruments__editor">
        <div class="admin-instruments__editor-head">
          <div class="admin-instruments__identity">
            <span class="admin-instruments__logo admin-instruments__logo--large" :class="{ 'admin-instruments__logo--image': form.logoUrl }">
              <img v-if="form.logoUrl" :src="assetUrl(form.logoUrl)" :alt="form.name" />
              <Building2 v-else />
            </span>
            <div>
              <p>{{ selectedInstrument.symbol }} · {{ selectedInstrument.asset_type }}</p>
              <h2>{{ selectedInstrument.name }}</h2>
            </div>
          </div>

          <label class="admin-instruments__upload">
            <Upload />
            <span>Логотип</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" @change="onLogoSelected" />
          </label>
        </div>

        <div class="admin-instruments__grid">
          <div class="admin-instruments__field">
            <Label for="instrument-name">Название</Label>
            <Input id="instrument-name" v-model="form.name" />
          </div>
          <div class="admin-instruments__field">
            <Label for="instrument-sector">Сектор</Label>
            <Input id="instrument-sector" v-model="form.sector" />
          </div>
          <div class="admin-instruments__field">
            <Label for="instrument-country">Страна</Label>
            <Input id="instrument-country" v-model="form.country" />
          </div>
          <div class="admin-instruments__field">
            <Label for="instrument-isin">ISIN</Label>
            <Input id="instrument-isin" v-model="form.isin" />
          </div>
          <div class="admin-instruments__field admin-instruments__field--full">
            <Label for="instrument-website">Сайт компании</Label>
            <Input id="instrument-website" v-model="form.websiteUrl" placeholder="https://..." />
          </div>
          <div class="admin-instruments__field admin-instruments__field--full">
            <Label for="instrument-description">Описание</Label>
            <Textarea id="instrument-description" v-model="form.description" rows="7" />
          </div>
        </div>

        <section class="admin-instruments__section">
          <div class="admin-instruments__section-head">
            <h3>Ключевые показатели</h3>
          </div>

          <div class="admin-instruments__metric-groups">
            <div v-for="group in metricGroups" :key="group.section" class="admin-instruments__metric-group">
              <h4>{{ group.section }}</h4>
              <div v-for="metric in group.items" :key="metric.draftKey" class="admin-instruments__metric-row">
                <div>
                  <strong>{{ metric.label }}</strong>
                  <span>{{ metric.hint }}</span>
                </div>
                <Input v-model="metric.value" placeholder="Значение" />
              </div>
            </div>
          </div>
        </section>

        <section class="admin-instruments__section">
          <div class="admin-instruments__section-head">
            <h3>Дивиденды</h3>
            <Button type="button" variant="outline" @click="addDividend">
              <Plus />
              Выплата
            </Button>
          </div>

          <div v-if="form.dividends.length === 0" class="admin-instruments__state admin-instruments__state--inner">
            История дивидендов пока не заполнена.
          </div>
          <div v-else class="admin-instruments__dividend-list">
            <div v-for="dividend in form.dividends" :key="dividend.draftKey" class="admin-instruments__dividend-row">
              <Input v-model="dividend.recordDate" type="date" />
              <Input v-model.number="dividend.amount" type="number" min="0" step="0.000001" placeholder="Сумма" />
              <Input v-model="dividend.currency" placeholder="Валюта" />
              <Input v-model.number="dividend.yieldPercent" type="number" min="0" step="0.0001" placeholder="Доходность, %" />
              <Input v-model="dividend.period" placeholder="Период" />
              <Button type="button" variant="outline" size="icon" @click="removeDividend(dividend.draftKey)">
                <Trash2 />
              </Button>
            </div>
          </div>
        </section>
      </Card>

      <Card v-else class="admin-instruments__editor admin-instruments__state">
        Выберите актив из списка.
      </Card>
    </div>
  </section>
</template>

<style scoped>
.admin-instruments {
  display: grid;
  gap: 16px;
}

.admin-instruments__header,
.admin-instruments__editor-head,
.admin-instruments__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-instruments__header h1,
.admin-instruments__editor h2,
.admin-instruments__section h3,
.admin-instruments__eyebrow,
.admin-instruments__identity p {
  margin: 0;
}

.admin-instruments__header h1 {
  font-size: clamp(30px, 3.5vw, 40px);
  line-height: 1.05;
}

.admin-instruments__header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.admin-instruments__eyebrow,
.admin-instruments__identity p,
.admin-instruments__state,
.admin-instruments__instrument-button small {
  color: hsl(var(--muted-foreground));
}

.admin-instruments__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.admin-instruments__notice {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 12px 14px;
}

.admin-instruments__notice--success {
  background: hsl(151 72% 95%);
  border-color: hsl(151 42% 78%);
  color: hsl(151 62% 25%);
}

.admin-instruments__notice--error {
  background: hsl(0 82% 96%);
  border-color: hsl(0 56% 83%);
  color: hsl(0 58% 36%);
}

.admin-instruments__shell {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.admin-instruments__list,
.admin-instruments__editor {
  padding: 0;
  overflow: hidden;
}

.admin-instruments__list {
  position: sticky;
  top: 18px;
}

.admin-instruments__list-head,
.admin-instruments__editor-head,
.admin-instruments__grid,
.admin-instruments__section,
.admin-instruments__skeleton-list,
.admin-instruments__state {
  padding: 18px;
}

.admin-instruments__list-head,
.admin-instruments__section {
  display: grid;
  gap: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.admin-instruments__skeleton-list {
  display: grid;
  gap: 10px;
}

.admin-instruments__skeleton-row {
  height: 58px;
  border-radius: 12px;
}

.admin-instruments__instrument-button {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 0;
  border-top: 1px solid hsl(var(--border));
  background: transparent;
  padding: 13px 18px;
  text-align: left;
  cursor: pointer;
}

.admin-instruments__instrument-button:hover,
.admin-instruments__instrument-button--active {
  background: hsl(211 88% 97%);
}

.admin-instruments__instrument-button span:last-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.admin-instruments__instrument-button strong,
.admin-instruments__instrument-button small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-instruments__logo {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: hsl(211 88% 52%);
  color: white;
  font-weight: 800;
  overflow: hidden;
}

.admin-instruments__logo--large {
  width: 72px;
  height: 72px;
}

.admin-instruments__logo--large svg {
  width: 30px;
  height: 30px;
}

.admin-instruments__logo--image {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.admin-instruments__logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: white;
}

.admin-instruments__identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.admin-instruments__identity h2 {
  margin-top: 4px;
  line-height: 1.1;
}

.admin-instruments__upload {
  min-height: 40px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  cursor: pointer;
}

.admin-instruments__upload input {
  display: none;
}

.admin-instruments__upload svg,
.admin-instruments__header svg,
.admin-instruments__section-head svg {
  width: 16px;
  height: 16px;
}

.admin-instruments__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  border-top: 1px solid hsl(var(--border));
}

.admin-instruments__field {
  display: grid;
  gap: 8px;
}

.admin-instruments__field--full {
  grid-column: 1 / -1;
}

.admin-instruments__metric-groups,
.admin-instruments__dividend-list {
  display: grid;
  gap: 10px;
}

.admin-instruments__metric-group {
  display: grid;
  gap: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 14px;
}

.admin-instruments__metric-group h4 {
  margin: 0;
  font-size: 15px;
}

.admin-instruments__metric-row,
.admin-instruments__dividend-row {
  display: grid;
  gap: 8px;
  align-items: center;
}

.admin-instruments__metric-row {
  grid-template-columns: minmax(190px, 0.8fr) minmax(180px, 1fr);
}

.admin-instruments__metric-row > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.admin-instruments__metric-row span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.admin-instruments__dividend-row {
  grid-template-columns: minmax(140px, 0.8fr) minmax(110px, 0.7fr) minmax(80px, 0.45fr) minmax(120px, 0.7fr) minmax(120px, 0.8fr) 40px;
}

.admin-instruments__state--inner {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--muted) / 0.35);
}

@media (max-width: 1180px) {
  .admin-instruments__shell,
  .admin-instruments__grid,
  .admin-instruments__metric-row,
  .admin-instruments__dividend-row {
    grid-template-columns: 1fr;
  }

  .admin-instruments__list {
    position: static;
  }
}

@media (max-width: 720px) {
  .admin-instruments__header,
  .admin-instruments__editor-head,
  .admin-instruments__section-head,
  .admin-instruments__header-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
