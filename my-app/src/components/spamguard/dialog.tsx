import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, X } from "lucide-react";

export function BypassModal({ isOpen, onClose, onConfirm }:{isOpen: any, onClose: any, onConfirm: any}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="z-[110] p-0 border-none bg-transparent shadow-none sm:max-w-[360px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative bg-background border rounded-2xl shadow-lg w-full p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          

          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/10 mb-4">
              <AlertTriangle className="h-7 w-7 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
            </div>
            
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Review Your Message
            </DialogTitle>
            
            <DialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Our system flagged your input as potentially <span className="font-medium text-foreground">suspicious</span>. If this is a mistake, you can proceed, but please ensure your content follows the guidelines.
            </DialogDescription>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2">
            <button 
              onClick={onConfirm}
              className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-70"
            >
              {"Submit anyway"}
            </button>
            
            <button 
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}