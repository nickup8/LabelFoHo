/**
 * Выбор категории живёт вне React-состояния: Inertia-визиты перемонтируют
 * страницу, состояние useState теряется. Модульный кэш переживает «Назад»
 * и любые внутри-SPA переходы, но сбрасывается при полной перезагрузке
 * страницы (новый экземпляр модуля) — как и требуется правилом
 * «после обновления выбор требуется заново».
 */
let category: string | null = null;

export function readWizardCategory(): string | null {
    return category;
}

export function writeWizardCategory(value: string): void {
    category = value;
}
