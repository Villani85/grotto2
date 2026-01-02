import { redirect } from "next/navigation"

// Redirect vecchia pagina admin nuovo corso a /admin/courses/new
export default function AdminNuovoCorsoPage() {
  redirect("/admin/courses/new")
}




