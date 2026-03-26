import React from 'react'
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function PartnerWidget() {
  const d = latestWidgetData.find((p) => p.type === 'partner')?.data ?? {}
  const imageUrl = d.imageUrl as string | null
  const caption = d.caption as string | null
  const senderName = d.senderName as string | null

  if (!imageUrl) {
    return (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="💕" style={{ fontSize: 32 }} />
        <TextWidget text="No photos yet" style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }} />
      </FlexWidget>
    )
  }

  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#000', overflow: 'hidden' }}>
      <ImageWidget image={{ uri: imageUrl }} imageWidth={160} imageHeight={160} style={{ width: 'match_parent', height: 'match_parent' }} />
      <FlexWidget style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8 }}>
        {senderName ? <TextWidget text={senderName} style={{ fontSize: 11, color: '#fff', fontWeight: '600' }} /> : null}
        {caption ? <TextWidget text={caption} style={{ fontSize: 11, color: '#e5e7eb' }} /> : null}
      </FlexWidget>
    </FlexWidget>
  )
}
