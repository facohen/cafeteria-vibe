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
const CHOCO = "#4a2c1a";
const ICE = "#dff3fb";
const WATER = "#bfe6f5";
const LEMON = "#ffe066";
const BERRY = "#e8485c";
const PINK = "#f6a5b4";

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
  // Tazón alto con café negro y vapor.
  americano: (
    <>
      <Steam xs={[40, 50, 60]} y={28} />
      <path d="M68 44h4a8 8 0 0 1 0 16h-5" fill="none" />
      <path d="M30 36v30a10 10 0 0 0 10 10h18a10 10 0 0 0 10-10V36z" fill={WHITE} />
      <ellipse cx={49} cy={36} rx={19} ry={4} fill={COFFEE} />
      <path d="M36 46v18" fill="none" stroke={MILK} strokeWidth={2.4} />
    </>
  ),
  // Taza ancha vista desde arriba con corazón de latte art.
  flat_white: (
    <>
      <path d="M74 44h5a6 6 0 0 1 0 12h-5" fill="none" />
      <ellipse cx={48} cy={50} rx={28} ry={24} fill={WHITE} />
      <ellipse cx={48} cy={50} rx={21} ry={17.5} fill={CREMA} strokeWidth={2.2} />
      <path d="M48 62C38 55 36 48 40 44.5C43.5 41.5 47 43.5 48 46.5C49 43.5 52.5 41.5 56 44.5C60 48 58 55 48 62z" fill={FOAM} strokeWidth={2} />
    </>
  ),
  // Vaso con chocolate, café y crema batida con hilo de chocolate.
  mocha: (
    <>
      <path d="M35.4 62L36 76h24l0.6-14z" fill={CHOCO} stroke="none" />
      <path d="M34.6 44L35.4 62h25.2l0.8-18z" fill={CREMA} stroke="none" />
      <path d="M35.4 62h25.2" fill="none" strokeWidth={2} />
      <path d="M34 30L36 76h24l2-46z" fill="none" />
      <path d="M31 32C30 24 37 21 41 24C43 16 55 16 56 24C61 21 67 26 65 32z" fill={FOAM} />
      <path d="M38 27q5 3 9-1t10 1" fill="none" stroke={CHOCO} strokeWidth={2.4} />
    </>
  ),
  // Vaso de leche caliente con la barrita de chocolate hundiéndose.
  submarino: (
    <>
      <Steam xs={[42, 54]} y={26} />
      <path d="M33.7 34L36 78h24l2.3-44z" fill={MILK} stroke="none" />
      <path d="M33 30L36 78h24l3-48z" fill="none" />
      <g transform="rotate(-14 48 46)">
        <rect x={41} y={26} width={14} height={34} rx={2} fill={CHOCO} />
        <path d="M41 37h14M41 48h14M48 26v34" fill="none" stroke={COFFEE} strokeWidth={1.8} />
      </g>
      <path d="M33.7 34h28.6" fill="none" strokeWidth={2} />
    </>
  ),
  // Vaso con café frío, cubitos de hielo y pajita.
  cafe_helado: (
    <>
      <path d="M53 40L62 12h7" fill="none" stroke={GREEN} strokeWidth={5} />
      <path d="M53 40L62 12h7" fill="none" strokeWidth={1.4} opacity={0.6} />
      <path d="M31.5 34L36 80h24l4.5-46z" fill={CREMA} stroke="none" />
      <g fill={ICE} strokeWidth={2} opacity={0.95}>
        <rect x={36} y={38} width={11} height={11} rx={2} transform="rotate(-10 41 43)" />
        <rect x={49} y={46} width={11} height={11} rx={2} transform="rotate(12 54 51)" />
        <rect x={39} y={56} width={10} height={10} rx={2} transform="rotate(6 44 61)" />
      </g>
      <path d="M30 24L36 80h24l6-56z" fill="none" />
    </>
  ),
  // Taza de té con leche, rama de canela y anís estrellado.
  chai: (
    <>
      <Steam xs={[44, 54]} y={30} />
      <path d="M68 46h3a8 8 0 0 1 0 16h-3" fill="none" />
      <path d="M30 38v26a10 10 0 0 0 10 10h18a10 10 0 0 0 10-10V38z" fill={WHITE} />
      <ellipse cx={49} cy={38} rx={19} ry={4} fill={PASTRY_LIGHT} />
      <rect x={58} y={16} width={7} height={30} rx={3} fill="#b5742d" transform="rotate(22 61 31)" />
      <path d="M22 56l2.4 4l4.8 0.8l-3.6 3.2l0.8 4.8l-4.4-2.4l-4.4 2.4l0.8-4.8l-3.6-3.2l4.8-0.8z" fill={COFFEE} strokeWidth={2} />
    </>
  ),
  // Vaso de limonada con rodaja de limón y hojitas de menta.
  limonada: (
    <>
      <path d="M31.3 38L35 78h26l3.7-40z" fill={LEMON} stroke="none" opacity={0.9} />
      <g fill={WHITE} stroke="none" opacity={0.8}>
        <circle cx={42} cy={52} r={2} />
        <circle cx={53} cy={64} r={2.4} />
        <circle cx={46} cy={70} r={1.6} />
      </g>
      <path d="M30 26L35 78h26l5-52z" fill="none" />
      <circle cx={64} cy={28} r={9} fill={LEMON} />
      <circle cx={64} cy={28} r={5.5} fill="#fff3b0" strokeWidth={1.8} />
      <path d="M64 22.5v11M58.5 28h11" fill="none" strokeWidth={1.4} />
      <path d="M38 26q-6-10 4-12q2 8-4 12z" fill={GREEN} strokeWidth={2} />
      <path d="M40 26q8-6 12 2q-8 3-12-2z" fill={GREEN} strokeWidth={2} />
    </>
  ),
  // Vaso de licuado espeso con copete, pajita y frutilla.
  licuado: (
    <>
      <path d="M50 38L58 12h8" fill="none" stroke={GREEN} strokeWidth={5} />
      <path d="M50 38L58 12h8" fill="none" strokeWidth={1.4} opacity={0.6} />
      <path d="M31.3 36L36 80h24l4.7-44z" fill={PINK} stroke="none" />
      <path d="M30 32C30 24 38 22 42 26C46 20 56 20 58 27C63 25 67 28 66 32z" fill={PINK} />
      <path d="M31 32L36 80h24l5-48" fill="none" />
      <g fill={FOAM} stroke="none" opacity={0.8}>
        <circle cx={42} cy={50} r={2} />
        <circle cx={52} cy={62} r={2.4} />
      </g>
      <path d="M22 30c0-8 14-8 14 0c0 8-5 12-7 12s-7-4-7-12z" fill={BERRY} strokeWidth={2.2} />
      <path d="M24 23l5 3l5-3" fill="none" stroke={GREEN} strokeWidth={2.6} />
    </>
  ),
  // Botella de agua con tapa y etiqueta verde.
  agua: (
    <>
      <path d="M38 34Q38 28 42 26V20h12v6q4 2 4 8v38a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z" fill={WATER} />
      <rect x={41} y={13} width={14} height={8} rx={2} fill={GREEN} />
      <rect x={38} y={46} width={20} height={14} fill={WHITE} strokeWidth={2.2} />
      <path d="M43 53h10" fill="none" stroke={GREEN} strokeWidth={3} />
      <path d="M43 66v6" fill="none" stroke={WHITE} strokeWidth={2.6} opacity={0.8} />
    </>
  ),
  // Alfajor de costado: dos tapas, dulce de leche al medio y coco.
  alfajor: (
    <>
      <ellipse cx={48} cy={72} rx={30} ry={4} fill={WHITE} />
      <path d="M18 60q0-6 6-6h48q6 0 6 6v2q0 6-6 6H24q-6 0-6-6z" fill={PASTRY_LIGHT} />
      <rect x={20} y={48} width={56} height={7} rx={3.5} fill={COFFEE} />
      <path d="M18 44q0-8 8-8h44q8 0 8 8v1q0 4-6 4H24q-6 0-6-4z" fill={PASTRY_LIGHT} />
      <g fill={WHITE} stroke="none">
        <circle cx={28} cy={50} r={1.6} />
        <circle cx={40} cy={51} r={1.6} />
        <circle cx={54} cy={50} r={1.6} />
        <circle cx={67} cy={51} r={1.6} />
      </g>
    </>
  ),
  // Cookie redonda con chips de chocolate y una mordida.
  cookie: (
    <>
      <path d="M72 36A27 27 0 1 1 60 24a6 6 0 0 0 6 6a6 6 0 0 0 6 6z" fill={PASTRY} />
      <g fill={CHOCO} stroke="none">
        <circle cx={38} cy={40} r={3.2} />
        <circle cx={52} cy={46} r={3} />
        <circle cx={36} cy={58} r={3} />
        <circle cx={50} cy={64} r={3.4} />
        <circle cx={63} cy={56} r={2.8} />
        <circle cx={47} cy={32} r={2.4} />
      </g>
    </>
  ),
  // Porción de torta en capas con crema y cereza.
  torta: (
    <>
      <ellipse cx={48} cy={74} rx={32} ry={5} fill={WHITE} />
      <path d="M18 70V50L68 36l10 6v28z" fill={COFFEE} />
      <path d="M18 60h60" fill="none" stroke={FOAM} strokeWidth={4} />
      <path d="M18 60h60" fill="none" strokeWidth={1.4} opacity={0.4} />
      <path d="M18 50L68 36l10 6L18 52z" fill={FOAM} />
      <path d="M68 70V42" fill="none" strokeWidth={2} />
      <circle cx={66} cy={31} r={5} fill={BERRY} />
      <path d="M66 26q2-6 7-7" fill="none" strokeWidth={2} />
    </>
  ),
  // Dos tostadas: una con palta y otra con mermelada.
  tostadas: (
    <>
      <ellipse cx={48} cy={74} rx={34} ry={4} fill={WHITE} />
      <g transform="rotate(-6 30 52)">
        <path d="M14 70V42q0-10 10-10h10q10 0 10 10v28z" fill={PASTRY} />
        <path d="M18 64V43q0-6 6-6h10q6 0 6 6v21z" fill="#9ccf6a" strokeWidth={2.2} />
        <g fill="#4f8a2e" stroke="none">
          <circle cx={25} cy={48} r={1.8} />
          <circle cx={33} cy={54} r={1.8} />
          <circle cx={26} cy={58} r={1.6} />
        </g>
      </g>
      <path d="M50 70V40q0-10 10-10h10q10 0 10 10v30z" fill={PASTRY} />
      <path d="M54 64V41q0-6 6-6h10q6 0 6 6v23z" fill={BERRY} strokeWidth={2.2} />
      <path d="M60 44l3-2M68 50l3 1M62 56l2 2" fill="none" stroke={FOAM} strokeWidth={2.4} />
    </>
  ),
  // Bowl de yogur con granola y frutos rojos.
  yogur: (
    <>
      <path d="M18 46h60a30 26 0 0 1-60 0z" fill={WHITE} />
      <ellipse cx={48} cy={46} rx={30} ry={7} fill={FOAM} />
      <g fill={PASTRY} strokeWidth={1.6}>
        <circle cx={34} cy={45} r={3} />
        <circle cx={42} cy={43} r={2.6} />
        <circle cx={38} cy={49} r={2.4} />
      </g>
      <g fill={BERRY} strokeWidth={1.6}>
        <circle cx={56} cy={44} r={3.6} />
        <circle cx={63} cy={47} r={3.2} />
      </g>
      <circle cx={50} cy={48} r={3} fill="#5a4fcf" strokeWidth={1.6} />
      <path d="M30 60q18 8 36 0" fill="none" stroke={GREEN} strokeWidth={3} />
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
