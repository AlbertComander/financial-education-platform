export type DemoInstrumentMetricDefinition = {
  section: string
  label: string
  hint: string
}

export const demoInstrumentMetricDefinitions: DemoInstrumentMetricDefinition[] = [
  {
    section: 'Финансовые показатели',
    label: 'Market Cap',
    hint: 'Стоимость компании',
  },
  { section: 'Оценка стоимости', label: 'P/E', hint: 'Цена акции / прибыль' },
  { section: 'Оценка стоимости', label: 'P/S', hint: 'Цена акции / выручка' },
  { section: 'Оценка стоимости', label: 'Рост EPS', hint: 'Средний рост за 5 лет' },
  { section: 'Оценка стоимости', label: 'Рост выручки', hint: 'Средний рост за 5 лет' },
  { section: 'Рентабельность', label: 'ROE', hint: 'Доходность капитала' },
  { section: 'Рентабельность', label: 'ROA', hint: 'Доходность активов' },
  { section: 'Дивиденды', label: 'Payout Ratio', hint: 'Процент дивидендов от прибыли' },
  { section: 'Дивиденды', label: 'Средний дивидендный доход', hint: 'За 5 лет' },
  { section: 'Дивиденды', label: 'Дивидендная доходность', hint: 'За год' },
  { section: 'Торговля', label: 'Цена открытия', hint: 'Текущая сессия' },
  { section: 'Торговля', label: '52w Low', hint: 'Минимум за год' },
  { section: 'Торговля', label: '52w High', hint: 'Максимум за год' },
  { section: 'Торговля', label: 'Объем торгов', hint: 'За день' },
]

export function groupDemoInstrumentMetricDefinitions() {
  const groups = new Map<string, DemoInstrumentMetricDefinition[]>()

  for (const definition of demoInstrumentMetricDefinitions) {
    groups.set(definition.section, [...(groups.get(definition.section) ?? []), definition])
  }

  return [...groups.entries()].map(([section, items]) => ({ section, items }))
}
