import { redirect } from 'next/navigation'

export default function LegacyCallsRedirect() {
  redirect('/dashboard/calls')
}
