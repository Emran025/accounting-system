<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Setting;
use DOMDocument;
use DOMElement;
use Exception;

/**
 * UBL 2.1 XML Generator Service
 * 
 * Generates UBL 2.1 (Universal Business Language) compliant XML invoices
 * for ZATCA e-invoicing compliance.
 * 
 * Reference: https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=ubl
 */
class UBLGeneratorService
{
    private const UBL_VERSION = '2.1';
    private const UBL_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
    private const CAC_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
    private const CBC_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';

    /**
     * Generate UBL 2.1 XML for an invoice
     * 
     * @param Invoice $invoice
     * @return string XML content
     * @throws Exception
     */
    public function generate(Invoice $invoice): string
    {
        $invoice->load(['items.product', 'customer', 'fees', 'currency']);

        $doc = new DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        // Create root Invoice element
        $invoiceElement = $doc->createElementNS(self::UBL_NAMESPACE, 'Invoice');
        $invoiceElement->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:cac', self::CAC_NAMESPACE);
        $invoiceElement->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:cbc', self::CBC_NAMESPACE);
        $doc->appendChild($invoiceElement);

        // Invoice ID
        $this->addElement($doc, $invoiceElement, 'cbc:ID', $invoice->invoice_number);

        // Issue Date
        $this->addElement($doc, $invoiceElement, 'cbc:IssueDate', $invoice->created_at->format('Y-m-d'));

        // Issue Time
        $this->addElement($doc, $invoiceElement, 'cbc:IssueTime', $invoice->created_at->format('H:i:s'));

        // Invoice Type Code (Standard Invoice = 388)
        $this->addElement($doc, $invoiceElement, 'cbc:InvoiceTypeCode', '388');

        // Document Currency Code
        $currencyCode = $invoice->currency ? $invoice->currency->code : 'SAR';
        $this->addElement($doc, $invoiceElement, 'cbc:DocumentCurrencyCode', $currencyCode);

        // Accounting Supplier Party (Seller)
        $supplierParty = $this->createSupplierParty($doc, $invoice);
        $invoiceElement->appendChild($supplierParty);

        // Accounting Customer Party (Buyer)
        if ($invoice->customer) {
            $customerParty = $this->createCustomerParty($doc, $invoice);
            $invoiceElement->appendChild($customerParty);
        }

        // Tax Total
        if ($invoice->vat_amount > 0) {
            $taxTotal = $this->createTaxTotal($doc, $invoice);
            $invoiceElement->appendChild($taxTotal);
        }

        // Legal Monetary Total
        $monetaryTotal = $this->createMonetaryTotal($doc, $invoice);
        $invoiceElement->appendChild($monetaryTotal);

        // Invoice Lines
        foreach ($invoice->items as $index => $item) {
            $invoiceLine = $this->createInvoiceLine($doc, $item, $index + 1);
            $invoiceElement->appendChild($invoiceLine);
        }

        return $doc->saveXML();
    }

    /**
     * Create supplier party element
     */
    private function createSupplierParty(DOMDocument $doc, Invoice $invoice): DOMElement
    {
        $settings = $this->getCompanySettings();

        $supplierParty = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:AccountingSupplierParty');
        
        $party = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:Party');
        $supplierParty->appendChild($party);

        // Party Name
        $partyName = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:PartyName');
        $this->addElement($doc, $partyName, 'cbc:Name', $settings['company_name']);
        $party->appendChild($partyName);

        // Postal Address
        $postalAddress = $this->createPostalAddress($doc, $settings);
        $party->appendChild($postalAddress);

        // Party Tax Scheme (VAT Number)
        $partyTaxScheme = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:PartyTaxScheme');
        $this->addElement($doc, $partyTaxScheme, 'cbc:CompanyID', $settings['tax_number']);
        $taxScheme = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:TaxScheme');
        $this->addElement($doc, $taxScheme, 'cbc:ID', 'VAT');
        $partyTaxScheme->appendChild($taxScheme);
        $party->appendChild($partyTaxScheme);

        return $supplierParty;
    }

