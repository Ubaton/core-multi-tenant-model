import { redirect } from 'next/navigation';

export default function SuperAdminSignInPage() {
  redirect('/login?role=super-admin');
}
