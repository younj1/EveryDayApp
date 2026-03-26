import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function FitnessWidget() {
  const d = latestWidgetData.find((p) => p.type === 'fitness')?.data ?? {}
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Fitness" style={{ fontSize: 11, color: '#6366f1', fontWeight: '600' }} />
      <TextWidget text={`${(d.steps as number ?? 0).toLocaleString()}`} style={{ fontSize: 28, color: '#1e1b4b', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="steps" style={{ fontSize: 11, color: '#6b7280' }} />
      <TextWidget text={`${d.caloriesBurned ?? 0} cal burned`} style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }} />
    </FlexWidget>
  )
}
