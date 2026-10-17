import { Link, router } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { runSceneTransition } from '@/components/Labels/SceneTransition';
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

export interface SceneRunRequest {
    stepId: number;
    label?: string;
    /** Freeze the current step/stage until the swap moment (footer visits). */
    hold?: boolean;
    onSwap?: () => void;
}

export interface SceneApi {
    /** Starts the standard scene transition for a wizard step. */
    run: (request: SceneRunRequest) => boolean;
}

const instantScene: SceneApi = {
    run: (request) => {
        request.onSwap?.();

        return false;
    },
};

const SceneContext = createContext<SceneApi>(instantScene);

/**
 * Runs the approved two-layer scene transition (motion.js parameters) for a
 * wizard step: number and label come from the dynamic step list. Outside the
 * shell (or under reduced motion) the swap happens instantly.
 */
export function useSceneTransition(): SceneApi {
    return useContext(SceneContext);
}

const GenerationContext = createContext<(active: boolean) => void>(() => {});

/** Keeps `data-generating` on the shell root while PDF creation owns the screen. */
export function useGenerationScene(active: boolean): void {
    const setGeneration = useContext(GenerationContext);

    useEffect(() => {
        if (!active) {
            return;
        }

        setGeneration(true);

        return () => setGeneration(false);
    }, [active, setGeneration]);
}

const ReadyContext = createContext<(active: boolean) => void>(() => {});

