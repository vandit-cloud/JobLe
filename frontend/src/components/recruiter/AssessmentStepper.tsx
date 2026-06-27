import { cn } from "../../lib/utils";

export function AssessmentStepper({
  steps,
  currentStep,
  onStepChange,
}: {
  steps: string[];
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <div className="glass-panel p-5">
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <button
            key={step}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
              currentStep === index
                ? "border-ink bg-ink text-white"
                : index < currentStep
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600",
            )}
            onClick={() => onStepChange(index)}
            type="button"
          >
            <span className="block text-xs uppercase tracking-[0.2em] opacity-75">Step {index + 1}</span>
            <span className="mt-1 block">{step}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

