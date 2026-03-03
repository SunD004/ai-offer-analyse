"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceCitationProps {
  sourceIndex: number;
  preview: string;
}

export function SourceCitation({ sourceIndex, preview }: SourceCitationProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-help text-xs font-normal"
        >
          Source {sourceIndex}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{preview}</p>
      </TooltipContent>
    </Tooltip>
  );
}
