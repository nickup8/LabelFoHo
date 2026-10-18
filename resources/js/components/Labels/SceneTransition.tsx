import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import '../../../css/scene-transition.css';

/**
 * Scene transition overlay, ported from docs/foho-ui-white/js/motion.js.
 *
 * The package appends `.scene-transition` to <body>; here it is a body
 * portal (mounted once at the app root, see app.tsx) with its own isolated
 * stylesheet, so it survives Inertia page swaps and stays outside the
 * `.foho-root` scoped CSS.
 *
 * Phases run strictly in order via `Animation.finished` (no pause/play):
 * 1. CLOSE — both layers rise to cover the viewport (500 ms + 55 ms stagger).
 * 2. TITLE + SWAP — number/word fade in (180 ms), `onSwap` fires once under
 *    the closed layers, then the title holds still for a readable pause
 *    (650 ms). With `awaitContent` the open phase also waits for
 *    `releaseSceneContent()`; an early response never shortens the pause
 *    and never restarts animations.
 * 3. OPEN — title exits (180 ms) while layers leave upward (500 ms +
 *    55 ms stagger) and the stage is revealed with them. The overlay is
 *    removed only after both layer animations finish.
 */

interface OverlayParts {
    overlay: HTMLDivElement;
    one: HTMLDivElement;
    two: HTMLDivElement;
    type: HTMLDivElement;
    numberEl: HTMLSpanElement;
    wordEl: HTMLSpanElement;
}

export interface SceneRunOptions {
    number: string;
    word: string;
    /**
     * Also wait for `releaseSceneContent()` (typically Inertia `onFinish`)
     * before the open phase — used when the destination page is still
     * loading and must not be revealed early. A slow response never
     * starts or restarts animations; it only delays the open gate.
     */
    awaitContent?: boolean;
    onSwap?: () => void;
    onFinished?: () => void;
}

export interface SceneTarget {
    number: string;
    word: string;
}

interface GeneratorReturn extends SceneTarget {
    url: string;
}

const CLOSE_MS = 500;
const OPEN_MS = 500;
const TITLE_MS = 180;
const LAYER_STAGGER = 55;
/** Minimum readable hold of the fully visible title before the open phase. */
const READ_MS = 650;
const EASE = 'cubic-bezier(.76,0,.24,1)';

let parts: OverlayParts | null = null;
let running = false;
let releaseWaiter: (() => void) | null = null;
let contentReleased = false;
let clearRun: (() => void) | null = null;
let generatorReturn: GeneratorReturn | null = null;

function prefersReducedMotion(): boolean {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True for a plain left-click (no modifier / middle-click). */
export function isPlainLeftClick(event: ReactMouseEvent): boolean {
    return (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
    );
}

/** Remembers the generator step URL shown before leaving for the importer. */
export function rememberGeneratorReturn(entry: GeneratorReturn): void {
    generatorReturn = entry;
}

/** Last generator step, or the upload screen when nothing was remembered. */
export function readGeneratorReturn(): GeneratorReturn {
    return (
        generatorReturn ?? {
            number: '01',
            word: 'Загрузка',
            url: '/labels',
        }
    );
}

/** Upload URL for a generator return entry, keeping the saved session. */
export function uploadUrlFromReturn(
    entry: GeneratorReturn = readGeneratorReturn(),
): string {
    const session = new URL(entry.url, window.location.origin).searchParams.get(
        'session',
    );

    return session
        ? `/labels?session=${encodeURIComponent(session)}&step=1`
        : '/labels';
}

function isSameDestination(url: string): boolean {
    const target = new URL(url, window.location.origin);
    const current = new URL(window.location.href);

    if (target.pathname !== current.pathname) {
        return false;
    }

    if (target.pathname.startsWith('/importers')) {
        return true;
    }

    const targetStep = target.searchParams.get('step') ?? '1';
    const currentStep = current.searchParams.get('step') ?? '1';

    return targetStep === currentStep;
}

/**
 * Runs the scene transition and visits `url` under the closed layers.
 * Skips the visit when the destination is the current page or another
 * transition is already in flight. Reduced motion visits instantly.
 */
export function navigateWithScene(url: string, scene: SceneTarget): boolean {
    if (running || isSameDestination(url)) {
        return false;
    }

    return runSceneTransition({
        number: scene.number,
        word: scene.word,
        awaitContent: true,
        onSwap: () => {
            router.visit(url, {
                onFinish: () => releaseSceneContent(),
            });
        },
    });
}

/**
 * Marks destination content ready for a transition paused by `awaitContent`.
 * Safe to call when nothing is waiting (e.g. reduced-motion visits).
 */
export function releaseSceneContent(): void {
    contentReleased = true;

    const waiter = releaseWaiter;

    releaseWaiter = null;
    waiter?.();
}

function stageElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.stage');
}

