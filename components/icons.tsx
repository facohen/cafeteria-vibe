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
const DARK_COFFEE = "#2e1a0e";
const MUG_BLACK = "#33302c";
const CHOCO = "#4a2a17";
const DULCE = "#b5742d";
const ICE = "#e3f4ff";
const WATER = "#cfeaff";
const LEMON = "#ffe14d";
const LEMON_LIGHT = "#fff6b0";
const BERRY = "#5b5fc7";
const PINK = "#ffd6e0";

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
  // Taza alta negra sin plato, café negro hasta el borde y tres volutas.
  americano: (
    <>
      <Steam xs={[38, 47, 56]} y={26} />
      <path d="M62 40h5a9 9 0 0 1 0 18h-5" fill="none" />
      <path d="M30 32v38a8 8 0 0 0 8 8h16a8 8 0 0 0 8-8V32z" fill={MUG_BLACK} />
      <path d="M34 42v22" fill="none" stroke={WHITE} strokeWidth={2.4} opacity={0.35} />
      <path d="M31.5 50h29" fill="none" stroke={GREEN} strokeWidth={4} />
      <ellipse cx={46} cy={32} rx={16} ry={4} fill={DARK_COFFEE} stroke={INK} />
      <ellipse cx={46} cy={32} rx={11} ry={2.2} fill="none" stroke={CREMA} strokeWidth={1.6} />
    </>
  ),
  // Jarrito de vidrio: chocolate abajo, café arriba y copete de crema con chocolate.
  mocha: (
    <>
      <path d="M64 46h4a7 7 0 0 1 0 14h-5" fill="none" />
      <path d="M32.2 58L34 78h28l1.8-20z" fill={CHOCO} stroke="none" />
      <path d="M31 44L32.2 58h31.6L65 44z" fill={CREMA} stroke="none" />
      <path d="M32.2 58h31.6" fill="none" strokeWidth={2} />
      <path d="M30 36L34 78h28l4-42z" fill="none" />
      <path d="M27 38C25 28 34 23 40 27C42 17 56 17 58 27C64 23 71 29 69 38z" fill={FOAM} />
      <path d="M35 33l5-3l5 3l5-3l5 3l5-3" fill="none" stroke={CHOCO} strokeWidth={2.4} />
      <path d="M42 50v6" fill="none" stroke={WHITE} strokeWidth={2.4} opacity={0.5} />
    </>
  ),
  // Vaso alto de café helado con cubos de hielo y sorbete recto.
  frio: (
    <>
      <path d="M31.9 36L36 80h24l4.1-44z" fill="#a8703f" stroke="none" />
      <path d="M56 58V8" fill="none" stroke={GREEN} strokeWidth={5} />
      <path d="M56 58V8" fill="none" strokeWidth={1.4} opacity={0.6} />
      <g fill={ICE} strokeWidth={2} opacity={0.95}>
        <rect x={36} y={38} width={12} height={12} rx={2.5} transform="rotate(-12 42 44)" />
        <rect x={46} y={46} width={12} height={12} rx={2.5} transform="rotate(10 52 52)" />
        <rect x={38} y={56} width={11} height={11} rx={2.5} transform="rotate(-6 43.5 61.5)" />
      </g>
      <path d="M31 26L36 80h24l5-54z" fill="none" />
      <path d="M31 26h34" fill="none" strokeWidth={2} />
      <g fill={WHITE} stroke="none" opacity={0.85}>
        <circle cx={63} cy={50} r={1.6} />
        <circle cx={61.5} cy={62} r={1.3} />
        <circle cx={33.5} cy={48} r={1.3} />
      </g>
    </>
  ),
  // Taza ancha de chocolate caliente con malvaviscos.
  chocolate: (
    <>
      <Steam xs={[40, 54]} y={30} />
      <path d="M70 50h3a8 8 0 0 1 0 16h-4" fill="none" />
      <path d="M24 46v14a16 16 0 0 0 16 16h16a16 16 0 0 0 16-16V46z" fill={WHITE} />
      <path d="M26 62h44" fill="none" stroke={GREEN} strokeWidth={4} />
      <ellipse cx={48} cy={46} rx={24} ry={5} fill={CHOCO} />
      <g strokeWidth={2}>
        <rect x={33} y={37} width={10} height={9} rx={2.5} fill={PINK} transform="rotate(-10 38 41.5)" />
        <rect x={44} y={35} width={10} height={9} rx={2.5} fill={WHITE} transform="rotate(8 49 39.5)" />
        <rect x={54} y={38} width={9} height={8} rx={2.5} fill={PINK} transform="rotate(14 58.5 42)" />
      </g>
    </>
  ),
  // Vaso recto de limonada con hielo, rodaja de limón y hojas de menta.
  limonada: (
    <>
      <path d="M33.5 38v38a4 4 0 0 0 4 4h21a4 4 0 0 0 4-4V38z" fill={LEMON_LIGHT} stroke="none" />
      <g fill={WHITE} strokeWidth={1.8} opacity={0.9}>
        <rect x={38} y={44} width={10} height={10} rx={2} transform="rotate(-10 43 49)" />
        <rect x={48} y={52} width={10} height={10} rx={2} transform="rotate(12 53 57)" />
      </g>
      <path d="M33 28v48a6 6 0 0 0 6 6h18a6 6 0 0 0 6-6V28z" fill="none" />
      <path d="M33.5 38h29" fill="none" strokeWidth={2} />
      <path d="M58 30C58 20 66 16 74 18C74 26 68 32 58 30z" fill={GREEN} />
      <path d="M58 30Q65 25 71 20" fill="none" strokeWidth={1.6} />
      <circle cx={32} cy={30} r={10} fill={LEMON} />
      <circle cx={32} cy={30} r={6.5} fill={LEMON_LIGHT} strokeWidth={1.8} />
      <path d="M32 23.5v13M25.5 30h13M27.4 25.4l9.2 9.2M36.6 25.4l-9.2 9.2" fill="none" strokeWidth={1.2} />
    </>
  ),
  // Botella de agua con tapa verde y etiqueta con una gota.
  agua: (
    <>
      <rect x={41} y={10} width={14} height={8} rx={2} fill={GREEN} />
      <path d="M42 18v6q-6 4-6 12v38a6 6 0 0 0 6 6h12a6 6 0 0 0 6-6V36q0-8-6-12v-6z" fill={WATER} />
      <rect x={36} y={46} width={24} height={18} fill={WHITE} strokeWidth={2.4} />
      <path d="M48 49q-5 6-5 9a5 5 0 0 0 10 0q0-3-5-9z" fill={WATER} strokeWidth={2} />
      <path d="M41 32v8M41 70v4" fill="none" stroke={WHITE} strokeWidth={2.6} />
    </>
  ),
  // Alfajor de maicena: dos tapitas, dulce de leche al medio y coco rallado.
  alfajor: (
    <>
      <ellipse cx={48} cy={74} rx={32} ry={5} fill={WHITE} />
      <path d="M20 58v6a28 8 0 0 0 56 0v-6z" fill={PASTRY_LIGHT} />
      <path d="M21 52v6a27 7.5 0 0 0 54 0v-6z" fill={DULCE} />
      <g fill={FOAM} stroke="none">
        <circle cx={26} cy={58} r={1.6} />
        <circle cx={40} cy={62.5} r={1.6} />
        <circle cx={56} cy={62.5} r={1.6} />
        <circle cx={70} cy={58} r={1.6} />
      </g>
      <path d="M20 44v8a28 8 0 0 0 56 0v-8z" fill="#f8e3b8" />
      <ellipse cx={48} cy={44} rx={28} ry={8} fill="#fbeccc" />
      <g fill={WHITE} stroke="none">
        <circle cx={38} cy={42} r={1.5} />
        <circle cx={48} cy={46} r={1.5} />
        <circle cx={58} cy={42} r={1.5} />
        <circle cx={46} cy={40} r={1.2} />
      </g>
    </>
  ),
  // Cookie redonda con chips de chocolate y un mordisco.
  cookie: (
    <>
      <path d="M57.7 25.9A26 26 0 1 0 72.1 40.3A6 6 0 0 1 65.6 34.6A6 6 0 0 1 57.7 25.9z" fill={PASTRY_LIGHT} />
      <g fill={CHOCO} stroke="none">
        <circle cx={38} cy={40} r={3.2} />
        <circle cx={52} cy={44} r={2.8} />
        <circle cx={34} cy={56} r={2.8} />
        <circle cx={48} cy={62} r={3.2} />
        <circle cx={62} cy={56} r={2.8} />
        <circle cx={44} cy={30} r={2.4} />
      </g>
      <path d="M26 48q1-6 4-9M58 70q5-2 8-6" fill="none" stroke={PASTRY} strokeWidth={2.4} />
    </>
  ),
  // Muffin con pirotín verde a rayas y copete con arándanos.
  muffin: (
    <>
      <path d="M27 52l6 26h30l6-26z" fill={GREEN} />
      <path d="M38 54l2 23M48 54v23M58 54l-2 23" fill="none" strokeWidth={2} />
      <path d="M22 50c0-16 11-24 26-24s26 8 26 24c0 3-2 5-5 5H27c-3 0-5-2-5-5z" fill={PASTRY} />
      <path d="M32 36Q40 30 50 31" fill="none" stroke={PASTRY_LIGHT} strokeWidth={3} />
      <g fill={BERRY} strokeWidth={1.8}>
        <circle cx={36} cy={44} r={3.4} />
        <circle cx={52} cy={38} r={3.4} />
        <circle cx={60} cy={47} r={3.4} />
        <circle cx={46} cy={49} r={3} />
      </g>
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