/** Switches the shell header to the package «Этикетки готовы» page state. */
export function useReadyScene(active: boolean): void {
    const setReady = useContext(ReadyContext);

    useEffect(() => {
        if (!active) {
            return;
        }

        setReady(true);

        return () => setReady(false);
    }, [active, setReady]);
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

/** Package «ready» page header shown once the PDF is downloadable. */
const READY_PAGE: PageContent = {
    title: (
        <>
            Этикетки <span>готовы</span>
        </>
    ),
    subtitle: 'Ваш файл готов к скачиванию и печати.',
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
    /**
     * Fires at the transition's swap moment so the page can switch to the
     * target step locally: the visual swap must not wait for the Inertia
     * response (motion.js `change()` is synchronous in the package).
     */
    onSceneSwap?: (stepId: number) => void;
    children: ReactNode;
}

export default function FohoShell({
    steps,
    currentId,
    onSceneSwap,
    children,
}: FohoShellProps) {
    return (
        <WizardNavProvider>
            <ShellView
                steps={steps}
                currentId={currentId}
                onSceneSwap={onSceneSwap}
            >
                {children}
            </ShellView>
        </WizardNavProvider>
    );
}

function ShellView({
    steps,
    currentId,
    onSceneSwap,
    children,
}: FohoShellProps) {
    const nav = useContext(WizardNavContext);

    const [busy, setBusy] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [ready, setReady] = useState(false);
    // While a transition is closing the old scene, the previous step and its
    // stage content stay on screen; the swap to the latest props happens under
    // the overlay at 520 ms (motion.js `change()` timing).
    const [hold, setHold] = useState<{
        view: ReactNode;
        stepId: number;
    } | null>(null);

    const runScene = useCallback(
        (request: SceneRunRequest): boolean => {
            const index = steps.findIndex((step) => step.id === request.stepId);

            if (index < 0) {
                request.onSwap?.();

                return false;
            }

            const started = runSceneTransition({
                number: `0${index + 1}`,
                word: request.label ?? steps[index].label,
                onSwap: () => {
                    onSceneSwap?.(request.stepId);
                    request.onSwap?.();
                    setHold(null);
                },
                onFinished: () => setBusy(false),
            });

            if (started) {
                setBusy(true);

                if (request.hold) {
                    setHold({ view: children, stepId: currentId });
                }
            }

            return started;
        },
        [steps, children, currentId, onSceneSwap],
    );

    const scene = useMemo<SceneApi>(() => ({ run: runScene }), [runScene]);

    // Browser «Назад»/«Вперёд»: Inertia restores the page from history while
    // the overlay (mounted at the app root) is already sweeping.
    useEffect(() => {
        const onPopState = () => {
            const url = new URL(window.location.href);

            if (!url.pathname.startsWith('/labels')) {
                return;
            }

            const targetId = Number(url.searchParams.get('step') ?? 1);

            runScene({ stepId: targetId });
        };

        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, [runScene]);

    const displayId = hold ? hold.stepId : currentId;
    const page = PAGE_BY_STEP[displayId] ?? 'upload';
    const readyPage = ready && page === 'export';
    const content = readyPage ? READY_PAGE : PAGES[page];
    const activeIndex = steps.findIndex((step) => step.id === displayId);
    const sceneIndex = activeIndex >= 0 ? String(activeIndex) : undefined;
    const view = hold ? hold.view : children;

    // Footer navigation starts the transition and fires the real Inertia
    // request immediately — the visit itself is never delayed by animation.
    const runForVisit = (targetId: number | undefined, visit: () => void) => {
        if (busy) {
            return;
        }

        if (targetId === undefined) {
            visit();

            return;
        }

        runScene({ stepId: targetId, hold: true });
        visit();
    };

    const handleBack = () => {
        if (busy || !nav?.back) {
            return;
        }

        const target = activeIndex > 0 ? steps[activeIndex - 1] : undefined;

        runForVisit(target?.id, nav.back);
    };

    const handleNext = () => {
        if (busy || !nav?.next || nav.nextDisabled) {
            return;
        }

        const target =
            activeIndex >= 0 && activeIndex < steps.length - 1
                ? steps[activeIndex + 1]
                : undefined;

        runForVisit(target?.id, nav.next);
    };

    // Package behaviour: completed steps in the stepper are clickable and
    // jump back through the wizard URL (session is kept in the query).
    const handleStepSelect = (targetId: number) => {
        if (busy) {
            return;
        }

        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session');

        if (!sessionId) {
            return;
        }

        runScene({ stepId: targetId, hold: true });

        router.get(
            `/labels?session=${encodeURIComponent(sessionId)}&step=${targetId}`,
            {},
            { preserveState: true },
        );
    };

    return (
        <GenerationContext.Provider value={setGenerating}>
            <ReadyContext.Provider value={setReady}>
                <SceneContext.Provider value={scene}>
                    <div
                        className="foho-root"
                        data-theme="mono"
                        data-page={readyPage ? 'ready' : page}
                        data-scene={sceneIndex}
                        data-generating={generating ? 'true' : 'false'}
                    >
                        <header className="header">
                            <Link
                                href="/labels"
                                className="logo"
                                aria-label="FoHo"
                                prefetch
                            >
                                <img
                                    src="/foho/brand/foho-logo.png"
                                    alt="FoHo"
                                />
                            </Link>
                            <nav aria-label="Разделы приложения">
                                <Link
                                    href="/labels"
                                    prefetch
                                    aria-current="page"
                                >
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
                                <WizardStepper
                                    steps={steps}
                                    currentId={displayId}
                                    onStepSelect={handleStepSelect}
                                />
                                <div className="stage">{view}</div>
                                <div className="footer">
                                    {templateDownloadUrl &&
                                        page === 'upload' && (
                                            <div
                                                className="context"
                                                aria-live="polite"
                                            >
                                                <a
                                                    className="text-link template-download"
                                                    href={templateDownloadUrl}
                                                    download
                                                >
                                                    Скачать шаблон для
                                                    заполнения ↗
                                                </a>
                                            </div>
                                        )}
                                    <div className="actions">
                                        <button
                                            type="button"
                                            className="back"
                                            hidden={!nav?.back}
                                            disabled={busy}
                                            onClick={handleBack}
                                        >
                                            {nav?.backLabel ?? 'Назад'}
                                        </button>
                                        <button
                                            type="button"
                                            className="primary"
                                            hidden={!nav?.next}
                                            disabled={busy || nav?.nextDisabled}
                                            onClick={handleNext}
                                        >
                                            {nav?.nextLabel ?? 'Далее'}{' '}
                                            <span aria-hidden="true">↗</span>
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </main>
                    </div>
                </SceneContext.Provider>
            </ReadyContext.Provider>
        </GenerationContext.Provider>
    );
}
