import { useEffect, useRef, useState, useCallback } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Canvas, FabricText, Textbox, Rect, type FabricObject } from 'fabric';
import labels from '@/routes/labels';
import { Move, Type, Bold as BoldIcon, RotateCcw, Save } from 'lucide-react';
import type { LabelTemplate } from '@/types';

interface Props {
  template: LabelTemplate;
}

interface ElementConfig {
  key: string;
  text: string;
  fontSize: number;
  fontWeight: 'bold' | 'normal';
  x: number;
  y: number;
  width?: number;
  height?: number;
  textAlign?: 'left' | 'center';
  fill?: string;
}

interface SelectedProps {
  key: string;
  fontSize: number;
  fontWeight: 'bold' | 'normal';
  left: number;
  top: number;
  width: number;
}

const DEFAULT_ELEMENTS: ElementConfig[] = [
  { key: 'title', text: 'Название товара', fontSize: 15, fontWeight: 'bold', x: 235, y: 28, width: 380, textAlign: 'center' },
  { key: 'brand', text: 'Торговая марка: FoHo', fontSize: 11, fontWeight: 'normal', x: 25, y: 62, width: 300 },
  { key: 'article', text: 'Артикул: A-001', fontSize: 11, fontWeight: 'normal', x: 25, y: 80, width: 300 },
  { key: 'size', text: 'Размер: 30x45 см', fontSize: 11, fontWeight: 'normal', x: 25, y: 98, width: 300 },
  { key: 'tolerance', text: 'Допускается отклонение в размерах ± 1 см.', fontSize: 9.5, fontWeight: 'normal', x: 25, y: 113, width: 300, fill: '#555' },
  { key: 'expiry', text: 'Срок годности: не ограничен', fontSize: 11, fontWeight: 'normal', x: 25, y: 133, width: 300 },
  { key: 'composition', text: 'Состав: 100% ПВХ', fontSize: 11, fontWeight: 'normal', x: 25, y: 151, width: 300 },
  { key: 'importer', text: 'Импортёр: ИП Климин П. А.\nАдрес: 358007, Россия, респ. Калмыкия, г. Элиста, пос. Салын, ул. Красная, 9\nТелефон: +7 (995) 771-27-92\nИзготовитель: Ningbo Huafu Home Goods Co., Ltd\nДата производства: Июнь 2026', fontSize: 10, fontWeight: 'normal', x: 25, y: 172, width: 300 },
  { key: 'eac', text: 'EAC', fontSize: 22, fontWeight: 'bold', x: 360, y: 190, textAlign: 'center' },
  { key: 'recycle', text: '03', fontSize: 14, fontWeight: 'bold', x: 367, y: 225, width: 42, textAlign: 'center' },
  { key: 'recycle_label', text: 'PVC', fontSize: 8, fontWeight: 'bold', x: 367, y: 241, width: 42, fill: '#555', textAlign: 'center' },
  { key: 'regulation', text: 'Соответствует требованиям ТР ТС 017/2011\n«О безопасности продукции легкой промышленности»', fontSize: 9, fontWeight: 'normal', x: 15, y: 450, width: 400, textAlign: 'center', fill: '#444' },
];

const ACTIVE_COLOR = '#2563eb';

function serializeObject(obj: FabricObject, key: string) {
  return {
    key,
    left: Math.round(obj.left ?? 0),
    top: Math.round(obj.top ?? 0),
    fontSize: (obj as FabricText).fontSize ?? 14,
    fontWeight: (obj as FabricText).fontWeight ?? 'normal',
    width: Math.round(obj.width ?? 0),
    height: Math.round(obj.height ?? 0),
    textAlign: (obj as FabricText).textAlign ?? 'left',
    fill: obj.fill?.toString() ?? '#000',
  };
}

