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
 * `.foho-root` scoped CSS. Animation keyframes match motion.js: 1120 ms
 * layers with `cubic-bezier(.76,0,.24,1)`, the stage closes for 470 ms and
 * reopens after the swap at 520 ms with a 720 ms perspective/blur reveal.
 * At ≈535 ms (title fully visible) layers and title pause together for an
 * extra 400 ms hold; with `awaitContent` the resume also waits for
 * `releaseSceneContent()` so a slow response never reveals the outgoing page.
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
     * Hold the shared full-cover pause until both the extra 400 ms have
     * elapsed and `releaseSceneContent()` is called (typically Inertia
     * `onFinish`) — used when the destination page is still loading and
     * must not be replaced by the outgoing scene on reveal.
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

const SWAP_DELAY = 520;
const LAYER_DURATION = 1120;
const EASE = 'cubic-bezier(.76,0,.24,1)';
/** Wall-clock moment when the title is fully visible (measured ≈535 ms). */
const PAUSE_AT = 535;
/** Extra full-cover hold added to the original keyframe hold. */
const HOLD_MS = 400;

let parts: OverlayParts | null = null;
let running = false;
let releaseWaiter: (() => void) | null = null;
let releasedDuringHold = false;
let clearRunTimers: (() => void) | null = null;
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
    releasedDuringHold = true;

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
    clearRunTimers?.();
    clearRunTimers = null;
    document.body.classList.remove('scene-changing');
    parts?.overlay.classList.remove('active');
    parts?.overlay.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    cancelStageAnimations();
}

/**
 * Runs the standard scene transition. Returns false when the animation was
 * skipped (reduced motion, no Web Animations API, overlay not mounted, or a
 * transition is already in flight) — in that case `onSwap` fires immediately
 * so callers never wait on animation, except when a transition is already
 * running: then the call is ignored so a second click cannot start a visit.
 * Requests are never delayed by this helper unless `awaitContent` extends
 * the shared full-cover pause until `releaseSceneContent()`.
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
    releasedDuringHold = false;

    const { overlay, one, two, type, numberEl, wordEl } = overlayParts;

    overlay.classList.add('active');
    document.body.classList.add('scene-changing');
    numberEl.textContent = number;
    wordEl.textContent = word;

    const layerOptions: KeyframeAnimationOptions = {
        duration: LAYER_DURATION,
        easing: EASE,
        fill: 'both',
    };

    const layerOne = one.animate(
        [
            {
                transform: 'translateY(108%) rotate(-4deg)',
                borderRadius: '48% 48% 0 0',
            },
            {
                transform: 'translateY(0) rotate(0)',
                borderRadius: '0',
                offset: 0.43,
            },
            { transform: 'translateY(0)', offset: 0.58 },
            {
                transform: 'translateY(-110%) rotate(3deg)',
                borderRadius: '0 0 46% 46%',
            },
        ],
        layerOptions,
    );

    const layerTwo = two.animate(
        [
            { transform: 'translateY(112%) rotate(3deg)' },
            { transform: 'translateY(0) rotate(0)', offset: 0.48 },
            { transform: 'translateY(0)', offset: 0.61 },
            { transform: 'translateY(-112%) rotate(-3deg)' },
        ],
        { ...layerOptions, delay: 55 },
    );

    const typeAnim = type.animate(
        [
            { opacity: 0, transform: 'translateY(48px)' },
            { opacity: 1, transform: 'translateY(0)', offset: 0.35 },
            { opacity: 1, transform: 'translateY(0)', offset: 0.62 },
            { opacity: 0, transform: 'translateY(-60px)' },
        ],
        { ...layerOptions, duration: 1030, delay: 60 },
    );

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

    let swapTimer = 0;
    let pauseTimer = 0;
    let holdTimer = 0;
    let settleTimer = 0;
    let settled = false;
    let resumed = false;
    let holdElapsed = false;
    let contentReady = false;

    const clearTimers = () => {
        clearTimeout(swapTimer);
        clearTimeout(pauseTimer);
        clearTimeout(holdTimer);
        clearTimeout(settleTimer);
    };

    clearRunTimers = clearTimers;

    const revealStage = () => {
        // Reveal the stage after React has committed the swapped scene.
        requestAnimationFrame(() => {
            const fresh = stageElement();

            if (!fresh || settled) {
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
    };

    const resumeLayers = () => {
        if (resumed || settled) {
            return;
        }

        // With awaitContent the shared pause also waits for the response so
        // a slow visit never reveals the outgoing page under the layers.
        if (!holdElapsed || (awaitContent && !contentReady)) {
            return;
        }

        resumed = true;
        releaseWaiter = null;
        layerOne.play();
        layerTwo.play();
        typeAnim.play();
        revealStage();
    };

    const settle = () => {
        if (settled) {
            return;
        }

        settled = true;
        clearTimers();
        releaseWaiter = null;
        deactivate();
        running = false;
        onFinished?.();
    };

    swapTimer = window.setTimeout(() => {
        onSwap?.();
    }, SWAP_DELAY);

    // Synchronous full-cover pause of both layers and the title while the
    // title is fully visible; resume only after HOLD_MS and (if awaited)
    // after the content response.
    pauseTimer = window.setTimeout(() => {
        layerOne.pause();
        layerTwo.pause();
        typeAnim.pause();

        if (awaitContent) {
            if (releasedDuringHold) {
                contentReady = true;
            } else {
                releaseWaiter = () => {
                    contentReady = true;
                    resumeLayers();
                };
            }
        }

        holdTimer = window.setTimeout(() => {
            holdElapsed = true;
            resumeLayers();
        }, HOLD_MS);
    }, PAUSE_AT);

    layerOne.finished
        .then(
            () =>
                new Promise((resolve) => {
                    settleTimer = window.setTimeout(resolve, 75);
                }),
        )
        .then(settle)
        .catch(settle);

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
