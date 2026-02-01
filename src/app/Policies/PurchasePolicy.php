<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Purchase;
use App\Models\FiscalPeriod;

class PurchasePolicy
{
    /**
     * Determine if the user can view the purchase.
     */
    public function view(User $user, Purchase $purchase): bool
    {
        if ($user->can('purchases.view_all')) {
            return true;
        }

        // Users can view purchases they created
        return $purchase->user_id === $user->id;
    }

    /**
     * Determine if the user can create purchases.
     */
    public function create(User $user): bool
    {
        return $user->can('purchases.create');
    }

    /**
     * Determine if the user can update the purchase.
     */
    public function update(User $user, Purchase $purchase): bool
    {
        // Cannot update if purchase is approved and reversed
        if ($purchase->approval_status === 'approved' && $purchase->is_reversed) {
            return false;
        }

        // Check fiscal period based on purchase date
        if ($purchase->purchase_date) {
            $period = FiscalPeriod::where('start_date', '<=', $purchase->purchase_date)
                ->where('end_date', '>=', $purchase->purchase_date)
                ->first();
            
            if ($period && ($period->is_locked || $period->is_closed)) {
                return false;
            }
        }

        if (!$user->can('purchases.update')) {
            return false;
        }

        return $purchase->user_id === $user->id || $user->can('purchases.update_all');
    }

    /**
     * Determine if the user can delete the purchase.
     */
    public function delete(User $user, Purchase $purchase): bool
    {
        // Cannot delete if purchase is approved and reversed
        if ($purchase->approval_status === 'approved' && $purchase->is_reversed) {
            return false;
        }

        // Check fiscal period based on purchase date
        if ($purchase->purchase_date) {
            $period = FiscalPeriod::where('start_date', '<=', $purchase->purchase_date)
                ->where('end_date', '>=', $purchase->purchase_date)
                ->first();
            
            if ($period && ($period->is_locked || $period->is_closed)) {
                return false;
            }
        }

        if (!$user->can('purchases.delete')) {
            return false;
        }

        return $purchase->user_id === $user->id || $user->can('purchases.delete_all');
    }

    /**
     * Determine if the user can approve the purchase.
     */
    public function approve(User $user, Purchase $purchase): bool
    {
        if (!$user->can('purchases.approve')) {
            return false;
        }

        // Cannot approve if already approved
        if ($purchase->approval_status === 'approved') {
            return false;
        }

        return true;
    }
}

