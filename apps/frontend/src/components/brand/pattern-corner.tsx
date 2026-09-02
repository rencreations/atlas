import { cn } from '@/lib/utils';

type Shape = 'circle' | 'square' | 'plus' | 'x' | 'triangle' | 'half' | 'quarter' | 'flower';

interface Cell {
  shape: Shape;
  rotate?: 0 | 90 | 180 | 270;
}

interface Props {
  className?: string;
  /** Position in the parent (the parent must be `relative` and clip overflow). */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Number of cells per side. */
  size?: 2 | 3 | 4;
  /** Fixed deterministic pattern. Provide to keep server/client renders in sync. */
  cells?: Cell[];
  /** Cell size in px. */
  cellSize?: number;
}

const DEFAULT_3X3: Cell[] = [
  { shape: 'circle' },
  { shape: 'square' },
  { shape: 'triangle' },
  { shape: 'plus' },
  { shape: 'circle' },
  { shape: 'x' },
  { shape: 'flower' },
  { shape: 'half' },
  { shape: 'quarter' },
];

const DEFAULT_2X2: Cell[] = [
  { shape: 'triangle' },
  { shape: 'circle' },
  { shape: 'square' },
  { shape: 'x' },
];

/**
 * The Atlas signature corner pattern. Used at edges, corners, and divider
 * strips, never as a tiled wallpaper.
 *
 * Every motif renders in the theme's single primary brand color on the
 * page paper, so the pattern re-skins with the active theme and stays one
 * hue.
 */
export function PatternCorner({
  className,
  position = 'top-right',
  size = 3,
  cells,
  cellSize = 64,
}: Props) {
  const fallback = size === 2 ? DEFAULT_2X2 : DEFAULT_3X3;
  const grid = cells ?? fallback.slice(0, size * size);
  const total = size * cellSize;

  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0',
  }[position];

  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('pointer-events-none absolute', positionClasses, className)}
    >
      {grid.map((cell, idx) => {
        const col = idx % size;
        const row = Math.floor(idx / size);
        const x = col * cellSize;
        const y = row * cellSize;
        return (
          <g key={idx} transform={`translate(${x} ${y})`}>
            <Motif shape={cell.shape} size={cellSize} rotate={cell.rotate ?? 0} />
          </g>
        );
      })}
    </svg>
  );
}

function Motif({ shape, size, rotate }: { shape: Shape; size: number; rotate: number }) {
  const color = 'rgb(var(--brand-blue))';
  const c = size / 2;
  const r = size * 0.35;
  const stroke = size * 0.16;
  const transform = rotate ? `rotate(${rotate} ${c} ${c})` : undefined;

  switch (shape) {
    case 'circle':
      return <circle cx={c} cy={c} r={r} style={{ fill: color }} transform={transform} />;
    case 'square': {
      const side = size * 0.6;
      const off = (size - side) / 2;
      return (
        <rect
          x={off}
          y={off}
          width={side}
          height={side}
          style={{ fill: color }}
          transform={transform}
        />
      );
    }
    case 'plus':
      return (
        <g transform={transform} style={{ fill: color }}>
          <rect x={c - stroke / 2} y={size * 0.2} width={stroke} height={size * 0.6} />
          <rect x={size * 0.2} y={c - stroke / 2} width={size * 0.6} height={stroke} />
        </g>
      );
    case 'x':
      return (
        <g
          transform={transform}
          style={{ stroke: color }}
          strokeWidth={stroke}
          strokeLinecap="round"
        >
          <line x1={size * 0.22} y1={size * 0.22} x2={size * 0.78} y2={size * 0.78} />
          <line x1={size * 0.78} y1={size * 0.22} x2={size * 0.22} y2={size * 0.78} />
        </g>
      );
    case 'triangle': {
      const points = `${c},${size * 0.2} ${size * 0.82},${size * 0.78} ${size * 0.18},${size * 0.78}`;
      return <polygon points={points} style={{ fill: color }} transform={transform} />;
    }
    case 'half':
      return (
        <path
          d={`M ${size * 0.15} ${c} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.85} ${c} Z`}
          style={{ fill: color }}
          transform={transform}
        />
      );
    case 'quarter':
      return (
        <path
          d={`M ${size * 0.18} ${size * 0.18} L ${size * 0.82} ${size * 0.18} A ${size * 0.64} ${size * 0.64} 0 0 1 ${size * 0.18} ${size * 0.82} Z`}
          style={{ fill: color }}
          transform={transform}
        />
      );
    case 'flower': {
      const r2 = size * 0.32;
      return (
        <g style={{ fill: color }} transform={transform}>
          <path d={`M ${c} ${c} m -${r2} 0 a ${r2} ${r2} 0 0 1 ${r2} -${r2} L ${c} ${c} Z`} />
          <path d={`M ${c} ${c} m 0 -${r2} a ${r2} ${r2} 0 0 1 ${r2} ${r2} L ${c} ${c} Z`} />
          <path d={`M ${c} ${c} m ${r2} 0 a ${r2} ${r2} 0 0 1 -${r2} ${r2} L ${c} ${c} Z`} />
          <path d={`M ${c} ${c} m 0 ${r2} a ${r2} ${r2} 0 0 1 -${r2} -${r2} L ${c} ${c} Z`} />
        </g>
      );
    }
  }
}
