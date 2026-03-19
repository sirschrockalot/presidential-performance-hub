"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogFooter,
} from "@/components/ui/dialog";

type RecipientOption = { value: string; label: string };

export function ManualPointAdjustmentModal({
  onClose,
  recipients,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  recipients: RecipientOption[];
  isSubmitting: boolean;
  onSubmit: (input: { recipientUserId: string; points: number; reason: string }) => void;
}) {
  const [recipientUserId, setRecipientUserId] = useState("");
  const [points, setPoints] = useState<string>("");
  const [reason, setReason] = useState("");

  const canSubmit =
    recipientUserId && points !== "" && reason.trim().length > 0 && !isSubmitting;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Rep</Label>
        <Select value={recipientUserId} onValueChange={setRecipientUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Select rep" />
          </SelectTrigger>
          <SelectContent>
            {recipients.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Points</Label>
        <Input
          type="number"
          placeholder="e.g. 1 or -1"
          step="0.5"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Reason</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for manual adjustment…"
          rows={3}
        />
      </div>

      <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Points Reference:</p>
        <p>$7,500 fee = 1 pt · $8,000 = 2 pts · $10,000 = 3 pts</p>
        <p>$15,000 = 4 pts · $20,000+ = 5 pts · TC = 0.5 pts</p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() => {
            const pts = Number(points);
            if (!Number.isFinite(pts)) return;
            onSubmit({ recipientUserId, points: pts, reason });
          }}
        >
          Submit Adjustment
        </Button>
      </DialogFooter>
    </div>
  );
}

