import { redirect } from "next/navigation"

/** Backwards-compatible entry point; the patient workspace lives at /patient. */
export default function LegacyAppRedirect() {
  redirect("/patient")
}
