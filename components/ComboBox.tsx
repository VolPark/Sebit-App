'use client'
import { useState } from 'react'
import { Combobox } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid' // Assuming heroicons is available or I can use inline SVG

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}

type ComboBoxItem = {
  id: number | string
  name: string
}

type ComboBoxProps = {
  items: ComboBoxItem[]
  selected: ComboBoxItem | null
  setSelected: (item: ComboBoxItem | null) => void
}

export default function ComboBox({ items, selected, setSelected }: ComboBoxProps) {
  const [query, setQuery] = useState('')

  const filteredItems =
    query === ''
      ? items
      : items.filter((item) => {
          return item.name.toLowerCase().includes(query.toLowerCase())
        })

  return (
    <Combobox as="div" value={selected} onChange={setSelected}>
      <div className="relative">
        <Combobox.Input
          className="w-full rounded-lg bg-white border border-slate-300 p-3 pr-12 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(item: ComboBoxItem) => item?.name || ''}
          placeholder="Vyhledejte..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3 bg-slate-100 border-l border-slate-300 hover:bg-slate-200 focus:outline-none">
          {/* Using inline SVG for chevron as I can't be sure about heroicons */}
          <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-5.03 8.22a.75.75 0 011.06 0L10 15.19l2.97-2.97a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </Combobox.Button>

        {filteredItems.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredItems.map((item) => (
              <Combobox.Option
                key={item.id}
                value={item}
                className={({ active }) =>
                  classNames(
                    'relative cursor-default select-none py-2 pl-3 pr-9',
                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                  )
                }
              >
                {({ active, selected }) => (
                  <>
                    <span className={classNames('block truncate', selected && 'font-semibold')}>{item.name}</span>
                    {selected && (
                      <span
                        className={classNames(
                          'absolute inset-y-0 right-0 flex items-center pr-4',
                          active ? 'text-white' : 'text-blue-600'
                        )}
                      >
                       {/* Using inline SVG for check icon */}
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  )
}
