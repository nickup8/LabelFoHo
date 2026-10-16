import { useEffect, useRef } from 'react';

/**
 * Volumetric document scene, ported from docs/foho-ui-white/js/motion.js
 * (`drawVolume`): seven projected sheets with thickness, shadows, abstract
 * rules, orbiting particles and a scanning line while active. The approved
 * white (mono) palette is used as in the source. rAF stops on hidden tabs
 * and under prefers-reduced-motion (a single static frame at t = 2.7 is
 * drawn); pointer parallax is skipped for touch and reduced motion.
 */

export type VolumeMode = 'idle' | 'uploading' | 'generating' | 'ready';

interface Props {
    mode: VolumeMode;
    width?: number;
    height?: number;
}

interface Plane {
    i: number;
    x: number;
    y: number;
    z: number;
    depth: number;
}

type Point = [number, number];
type Point3 = [number, number, number];

const ease = (t: number): number =>
    1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function project(p: Point3, rx: number, ry: number): Point3 {
    const [x, y, z] = p;
    const yy = y * Math.cos(rx) - z * Math.sin(rx);
    let zz = y * Math.sin(rx) + z * Math.cos(rx);
    const xx = x * Math.cos(ry) + zz * Math.sin(ry);
    zz = -x * Math.sin(ry) + zz * Math.cos(ry);
    const scale = 650 / (650 + zz);

    return [xx * scale, yy * scale, zz];
}

