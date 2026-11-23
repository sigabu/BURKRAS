import { config } from './config.js';

export const serviceNames = Object.freeze({
  drilling: 'Алмазное бурение',
  cutting: 'Алмазная резка',
  reinforcement: 'Усиление проёмов',
  demolition: 'Демонтаж',
});

export function calculateEstimate(input, tariffs = config.pricing) {
  const { service, material, thickness, size, quantity = 1 } = input;
  if (!Object.hasOwn(serviceNames, service)) throw new RangeError('Выберите услугу');
  if (!['brick', 'concrete', 'reinforced'].includes(material)) throw new RangeError('Выберите материал');
  if (service === 'reinforcement') return { individual: true, low: null, high: null };
  const depth = Number(thickness);
  const dimension = Number(size);
  const count = Number(quantity);
  if (!Number.isFinite(depth) || depth < 5 || depth > 100) throw new RangeError('Толщина: от 5 до 100 см');
  if (!Number.isFinite(dimension) || dimension <= 0) throw new RangeError('Укажите положительный размер');
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new RangeError('Количество: от 1 до 100');
  let base;
  if (service === 'drilling') {
    if (dimension < 40 || dimension > 400) throw new RangeError('Диаметр в демо: от 40 до 400 мм');
    const factor = dimension <= 100 ? 1 : dimension <= 160 ? 1.25 : dimension <= 250 ? 1.65 : 2.4;
    base = tariffs.drillingPerCm[material] * depth * factor * count;
  } else {
    if (dimension > 100) throw new RangeError('Размер в демо: до 100');
    const unitPrice = service === 'cutting' ? tariffs.cuttingPerMetre[material] : tariffs.demolitionPerM2[material];
    base = unitPrice * dimension * Math.max(1, depth / (service === 'cutting' ? 15 : 12));
  }
  const low = Math.ceil(Math.max(tariffs.minimum, base) / 100) * 100;
  const high = Math.ceil(low * tariffs.upperMultiplier / 100) * 100;
  return { individual: false, low, high };
}

export const formatRubles = (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
