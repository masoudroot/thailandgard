/**
 * Prisma Composer root module: the app itself.
 *
 * Provisions the single `web` service (the Next.js site). No database module:
 * Supabase Postgres is external and is wired through environment variables,
 * not through Composer provisioning.
 */
import { module } from "@prisma/composer";
import webService from "./service";

export default module("thailandgard", ({ provision }) => {
  provision(webService);
});
