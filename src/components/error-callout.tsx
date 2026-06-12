import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorCalloutProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorCallout({ title, message, action, className }: ErrorCalloutProps) {
  return (
    <Alert variant="destructive" className={cn(className)}>
      <AlertCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        {action}
      </AlertDescription>
    </Alert>
  );
}
