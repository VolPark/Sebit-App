'use client'
import { useState, Fragment } from 'react'
import { Combobox, Transition } from '@headlessui/react'

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
          className="w-full rounded-lg bg-white/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 p-3 pr-10 transition duration-150 ease-in-out placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white border focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-[#E30613] sm:text-sm sm:leading-6"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(item: ComboBoxItem) => item?.name || ''}
          placeholder="Všichni klienti"
          autoComplete='off'
          onFocus={(e) => e.target.select()}
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-5.03 8.22a.75.75 0 011.06 0L10 15.19l2.97-2.97a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </Combobox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm p-2 text-base shadow-2xl ring-1 ring-black/5 dark:ring-slate-700 focus:outline-none sm:text-sm">
            {filteredItems.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-500 dark:text-gray-400">
                Nic nenalezeno.
              </div>
            ) : (
              filteredItems.map((item) => (
                <Combobox.Option
                  key={item.id}
                  value={item}
                  className={({ active }) =>
                    classNames(
                      'relative cursor-pointer select-none rounded-lg py-2.5 pl-4 pr-9 transition-colors',
                      active ? 'bg-[#E30613] text-white' : 'text-gray-900 dark:text-gray-200'
                    )
                  }
                >
                  {({ active, selected }) => (
                    <>
                      <span className={classNames('block truncate', selected && 'font-semibold')}>{item.name}</span>
                      {selected && (
                        <span
                          className={classNames(
                            'absolute inset-y-0 right-0 flex items-center pr-3',
                            active ? 'text-white' : 'text-[#E30613]'
                          )}
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  )
}
