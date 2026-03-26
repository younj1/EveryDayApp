import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

const MOOD_MAP: Record<string, string> = { '1': '😞', '2': '😕', '3': '😐', '4': '🙂', '5': '😄' }

export function MoodWidget() {
  const d = latestWidgetData.find((p) => p.type === 'mood')?.data ?? {}
  const emoji = d.emoji ? MOOD_MAP[d.emoji as string] : null
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Mood" style={{ fontSize: 11, color: '#ea580c', fontWeight: '600' }} />
      {emoji
        ? <TextWidget text={emoji} style={{ fontSize: 36, marginTop: 4 }} />
        : <TextWidget text="Tap to log" style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }} />}
    </FlexWidget>
  )
}
