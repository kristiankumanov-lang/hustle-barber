"use client";

/**
 * Client бутон за окончателна отмяна.
 * Прави POST към /api/cancel — НЕ GET, за да не може email scanner-и да
 * автоматично отменят часа просто като отварят линка.
 */

import { useState } from "react";

interface Props {
  token: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; alreadyCancelled?: boolean }
  | { kind: "error"; message: string };

export default function CancelConfirmButton({ token }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleCancel() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data?.ok) {
        setState({ kind: "done", alreadyCancelled: Boolean(data.alreadyCancelled) });
        return;
      }
      setState({ kind: "error", message: data?.message ?? "Грешка при отмяна." });
    } catch {
      setState({ kind: "error", message: "Мрежова грешка. Опитай пак." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="text-center py-3">
        <p className="text-lg font-semibold text-[#F0EBE3] mb-1">
          {state.alreadyCancelled ? "Часът вече беше отменен" : "Часът е отменен"}
        </p>
        <p className="text-sm text-[#A8A39A]">Слотът е освободен.</p>
      </div>
    );
  }

  const isLoading = state.kind === "loading";

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Отменяне..." : "Да, отмени часа"}
      </button>

      {state.kind === "error" && (
        <p className="text-sm text-[#e57373] text-center mt-3">{state.message}</p>
      )}
    </>
  );
}
