import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormError } from "../components/common/FormError";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const registerSchema = z
  .object({
    role: z.enum(["recruiter", "candidate"]),
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
    phone: z.string().optional(),
    position: z.string().optional(),
    companyName: z.string().optional(),
    companyIndustry: z.string().optional(),
    companyWebsite: z.string().optional(),
    professionalTitle: z.string().optional(),
    location: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }

    if (values.role === "recruiter") {
      if (!values.companyName?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter your company name",
          path: ["companyName"],
        });
      }
      if (!values.companyIndustry?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter your company industry",
          path: ["companyIndustry"],
        });
      }
    }
  });

type RegisterValues = z.infer<typeof registerSchema>;

const DEFAULT_REDIRECTS = {
  recruiter: "/recruiter/dashboard",
  candidate: "/candidate/dashboard",
} as const;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "recruiter",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      position: "",
      companyName: "",
      companyIndustry: "",
      companyWebsite: "",
      professionalTitle: "",
      location: "",
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(values: RegisterValues) {
    try {
      setLoading(true);

      if (values.role === "candidate") {
        await registerAccount({
          role: "candidate",
          name: values.name,
          email: values.email,
          password: values.password,
          phone: values.phone || undefined,
          professionalTitle: values.professionalTitle || undefined,
          location: values.location || undefined,
        });
      } else {
        await registerAccount({
          role: "recruiter",
          name: values.name,
          email: values.email,
          password: values.password,
          phone: values.phone || undefined,
          position: values.position || undefined,
          companyName: values.companyName?.trim() || "",
          companyIndustry: values.companyIndustry?.trim() || "",
          companyWebsite: values.companyWebsite || undefined,
        });
      }

      showToast(values.role === "candidate" ? "Candidate account created successfully." : "Recruiter account created successfully.", "success");
      navigate(DEFAULT_REDIRECTS[values.role], { replace: true });
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel overflow-hidden p-8 lg:p-10">
          <div className="mb-10 max-w-xl">
            <div className="mb-4 inline-flex rounded-full bg-tide/10 px-4 py-2 text-sm font-semibold text-tide">
              {selectedRole === "candidate" ? "Candidate onboarding" : "Recruiter onboarding"}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink">
              {selectedRole === "candidate" ? "Create your candidate workspace." : "Launch your hiring workspace."}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {selectedRole === "candidate"
                ? "Build your profile, track applications, complete assessments, and manage interviews from one place."
                : "Create your recruiter account, set up your company workspace, and start managing jobs, applicants, and interviews."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: CircleUserRound, title: "Role-based workspace", text: "Each account opens directly into the right candidate or recruiter experience." },
              { icon: Mail, title: "Secure account access", text: "Signup feeds directly into authenticated API-backed sessions." },
              { icon: LockKeyhole, title: "Backend-owned auth", text: "Passwords stay hashed on the backend and tokens are issued after account creation." },
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
          <h2 className="text-2xl font-bold text-ink">{selectedRole === "candidate" ? "Candidate registration" : "Recruiter registration"}</h2>
          <p className="mt-2 text-sm text-slate-600">Create a new account and continue straight into your workspace.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="label" htmlFor="role">
                Register as
              </label>
              <select className="input" id="role" {...register("role")}>
                <option value="recruiter">Recruiter</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input className="input" id="name" {...register("name")} />
              <FormError message={errors.name?.message} />
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input className="input" id="email" {...register("email")} />
              <FormError message={errors.email?.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <input className="input" id="password" type="password" {...register("password")} />
                <FormError message={errors.password?.message} />
              </div>
              <div>
                <label className="label" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input className="input" id="confirmPassword" type="password" {...register("confirmPassword")} />
                <FormError message={errors.confirmPassword?.message} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input className="input" id="phone" {...register("phone")} />
                <FormError message={errors.phone?.message} />
              </div>
              {selectedRole === "recruiter" ? (
                <div>
                  <label className="label" htmlFor="position">
                    Position
                  </label>
                  <input className="input" id="position" placeholder="Hiring Manager" {...register("position")} />
                  <FormError message={errors.position?.message} />
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="professionalTitle">
                    Professional title
                  </label>
                  <input className="input" id="professionalTitle" placeholder="Frontend Developer" {...register("professionalTitle")} />
                  <FormError message={errors.professionalTitle?.message} />
                </div>
              )}
            </div>

            {selectedRole === "recruiter" ? (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="companyName">
                      Company name
                    </label>
                    <input className="input" id="companyName" {...register("companyName")} />
                    <FormError message={errors.companyName?.message} />
                  </div>
                  <div>
                    <label className="label" htmlFor="companyIndustry">
                      Industry
                    </label>
                    <input className="input" id="companyIndustry" {...register("companyIndustry")} />
                    <FormError message={errors.companyIndustry?.message} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="companyWebsite">
                    Company website
                  </label>
                  <input className="input" id="companyWebsite" placeholder="https://example.com" {...register("companyWebsite")} />
                  <FormError message={errors.companyWebsite?.message} />
                </div>
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="location">
                  Location
                </label>
                <input className="input" id="location" placeholder="Ahmedabad, India" {...register("location")} />
                <FormError message={errors.location?.message} />
              </div>
            )}

            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading
                ? "Creating account..."
                : selectedRole === "candidate"
                  ? "Create candidate account"
                  : "Create recruiter account"}
            </button>
          </form>

          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-semibold text-tide" to="/login">
              Sign in here
            </Link>
            .
          </div>
        </section>
      </div>
    </div>
  );
}
