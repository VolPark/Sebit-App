'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function FixedCostsAutomator() {
    const ranOnce = useRef(false)

    useEffect(() => {
        // Prevent double execution in React StrictMode
        if (ranOnce.current) return
        ranOnce.current = true

        checkAndImportCosts()
    }, [])

    async function checkAndImportCosts() {

        // Logic: Check current real month. If empty, check previous. If previous has data, copy.
        const now = new Date()
        // We want to handle potentially "Last Month" too if we just entered it?
        // User requirement: "načíst režie z listopadu do prosince" (when in December).
        // So we primarily care about the CURRENT month being filled.

        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1 // 1-12

        // 1. Check if current month has data
        const { count, error } = await supabase
            .from('fixed_costs')
            .select('*', { count: 'exact', head: true })
            .eq('rok', currentYear)
            .eq('mesic', currentMonth)

        if (error) {
            console.error('Error checking fixed costs:', error)
            return
        }

        if (count !== null && count > 0) {
            // Data exists, nothing to do
            return
        }

        // 2. Data missing, try to fetch from PREVIOUS month
        let prevYear = currentYear
        let prevMonth = currentMonth - 1
        if (prevMonth === 0) {
            prevMonth = 12
            prevYear -= 1
        }

        const { data: prevData } = await supabase
            .from('fixed_costs')
            .select('*')
            .eq('rok', prevYear)
            .eq('mesic', prevMonth)

        if (!prevData || prevData.length === 0) {
            // No history to copy
            return
        }

        // 3. Perform Copy
        const newRows = prevData.map(c => ({
            nazev: c.nazev,
            castka: c.castka,
            rok: currentYear,
            mesic: currentMonth
        }))

        const { error: insertError } = await supabase.from('fixed_costs').insert(newRows)

        if (insertError) {
            console.error('Failed to auto-import fixed costs:', insertError)
        } else {
            console.log(`Auto-imported ${newRows.length} fixed costs items for ${currentMonth}/${currentYear}`)
        }
    }

    return null // This component renders nothing
}
