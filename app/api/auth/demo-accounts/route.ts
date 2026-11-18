import { handle } from "@/lib/session";
import { listDemoAccounts } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export const GET = handle(() => listDemoAccounts());
