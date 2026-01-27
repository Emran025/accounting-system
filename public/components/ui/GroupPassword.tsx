"use client";

import { PasswordInput } from "./PasswordInput";

interface PasswordGroupProps {
    passwordValue: string;
    onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    confirmValue: string;
    onConfirmChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    passwordError?: string;
    confirmError?: string;
}

export function GroupPassword({
    passwordValue,
    onPasswordChange,
    confirmValue,
    onConfirmChange,
    passwordError,
    confirmError
}: PasswordGroupProps) {
    
    // Auto-detect mismatch if confirm has value
    const mismatch = confirmValue && passwordValue !== confirmValue ? "كلمة المرور غير متطابقة" : null;
    const finalConfirmError = confirmError || mismatch;

    return (
        <div className="space-y-4">
            <PasswordInput
                id="password"
                label="كلمة المرور"
                value={passwordValue}
                onChange={onPasswordChange}
                error={passwordError}
                autoComplete="new-password"
            />
            <PasswordInput
                id="confirm_password"
                label="تأكيد كلمة المرور"
                value={confirmValue}
                onChange={onConfirmChange}
                error={finalConfirmError || undefined}
                autoComplete="new-password"
            />
        </div>
    );
}