function cancelStageAnimations(): void {
    document
        .querySelectorAll<HTMLElement>('.stage')
        .forEach((stage) => stage.getAnimations().forEach((a) => a.cancel()));
}

function deactivate(): void {
    clearRun?.();
    clearRun = null;
    document.body.classList.remove('scene-changing');
    parts?.overlay.classList.remove('active');
    parts?.overlay.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    cancelStageAnimations();
}

function waitAnimation(animation: Animation): Promise<void> {
    return animation.finished.then(
        () => undefined,
        () => undefined,
    );
}

function animateTo(
    element: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
): Promise<void> {
    return waitAnimation(element.animate(keyframes, options));
}

function waitReadablePause(): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, READ_MS);
    });
}

function waitContentRelease(): Promise<void> {
    if (contentReleased) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        releaseWaiter = () => resolve();
    });
}

function revealStage(): void {
    // Reveal the stage after React has committed the swapped scene.
    requestAnimationFrame(() => {
        const fresh = stageElement();

        if (!fresh || !running) {
            return;
        }

        fresh.getAnimations().forEach((a) => a.cancel());
        fresh.animate(
            [
                {
                    opacity: 0,
                    transform:
                        'perspective(900px) translateY(45px) rotateX(-5deg)',
                    filter: 'blur(8px)',
                },
                {
                    opacity: 1,
                    transform:
                        'perspective(900px) translateY(0) rotateX(0)',
                    filter: 'blur(0)',
                },
            ],
            {
                duration: 720,
                delay: 80,
                easing: 'cubic-bezier(.16,1,.3,1)',
                fill: 'both',
            },
        );
    });
}

/**
 * Runs the standard scene transition. Returns false when the animation was
 * skipped (reduced motion, no Web Animations API, overlay not mounted, or a
 * transition is already in flight) — in that case `onSwap` fires immediately
 * so callers never wait on animation, except when a transition is already
 * running: then the call is ignored so a second click cannot start a visit.
 * Requests are never delayed by this helper unless `awaitContent` extends
 * the readable title pause until `releaseSceneContent()`.
 */
