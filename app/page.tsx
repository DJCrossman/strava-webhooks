import { auth } from "@/auth";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  // Middleware guarantees a session here, but guard anyway for type-safety.
  const session = await auth();
  const user = session?.user ?? {};
  return (
    <Dashboard
      user={{ name: user.name, image: user.image, athleteId: user.athleteId }}
    />
  );
}
