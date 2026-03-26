import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function NutritionWidget() {
  const d = latestWidgetData.find((p) => p.type === 'nutrition')?.data ?? {}
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Nutrition" style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }} />
      <TextWidget text={`${d.caloriesConsumed ?? 0} / ${d.caloriesGoal ?? 2000}`} style={{ fontSize: 20, color: '#14532d', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="kcal" style={{ fontSize: 11, color: '#6b7280' }} />
      <TextWidget text={`💧 ${d.waterMl ?? 0}ml / ${d.waterGoalMl ?? 2000}ml`} style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }} />
    </FlexWidget>
  )
}
