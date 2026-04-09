"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SignInPage, Testimonial } from "@/components/ui/sign-in";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBvqJubiz-ncqi482ClA66jbWhGF97e_66_w&s",
    name: "Leon S Kennedy",
    handle: "@Mr.Kennedy",
    text: "exactly what I needed.",
  },
  {
    avatarSrc: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvCgk_PbiB_sxNWRJkCkwrvvO7v2OyPi22Rg&s",
    name: "Walter White",
    handle: "@methMaster67",
    text: "Must have been the wind!!",
  },
  {
    avatarSrc: "https://i.redd.it/abbj8bab42x81.jpg",
    name: "Kanye West",
    handle: "@goat",
    text: "One good girl is worth a thousand bitches.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const loginAsAdmin = formData.get("loginAsAdmin") === "on";

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }

    if (loginAsAdmin) {
      router.push("/admin");
      return;
    }

    router.push("/meteors");
  };

  const handleGoogleSignIn = async (loginAsAdmin: boolean) => {
    const nextPath = loginAsAdmin ? "/admin" : "/meteors";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    });
  };

  const handleResetPassword = async () => {
    const email = prompt("Enter your email to reset password:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) alert(error.message);
    else alert("Check your email for a reset link.");
  };

  const handleCreateAccount = async () => {
    const email = prompt("Email:");
    const password = prompt("Password (min 6 chars):");
    if (!email || !password) return;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Account created! Check your email to confirm.");
  };

  return (
    <SignInPage
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={sampleTestimonials}
      showAdminLoginToggle
      onSignIn={handleSignIn}
      onGoogleSignIn={handleGoogleSignIn}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleCreateAccount}
    />
  );
}
