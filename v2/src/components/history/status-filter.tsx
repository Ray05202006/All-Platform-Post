"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { POST_STATUS_FILTERS, getPostStatusMeta } from "@/lib/post-status";

interface StatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function StatusFilter({ value, onValueChange }: StatusFilterProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
        {POST_STATUS_FILTERS.map((status) => (
          <TabsTrigger key={status} value={status} className="text-xs capitalize">
            {status === "all" ? "All" : getPostStatusMeta(status).label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
