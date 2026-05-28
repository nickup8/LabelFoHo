import React from 'react';
import { FileUp, Columns4, LayoutTemplate, Barcode, Printer, History } from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
}

export default function AppSidebar({ currentScreen, setCurrentScreen }: SidebarProps) {
  const menuItems = [
    { id: 'upload', label: 'Загрузка файла', icon: FileUp },
    { id: 'mapping', label: 'Сопоставление колонок', icon: Columns4 },
    { id: 'templates', label: 'Шаблоны этикеток', icon: LayoutTemplate },
    { id: 'generate', label: 'Генерация кодов', icon: Barcode },
    { id: 'print', label: 'Печать и экспорт', icon: Printer },
    { id: 'history', label: 'История импорта', icon: History },
  ];

  return (
    <aside className="w-[240px] bg-[var(--color-surface)] border-r border-[var(--color-border)] h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold font-display tracking-tight text-[var(--color-fg)]">
          Label<span className="text-[var(--color-accent)]">Forge</span>
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-1">Генератор этикеток</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm transition-colors font-body ${
                isActive
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-fg)]/5 hover:text-[var(--color-fg)]'
              }`}
            >
              <Icon className="size-5 mr-3 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50">
        <div className="text-xs text-[var(--color-muted)] font-body text-center">
          Внутренний сервис v1.0
        </div>
      </div>
    </aside>
  );
}
