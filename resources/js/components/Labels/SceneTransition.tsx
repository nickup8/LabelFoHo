import { router } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import '../../../css/scene-transition.css';

/**
 * Scene transition overlay, ported from docs/foho-ui-white/js/motion.js.
 *
 * The package appends `.scene-transition` to <body>; here it is a body
 * portal (mounted once at the app root, see app.tsx) with its own isolated
 * stylesheet, so it survives Inertia page swaps and stays outside the
 * `.foho-root` scoped CSS. Colors and layer geometry are unchanged.
 *
 * Phases run strictly in order via `Animation.finished` (no pause/play, no
 * shared timeline, no swap timer):
 * 1. CLOSE — both layers rise to cover the viewport (360 ms, second layer
 *    delayed by 30 ms); the phase waits for both `finished` promises.
 * 2. TITLE + SWAP — `onSwap` fires once under the closed layers, then the
 *    number/word appear over 100 ms (opacity 0→1, translateY 12px→0).
 * 3. HOLD — the title stays still for at least 220 ms while the transition
 *    waits for the destination screen's readiness signal (see
 *    `useSceneContentReady`). A slow response only extends the closed state.
 * 4. OPEN — layers leave upward (360 ms, second delayed by 30 ms) while the
 *    title exits over 130 ms (opacity 1→0, translateY 0→−12px). The overlay
 *    is removed after both layers finish.
 *
 * Page content is never animated: the old `.stage` opacity/blur/transform
 * WAAPI choreography is gone, and the open phase reveals whatever the
 * destination screen committed. Inertia request errors (`error`,
 * `networkError`, `httpException`) abort the run so a failed visit frees the
 * overlay and the repeat-click lock.
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
    /** Fires once under the fully closed layers — swap content here. */
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

const CLOSE_MS = 360;
const CLOSE_STAGGER = 30;
const TITLE_IN_MS = 100;
/** Minimum time the fully visible title stays still before the open phase. */
const TITLE_HOLD_MS = 220;
const TITLE_OUT_MS = 130;
const OPEN_MS = 360;
const OPEN_STAGGER = 30;
const EASE = 'cubic-bezier(.76,0,.24,1)';

let parts: OverlayParts | null = null;
let running = false;
/** Increments per run; readiness signals carry the id they saw at render. */
let sceneId = 0;
let awaitingReady = false;
let readyWaiter: (() => void) | null = null;
let abortRun: (() => void) | null = null;
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

/** True while a transition holds the overlay and the repeat-click lock. */
export function isSceneRunning(): boolean {
    return running;
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
        onSwap: () => {
            router.visit(url);
        },
    });
}

/**
 * Called by the destination screen from `useLayoutEffect` after its content
 * has committed: the open phase waits for this signal instead of an Inertia
 * `onFinish`. The signal carries the transition id captured at render, so a
 * stale signal from an earlier run is ignored.
 */
export function signalSceneContentReady(id: number): void {
    if (!awaitingReady || id !== sceneId) {
        return;
    }

    awaitingReady = false;

    const waiter = readyWaiter;

    readyWaiter = null;
    waiter?.();
}

/**
 * Screen-side readiness signal. Fires from `useLayoutEffect` only when
 * `enabled` flips true (or on mount), so unrelated re-renders of a mounted
 * screen never release another screen's transition.
 */
export function useSceneContentReady(enabled = true): void {
    const idRef = useRef(sceneId);

    idRef.current = sceneId;

    useLayoutEffect(() => {
        if (enabled) {
            signalSceneContentReady(idRef.current);
        }
    }, [enabled]);
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

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function waitContentReady(): Promise<void> {
    if (!awaitingReady) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        readyWaiter = resolve;
    });
}

function deactivate(overlay: HTMLDivElement): void {
    document.body.classList.remove('scene-changing');
    overlay.classList.remove('active');
    overlay.getAnimations({ subtree: true }).forEach((a) => a.cancel());
}

