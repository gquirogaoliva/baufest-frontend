import { Component, computed, ElementRef, inject, input, signal } from '@angular/core';

import { GrowthPoint } from '../../../services/dashboard-data';

interface ChartPoint {
  x: number;
  y: number;
}

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 260;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 36 };
const PLOT_WIDTH = VIEW_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;

function niceMax(value: number): number {
  return Math.max(4, Math.ceil(value / 4) * 4);
}

/** Catmull-Rom-to-Bezier smoothing (tension 1/6) — a pleasant curve, not a scientific fit. */
function smoothPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return '';
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

@Component({
  selector: 'app-growth-chart',
  templateUrl: './growth-chart.html',
  styleUrl: './growth-chart.scss',
})
export class GrowthChart {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly data = input.required<GrowthPoint[]>();
  readonly yoyLabel = input<string>('');

  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly total = computed(() =>
    this.data().reduce((sum, point) => sum + point.incorporaciones, 0),
  );

  private readonly maxValue = computed(() =>
    niceMax(Math.max(...this.data().flatMap((p) => [p.incorporaciones, p.completados]), 0)),
  );

  private readonly xForIndex = (index: number, count: number): number =>
    count <= 1 ? MARGIN.left : MARGIN.left + (index / (count - 1)) * PLOT_WIDTH;

  private readonly yForValue = (value: number): number =>
    MARGIN.top + (1 - value / this.maxValue()) * PLOT_HEIGHT;

  protected readonly yTicks = computed(() => {
    const max = this.maxValue();
    return [max, (max * 3) / 4, max / 2, max / 4, 0].map((value) => ({
      value,
      y: this.yForValue(value),
    }));
  });

  protected readonly incorporacionesPoints = computed<ChartPoint[]>(() => {
    const points = this.data();
    return points.map((p, i) => ({
      x: this.xForIndex(i, points.length),
      y: this.yForValue(p.incorporaciones),
    }));
  });

  protected readonly completadosPoints = computed<ChartPoint[]>(() => {
    const points = this.data();
    return points.map((p, i) => ({
      x: this.xForIndex(i, points.length),
      y: this.yForValue(p.completados),
    }));
  });

  protected readonly incorporacionesPath = computed(() => smoothPath(this.incorporacionesPoints()));
  protected readonly completadosPath = computed(() => smoothPath(this.completadosPoints()));

  protected readonly completadosAreaPath = computed(() => {
    const points = this.completadosPoints();
    if (points.length === 0) {
      return '';
    }
    const baseline = MARGIN.top + PLOT_HEIGHT;
    const last = points[points.length - 1];
    const first = points[0];
    return `${smoothPath(points)} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  });

  protected readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  protected readonly plotBottom = MARGIN.top + PLOT_HEIGHT;
  protected readonly plotLeft = MARGIN.left;
  protected readonly plotRight = VIEW_WIDTH - MARGIN.right;

  protected readonly hoveredPoint = computed(() => {
    const index = this.hoveredIndex();
    if (index === null) {
      return null;
    }
    const points = this.data();
    return points[index] ?? null;
  });

  protected readonly hoveredX = computed(() => {
    const index = this.hoveredIndex();
    if (index === null) {
      return 0;
    }
    return this.xForIndex(index, this.data().length);
  });

  /** Tooltip position as a percentage of the viewBox, so the HTML overlay tracks the SVG at any render size. */
  protected readonly hoveredXPercent = computed(() => (this.hoveredX() / VIEW_WIDTH) * 100);

  onPointerMove(event: PointerEvent): void {
    const svg = this.elementRef.nativeElement.querySelector('svg.growth-chart__svg');
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const svgX = ratio * VIEW_WIDTH;
    this.hoveredIndex.set(this.nearestIndex(svgX));
  }

  onPointerLeave(): void {
    this.hoveredIndex.set(null);
  }

  onFocus(): void {
    if (this.hoveredIndex() === null) {
      this.hoveredIndex.set(this.data().length - 1);
    }
  }

  onBlur(): void {
    this.hoveredIndex.set(null);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.data().length;
    if (count === 0) {
      return;
    }
    const current = this.hoveredIndex() ?? count - 1;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.hoveredIndex.set(Math.max(0, current - 1));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.hoveredIndex.set(Math.min(count - 1, current + 1));
    } else if (event.key === 'Escape') {
      this.hoveredIndex.set(null);
    }
  }

  private nearestIndex(svgX: number): number {
    const points = this.data();
    let closest = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < points.length; i++) {
      const x = this.xForIndex(i, points.length);
      const distance = Math.abs(x - svgX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = i;
      }
    }
    return closest;
  }
}
