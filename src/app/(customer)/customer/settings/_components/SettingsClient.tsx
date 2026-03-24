"use client";

import { useState, useTransition } from "react";
import {
  User,
  Building2,
  Phone,
  Mail,
  Save,
  CheckCircle,
  MapPin,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  updateMyProfile,
  addCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
} from "@/app/(customer)/_actions/customer.actions";
import type { Profile, Customer, CustomerAddress } from "@/types/database";

interface SettingsClientProps {
  profile: Profile;
  customer: Customer | null;
  initialAddresses?: CustomerAddress[];
}

export function SettingsClient({ profile, customer, initialAddresses = [] }: SettingsClientProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Addresses state
  const [addresses, setAddresses] = useState<CustomerAddress[]>(initialAddresses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState("");
  const [addrAddress, setAddrAddress] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("TX");
  const [addrZip, setAddrZip] = useState("");
  const [addrPending, startAddrTransition] = useTransition();
  const [addrError, setAddrError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateMyProfile({
        full_name: fullName,
        phone: phone || undefined,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="animate-slide-up-fade max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
        Settings
      </h1>

      {/* Company info (read-only) */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-brand-brown" />
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Company
          </h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
              Company Name
            </label>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">
              {customer?.name ?? profile.company_name ?? "—"}
            </p>
          </div>
          {customer?.billing_email && (
            <div>
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                Billing Email
              </label>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {customer.billing_email}
              </p>
            </div>
          )}
          {customer?.payment_terms && (
            <div>
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                Payment Terms
              </label>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                {customer.payment_terms.replace("_", " ").replace("net", "Net")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile info (editable) */}
      <form onSubmit={handleSave}>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-brand-brown" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Your Profile
            </h2>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-600 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Profile updated successfully
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Phone Number
                </span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                Used for delivery confirmation notifications via SMS.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Email
              </label>
              <p className="text-sm text-[var(--color-text-muted)] px-3 py-2.5">
                Contact J Fudge Trucking to update your email address.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <LoadingSpinner size="sm" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </form>

      {/* Saved Delivery Addresses */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-brown" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Saved Delivery Addresses
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-brand-gold)] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Address
          </button>
        </div>

        {addrError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
            {addrError}
          </div>
        )}

        {/* Add Address Form */}
        {showAddForm && (
          <div className="rounded-lg border border-[var(--color-border)] bg-surface-deep p-4 mb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                Label
              </label>
              <input
                type="text"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                placeholder="e.g. Main Office, Warehouse"
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={addrAddress}
                onChange={(e) => setAddrAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder="Plano"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  maxLength={2}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  ZIP
                </label>
                <input
                  type="text"
                  value={addrZip}
                  onChange={(e) => setAddrZip(e.target.value)}
                  placeholder="75074"
                  maxLength={10}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={addrPending || !addrAddress.trim()}
                onClick={() => {
                  setAddrError(null);
                  startAddrTransition(async () => {
                    const result = await addCustomerAddress({
                      label: addrLabel.trim(),
                      address: addrAddress.trim(),
                      city: addrCity.trim(),
                      state: addrState.trim(),
                      zip: addrZip.trim(),
                    });
                    if (result.success) {
                      setAddresses((prev) => [...prev, result.data!]);
                      setAddrLabel("");
                      setAddrAddress("");
                      setAddrCity("");
                      setAddrState("TX");
                      setAddrZip("");
                      setShowAddForm(false);
                    } else {
                      setAddrError(result.error);
                    }
                  });
                }}
                className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {addrPending ? <LoadingSpinner size="sm" /> : <Plus className="w-3 h-3" />}
                Save Address
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Address List */}
        {addresses.length === 0 && !showAddForm ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No saved addresses yet. Add an address to speed up ordering.
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start justify-between rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {addr.label && (
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {addr.label}
                      </span>
                    )}
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--color-brand-gold)] font-medium">
                        <Star className="w-3 h-3 fill-current" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {addr.address}
                    {addr.city && `, ${addr.city}`}
                    {addr.state && `, ${addr.state}`}
                    {addr.zip && ` ${addr.zip}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {!addr.is_default && (
                    <button
                      type="button"
                      title="Set as default"
                      disabled={addrPending}
                      onClick={() => {
                        startAddrTransition(async () => {
                          const result = await setDefaultAddress(addr.id);
                          if (result.success) {
                            setAddresses((prev) =>
                              prev.map((a) => ({
                                ...a,
                                is_default: a.id === addr.id,
                              }))
                            );
                          }
                        });
                      }}
                      className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-brand-gold)] transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete address"
                    disabled={addrPending}
                    onClick={() => {
                      startAddrTransition(async () => {
                        const result = await deleteCustomerAddress(addr.id);
                        if (result.success) {
                          setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
                        }
                      });
                    }}
                    className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification channel info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 mt-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Notifications
        </h2>
        <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p>
            You will receive delivery confirmation requests via:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--color-text-muted)]">
            <li>In-app notifications (always on)</li>
            <li>
              SMS to {phone || "your phone"}{" "}
              {!phone && "(add your phone number above)"}
            </li>
          </ul>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            When a delivery is completed, you can reply YES to confirm or
            DISPUTE to the SMS, or use this portal.
          </p>
        </div>
      </div>
    </div>
  );
}
