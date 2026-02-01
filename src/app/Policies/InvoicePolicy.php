<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Invoice;
use App\Models\FiscalPeriod;

class InvoicePolicy
{
    /**
     * Determine if the user can view the invoice.
     * 
     * Resource-level authorization to prevent:
     * - User A from viewing User B's invoices via ID enumeration
     * - Non-admin users accessing invoices outside their scope
     */
    public function view(User $user, Invoice $invoice): bool
    {
        // Admin or users with view_all permission can see everything
        if ($user->can('sales.view_all')) {
            return true;
        }

        // Users can view invoices they created
        if ($invoice->user_id === $user->id) {
            return true;
        }

        // Sales reps can view invoices for their assigned customers
        // TODO: Implement customer assignment logic if applicable
        // if ($this->isAssignedCustomer($user, $invoice->customer_id)) {
        //     return true;
        // }

        return false;
    }

    /**
     * Determine if the user can create invoices.
     */
    public function create(User $user): bool
    {
        return $user->can('sales.create');
    }

    /**
     * Determine if the user can update the invoice.
     */
    public function update(User $user, Invoice $invoice): bool
    {
        // Cannot update if invoice is in a locked/closed fiscal period
        if ($invoice->fiscal_period_id) {
            $period = FiscalPeriod::find($invoice->fiscal_period_id);
            if ($period && ($period->is_locked || $period->is_closed)) {
                return false;
            }
        }

        // User must have update permission
        if (!$user->can('sales.update')) {
            return false;
        }

        // Users can update their own invoices, or if they have update_all permission
        return $invoice->user_id === $user->id || $user->can('sales.update_all');
    }

    /**
     * Determine if the user can delete the invoice.
     * 
     * CRITICAL: Prevents deletion of invoices in closed fiscal periods
     */
    public function delete(User $user, Invoice $invoice): bool
    {
        // Cannot delete if invoice has payments
        if ($invoice->amount_paid > 0) {
            return false;
        }

        // Cannot delete if invoice is in a locked/closed fiscal period
        if ($invoice->fiscal_period_id) {
            $period = FiscalPeriod::find($invoice->fiscal_period_id);
            if ($period && ($period->is_locked || $period->is_closed)) {
                return false;
            }
        }

        // User must have delete permission
        if (!$user->can('sales.delete')) {
            return false;
        }

        // Users can delete their own invoices, or if they have delete_all permission
        return $invoice->user_id === $user->id || $user->can('sales.delete_all');
    }

    /**
     * Check if user can modify invoices in a specific fiscal period.
     */
    public function canModifyInPeriod(User $user, ?FiscalPeriod $period): bool
    {
        if (!$period) {
            return true; // No period restriction
        }

        if ($period->is_locked || $period->is_closed) {
            // Only admins can modify locked/closed periods
            return $user->can('fiscal_periods.modify_locked');
        }

        return true;
    }
}

