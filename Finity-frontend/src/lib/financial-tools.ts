export type MoneyEntry = {
  id: string
  name: string
  amount: number
}

export type CreditScheduleItem = {
  month: number
  payment: number
  principalPart: number
  interestPart: number
  balanceAfterPayment: number
}

export type CreditPlan = {
  monthlyPayment: number
  totalPaid: number
  totalInterest: number
  payoffMonths: number
  schedule: CreditScheduleItem[]
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function sumMoney(entries: MoneyEntry[]) {
  return roundMoney(entries.reduce((sum, entry) => sum + sanitizeNumber(entry.amount), 0))
}

export function sanitizeNumber(value: number) {
  if (!Number.isFinite(value)) return 0
  return value
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`
}

export function monthlyRateFromAnnual(annualRate: number) {
  return sanitizeNumber(annualRate) / 12 / 100
}

export function calculateFutureValue(
  currentAmount: number,
  monthlyContribution: number,
  annualRate: number,
  months: number,
) {
  let balance = Math.max(0, sanitizeNumber(currentAmount))
  const contribution = Math.max(0, sanitizeNumber(monthlyContribution))
  const monthlyRate = monthlyRateFromAnnual(annualRate)
  const totalMonths = Math.max(0, Math.floor(sanitizeNumber(months)))

  for (let month = 0; month < totalMonths; month += 1) {
    balance = balance * (1 + monthlyRate) + contribution
  }

  return roundMoney(balance)
}

export function calculateMonthsToGoal(
  goalAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  annualRate: number,
  maxMonths = 1200,
) {
  const goal = Math.max(0, sanitizeNumber(goalAmount))
  let balance = Math.max(0, sanitizeNumber(currentAmount))
  const contribution = Math.max(0, sanitizeNumber(monthlyContribution))
  const monthlyRate = monthlyRateFromAnnual(annualRate)

  if (balance >= goal) {
    return 0
  }

  if (contribution <= 0 && monthlyRate <= 0) {
    return null
  }

  for (let month = 1; month <= maxMonths; month += 1) {
    balance = balance * (1 + monthlyRate) + contribution
    if (balance >= goal) {
      return month
    }
  }

  return null
}

export function calculateRequiredMonthlyContribution(
  goalAmount: number,
  currentAmount: number,
  annualRate: number,
  months: number,
) {
  const goal = Math.max(0, sanitizeNumber(goalAmount))
  const current = Math.max(0, sanitizeNumber(currentAmount))
  const totalMonths = Math.max(1, Math.floor(sanitizeNumber(months)))

  if (current >= goal) {
    return 0
  }

  let lowerBound = 0
  let upperBound = Math.max(1, goal)

  while (calculateFutureValue(current, upperBound, annualRate, totalMonths) < goal) {
    upperBound *= 2
    if (upperBound > goal * 100) {
      break
    }
  }

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (lowerBound + upperBound) / 2
    const projected = calculateFutureValue(current, middle, annualRate, totalMonths)

    if (projected >= goal) {
      upperBound = middle
    } else {
      lowerBound = middle
    }
  }

  return roundMoney(upperBound)
}

export function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  months: number,
) {
  const amount = Math.max(0, sanitizeNumber(principal))
  const totalMonths = Math.max(1, Math.floor(sanitizeNumber(months)))
  const monthlyRate = monthlyRateFromAnnual(annualRate)

  if (amount <= 0) {
    return 0
  }

  if (monthlyRate === 0) {
    return roundMoney(amount / totalMonths)
  }

  const factor = monthlyRate / (1 - (1 + monthlyRate) ** -totalMonths)
  return roundMoney(amount * factor)
}

export function calculateCreditPlan(
  principal: number,
  annualRate: number,
  months: number,
  extraPayment = 0,
) {
  const amount = Math.max(0, sanitizeNumber(principal))
  const totalMonths = Math.max(1, Math.floor(sanitizeNumber(months)))
  const additionalPayment = Math.max(0, sanitizeNumber(extraPayment))

  if (amount <= 0) {
    return {
      monthlyPayment: 0,
      totalPaid: 0,
      totalInterest: 0,
      payoffMonths: 0,
      schedule: [],
    } satisfies CreditPlan
  }

  const monthlyRate = monthlyRateFromAnnual(annualRate)
  const basePayment = calculateAnnuityPayment(amount, annualRate, totalMonths)

  let balance = amount
  let totalPaid = 0
  let totalInterest = 0
  let month = 0
  const schedule: CreditScheduleItem[] = []

  while (balance > 0.01 && month < 1200) {
    month += 1
    const interestPart = roundMoney(balance * monthlyRate)
    const plannedPayment = Math.max(basePayment + additionalPayment, interestPart)
    const payment = roundMoney(Math.min(balance + interestPart, plannedPayment))
    const principalPart = roundMoney(Math.max(0, payment - interestPart))
    balance = roundMoney(Math.max(0, balance - principalPart))
    totalPaid = roundMoney(totalPaid + payment)
    totalInterest = roundMoney(totalInterest + interestPart)

    schedule.push({
      month,
      payment,
      principalPart,
      interestPart,
      balanceAfterPayment: balance,
    })
  }

  return {
    monthlyPayment: basePayment,
    totalPaid,
    totalInterest,
    payoffMonths: month,
    schedule,
  } satisfies CreditPlan
}

