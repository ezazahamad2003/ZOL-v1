import { redirect } from 'next/navigation'

export default function LegacyCallDetailRedirect() {
  redirect(`/dashboard/calls`)
}