/**
 * Runs the standard scene transition. Returns false when the animation was
 * skipped (reduced motion, no Web Animations API, overlay not mounted, or a
 * transition is already in flight) — in that case `onSwap` fires immediately
 * so callers never wait on animation, except when a transition is already
 * running: then the call is ignored so a second click cannot start a visit.
 * The request itself is started by the caller right away or at `onSwap`;
 * only the open phase waits for `useSceneContentReady`.
 */
export function runSceneTransition({
    number,
    word,
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
    sceneId += 1;
    awaitingReady = true;
    readyWaiter = null;

    const { overlay, one, two, type, numberEl, wordEl } = overlayParts;

    overlay.classList.add('active');
    document.body.classList.add('scene-changing');
    numberEl.textContent = number;
    wordEl.textContent = word;

    let cancelled = false;
    let settled = false;

    const settle = () => {
        if (settled) {
            return;
        }

        settled = true;
        cancelled = true;
        awaitingReady = false;
        readyWaiter = null;
        abortRun = null;
        deactivate(overlay);
        running = false;
        onFinished?.();
    };

    abortRun = () => {
        if (settled) {
            return;
        }

        // Error or cancel: stop the sequence, unblock the ready gate, and
        // free the overlay plus the repeat-click lock immediately.
        cancelled = true;

        const waiter = readyWaiter;

        readyWaiter = null;
        waiter?.();
        settle();
    };

    void (async () => {
        try {
            // 1. Close: both layers rise to full cover.
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
                        {
                            transform: 'translateY(112%) rotate(3deg)',
                            borderRadius: '45% 45% 0 0',
                        },
                        {
                            transform: 'translateY(0) rotate(0)',
                            borderRadius: '0',
                        },
                    ],
                    { ...close, delay: CLOSE_STAGGER },
                ),
            ]);

            if (cancelled) {
                return;
            }

            // 2. Swap once under the closed layers, then the title appears.
            onSwap?.();

            if (cancelled) {
                return;
            }

            await animateTo(
                type,
                [
                    { opacity: 0, transform: 'translateY(12px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                ],
                { duration: TITLE_IN_MS, easing: EASE, fill: 'both' },
            );

            if (cancelled) {
                return;
            }

            // 3. The title stays still at least 220 ms; the open phase also
            // waits for the destination screen's readiness signal. A slow
            // response only extends the closed state — nothing restarts.
            await Promise.all([delay(TITLE_HOLD_MS), waitContentReady()]);

            if (cancelled) {
                return;
            }

            // 4. Layers open together; the title exits over 130 ms.
            const open: KeyframeAnimationOptions = {
                duration: OPEN_MS,
                easing: EASE,
                fill: 'both',
            };

            await Promise.all([
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
                        {
                            transform: 'translateY(0) rotate(0)',
                            borderRadius: '0',
                        },
                        {
                            transform: 'translateY(-112%) rotate(-3deg)',
                            borderRadius: '45% 45% 0 0',
                        },
                    ],
                    { ...open, delay: OPEN_STAGGER },
                ),
                animateTo(
                    type,
                    [
                        { opacity: 1, transform: 'translateY(0)' },
                        { opacity: 0, transform: 'translateY(-12px)' },
                    ],
                    { duration: TITLE_OUT_MS, easing: EASE, fill: 'both' },
                ),
            ]);

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

/**
 * Frees a transition whose visit failed or was cancelled: error, network
 * error and HTTP exception events all route here so the overlay and the
 * repeat-click lock never stick to a dead request.
 */
function abortSceneTransition(): void {
    abortRun?.();
}

export default function SceneTransitionHost() {
    const overlayRef = useRef<HTMLDivElement>(null);
    // The overlay is a body portal: keep it out of the SSR markup so server
    // and client hydrate to the same tree, then mount it on the client.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Inertia `onFinish` does not mean React committed the destination, so
    // readiness comes from `useSceneContentReady`; these listeners only
    // cover failure paths that would otherwise wait forever.
    useEffect(() => {
        const offError = router.on('error', abortSceneTransition);
        const offNetwork = router.on('networkError', abortSceneTransition);
        const offHttp = router.on('httpException', abortSceneTransition);

        return () => {
            offError();
            offNetwork();
            offHttp();
        };
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
            abortRun?.();
            abortRun = null;
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
