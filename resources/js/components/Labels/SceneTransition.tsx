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
 * `.foho-root` scoped CSS. Animation parameters are unchanged: 1120 ms
 * layers with `cubic-bezier(.76,0,.24,1)`, the stage closes for 470 ms and
 * reopens after the swap at 520 ms with a 720 ms perspective/blur reveal.
 *
 * Inertia request errors (`error`, `networkError`, `httpException`) abort a
 * run in flight: settle then drops the pending swap and reveal timers and
 * cancels the overlay and `.stage` animations, so a failed visit frees the
 * overlay and the repeat-click lock and a cancelled run never fires `onSwap`.
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
    /** Fires once at 520 ms while the layers sweep over the viewport. */
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

let parts: OverlayParts | null = null;
let running = false;
let abortRun: (() => void) | null = null;
let generatorReturn: GeneratorReturn | null = null;

function prefersReducedMotion(): boolean {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stageElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.stage');
}

function cancelStageAnimations(): void {
    document
        .querySelectorAll<HTMLElement>('.stage')
        .forEach((stage) => stage.getAnimations().forEach((a) => a.cancel()));
}

function deactivate(overlay: HTMLDivElement): void {
    document.body.classList.remove('scene-changing');
    overlay.classList.remove('active');
    overlay.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    cancelStageAnimations();
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
 * Kept for existing callers: the restored timeline opens on its own
 * schedule, so screens no longer release a readiness gate.
 */
export function useSceneContentReady(enabled = true): void {
    void enabled;
}

/**
 * Runs the standard scene transition. Returns false when the animation was
 * skipped (reduced motion, no Web Animations API, overlay not mounted, or a
 * transition is already in flight) — in that case `onSwap` fires immediately
 * so callers never wait on animation, except when a transition is already
 * running: then the call is ignored so a second click cannot start a visit.
 * Requests are never delayed by this helper: callers fire navigation
 * themselves and only the visual swap of the scene is choreographed here.
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

    two.animate(
        [
            { transform: 'translateY(112%) rotate(3deg)' },
            { transform: 'translateY(0) rotate(0)', offset: 0.48 },
            { transform: 'translateY(0)', offset: 0.61 },
            { transform: 'translateY(-112%) rotate(-3deg)' },
        ],
        { ...layerOptions, delay: 55 },
    );

    type.animate(
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
    let settleTimer = 0;
    let revealRaf = 0;
    let settled = false;

    const settle = () => {
        if (settled) {
            return;
        }

        settled = true;
        clearTimeout(swapTimer);
        clearTimeout(settleTimer);

        if (revealRaf) {
            cancelAnimationFrame(revealRaf);
        }

        deactivate(overlay);
        running = false;
        abortRun = null;
        onFinished?.();
    };

    // Abort (Inertia error or host unmount) settles immediately: the pending
    // swap is dropped, so a cancelled run never fires `onSwap` afterwards.
    abortRun = settle;

    swapTimer = window.setTimeout(() => {
        onSwap?.();

        // Reveal the stage after React has committed the swapped scene.
        revealRaf = requestAnimationFrame(() => {
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
    }, SWAP_DELAY);

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
