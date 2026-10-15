import { Head, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImporterCard {
    name: string;
    legal_address: string;
    phone: string;
}

interface Props {
    importer: ImporterCard | null;
}

interface PageProps {
    flash?: { success?: string };
}

const inputClass =
    'flex w-full rounded-md border border-zinc-300 bg-background px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700';

function InputError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="size-3 shrink-0" />
            {message}
        </p>
    );
}

export default function ImportersIndex({ importer }: Props) {
    const { flash } = usePage().props as PageProps;

    const { data, setData, put, processing, errors } = useForm({
        name: importer?.name ?? '',
        legal_address: importer?.legal_address ?? '',
        phone: importer?.phone ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/importers', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Импортёр" />

            <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
                        Импортёр
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)] dark:text-zinc-400">
                        Единая карточка реквизитов импортёра — используется на
                        всех этикетках при экспорте PDF
                    </p>
                </div>

                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {flash.success}
                    </div>
                )}

                {!importer && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertCircle className="size-4 shrink-0" />
                        Карточка импортёра ещё не заполнена. Без неё экспорт
                        этикеток заблокирован.
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl border border-zinc-200 bg-[var(--color-surface)] p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <h2 className="mb-4 text-sm font-semibold tracking-wide text-[var(--color-fg)] uppercase dark:text-zinc-100">
                        Реквизиты для этикеток
                    </h2>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--color-fg)] dark:text-zinc-200">
                                Название организации *
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className={inputClass}
                                placeholder="Например: ИП Климин П. А."
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--color-fg)] dark:text-zinc-200">
                                Юридический адрес *
                            </label>
                            <textarea
                                value={data.legal_address}
                                onChange={(e) =>
                                    setData('legal_address', e.target.value)
                                }
                                rows={3}
                                className={cn(
                                    inputClass,
                                    'min-h-[60px] resize-y',
                                )}
                                placeholder="Полный юридический адрес"
                            />
                            <InputError message={errors.legal_address} />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--color-fg)] dark:text-zinc-200">
                                Телефон *
                            </label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                className={inputClass}
                                placeholder="+7 (995) 771-27-92, доб. 123"
                            />
                            <InputError message={errors.phone} />
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                        >
                            {processing ? (
                                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            {processing ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
