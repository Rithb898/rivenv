import Auth from '@/components/Auth';
import { getSession } from '@/lib/get-session';

const HomePage = async () => {
  const session = await getSession();
  return (
    <>
      {session ? <>login</> : <Auth />  }
    </>
  )
}

export default HomePage