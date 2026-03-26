import React from 'react'
import { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { FitnessWidget } from './FitnessWidget'
import { NutritionWidget } from './NutritionWidget'
import { FinanceWidget } from './FinanceWidget'
import { HabitsWidget } from './HabitsWidget'
import { MoodWidget } from './MoodWidget'
import { PartnerWidget } from './PartnerWidget'

const nameToWidget: Record<string, React.FC> = {
  FitnessWidget, NutritionWidget, FinanceWidget, HabitsWidget, MoodWidget, PartnerWidget,
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = nameToWidget[props.widgetName]
  if (!Widget) return
  if (props.widgetAction === 'WIDGET_ADDED' || props.widgetAction === 'WIDGET_UPDATE') {
    props.renderWidget(<Widget />)
  }
}