    /**
     * Create customer party element
     */
    private function createCustomerParty(DOMDocument $doc, Invoice $invoice): DOMElement
    {
        $customerParty = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:AccountingCustomerParty');
        
        $party = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:Party');
        $customerParty->appendChild($party);

        // Party Name
        if ($invoice->customer->name) {
            $partyName = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:PartyName');
            $this->addElement($doc, $partyName, 'cbc:Name', $invoice->customer->name);
            $party->appendChild($partyName);
        }

        // Customer VAT Number (if available)
        if ($invoice->customer->tax_number) {
            $partyTaxScheme = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:PartyTaxScheme');
            $this->addElement($doc, $partyTaxScheme, 'cbc:CompanyID', $invoice->customer->tax_number);
            $taxScheme = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:TaxScheme');
            $this->addElement($doc, $taxScheme, 'cbc:ID', 'VAT');
            $partyTaxScheme->appendChild($taxScheme);
            $party->appendChild($partyTaxScheme);
        }

        return $customerParty;
    }

    /**
     * Create tax total element
     */
    private function createTaxTotal(DOMDocument $doc, Invoice $invoice): DOMElement
    {
        $taxTotal = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:TaxTotal');
        
        $taxAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:TaxAmount');
        $taxAmount->setAttribute('currencyID', $invoice->currency ? $invoice->currency->code : 'SAR');
        $taxAmount->nodeValue = number_format($invoice->vat_amount, 2, '.', '');
        $taxTotal->appendChild($taxAmount);

        // Tax Subtotal
        $taxSubtotal = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:TaxSubtotal');
        
        $taxableAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:TaxableAmount');
        $taxableAmount->setAttribute('currencyID', $invoice->currency ? $invoice->currency->code : 'SAR');
        $taxableAmount->nodeValue = number_format($invoice->subtotal - $invoice->discount_amount, 2, '.', '');
        $taxSubtotal->appendChild($taxableAmount);

        $taxAmount2 = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:TaxAmount');
        $taxAmount2->setAttribute('currencyID', $invoice->currency ? $invoice->currency->code : 'SAR');
        $taxAmount2->nodeValue = number_format($invoice->vat_amount, 2, '.', '');
        $taxSubtotal->appendChild($taxAmount2);

        // Tax Category
        $taxCategory = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:TaxCategory');
        $this->addElement($doc, $taxCategory, 'cbc:ID', 'S');
        $this->addElement($doc, $taxCategory, 'cbc:Percent', number_format($invoice->vat_rate * 100, 2, '.', ''));
        
        $taxScheme = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:TaxScheme');
        $this->addElement($doc, $taxScheme, 'cbc:ID', 'VAT');
        $taxCategory->appendChild($taxScheme);
        
        $taxSubtotal->appendChild($taxCategory);
        $taxTotal->appendChild($taxSubtotal);

        return $taxTotal;
    }

    /**
     * Create monetary total element
     */
    private function createMonetaryTotal(DOMDocument $doc, Invoice $invoice): DOMElement
    {
        $monetaryTotal = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:LegalMonetaryTotal');
        
        $currencyID = $invoice->currency ? $invoice->currency->code : 'SAR';

        // Line Extension Amount (Subtotal)
        $lineExtensionAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:LineExtensionAmount');
        $lineExtensionAmount->setAttribute('currencyID', $currencyID);
        $lineExtensionAmount->nodeValue = number_format($invoice->subtotal, 2, '.', '');
        $monetaryTotal->appendChild($lineExtensionAmount);

        // Tax Exclusive Amount
        $taxExclusiveAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:TaxExclusiveAmount');
        $taxExclusiveAmount->setAttribute('currencyID', $currencyID);
        $taxExclusiveAmount->nodeValue = number_format($invoice->subtotal - $invoice->discount_amount, 2, '.', '');
        $monetaryTotal->appendChild($taxExclusiveAmount);

        // Tax Inclusive Amount
        $taxInclusiveAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:TaxInclusiveAmount');
        $taxInclusiveAmount->setAttribute('currencyID', $currencyID);
        $taxInclusiveAmount->nodeValue = number_format($invoice->total_amount, 2, '.', '');
        $monetaryTotal->appendChild($taxInclusiveAmount);

        // Payable Amount (Total)
        $payableAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:PayableAmount');
        $payableAmount->setAttribute('currencyID', $currencyID);
        $payableAmount->nodeValue = number_format($invoice->total_amount, 2, '.', '');
        $monetaryTotal->appendChild($payableAmount);

        return $monetaryTotal;
    }