export default function VolumeScene({ mode, width, height }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasWidth = width ?? (mode === 'generating' ? 1800 : 900);
    const canvasHeight = height ?? (mode === 'generating' ? 1120 : 560);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        const reduce = matchMedia('(prefers-reduced-motion: reduce)');
        let frame = 0;
        let disposed = false;
        const canvasStart = performance.now();
        let pointerX = 0;
        let pointerY = 0;
        let viewX = 0;
        let viewY = 0;

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch' || reduce.matches) {
                return;
            }

            pointerX = (event.clientX / innerWidth - 0.5) * 2;
            pointerY = (event.clientY / innerHeight - 0.5) * 2;
        };

        const drawVolume = (now: number) => {
            frame = 0;

            if (disposed || !canvas.isConnected || document.hidden) {
                return;
            }

            const rect = canvas.getBoundingClientRect();

            if (rect.bottom < 0 || rect.top > innerHeight) {
                frame = requestAnimationFrame(drawVolume);

                return;
            }

            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            const mono = true; /* Approved white palette. */
            const active = mode === 'generating' || mode === 'uploading';
            const t = reduce.matches ? 2.7 : (now - canvasStart) / 1000;

            viewX = lerp(viewX, pointerX, 0.04);
            viewY = lerp(viewY, pointerY, 0.04);

            const rx = -0.39 + Math.sin(t * 0.44) * 0.045 + viewY * 0.08;
            const ry = -0.43 + Math.sin(t * 0.3) * 0.08 + viewX * 0.13;
            const scale = Math.min(w / 460, h / 280);

            ctx.save();
            ctx.translate(w / 2, h / 2 + 8 * scale);
            ctx.scale(scale, scale);

            // A light pool sits below the suspended stack.
            const glow = ctx.createRadialGradient(0, 28, 3, 0, 28, 165);

            glow.addColorStop(
                0,
                mono ? 'rgba(36,87,245,.09)' : 'rgba(255,120,95,.20)',
            );
            glow.addColorStop(
                0.5,
                mono ? 'rgba(55,55,55,.045)' : 'rgba(178,99,178,.09)',
            );
            glow.addColorStop(
                1,
                mono ? 'rgba(36,87,245,0)' : 'rgba(255,120,95,0)',
            );

            ctx.fillStyle = glow;
            ctx.fillRect(-220, -145, 440, 290);

            const assembly =
                mode === 'ready'
                    ? 1
                    : active
                      ? ease(Math.min(t / 4.9, 1))
                      : 0.72;
            const orbit = active ? 1 - assembly : 0.12;
            const planes: Plane[] = [];

            for (let i = 0; i < 7; i++) {
                const a = i * 0.92 + t * 0.22;
                const spread = orbit * (1 + i * 0.09);
                const x = Math.sin(a) * 115 * spread;
                const y =
                    Math.cos(a) * 63 * spread -
                    6 * Math.sin(t * 1.05 + i * 0.35);
                const z = (i - 3) * 11 + Math.sin(a) * 27 * spread;

                planes.push({
                    i,
                    x,
                    y,
                    z,
                    depth: project([x, y, z], rx, ry)[2],
                });
            }

            planes.sort((a, b) => b.depth - a.depth);

            const poly = (
                points: Point[],
                fill: string | CanvasGradient,
                stroke?: string,
            ) => {
                ctx.beginPath();
                points.forEach((p, i) =>
                    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
                );
                ctx.closePath();
                ctx.fillStyle = fill;
                ctx.fill();

                if (stroke) {
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            };

            for (const p of planes) {
                const pulse = active ? Math.sin(t * 2.3 - p.i * 0.7) * 2 : 0;
                const rz =
                    (1 - assembly) * Math.sin(p.i) * 0.9 +
                    Math.sin(t * 0.45) * 0.025;
                const transform = (x: number, y: number, z = 0): Point => {
                    const out = project(
                        [
                            x * Math.cos(rz) - y * Math.sin(rz) + p.x,
                            x * Math.sin(rz) + y * Math.cos(rz) + p.y + pulse,
                            z + p.z,
                        ],
                        rx,
                        ry,
                    );

                    return [out[0], out[1]];
                };
                const corners: Point[] = [
                    [-51, -68],
                    [51, -68],
                    [51, 68],
                    [-51, 68],
                ];
                const face = corners.map(([x, y]) => transform(x, y));
                const bottom = corners.map(([x, y]) => transform(x, y, 3.7));

                poly(
                    [face[1], bottom[1], bottom[2], face[2]],
                    mono ? '#838383' : '#b88f98',
                );
                poly(
                    [face[2], bottom[2], bottom[3], face[3]],
                    mono ? '#cdcdcd' : '#edb7a3',
                );

                const grad = ctx.createLinearGradient(
                    face[0][0],
                    face[0][1],
                    face[2][0],
                    face[2][1],
                );

                grad.addColorStop(
                    0,
                    mono
                        ? p.i === 6
                            ? '#fafafa'
                            : '#dcdcdc'
                        : p.i === 6
                          ? '#fff8ef'
                          : '#ffd9c8',
                );
                grad.addColorStop(
                    1,
                    mono
                        ? p.i === 6
                            ? '#e1e1e1'
                            : '#adadad'
                        : p.i === 6
                          ? '#f6d3c4'
                          : '#e3a28f',
                );

                ctx.shadowColor = mono ? 'rgba(0,0,0,.3)' : 'rgba(9,4,17,.23)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetY = 7;
                poly(
                    face,
                    grad,
                    mono ? 'rgba(245,245,245,.6)' : 'rgba(255,246,232,.6)',
                );
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                // Abstract rules communicate a document without displaying a preview.
                for (let line = 0; line < 5; line++) {
                    const start = transform(-32, -16 + line * 14, -0.5);
                    const end = transform(
                        line === 4 ? 9 : 31,
                        -16 + line * 14,
                        -0.5,
                    );

                    ctx.beginPath();
                    ctx.moveTo(start[0], start[1]);
                    ctx.lineTo(end[0], end[1]);
                    ctx.strokeStyle = mono
                        ? line === 0
                            ? '#333333'
                            : 'rgba(80,80,80,.27)'
                        : line === 0
                          ? '#d96e5d'
                          : 'rgba(130,82,88,.27)';
                    ctx.lineWidth = line === 0 ? 4 : 1.5;
                    ctx.stroke();
                }

                const dot = transform(-29, -44, -0.6);

                ctx.beginPath();
                ctx.arc(dot[0], dot[1], 5, 0, Math.PI * 2);
                ctx.fillStyle = mono ? '#2457f5' : '#e46e58';
                ctx.fill();
            }

            // Depth-projected sparks travel on separate orbital paths.
            for (let i = 0; i < 26; i++) {
                const a = i * 2.399 + t * (0.12 + (i % 3) * 0.06);
                const r = 110 + (i % 5) * 9;
                const point = project(
                    [
                        Math.cos(a) * r,
                        Math.sin(a) * 75,
                        Math.sin(a * 0.73) * 95,
                    ],
                    rx,
                    ry,
                );

                ctx.beginPath();
                ctx.arc(
                    point[0],
                    point[1],
                    i % 5 === 0 ? 1.8 : 0.8,
                    0,
                    Math.PI * 2,
                );
                ctx.fillStyle = mono
                    ? i % 4 === 0
                        ? 'rgba(36,87,245,.7)'
                        : 'rgba(70,70,70,.28)'
                    : i % 4 === 0
                      ? 'rgba(255,181,137,.7)'
                      : 'rgba(221,176,229,.32)';
                ctx.fill();
            }

            if (active && !reduce.matches) {
                const sweep = Math.sin(t * 1.1) * 72;
                const scan = ctx.createLinearGradient(-145, sweep, 145, sweep);

                scan.addColorStop(
                    0,
                    mono ? 'rgba(36,87,245,0)' : 'rgba(255,145,109,0)',
                );
                scan.addColorStop(
                    0.5,
                    mono ? 'rgba(36,87,245,.65)' : 'rgba(255,189,151,.65)',
                );
                scan.addColorStop(
                    1,
                    mono ? 'rgba(36,87,245,0)' : 'rgba(255,145,109,0)',
                );

                ctx.fillStyle = scan;
                ctx.fillRect(-145, sweep, 290, 0.8);
            }

            ctx.restore();

            if (!reduce.matches) {
                frame = requestAnimationFrame(drawVolume);
            }
        };

        const startLoop = () => {
            if (frame) {
                cancelAnimationFrame(frame);
            }

            frame = requestAnimationFrame(drawVolume);
        };

        const onVisibilityChange = () => {
            if (document.hidden) {
                if (frame) {
                    cancelAnimationFrame(frame);
                }

                frame = 0;
            } else {
                startLoop();
            }
        };

        const onReduceChange = () => {
            startLoop();
        };

        document.addEventListener('pointermove', onPointerMove, {
            passive: true,
        });
        document.addEventListener('visibilitychange', onVisibilityChange);
        reduce.addEventListener('change', onReduceChange);
        startLoop();

        return () => {
            disposed = true;

            if (frame) {
                cancelAnimationFrame(frame);
            }

            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
            reduce.removeEventListener('change', onReduceChange);
        };
    }, [mode]);

    return (
        <div className="volume-scene" aria-hidden="true">
            <div className="volume-shadow" />
            <canvas
                ref={canvasRef}
                className="volume-canvas"
                width={canvasWidth}
                height={canvasHeight}
                data-mode={mode}
            />
            {mode === 'ready' && <span className="volume-ready">✓</span>}
        </div>
    );
}