export function runSceneTransition({
    number,
    word,
    awaitContent,
    onSwap,
    onFinished,
}: SceneRunOptions): boolean {
    if (running) {
        return false;
    }

    const overlayParts = parts;

    if (!overlayParts || prefersReducedMotion() || !Element.prototype.animate) {
        onSwap?.();
        onFinished?.();

        return false;
    }

    running = true;
    releaseWaiter = null;
    contentReleased = false;

    const { overlay, one, two, type, numberEl, wordEl } = overlayParts;

    overlay.classList.add('active');
    document.body.classList.add('scene-changing');
    numberEl.textContent = number;
    wordEl.textContent = word;

    let cancelled = false;

    clearRun = () => {
        cancelled = true;

        // Unblock an in-flight awaitContent wait; the cancelled flag stops
        // the sequence before any further animation is created.
        const waiter = releaseWaiter;

        releaseWaiter = null;
        waiter?.();
    };

    const settle = () => {
        if (!running || cancelled) {
            return;
        }

        running = false;
        deactivate();
        onFinished?.();
    };

    stageElement()?.animate(
        [
            {
                opacity: 1,
                transform: 'perspective(900px) translateZ(0)',
                filter: 'blur(0)',
            },
            {
                opacity: 0,
                transform: 'perspective(900px) translateZ(-65px) rotateX(5deg)',
                filter: 'blur(7px)',
            },
        ],
        { duration: 470, fill: 'both', easing: 'ease-in' },
    );

    void (async () => {
        try {
            // 1. Close: both layers from their bottom poses to full cover.
            const close: KeyframeAnimationOptions = {
                duration: CLOSE_MS,
                easing: EASE,
                fill: 'both',
            };

            await Promise.all([
                animateTo(
                    one,
                    [
                        {
                            transform: 'translateY(108%) rotate(-4deg)',
                            borderRadius: '48% 48% 0 0',
                        },
                        {
                            transform: 'translateY(0) rotate(0)',
                            borderRadius: '0',
                        },
                    ],
                    close,
                ),
                animateTo(
                    two,
                    [
                        { transform: 'translateY(112%) rotate(3deg)' },
                        { transform: 'translateY(0) rotate(0)' },
                    ],
                    { ...close, delay: LAYER_STAGGER },
                ),
            ]);

            if (cancelled) {
                return;
            }

            // 2. Title in, then the page swap under the closed layers.
            await animateTo(
                type,
                [
                    { opacity: 0, transform: 'translateY(16px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                ],
                { duration: TITLE_MS, easing: EASE, fill: 'both' },
            );

            if (cancelled) {
                return;
            }

            onSwap?.();

            if (cancelled) {
                return;
            }

            // Readable pause on the fully visible title; awaitContent also
            // waits for the response. A late release never restarts motion.
            await Promise.all([
                waitReadablePause(),
                awaitContent ? waitContentRelease() : Promise.resolve(),
            ]);

            if (cancelled) {
                return;
            }

            // 3. Title out and layers open together; reveal the new stage.
            const open: KeyframeAnimationOptions = {
                duration: OPEN_MS,
                easing: EASE,
                fill: 'both',
            };

            const layersOpening = Promise.all([
                animateTo(
                    one,
                    [
                        {
                            transform: 'translateY(0) rotate(0)',
                            borderRadius: '0',
                        },
                        {
                            transform: 'translateY(-110%) rotate(3deg)',
                            borderRadius: '0 0 46% 46%',
                        },
                    ],
                    open,
                ),
                animateTo(
                    two,
                    [
                        { transform: 'translateY(0) rotate(0)' },
                        { transform: 'translateY(-112%) rotate(-3deg)' },
                    ],
                    { ...open, delay: LAYER_STAGGER },
                ),
            ]);

            const titleClosing = animateTo(
                type,
                [
                    { opacity: 1, transform: 'translateY(0)' },
                    { opacity: 0, transform: 'translateY(-16px)' },
                ],
                { duration: TITLE_MS, easing: EASE, fill: 'both' },
            );

            revealStage();

            await Promise.all([layersOpening, titleClosing]);

            if (cancelled) {
                return;
            }

            settle();
        } catch {
            settle();
        }
    })();

    return true;
}

export default function SceneTransitionHost() {
    const overlayRef = useRef<HTMLDivElement>(null);
    // The overlay is a body portal: keep it out of the SSR markup so server
    // and client hydrate to the same tree, then mount it on the client.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const overlay = overlayRef.current;

        if (!overlay) {
            return;
        }

        parts = {
            overlay,
            one: overlay.querySelector<HTMLDivElement>('.layer-one')!,
            two: overlay.querySelector<HTMLDivElement>('.layer-two')!,
            type: overlay.querySelector<HTMLDivElement>('.transition-type')!,
            numberEl:
                overlay.querySelector<HTMLSpanElement>('.transition-number')!,
            wordEl: overlay.querySelector<HTMLSpanElement>('.transition-word')!,
        };

        return () => {
            parts = null;
            releaseWaiter = null;

            if (running) {
                running = false;
                deactivate();
            }
        };
    }, [mounted]);

    if (!mounted) {
        return null;
    }

    return createPortal(
        <div className="scene-transition" aria-hidden="true" ref={overlayRef}>
            <div className="transition-layer layer-one" />
            <div className="transition-layer layer-two" />
            <div className="transition-type">
                <span className="transition-number" />
                <span className="transition-word" />
            </div>
        </div>,
        document.body,
    );
}
