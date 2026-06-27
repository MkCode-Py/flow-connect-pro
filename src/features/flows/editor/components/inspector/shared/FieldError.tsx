import { AlertCircle } from "lucide-react";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}