    /**
     * Create invoice line element
     */
    private function createInvoiceLine(DOMDocument $doc, $item, int $lineNumber): DOMElement
    {
        $invoiceLine = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:InvoiceLine');
        
        $this->addElement($doc, $invoiceLine, 'cbc:ID', (string)$lineNumber);

        // Invoiced Quantity
        $invoicedQuantity = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:InvoicedQuantity');
        $invoicedQuantity->setAttribute('unitCode', 'C62'); // Unit code for "piece"
        $invoicedQuantity->nodeValue = (string)$item->quantity;
        $invoiceLine->appendChild($invoicedQuantity);

        // Line Extension Amount
        $lineExtensionAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:LineExtensionAmount');
        $lineExtensionAmount->setAttribute('currencyID', 'SAR');
        $lineExtensionAmount->nodeValue = number_format($item->subtotal, 2, '.', '');
        $invoiceLine->appendChild($lineExtensionAmount);

        // Item
        $itemElement = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:Item');
        
        // Item Name
        $name = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:Name');
        $name->nodeValue = $item->product->name ?? 'Product';
        $itemElement->appendChild($name);

        // Price
        $price = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:Price');
        $priceAmount = $doc->createElementNS(self::CBC_NAMESPACE, 'cbc:PriceAmount');
        $priceAmount->setAttribute('currencyID', 'SAR');
        $priceAmount->nodeValue = number_format($item->unit_price, 2, '.', '');
        $price->appendChild($priceAmount);
        $itemElement->appendChild($price);

        $invoiceLine->appendChild($itemElement);

        return $invoiceLine;
    }

    /**
     * Create postal address element
     */
    private function createPostalAddress(DOMDocument $doc, array $settings): DOMElement
    {
        $postalAddress = $doc->createElementNS(self::CAC_NAMESPACE, 'cac:PostalAddress');
        
        // Country Code (Saudi Arabia = SA)
        $this->addElement($doc, $postalAddress, 'cbc:Country', 'SA');

        // Add other address fields if available
        if (isset($settings['address'])) {
            $this->addElement($doc, $postalAddress, 'cbc:StreetName', $settings['address']);
        }

        return $postalAddress;
    }

    /**
     * Helper to add element with namespace
     */
    private function addElement(DOMDocument $doc, DOMElement $parent, string $qualifiedName, string $value): void
    {
        [$prefix, $localName] = explode(':', $qualifiedName);
        $namespace = $prefix === 'cbc' ? self::CBC_NAMESPACE : self::CAC_NAMESPACE;
        
        $element = $doc->createElementNS($namespace, $qualifiedName);
        $element->nodeValue = $value;
        $parent->appendChild($element);
    }

    /**
     * Get company settings
     */
    private function getCompanySettings(): array
    {
        $settings = Setting::whereIn('setting_key', [
            'company_name',
            'tax_number',
            'address',
        ])->pluck('setting_value', 'setting_key')->toArray();

        return [
            'company_name' => $settings['company_name'] ?? 'Company Name',
            'tax_number' => $settings['tax_number'] ?? '',
            'address' => $settings['address'] ?? '',
        ];
    }
}

