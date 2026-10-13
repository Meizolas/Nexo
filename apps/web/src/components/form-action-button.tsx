"use client";

import { LoaderCircle } from "lucide-react";
import { type ButtonHTMLAttributes, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

interface FormActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pendingLabel?: string;
  confirmMessage?: string;
}

export function FormActionButton({
  children,
  className,
  disabled,
  pendingLabel = "Salvando…",
  confirmMessage,
  onClick,
  ...props
}: FormActionButtonProps) {
  const { pending } = useFormStatus();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      {...props}
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={handleClick}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
