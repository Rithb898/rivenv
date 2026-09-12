import Auth from '@/components/Auth';
import SignedIn from '@/components/SignedIn';
import { ensureDefaultWorkspace } from '@/lib/ensure-workspace';
import { getSession } from '@/lib/get-session';

const HomePage = async () => {
  const session = await getSession();

  if (session) {
    await ensureDefaultWorkspace(session.user);
  }

  return (
    <>
      {session ? <SignedIn user={session.user} /> : <Auth />}
    </>
  )
}

export default HomePage