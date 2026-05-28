import React from 'react';
import { FileUp } from 'lucide-react';

interface UploadScreenProps {
  goToNext: () => void;
}

export default function UploadScreen({ goToNext }: UploadScreenProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-[var(--color-fg)]">Загрузка данных</h1>
        <p className="text-sm text-[var(--color-muted)]">Загрузите Excel-файл с данными для генерации бирок</p>
      </div>

      <div className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-12 text-center cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors">
        <FileUp className="size-12 text-[var(--color-muted)] mx-auto mb-4 opacity-50" />
        <div className="text-base font-medium text-[var(--color-fg)] mb-1">Перетащите файл Excel сюда</div>
        <div className="text-sm text-[var(--color-muted)]">или нажмите, чтобы выбрать · .xlsx, .xls, .csv</div>
      </div>

      <div className="border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between bg-[var(--color-surface)]">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-[var(--color-fg)]">Товары_ноябрь.xlsx</span>
          <span className="text-xs text-[var(--color-muted)]">24.5 КБ</span>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-600 font-medium">Загружен</span>
      </div>

      <button onClick={goToNext} className="px-5 py-2.5 bg-[var(--color-accent)] text-white font-medium rounded-xl text-sm hover:brightness-110 transition-all">
        Далее: сопоставить колонки →
      </button>
    </div>
  );
}
