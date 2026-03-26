import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function HabitsWidget() {
  const d = latestWidgetData.find((p) => p.type === 'habits')?.data ?? {}
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fdf4ff', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Habits" style={{ fontSize: 11, color: '#9333ea', fontWeight: '600' }} />
      <TextWidget text={`${d.completedCount ?? 0}/${d.activeCount ?? 0}`} style={{ fontSize: 28, color: '#581c87', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="done today" style={{ fontSize: 11, color: '#6b7280' }} />
    </FlexWidget>
  )
}
