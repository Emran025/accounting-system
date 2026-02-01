<?php

namespace App\Policies;

use App\Models\User;
use App\Models\JournalVoucher;
use App\Models\FiscalPeriod;

class JournalVoucherPolicy
{
    /**
     * Determine if the user can view the journal voucher.
     */
    public function view(User $user, JournalVoucher $voucher): bool
    {
        if ($user->can('journal_vouchers.view_all')) {
            return true;
        }

        // Users can view vouchers they created
        return $voucher->created_by === $user->id;
    }

    /**
     * Determine if the user can create journal vouchers.
     */
    public function create(User $user): bool
    {
        return $user->can('journal_vouchers.create');
    }

    /**
     * Determine if the user can update the journal voucher.
     */
    public function update(User $user, JournalVoucher $voucher): bool
    {
        // Check if voucher has been posted to GL (check if GL entries exist)
        $hasGlEntries = \App\Models\GeneralLedger::where('voucher_number', $voucher->voucher_number)->exists();
        if ($hasGlEntries) {
            return false; // Cannot update posted vouchers
        }

        // Check fiscal period based on voucher date
        $period = \App\Models\FiscalPeriod::where('start_date', '<=', $voucher->voucher_date)
            ->where('end_date', '>=', $voucher->voucher_date)
            ->first();
        
        if ($period && ($period->is_locked || $period->is_closed)) {
            return false;
        }

        if (!$user->can('journal_vouchers.update')) {
            return false;
        }

        return $voucher->created_by === $user->id || $user->can('journal_vouchers.update_all');
    }

    /**
     * Determine if the user can delete the journal voucher.
     */
    public function delete(User $user, JournalVoucher $voucher): bool
    {
        // Check if voucher has been posted to GL
        $hasGlEntries = \App\Models\GeneralLedger::where('voucher_number', $voucher->voucher_number)->exists();
        if ($hasGlEntries) {
            return false; // Cannot delete posted vouchers
        }

        // Check fiscal period based on voucher date
        $period = \App\Models\FiscalPeriod::where('start_date', '<=', $voucher->voucher_date)
            ->where('end_date', '>=', $voucher->voucher_date)
            ->first();
        
        if ($period && ($period->is_locked || $period->is_closed)) {
            return false;
        }

        if (!$user->can('journal_vouchers.delete')) {
            return false;
        }

        return $voucher->created_by === $user->id || $user->can('journal_vouchers.delete_all');
    }

    /**
     * Determine if the user can post the journal voucher.
     */
    public function post(User $user, JournalVoucher $voucher): bool
    {
        if (!$user->can('journal_vouchers.post')) {
            return false;
        }

        // Check if already posted
        $hasGlEntries = \App\Models\GeneralLedger::where('voucher_number', $voucher->voucher_number)->exists();
        if ($hasGlEntries) {
            return false;
        }

        // Check fiscal period
        $period = \App\Models\FiscalPeriod::where('start_date', '<=', $voucher->voucher_date)
            ->where('end_date', '>=', $voucher->voucher_date)
            ->first();
        
        if ($period && ($period->is_locked || $period->is_closed)) {
            return false;
        }

        return true;
    }
}

