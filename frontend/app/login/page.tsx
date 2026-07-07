import { redirect } from 'next/navigation';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  redirect(searchParams?.next || '/');
}
