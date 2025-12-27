'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/actions/auth'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('Hesla se neshodují')
            return
        }

        if (password.length < 6) {
            setError('Heslo musí mít alespoň 6 znaků')
            return
        }

        setLoading(true)

        try {
            const result = await updatePassword(password)
            if (result?.error) {
                setError(result.error)
            }
        } catch (err: any) {
            setError('Nastala chyba při ukládání hesla')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Nastavte si nové heslo
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Pro dokončení registrace si prosím zvolte heslo.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <label htmlFor="password" className="sr-only">Nové heslo</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#E30613] sm:text-sm sm:leading-6 px-3"
                                placeholder="Nové heslo"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">Potvrzení hesla</label>
                            <input
                                id="confirm-password"
                                name="confirmDevice"
                                type="password"
                                required
                                className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#E30613] sm:text-sm sm:leading-6 px-3"
                                placeholder="Potvrzení hesla"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md bg-[#E30613] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613] disabled:opacity-50"
                        >
                            {loading ? 'Ukládám...' : 'Uložit heslo a přihlásit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
