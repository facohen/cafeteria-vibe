import { handle } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => ({ user: actor }));
