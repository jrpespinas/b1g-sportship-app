import { redirect } from "next/navigation";

/**
 * The app has no page of its own at the root; it opens on whichever surface
 * its most frequent reader needs first.
 *
 * That used to be `/upload`, which greeted every visitor with the admin's
 * weekly file-drop — a task exactly one person performs. Changed 2026-08-16:
 * the dashboard is the surface the pastor and the volunteer heads open, and
 * they outnumber the admin. The admin still reaches Upload from the top bar,
 * one click from here, which is the right cost for the rarer job.
 *
 * A redirect rather than rendering the dashboard here, so the page keeps one
 * canonical URL: `/dashboard` is what the nav marks active, what a bookmark
 * saves, and what someone pastes into a message.
 */
export default function Home() {
  redirect("/dashboard");
}
