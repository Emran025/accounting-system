// import * as React from "react";
// import { CheckCircle, Lock } from "lucide-react";
// import { PasswordInput } from "./password-input";
// import { cn } from "@/lib/utils";

// interface PasswordGroupProps {
//   // Password Field Props
//   passwordValue: string;
//   onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   passwordError?: string; // Server error for main password
  
//   // Confirmation Field Props
//   confirmValue: string;
//   onConfirmChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   confirmError?: string; // Server error for confirmation

//   // Configuration
//   layout?: "row" | "column";
//   autoComplete?: "new-password" | "off";
//   className?: string;
  
//   // Labels (Optional override)
//   passwordLabel?: string;
//   confirmLabel?: string;
// }

// /**
//  * PasswordGroup Component
//  * 
//  * - Renders Password & Confirmation fields.
//  * - **Smart Validation**: Automatically checks if `confirmValue` matches `passwordValue`.
//  * - If they don't match, it shows a local error message on the confirmation field.
//  */
// export function PasswordGroup({
//   passwordValue,
//   onPasswordChange,
//   passwordError,
  
//   confirmValue,
//   onConfirmChange,
//   confirmError,

//   passwordLabel = "كلمة المرور",
//   confirmLabel = "تأكيد كلمة المرور",

//   layout = "row",
//   autoComplete = "new-password",
//   className,
// }: PasswordGroupProps) {

//   // Logic: Check for mismatch only if user has started typing in confirmation
//   const isMismatch = confirmValue && passwordValue !== confirmValue;
  
//   // Combine server error with local mismatch error
//   // If there is a mismatch, show that. Otherwise, show server error.
//   const effectiveConfirmError = isMismatch 
//     ? "كلمة المرور غير متطابقة" 
//     : confirmError;

//   return (
//     <div 
//       className={cn(
//         "grid gap-6",
//         layout === "row" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1",
//         className
//       )}
//     >
//       <PasswordInput
//         id="password"
//         label={passwordLabel}
//         value={passwordValue}
//         onChange={onPasswordChange}
//         error={passwordError}
//         autoComplete={autoComplete}
//         icon={Lock}
//       />

//       <PasswordInput
//         id="password_confirmation"
//         label={confirmLabel}
//         value={confirmValue}
//         onChange={onConfirmChange}
//         // Pass the calculated error here
//         error={effectiveConfirmError} 
//         autoComplete={autoComplete}
//         icon={CheckCircle}
//       />
//     </div>
//   );
// }