// ÍCONOS PROPIOS — Vibe Coffee. Un SVG dibujado a mano por cada clave de ICON_KEYS.
// Contrato: docs/TECNICO.md §Diseño. Lo usan el kiosco y la cocina.
// Estilo: plano, trazo redondeado #1f2a1f, fondo circular verde suave, tonos café/crema.
import type { ReactNode } from "react";
import type { IconKey } from "@/lib/contracts";

const INK = "#1f2a1f";
const GREEN = "#7ed957";
const GREEN_SOFT = "#eefbe8";
const COFFEE = "#6b4226";
const CREMA = "#c98e5a";
const MILK = "#f6ead8";
const FOAM = "#fffaf0";
const WHITE = "#ffffff";
const PASTRY = "#e8a94f";
const PASTRY_LIGHT = "#f3c77a";
const ORANGE = "#f7a531";

/** Vapor: dos o tres volutas sobre una bebida caliente. */
function Steam({ xs, y = 30 }: { xs: number[]; y?: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.55}>
      {xs.map((x) => (
        <path key={x} d={`M${x} ${y} q-4 -5 0 -10 q4 -5 0 -10`} />
      ))}
    </g>
  );
}

const ICONS: Record<IconKey, ReactNode> = {
  // Taza chiquita con plato, café oscuro y vapor.
  espresso: (
    <>
      <Steam xs={[42, 52]} y={38} />
      <ellipse cx={47} cy={73} rx={28} ry={6} fill={WHITE} />
      <path d="M64 50h4a5 5 0 0 1 0 10h-5" fill="none" />
      <path d="M29 46h36v8a14 14 0 0 1-14 14h-8a14 14 0 0 1-14-14z" fill={WHITE} />
      <ellipse cx={47} cy={46} rx={18} ry={3.5} fill={COFFEE} />
    </>
  ),
  // Vaso bajo: café abajo y una capa fina de leche arriba.
  cortado: (
    <>
      <ellipse cx={48} cy={75} rx={24} ry={5} fill={WHITE} />
      <path d="M32.6 46L36 72h24l3.4-26z" fill={COFFEE} stroke="none" />
      <path d="M31.8 40L32.6 46h30.8l0.8-6z" fill={MILK} stroke="none" />
      <path d="M32.6 46h30.8" fill="none" strokeWidth={2} />
      <path d="M31 34L36 72h24l5-38z" fill="none" />
      <path d="M39 52v14" fill="none" stroke={WHITE} strokeWidth={2.4} opacity={0.5} />
    </>
  ),
  // Vaso alto en capas: leche, espresso y espuma.
  latte: (
    <>
      <path d="M34.9 58L36 80h24l1.1-22z" fill={MILK} stroke="none" />
      <path d="M34 42L34.9 58h26.2L62 42z" fill={CREMA} stroke="none" />
      <path d="M33.3 28L34 42h28l0.7-14z" fill={FOAM} stroke="none" />
      <path d="M34 42h28M34.9 58h26.2" fill="none" strokeWidth={2} />
      <path d="M33 20L36 80h24l3-60z" fill="none" />
      <circle cx={44} cy={34} r={1.8} fill={CREMA} stroke="none" />
      <circle cx={52} cy={32} r={1.8} fill={CREMA} stroke="none" />
    </>
  ),
  // Taza ancha con montaña de espuma y cacao.
  cappuccino: (
    <>
      <ellipse cx={46} cy={76} rx={32} ry={6} fill={WHITE} />
      <path d="M70 52h4a6 6 0 0 1 0 12h-6" fill="none" />
      <path d="M22 48h48v6a18 18 0 0 1-18 18H40a18 18 0 0 1-18-18z" fill={WHITE} />
      <path d="M22 48C22 40 28 35 34 38C36 29 50 27 54 35C62 32 70 40 70 48z" fill={FOAM} />
      <g fill={COFFEE} stroke="none">
        <circle cx={38} cy={42} r={1.7} />
        <circle cx={47} cy={38} r={1.7} />
        <circle cx={56} cy={42} r={1.7} />
        <circle cx={47} cy={44} r={1.7} />
      </g>
    </>
  ),
  // Taza con saquito de té colgando por el borde.
  te: (
    <>
      <Steam xs={[48, 58]} y={30} />
      <path d="M70 44h3a8 8 0 0 1 0 16h-3" fill="none" />
      <path d="M34 36v28a10 10 0 0 0 10 10h16a10 10 0 0 0 10-10V36z" fill={WHITE} />
      <path d="M36 60h32" fill="none" stroke={GREEN} strokeWidth={4} />
      <ellipse cx={52} cy={36} rx={18} ry={4} fill={CREMA} />
      <path d="M46 36Q40 22 24 46" fill="none" strokeWidth={2.2} />
      <rect x={17} y={45} width={14} height={14} rx={2.5} fill={GREEN} />
      <path d="M21 55q3-7 6-6q-1 6-6 6z" fill={GREEN_SOFT} strokeWidth={1.6} />
    </>
  ),
  // Vaso alto de jugo con pajita y rodaja de naranja.
  jugo: (
    <>
      <path d="M31.1 36L36 80h24l4.9-44z" fill={ORANGE} stroke="none" />
      <g fill={FOAM} stroke="none" opacity={0.8}>
        <circle cx={42} cy={50} r={2} />
        <circle cx={52} cy={62} r={2.4} />
        <circle cx={46} cy={70} r={1.6} />
      </g>
      <path d="M52 52L62 14h8" fill="none" stroke={GREEN} strokeWidth={5} />
      <path d="M52 52L62 14h8" fill="none" strokeWidth={1.4} opacity={0.6} />
      <path d="M30 26L36 80h24l6-54z" fill="none" />
      <circle cx={30} cy={28} r={9} fill={ORANGE} />
      <circle cx={30} cy={28} r={5.5} fill="#ffd27a" strokeWidth={1.8} />
      <path d="M30 22.5v11M24.5 28h11" fill="none" strokeWidth={1.4} />
    </>
  ),
  // Medialuna dorada sobre un platito.
  medialuna: (
    <>
      <ellipse cx={48} cy={69} rx={28} ry={4} fill={WHITE} />
      <path d="M14 62C18 34 78 34 82 62C70 52 26 52 14 62z" fill={PASTRY} />
      <path d="M30 43Q48 35 66 43" fill="none" stroke={PASTRY_LIGHT} strokeWidth={3} />
      <path d="M48 42q3 6 0 12M31 47q3 5 0 10M65 47q-3 5 0 10" fill="none" strokeWidth={2.4} />
    </>
  ),
  // Tostado de jamón y queso con marcas de plancha.
  tostado: (
    <>
      <rect x={16} y={60} width={64} height={12} rx={5} fill={PASTRY} />
      <rect x={14} y={54} width={68} height={7} rx={3.5} fill="#f4a7a3" />
      <path d="M16 50h64v4l-6 6l-6-6H38l-5 7l-5-7H16z" fill="#ffd34d" />
      <rect x={16} y={34} width={64} height={17} rx={7} fill={PASTRY_LIGHT} />
      <path d="M32 38l-6 10M46 38l-6 10M60 38l-6 10M74 38l-6 10" fill="none" stroke="#b5742d" strokeWidth={3} />
    </>
  ),
  // Budín con glaseado chorreado y pasas.
  budin: (
    <>
      <ellipse cx={48} cy={73} rx={34} ry={5} fill={WHITE} />
      <path d="M18 70V48C18 38 30 34 48 34C66 34 78 38 78 48V70z" fill="#d9944a" />
      <path
        d="M18 50C18 38 30 34 48 34C66 34 78 38 78 50Q74 56 70 50Q66 60 62 50Q56 54 50 50Q46 58 42 50Q36 54 32 50Q28 58 24 50Q21 54 18 50z"
        fill={FOAM}
      />
      <g fill={COFFEE} stroke="none">
        <circle cx={30} cy={63} r={2.2} />
        <circle cx={46} cy={65} r={2.2} />
        <circle cx={62} cy={61} r={2.2} />
        <circle cx={54} cy={67} r={2} />
      </g>
      <path d="M36 41l3-2M50 39l3 1M62 43l3-2M44 45l2 2" fill="none" stroke={GREEN} strokeWidth={2.6} />
    </>
  ),
  // Vaso take away con tapa y faja verde.
  generico: (
    <>
      <path d="M30 32L36 78h24l6-46z" fill={WHITE} />
      <path d="M31.8 46L33.9 62h28.2l2.1-16z" fill={GREEN} />
      <circle cx={48} cy={54} r={3.5} fill={WHITE} strokeWidth={2} />
      <rect x={26} y={24} width={44} height={9} rx={4} fill={WHITE} />
      <path d="M33 24Q35 18 41 18h14q6 0 8 6" fill={WHITE} />
    </>
  ),
};

export function ProductIcon({ icon, size = 72 }: { icon: IconKey; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
      stroke={INK}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx={48} cy={48} r={46} fill={GREEN_SOFT} stroke="none" />
      {ICONS[icon] ?? ICONS.generico}
    </svg>
  );
}
