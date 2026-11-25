import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'bpl-ui z-50 max-w-72 rounded-md border bg-popover px-3 py-2 text-[12.5px] leading-snug text-popover-foreground shadow-lg',
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
