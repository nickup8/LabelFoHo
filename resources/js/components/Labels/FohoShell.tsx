import { Link } from '@inertiajs/react';
import { createContext, useContext, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import WizardStepper from '@/components/Labels/WizardStepper';
import type { WizardStep } from '@/components/Labels/WizardStepper';
import { cn } from '@/lib/utils';
import '../../../css/foho.css';

export type WizardPage = 'upload' | 'audit' | 'template' | 'export';

export interface WizardNav {
    back?: () => void;
    backLabel?: string;
    next?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
}

const WizardNavSetterContext = createContext<(nav: WizardNav | null) => void>(
    () => {},
);
const WizardNavContext = createContext<WizardNav | null>(null);

function WizardNavProvider({ children }: { children: ReactNode }) {
    const [nav, setNav] = useState<WizardNav | null>(null);

    return (
        <WizardNavSetterContext.Provider value={setNav}>
            <WizardNavContext.Provider value={nav}>
                {children}
            </WizardNavContext.Provider>
        </WizardNavSetterContext.Provider>
    );
}

/**
 * Publishes the current step actions to the shell footer (package «Назад» /
 * «Далее»). Runs before paint so the footer never flashes empty on a visit.
 */
export function useWizardNav(nav: WizardNav): void {
    const setNav = useContext(WizardNavSetterContext);
    const { back, backLabel, next, nextLabel, nextDisabled } = nav;

    useLayoutEffect(() => {
        setNav({ back, backLabel, next, nextLabel, nextDisabled });

        return () => setNav(null);
    }, [setNav, back, backLabel, next, nextLabel, nextDisabled]);
}

interface PageContent {
    title: ReactNode;
    subtitle: string;
}

const PAGES: Record<WizardPage, PageContent> = {
    upload: {
        title: (
            <>
                Генератор <span>этикеток</span>
            </>
        ),
        subtitle: 'Выберите категорию и загрузите файл с данными товаров.',
    },
    audit: {
        title: (
            <>
                Аудит <span>данных</span>
            </>
        ),
        subtitle: 'Проверьте данные товаров перед созданием этикеток.',
    },
    template: {
        title: (
            <>
                Выбор <span>шаблона</span>
            </>
        ),
        subtitle: 'Выберите тип этикетки для вашего товара.',
    },
    export: {
        title: (
            <>
                Экспорт <span>PDF</span>
            </>
        ),
        subtitle: 'Остался один шаг — создать файл для печати.',
    },
};

const templateDownloadUrl: string | null =
    (import.meta.env.VITE_FOHO_TEMPLATE_URL as string | undefined) ?? null;

const PAGE_BY_STEP: Record<number, WizardPage> = {
    1: 'upload',
    2: 'audit',
    3: 'template',
    4: 'export',
};

interface FohoShellProps {
    steps: WizardStep[];
    currentId: number;
    children: ReactNode;
}

export default function FohoShell({
    steps,
    currentId,
    children,
}: FohoShellProps) {
    return (
        <WizardNavProvider>
            <ShellView steps={steps} currentId={currentId}>
                {children}
            </ShellView>
        </WizardNavProvider>
    );
}

function ShellView({ steps, currentId, children }: FohoShellProps) {
    const nav = useContext(WizardNavContext);
    const page = PAGE_BY_STEP[currentId] ?? 'upload';
    const content = PAGES[page];

    return (
        <div className="foho-root" data-theme="mono" data-page={page}>
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
                    <Link href="/labels" prefetch aria-current="page">
                        Генератор этикеток
                    </Link>
                    <Link href="/importers" prefetch>
                        Импортёр
                    </Link>
                </nav>
            </header>
            <main>
                <section className="hero">
                    <h1>{content.title}</h1>
                    <p>{content.subtitle}</p>
                </section>
                <section
                    className={cn(
                        'workspace',
                        page === 'audit' && 'wide',
                    )}
                    aria-label="Подготовка этикеток"
                >
                    <WizardStepper steps={steps} currentId={currentId} />
                    <div className="stage">{children}</div>
                    <div className="footer">
                        {templateDownloadUrl && (
                            <div className="context" aria-live="polite">
                                <a
                                    className="text-link template-download"
                                    href={templateDownloadUrl}
                                    download
                                >
                                    Скачать шаблон для заполнения ↗
                                </a>
                            </div>
                        )}
                        <div className="actions">
                            <button
                                type="button"
                                className="back"
                                hidden={!nav?.back}
                                disabled={!nav?.back}
                                onClick={nav?.back}
                            >
                                {nav?.backLabel ?? 'Назад'}
                            </button>
                            <button
                                type="button"
                                className="primary"
                                hidden={!nav?.next}
                                disabled={nav?.nextDisabled}
                                onClick={nav?.next}
                            >
                                {nav?.nextLabel ?? 'Далее'}{' '}
                                <span aria-hidden="true">↗</span>
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
