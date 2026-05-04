import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { FaGoogle, FaApple, FaFacebook, FaMicrosoft } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const OAUTH_PROVIDERS = [
  { id: "google" as const, label: "Google", Icon: FaGoogle },
  { id: "apple" as const, label: "Apple", Icon: FaApple },
  { id: "facebook" as const, label: "Facebook", Icon: FaFacebook },
  { id: "azure" as const, label: "Microsoft", Icon: FaMicrosoft },
];

export default function Login() {
  const { signIn, session, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      navigate("/", { replace: true });
    }
  }, [loading, session, navigate]);

  const onOAuth = async (
    provider: "google" | "apple" | "facebook" | "azure",
  ) => {
    setError(null);
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (e) setError(e.message);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSubmitting(true);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (e) throw e;
      setResetSent(true);
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : "Failed to send reset email. Try again.",
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 flex justify-end">
        <div className="w-1/2 h-full bg-gradient-to-bl from-indigo-100/50 via-slate-50/20 to-transparent"></div>
        <div className="absolute -top-64 -right-64 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-violet-400/10 rounded-full blur-3xl translate-y-1/2"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
        <div className="w-full max-w-[420px] mb-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {forgotMode ? "Reset your password" : "Sign in to InsureMatch"}
          </h1>
          <p className="text-slate-500 text-sm">
            {forgotMode
              ? "Enter your email and we'll send you a reset link."
              : "Admin portal access"}
          </p>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          {forgotMode ? (
            resetSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="font-semibold text-slate-900">Check your inbox</p>
                <p className="text-sm text-slate-500">
                  A password reset link has been sent to{" "}
                  <span className="font-medium text-slate-700">
                    {resetEmail}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setResetSent(false);
                    setResetEmail("");
                  }}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onResetSubmit}>
                <div className="space-y-2">
                  <Label
                    htmlFor="reset-email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email address
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@insurematch.io"
                      className="pl-10 h-11 border-slate-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                    {resetError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20"
                >
                  {resetSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setResetError(null);
                  }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 pt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </form>
            )
          ) : (
            <>
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email address
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@insurematch.io"
                      className="pl-10 h-11 border-slate-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setError(null);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative mt-6 mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <TooltipProvider>
                <div className="grid grid-cols-2 gap-2">
                  {OAUTH_PROVIDERS.map(({ id, label, Icon }) =>
                    id === "google" ? (
                      <Button
                        key={id}
                        type="button"
                        variant="outline"
                        onClick={() => void onOAuth(id)}
                        className="h-10 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    ) : (
                      <Tooltip key={id}>
                        <TooltipTrigger asChild>
                          <span className="w-full cursor-not-allowed">
                            <Button
                              type="button"
                              variant="outline"
                              disabled
                              className="h-10 gap-2 border-slate-200 text-slate-400 opacity-70 pointer-events-none w-full"
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{label}</span>
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Not implemented yet</TooltipContent>
                      </Tooltip>
                    ),
                  )}
                </div>
              </TooltipProvider>
            </>
          )}
        </div>

        {!forgotMode && (
          <div className="mt-8 text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <span className="font-medium text-slate-700">
              Contact your admin.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
