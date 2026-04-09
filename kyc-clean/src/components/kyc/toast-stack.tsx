"use client";

type ToastMessage = {
  id: number;
  text: string;
  type: "success" | "error";
};

export function ToastStack({ messages }: { messages: ToastMessage[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}

export type { ToastMessage };
