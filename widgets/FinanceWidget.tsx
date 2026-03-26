import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function FinanceWidget() {
  const d = latestWidgetData.find((p) => p.type === 'finance')?.data ?? {}
  const spend = d.netSpend as number ?? 0
  const status = d.budgetStatus as string ?? 'green'
  const dot = status === 'red' ? '🔴' : status === 'yellow' ? '🟡' : '🟢'
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fefce8', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Finance" style={{ fontSize: 11, color: '#ca8a04', fontWeight: '600' }} />
      <TextWidget text={`$${spend.toFixed(2)}`} style={{ fontSize: 24, color: '#713f12', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="spent today" style={{ fontSize: 11, color: '#6b7280' }} />
      <TextWidget text={dot} style={{ fontSize: 14, marginTop: 4 }} />
    </FlexWidget>
  )
}
