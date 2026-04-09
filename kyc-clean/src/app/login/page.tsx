"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SignInPage, Testimonial } from "@/components/ui/sign-in";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&q=80",
    name: "Aarav Mehta",
    handle: "@operations",
    text: "Simple, fast, and easy to review.",
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&q=80",
    name: "Priya Sharma",
    handle: "@compliance",
    text: "The review flow stays clear even with multiple uploads.",
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&q=80",
    name: "Daniel Cruz",
    handle: "@review-team",
    text: "Feels polished and dependable on desktop and mobile.",
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
      router.replace("/admin");
      return;
    }

    router.replace("/meteors");
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
