import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import '../../../css/foho.css';

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

export default function ImportersIndex({ importer }: Props) {
    const { flash } = usePage().props as PageProps;
    const toastedFlash = useRef<string | null>(null);

    const { data, setData, put, processing, errors } = useForm({
        name: importer?.name ?? '',
        legal_address: importer?.legal_address ?? '',
        phone: importer?.phone ?? '',
    });

    useEffect(() => {
        if (!flash?.success || toastedFlash.current === flash.success) {
            return;
        }

        toastedFlash.current = flash.success;
        toast(flash.success);
    }, [flash?.success]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        put('/importers', { preserveScroll: true });
    };

    const firstError =
        errors.name || errors.legal_address || errors.phone || '';
    const message = firstError
        ? firstError
        : flash?.success
          ? '✓ Изменения применены'
          : '';

    return (
        <>
            <Head title="Реквизиты импортёра" />

            <div
                className="foho-root"
                data-theme="mono"
                data-page="importer"
                data-scene="4"
            >
                <header className="header">
                    <Link
                        href="/labels"
                        className="logo"
                        aria-label="FoHo"
                        prefetch
                    >
                        <img src="/foho/brand/foho-logo.png" alt="FoHo" />
                    </Link>
                    <nav aria-label="Разделы приложения">
                        <Link href="/labels" prefetch>
                            Генератор этикеток
                        </Link>
                        <Link href="/importers" prefetch aria-current="page">
                            Импортёр
                        </Link>
                    </nav>
                </header>
                <main>
                    <section className="hero">
                        <h1>
                            Реквизиты <span>импортёра</span>
                        </h1>
                        <p>Одна карточка реквизитов для всех этикеток.</p>
                    </section>
                    <section
                        className="workspace"
                        aria-label="Реквизиты импортёра"
                    >
                        <div className="stage">
                            <form
                                className="importer-form"
                                noValidate
                                onSubmit={handleSubmit}
                            >
                                <div className="form-section-head">
                                    <span className="overline">
                                        Карточка импортёра
                                    </span>
                                    <span className="saved-mark">
                                        Применяется ко всем этикеткам
                                    </span>
                                </div>

                                <label className="field">
                                    <span>
                                        Название компании <em>*</em>
                                    </span>
                                    <input
                                        name="company"
                                        type="text"
                                        maxLength={250}
                                        value={data.name}
                                        onChange={(event) =>
                                            setData('name', event.target.value)
                                        }
                                        placeholder="Название организации или ИП"
                                        autoComplete="organization"
                                    />
                                </label>

                                <label className="field">
                                    <span>
                                        Юридический адрес <em>*</em>
                                    </span>
                                    <textarea
                                        name="address"
                                        maxLength={1000}
                                        rows={3}
                                        value={data.legal_address}
                                        onChange={(event) =>
                                            setData(
                                                'legal_address',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Индекс, страна, город, улица, дом"
                                        autoComplete="street-address"
                                    />
                                </label>

                                <label className="field">
                                    <span>
                                        Телефон <em>*</em>
                                    </span>
                                    <input
                                        name="phone"
                                        type="tel"
                                        maxLength={80}
                                        value={data.phone}
                                        onChange={(event) =>
                                            setData('phone', event.target.value)
                                        }
                                        placeholder="+7 (___) ___-__-__"
                                        autoComplete="tel"
                                    />
                                </label>

                                <div className="importer-form-footer">
                                    <p>
                                        Реквизиты сохраняются для следующих
                                        пакетов этикеток.
                                    </p>
                                    <button
                                        className="primary"
                                        type="submit"
                                        disabled={processing}
                                    >
                                        Сохранить{' '}
                                        <span aria-hidden="true">↗</span>
                                    </button>
                                </div>
                                <p
                                    className="form-message"
                                    role={firstError ? 'alert' : 'status'}
                                >
                                    {message}
                                </p>
                            </form>

                            <Link
                                href="/labels"
                                className="text-link return-generator"
                                prefetch
                            >
                                ← Вернуться к генератору
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
