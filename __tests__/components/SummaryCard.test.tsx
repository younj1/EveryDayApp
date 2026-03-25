import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { SummaryCard } from '@/components/dashboard/SummaryCard'

describe('SummaryCard', () => {
  it('renders title and value', () => {
    render(<SummaryCard title="Steps" value="8,432" color="green" />)
    expect(screen.getByText('Steps')).toBeTruthy()
    expect(screen.getByText('8,432')).toBeTruthy()
  })

  it('renders optional subtitle when provided', () => {
    render(<SummaryCard title="Water" value="1500ml" subtitle="of 2500ml goal" color="blue" />)
    expect(screen.getByText('of 2500ml goal')).toBeTruthy()
  })
})
