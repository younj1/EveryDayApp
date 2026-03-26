import { View, Text } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

interface Props { consumed: number; goal: number }

export function CalorieRing({ consumed, goal }: Props) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View className="items-center" style={{ width: 150, height: 150 }}>
      <Svg width={150} height={150}>
        <Circle cx={75} cy={75} r={radius} stroke="#e5e7eb" strokeWidth={12} fill="none" />
        <Circle
          cx={75}
          cy={75}
          r={radius}
          stroke="#6366f1"
          strokeWidth={12}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin="75, 75"
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-900">{consumed}</Text>
        <Text className="text-xs text-gray-400">of {goal} kcal</Text>
      </View>
    </View>
  )
}
