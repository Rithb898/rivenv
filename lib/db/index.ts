import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import { relations } from "./schema";

export const db = drizzle(env.DB, { relations });
