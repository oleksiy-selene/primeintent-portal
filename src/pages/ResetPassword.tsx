import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Lock, Eye, EyeOff, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login", { replace: true });
      } else {
        setSessionReady(true);
      }
    });
  }, [navigate]);

  const validate = (): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionReady) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 flex justify-end">
        <div className="w-1/2 h-full bg-gradient-to-bl from-indigo-100/50 via-slate-50/20 to-transparent" />
        <div className="absolute -top-64 -right-64 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-violet-400/10 rounded-full blur-3xl translate-y-1/2" />
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
        <div className="w-full max-w-[420px] mb-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Reset your password
          </h1>
          <p className="text-slate-500 text-sm text-center">
            Choose a new password for your account.
          </p>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-slate-900">Password updated!</p>
              <p className="text-sm text-slate-500">Taking you to the dashboard…</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  New password
                </Label>
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
                    placeholder="Min. 8 characters"
                    className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-medium text-slate-700">
                  Confirm password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
