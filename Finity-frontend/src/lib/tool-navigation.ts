export type InteractiveToolId =
  | 'overview'
  | 'budget-planner'
  | 'rule-503020'
  | 'emergency-fund'
  | 'credit-calculator'
  | 'savings-planner'
  | 'scenario-comparison'
  | 'demo-account'

export type InteractiveToolLink = {
  id: InteractiveToolId
  routeName:
    | 'tools-home'
    | 'tool-budget-planner'
    | 'tool-rule-503020'
    | 'tool-emergency-fund'
    | 'tool-credit-calculator'
    | 'tool-savings-planner'
    | 'tool-scenario-comparison'
    | 'tool-demo-account'
  to: string
  name: string
  shortName: string
  description: string
  eyebrow: string
  iconKey:
    | 'sparkles'
    | 'wallet'
    | 'pie'
    | 'shield'
    | 'calculator'
    | 'target'
    | 'split'
    | 'wallet-cards'
  theme: 'gold' | 'ocean' | 'mint' | 'rose' | 'indigo' | 'teal' | 'sunset' | 'market'
}

export const interactiveToolLinks: InteractiveToolLink[] = [
  {
    id: 'overview',
    routeName: 'tools-home',
    to: '/tools',
    name: 'Все инструменты',
    shortName: 'Обзор',
    description: 'Подборка интерактивных финансовых инструментов для расчётов, сценарного анализа и прикладного планирования.',
    eyebrow: 'Finity Tools',
    iconKey: 'sparkles',
    theme: 'gold',
  },
  {
    id: 'demo-account',
    routeName: 'tool-demo-account',
    to: '/tools/demo-account',
    name: 'Демо-счет',
    shortName: 'Демо-счет',
    description: 'Учебный счет с виртуальными деньгами, регулярными пополнениями и настоящими рыночными котировками.',
    eyebrow: 'Инструменты • Рынок',
    iconKey: 'wallet-cards',
    theme: 'market',
  },
  {
    id: 'budget-planner',
    routeName: 'tool-budget-planner',
    to: '/tools/budget-planner',
    name: 'Планировщик бюджета',
    shortName: 'Бюджет',
    description: 'Помогает зафиксировать доходы и расходы, увидеть структуру трат и оценить текущий баланс.',
    eyebrow: 'Инструменты • Бюджет',
    iconKey: 'wallet',
    theme: 'ocean',
  },
  {
    id: 'rule-503020',
    routeName: 'tool-rule-503020',
    to: '/tools/rule-503020',
    name: 'Правило 50/30/20',
    shortName: '50/30/20',
    description: 'Сравнивает фактическое распределение дохода с моделью 50/30/20 и показывает отклонения.',
    eyebrow: 'Инструменты • Баланс',
    iconKey: 'pie',
    theme: 'sunset',
  },
  {
    id: 'emergency-fund',
    routeName: 'tool-emergency-fund',
    to: '/tools/emergency-fund',
    name: 'Финансовая подушка',
    shortName: 'Подушка',
    description: 'Оценивает размер резервного фонда, текущую готовность и срок достижения целевого резерва.',
    eyebrow: 'Инструменты • Резерв',
    iconKey: 'shield',
    theme: 'mint',
  },
  {
    id: 'credit-calculator',
    routeName: 'tool-credit-calculator',
    to: '/tools/credit-calculator',
    name: 'Кредитный калькулятор',
    shortName: 'Кредит',
    description: 'Рассчитывает аннуитетный платёж, переплату и влияние досрочного погашения на общий график.',
    eyebrow: 'Инструменты • Обязательства',
    iconKey: 'calculator',
    theme: 'rose',
  },
  {
    id: 'savings-planner',
    routeName: 'tool-savings-planner',
    to: '/tools/savings-planner',
    name: 'Калькулятор накоплений',
    shortName: 'Накопления',
    description: 'Показывает, какой ежемесячный вклад нужен для цели, и как меняется результат при доходности.',
    eyebrow: 'Инструменты • Цели',
    iconKey: 'target',
    theme: 'teal',
  },
  {
    id: 'scenario-comparison',
    routeName: 'tool-scenario-comparison',
    to: '/tools/scenario-comparison',
    name: 'Сравнение сценариев',
    shortName: 'Сценарии',
    description: 'Сопоставляет покупку в кредит и накопление до цели, чтобы выбрать более устойчивый вариант.',
    eyebrow: 'Инструменты • Сценарии',
    iconKey: 'split',
    theme: 'indigo',
  },
]

export const interactiveToolMap = Object.fromEntries(
  interactiveToolLinks.map((tool) => [tool.routeName, tool]),
) as Record<InteractiveToolLink['routeName'], InteractiveToolLink>

export const sidebarInteractiveTools = interactiveToolLinks.filter((tool) => tool.id !== 'overview')