export default function Settings({ template }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const objectsMap = useRef<Map<string, FabricObject>>(new Map());
  const [selected, setSelected] = useState<SelectedProps | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const { flash } = usePage().props as { flash?: { success?: string } };

  const { data, setData, post, processing, errors } = useForm({
    importer_name: template.importer_name,
    importer_address: template.importer_address,
    importer_phone: template.importer_phone,
    manufacturer_name: template.manufacturer_name,
    default_width_px: template.default_width_px,
    default_height_px: template.default_height_px,
    canvas_elements: JSON.stringify(template.canvas_elements ?? ''),
  });

  const loadElements = useCallback((canvas: Canvas, elements: ElementConfig[]) => {
    objectsMap.current.clear();
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    elements.forEach((cfg) => {
      const common = {
        left: cfg.x,
        top: cfg.y,
        fontSize: cfg.fontSize,
        fontWeight: cfg.fontWeight,
        fill: cfg.fill ?? '#000',
        name: cfg.key,
      };

      let obj: FabricObject;

      if (cfg.key === 'barcode') {
        obj = new Rect({
          ...common,
          width: cfg.width ?? 240,
          height: cfg.height ?? 50,
          fill: '#f0f0f0',
          stroke: '#ccc',
          strokeWidth: 1,
          rx: 2,
          ry: 2,
        });
      } else if (cfg.key === 'recycle') {
        const rect = new Rect({
          left: cfg.x - 2,
          top: cfg.y - 2,
          width: 46,
          height: 30,
          fill: '#fff',
          stroke: '#000',
          strokeWidth: 1.5,
          rx: 2,
          ry: 2,
          name: 'recycle_bg',
          selectable: false,
          evented: false,
        });
        canvas.add(rect);

        obj = new FabricText(cfg.text, {
          ...common,
          width: cfg.width,
          textAlign: cfg.textAlign ?? 'left',
        });
      } else if (cfg.key === 'eac') {
        const rect = new Rect({
          left: cfg.x - 4,
          top: cfg.y - 4,
          width: 52,
          height: 32,
          fill: '#fff',
          stroke: '#000',
          strokeWidth: 1.5,
          rx: 2,
          ry: 2,
          name: 'eac_bg',
          selectable: false,
          evented: false,
        });
        canvas.add(rect);

        obj = new FabricText(cfg.text, {
          ...common,
          textAlign: cfg.textAlign ?? 'left',
        });
      } else if (cfg.key === 'recycle_label') {
        obj = new FabricText(cfg.text, {
          ...common,
          width: cfg.width,
          textAlign: cfg.textAlign ?? 'left',
        });
      } else if ((cfg.text?.length ?? 0) > 50) {
        obj = new Textbox(cfg.text, {
          ...common,
          width: cfg.width ?? 400,
        });
      } else {
        obj = new FabricText(cfg.text, {
          ...common,
          width: cfg.width,
          textAlign: cfg.textAlign ?? 'left',
        });
      }

      obj.setControlVisible('mtr', false);
      canvas.add(obj);
      objectsMap.current.set(cfg.key, obj);
    });

    canvas.renderAll();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 469,
      height: 634,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    const saved = template.canvas_elements;
    if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
      const elements: ElementConfig[] = DEFAULT_ELEMENTS.map((def) => {
        const s = (saved as Record<string, Record<string, unknown>>)[def.key];
        if (!s) return def;
        return {
          ...def,
          x: (s.left as number) ?? def.x,
          y: (s.top as number) ?? def.y,
          fontSize: (s.fontSize as number) ?? def.fontSize,
          fontWeight: (s.fontWeight as 'bold' | 'normal') ?? def.fontWeight,
          fill: (s.fill as string) ?? def.fill,
          textAlign: (s.textAlign as 'left' | 'center') ?? def.textAlign,
          text: (s.text as string) ?? def.text,
          width: (s.width as number) ?? def.width,
        };
      });
      loadElements(canvas, elements);
    } else {
      loadElements(canvas, DEFAULT_ELEMENTS);
    }

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (!obj || obj.name === 'recycle_bg' || obj.name === 'eac_bg') return;
      setSelected({
        key: obj.name ?? '',
        fontSize: (obj as FabricText).fontSize ?? 14,
        fontWeight: ((obj as FabricText).fontWeight as 'bold' | 'normal') ?? 'normal',
        left: Math.round(obj.left ?? 0),
        top: Math.round(obj.top ?? 0),
        width: Math.round(obj.width ?? 0),
      });
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (!obj || obj.name === 'recycle_bg' || obj.name === 'eac_bg') return;
      setSelected({
        key: obj.name ?? '',
        fontSize: (obj as FabricText).fontSize ?? 14,
        fontWeight: ((obj as FabricText).fontWeight as 'bold' | 'normal') ?? 'normal',
        left: Math.round(obj.left ?? 0),
        top: Math.round(obj.top ?? 0),
        width: Math.round(obj.width ?? 0),
      });
    });

    canvas.on('selection:cleared', () => {
      setSelected(null);
    });

    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj || obj.name === 'recycle_bg' || obj.name === 'eac_bg') return;
      setSelected({
        key: obj.name ?? '',
        fontSize: (obj as FabricText).fontSize ?? 14,
        fontWeight: ((obj as FabricText).fontWeight as 'bold' | 'normal') ?? 'normal',
        left: Math.round(obj.left ?? 0),
        top: Math.round(obj.top ?? 0),
        width: Math.round(obj.width ?? 0),
      });
    });

    setCanvasReady(true);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  const updateObjectProp = useCallback((prop: string, value: number | string) => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;

    const obj = canvas.getObjects().find((o) => o.name === selected.key);
    if (!obj) return;

    if (prop === 'fontSize') {
      (obj as FabricText).set('fontSize', Number(value));
    } else if (prop === 'fontWeight') {
      const w = value === 'bold' ? 'bold' : 'normal';
      (obj as FabricText).set('fontWeight', w);
      setSelected((prev) => prev ? { ...prev, fontWeight: w } : null);
    } else if (prop === 'left') {
      obj.set('left', Number(value));
    } else if (prop === 'top') {
      obj.set('top', Number(value));
    }

    obj.setCoords();
    canvas.renderAll();

    setSelected((prev) => {
      if (!prev) return null;
      const updated = { ...prev };
      if (prop === 'fontSize') updated.fontSize = Number(value);
      if (prop === 'left') updated.left = Number(value);
      if (prop === 'top') updated.top = Number(value);
      return updated;
    });
  }, [selected]);

  const handleReset = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    loadElements(canvas, DEFAULT_ELEMENTS);
    setSelected(null);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const elements: Record<string, Record<string, unknown>> = {};
    canvas.getObjects().forEach((obj) => {
      const name = obj.name;
      if (!name || name === 'recycle_bg' || name === 'eac_bg') return;
      elements[name] = serializeObject(obj, name);
    });

    setData('canvas_elements', JSON.stringify(elements));
  }, [setData]);

  useEffect(() => {
    if (data.canvas_elements && data.canvas_elements !== '') {
      post(labels.settings.update().url, {
        preserveScroll: true,
        onFinish: () => setData('canvas_elements', ''),
      });
    }
  }, [data.canvas_elements]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveTemplate();
  };

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <>
      <Head title="Редактор шаблона" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Редактор шаблона бирки</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Перетаскивайте элементы на холсте, настраивайте шрифты и положение
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <RotateCcw className="size-3.5" />
              Сбросить
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={handleSaveTemplate}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {processing ? (
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="size-3.5" />
              )}
              {processing ? 'Сохранение…' : 'Сохранить шаблон'}
            </button>
          </div>
        </div>

        {flash?.success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
            {flash.success}
          </div>
        )}

        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-4 shadow-sm">
              <canvas ref={canvasRef} id="labelCanvas" className="block" />
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {canvasReady ? 'Холст 469 × 634 px. Кликните на элемент для редактирования.' : 'Загрузка редактора…'}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Move className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Позиция</span>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">X (px)</label>
                  <input
                    type="number"
                    value={selected?.left ?? ''}
                    onChange={(e) => updateObjectProp('left', Number(e.target.value))}
                    disabled={!selected}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Y (px)</label>
                  <input
                    type="number"
                    value={selected?.top ?? ''}
                    onChange={(e) => updateObjectProp('top', Number(e.target.value))}
                    disabled={!selected}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Type className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Текст</span>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Размер шрифта</label>
                  <input
                    type="number"
                    value={selected?.fontSize ?? ''}
                    onChange={(e) => updateObjectProp('fontSize', Number(e.target.value))}
                    disabled={!selected}
                    min={6}
                    max={72}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Начертание</label>
                  <button
                    type="button"
                    onClick={() => updateObjectProp('fontWeight', selected?.fontWeight === 'bold' ? 'normal' : 'bold')}
                    disabled={!selected}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors ${selected?.fontWeight === 'bold' ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground'} disabled:pointer-events-none disabled:opacity-50`}
                  >
                    <BoldIcon className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {!selected && (
              <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 px-4 py-12 text-center">
                <div className="space-y-2">
                  <Move className="mx-auto size-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/60">
                    Кликните на любой элемент на холсте слева,<br />чтобы увидеть его свойства
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <input type="hidden" name="canvas_elements" value={data.canvas_elements} />

          <details className="rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Юридические данные и параметры
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Импортёр</label>
                  <input
                    type="text"
                    value={data.importer_name}
                    onChange={(e) => setData('importer_name', e.target.value)}
                    className={inputClass}
                  />
                  {errors.importer_name && <p className="text-[10px] text-destructive">{errors.importer_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Телефон</label>
                  <input
                    type="text"
                    value={data.importer_phone}
                    onChange={(e) => setData('importer_phone', e.target.value)}
                    className={inputClass}
                  />
                  {errors.importer_phone && <p className="text-[10px] text-destructive">{errors.importer_phone}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Адрес</label>
                <textarea
                  value={data.importer_address}
                  onChange={(e) => setData('importer_address', e.target.value)}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {errors.importer_address && <p className="text-[10px] text-destructive">{errors.importer_address}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Изготовитель</label>
                <input
                  type="text"
                  value={data.manufacturer_name}
                  onChange={(e) => setData('manufacturer_name', e.target.value)}
                  className={inputClass}
                />
                {errors.manufacturer_name && <p className="text-[10px] text-destructive">{errors.manufacturer_name}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Ширина холста (px)</label>
                  <input
                    type="number"
                    value={data.default_width_px}
                    onChange={(e) => setData('default_width_px', Number(e.target.value))}
                    className={inputClass}
                    min={200}
                    max={2000}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Высота холста (px)</label>
                  <input
                    type="number"
                    value={data.default_height_px}
                    onChange={(e) => setData('default_height_px', Number(e.target.value))}
                    className={inputClass}
                    min={200}
                    max={2000}
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={processing}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {processing ? (
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="size-3.5" />
              )}
              Сохранить все настройки
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
