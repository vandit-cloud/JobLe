import type { Interview } from "../../types";
import { formatDateTime } from "../../lib/utils";

export function InterviewCalendar({ interviews }: { interviews: Interview[] }) {
  const grouped = interviews.reduce<Record<string, Interview[]>>((accumulator, interview) => {
    const date = new Date(interview.startDateTime).toDateString();
    accumulator[date] = [...(accumulator[date] || []), interview];
    return accumulator;
  }, {});

  return (
    <div className="glass-panel p-5">
      <h3 className="text-lg font-bold text-slate-800">Calendar view</h3>
      <div className="mt-5 space-y-4">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-800">{date}</p>
            <div className="mt-3 space-y-3">
              {items.map((interview) => (
                <div key={interview._id} className="rounded-2xl bg-white px-4 py-3">
                  <p className="font-semibold text-slate-800">{interview.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDateTime(interview.startDateTime)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

