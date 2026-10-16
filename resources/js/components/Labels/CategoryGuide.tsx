import { useEffect, useRef } from 'react';

/**
 * Curved arrow from the upload prompt to the category buttons.
 * Ported from docs/foho-ui-white/js/category-guide.js.
 */
export default function CategoryGuide() {
    const svgRef = useRef<SVGSVGElement>(null);
    const lineRef = useRef<SVGPathElement>(null);
    const tipRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        const line = lineRef.current;
        const tip = tipRef.current;
        const stage = svg?.closest('.stage');

        if (!svg || !line || !tip || !stage) {
            return;
        }

        let frame = 0;
        let disposed = false;

        const position = () => {
            frame = 0;

            const prompt = stage.querySelector('#category-prompt');
            const categories = stage.querySelector('.categories');

            if (!prompt || !categories) {
                return;
            }

            const box = stage.getBoundingClientRect();
            const label = prompt.getBoundingClientRect();
            const target = categories.getBoundingClientRect();

            if (!box.width || !box.height) {
                return;
            }

            const w = stage.clientWidth;
            const h = stage.clientHeight;
            const kx = w / box.width;
            const ky = h / box.height;
            const sx = (label.right - box.left) * kx + 8;
            const sy = (label.top + label.height / 2 - box.top) * ky;
            const ex = (target.left + target.width / 2 - box.left) * kx;
            const ey = (target.bottom - box.top) * ky + 10;
            const distance = ex - sx;
            const bendX = Math.min(w - 8, sx + Math.max(18, distance * 0.65));
            const bendY = sy - (sy - ey) * 0.3;

            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            line.setAttribute(
                'd',
                `M${sx} ${sy} C${bendX} ${sy} ${ex} ${bendY} ${ex} ${ey}`,
            );
            tip.setAttribute(
                'd',
                `M${ex - 7} ${ey + 9} L${ex} ${ey} L${ex + 7} ${ey + 9}`,
            );
        };

        const schedule = () => {
            if (!frame) {
                frame = requestAnimationFrame(position);
            }
        };

        const observer = new ResizeObserver(schedule);

        observer.observe(stage);
        window.addEventListener('resize', schedule);

        if (document.fonts) {
            document.fonts.ready.then(() => {
                if (!disposed) {
                    schedule();
                }
            });
        }

        schedule();

        return () => {
            disposed = true;

            if (frame) {
                cancelAnimationFrame(frame);
            }

            observer.disconnect();
            window.removeEventListener('resize', schedule);
        };
    });

    return (
        <svg
            ref={svgRef}
            className="category-guide"
            fill="none"
            aria-hidden="true"
        >
            <path ref={lineRef} className="guide-line" pathLength={100} />
            <path ref={tipRef} className="guide-tip" />
        </svg>
    );
}
