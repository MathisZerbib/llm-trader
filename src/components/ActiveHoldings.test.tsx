import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ActiveHoldings from './ActiveHoldings'

describe('ActiveHoldings', () => {
  it('shows an indeterminate select-all when some rows selected', async () => {
    const user = userEvent.setup()

    const onSelect = vi.fn()
    const onSelectAll = vi.fn()

    render(
      <ActiveHoldings
        positions={[
          { symbol: 'AAPL', qty: 1, market_value: 1000, unrealized_pl: 10 },
          { symbol: 'TSLA', qty: 2, market_value: 2000, unrealized_pl: -5 },
        ]}
        selected={['AAPL']}
        onSelect={onSelect}
        onSelectAll={onSelectAll}
      />
    )

    const selectAll = screen.getByLabelText('Select all holdings') as HTMLInputElement

    expect(selectAll).not.toBeChecked()
    expect(selectAll).toBePartiallyChecked()

    await user.click(selectAll)

    expect(onSelectAll).toHaveBeenCalledWith(['AAPL', 'TSLA'], true)
  })
})
