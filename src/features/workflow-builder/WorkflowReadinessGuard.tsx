import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  readiness: 'ACTIVE' | 'INCOMPLETE' | 'DRAFT';
  children: React.ReactNode;
}

export function WorkflowReadinessGuard({ readiness, children }: Props) {
  if (readiness === 'ACTIVE') {
    return <>{children}</>;
  }

  return (
    <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950/30">
      <Alert variant="default" className="border-amber-200 bg-transparent text-amber-800 dark:text-amber-300">
        <AlertCircle className="h-4 w-4 stroke-amber-600 dark:stroke-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300 font-bold">Workflow Not Ready</AlertTitle>
        <AlertDescription>
          This project's workflow is currently marked as <strong>{readiness}</strong>.
          AI Automation controls and automated transitions are blocked until the workflow reaches ACTIVE status
          (minimum 2 stages and 1 transition).
        </AlertDescription>
      </Alert>
    </div>
  );
}
