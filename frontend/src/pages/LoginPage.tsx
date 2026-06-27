import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormError } from "../components/common/FormError";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const loginSchema = z.object({
  role: z.enum(["recruiter", "candidate"]),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

const SEEDED_CREDENTIALS = {
  recruiter: {
    email: "recruiter@novaedge.ai",
    password: "Recruiter@123",
  },
  candidate: {
    email: "aarav.patel@example.com",
    password: "Candidate@123",
  },
} as const;

const DEFAULT_REDIRECTS = {
  recruiter: "/recruiter/dashboard",
  candidate: "/candidate/dashboard",
} as const;

function getSafeRedirectPath(role: LoginValues["role"], from?: string) {
  if (!from) {
    return DEFAULT_REDIRECTS[role];
  }

  if (role === "candidate") {
    return from.startsWith("/candidate") ? from : DEFAULT_REDIRECTS.candidate;
  }

  return from === "/" || from.startsWith("/recruiter") ? from : DEFAULT_REDIRECTS.recruiter;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: "recruiter",
      email: "",
      password: "",
    },
  });
  const selectedRole = watch("role");

  async function handleQuickAccess(role: LoginValues["role"]) {
    try {
      setLoading(true);
      await login({
        role,
        email: SEEDED_CREDENTIALS[role].email,
        password: SEEDED_CREDENTIALS[role].password,
      });
      showToast(role === "candidate" ? "Opened candidate workspace." : "Opened recruiter workspace.", "success");
      navigate(DEFAULT_REDIRECTS[role], { replace: true });
    } catch (error) {
      showToast("Quick access failed. Please try normal login.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: LoginValues) {
    try {
      setLoading(true);
      await login(values);
      const nextPath = getSafeRedirectPath(values.role, location.state?.from);
      showToast(values.role === "candidate" ? "Candidate login successful." : "Welcome back to the recruiter console.", "success");
      navigate(nextPath, { replace: true });
    } catch (error) {
      showToast("Login failed. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel overflow-hidden p-8 lg:p-10">
          <div className="mb-10 max-w-xl">
            <div className="mb-4 inline-flex rounded-full bg-sunrise/10 px-4 py-2 text-sm font-semibold text-sunrise">
              Recruiter workspace
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink">Hire with clarity, speed, and better context.</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Manage company branding, job posts, applicants, shortlists, and interviews from one AI-assisted recruiter dashboard.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: BriefcaseBusiness, title: "All recruiter workflows", text: "Jobs, applicants, interviews, and analytics in one place." },
              { icon: Mail, title: "Protected recruiter access", text: "JWT-authenticated recruiter routes with ownership checks." },
              { icon: LockKeyhole, title: "AI via backend only", text: "Generated content and analysis stay behind secure APIs." },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl bg-slate-50 p-5">
                <item.icon className="mb-3 h-5 w-5 text-tide" />
                <h2 className="font-semibold text-slate-800">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-8 lg:p-10">
          <h2 className="text-2xl font-bold text-ink">{selectedRole === "candidate" ? "Candidate login" : "Recruiter login"}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Use a local seeded account for development or your own {selectedRole === "candidate" ? "candidate" : "recruiter"} credentials.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="label" htmlFor="role">
                Sign in as
              </label>
              <select className="input" id="role" {...register("role")}>
                <option value="recruiter">Recruiter</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input className="input" id="email" {...register("email")} />
              <FormError message={errors.email?.message} />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input className="input" id="password" type="password" {...register("password")} />
              <FormError message={errors.password?.message} />
            </div>

            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Signing in..." : selectedRole === "candidate" ? "Sign in to candidate dashboard" : "Sign in to recruiter dashboard"}
            </button>
          </form>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button className="btn-secondary w-full" disabled={loading} onClick={() => void handleQuickAccess("recruiter")} type="button">
              Skip to recruiter
            </button>
            <button className="btn-secondary w-full" disabled={loading} onClick={() => void handleQuickAccess("candidate")} type="button">
              Skip to candidate
            </button>
          </div>

          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Seeded recruiter: <span className="font-semibold text-slate-800">recruiter@novaedge.ai</span>
            <br />
            Seeded candidate: <span className="font-semibold text-slate-800">aarav.patel@example.com</span>
            <br />
            Seeded candidate password: <span className="font-semibold text-slate-800">Candidate@123</span>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            Need a new account?{" "}
            <Link className="font-semibold text-tide" to="/register">
              Create one here
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
