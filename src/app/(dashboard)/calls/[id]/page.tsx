import { redirect } from 'next/navigation'

export default function LegacyCallDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard/calls`)
}
