'use client'
import { useState, Fragment } from 'react'
import { Combobox, Transition } from '@headlessui/react'

function classNames(...classes: (string | boolean)[]) {
    return classes.filter(Boolean).join(' ')
}

export type ComboBoxItem = {
    id: number | string
    name: string
}

type CreatableComboBoxProps = {
    items: ComboBoxItem[]
    selected: ComboBoxItem | null
    setSelected: (item: ComboBoxItem | null) => void
    onCreate: (name: string) => void
    placeholder?: string
    label?: string
}

export default function CreatableComboBox({ items, selected, setSelected, onCreate, placeholder = "Vyberte...", label }: CreatableComboBoxProps) {
    const [query, setQuery] = useState('')

    const filteredItems =
        query === ''
            ? items
            : items.filter((item) => {
                return item.name.toLowerCase().includes(query.toLowerCase())
            })

    return (
        <Combobox as="div" value={selected} onChange={(value: ComboBoxItem) => {
            if (value && value.id === 'NEW') {
                onCreate(value.name)
            } else {
                setSelected(value)
            }
        }}>
            {label && <Combobox.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</Combobox.Label>}
            <div className="relative">
                <Combobox.Input
                    className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-2.5 pl-4 pr-10 shadow-sm focus:border-[#E30613] focus:outline-none focus:ring-1 focus:ring-[#E30613] sm:text-sm dark:text-white"
                    onChange={(event) => setQuery(event.target.value)}
                    displayValue={(item: ComboBoxItem) => item?.name || ''}
                    placeholder={placeholder}
                    autoComplete='off'
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
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-slate-900 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-slate-700 focus:outline-none sm:text-sm">
                        {query.length > 0 && (
                            <Combobox.Option
                                value={{ id: 'NEW', name: query }}
                                className={({ active }) =>
                                    classNames(
                                        'relative cursor-pointer select-none py-2 pl-3 pr-9',
                                        active ? 'bg-[#E30613]/10 text-[#E30613]' : 'text-gray-900 dark:text-gray-100'
                                    )
                                }
                            >
                                <div className="flex items-center">
                                    <span className="font-semibold mr-2">+</span>
                                    Vytvořit "{query}"
                                </div>
                            </Combobox.Option>
                        )}

                        {filteredItems.map((item) => (
                            <Combobox.Option
                                key={item.id}
                                value={item}
                                className={({ active }) =>
                                    classNames(
                                        'relative cursor-pointer select-none py-2 pl-3 pr-9 transition-colors',
                                        active ? 'bg-[#E30613] text-white' : 'text-gray-900 dark:text-gray-100'
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
                        ))}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    )
}
