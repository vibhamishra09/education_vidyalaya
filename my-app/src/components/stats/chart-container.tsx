"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
  gradient?: string;
}

export function ChartContainer({ 
  title, 
  description, 
  children, 
  action, 
  className,
  icon,
  gradient = "from-primary to-primary/80"
}: ChartContainerProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}/10 border border-${gradient.split(' ')[0].replace('from-', '')}/20`}>
                {icon}
              </div>
            )}
            <div>
              <CardTitle className={`text-lg font-bold ${icon ? '' : `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}`}>
                {title}
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}
