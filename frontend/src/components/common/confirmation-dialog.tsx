"use client"

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) => (
  <Dialog open={open} onOpenChange={onCancel}>
    <DialogContent className="w-full max-w-sm sm:max-w-md max-h-[85vh] mx-auto">
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-base sm:text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
          {message}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="sm"
          className="h-8 px-3"
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          size="sm"
          className="h-8 px-3"
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ConfirmationDialog;