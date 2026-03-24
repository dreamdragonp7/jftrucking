"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  MapPin,
  Copy,
  Navigation,
  Info,
  KeyRound,
  Phone,
  Play,
  FileText
} from "lucide-react";
import { toast } from "sonner";

import type { DispatchWithRelations } from "@/types/database";
import {
  formatAddress,
  copyToClipboard,
  openInMaps,
} from "@/lib/utils/address";
import { cacheLoads } from "@/lib/offline/sync";
import { cn } from "@/lib/utils/cn";
import { JFT_COMPANY } from "@/lib/constants/company";
import { SwipeActions } from "@/components/shared/SwipeActions";
import { BottomSheet } from "@/components/shared/BottomSheet";

// ---------------------------------------------------------------------------
// Status badge colors (Sleek Dark Mode Variants)
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  dispatched: "bg-brand-gold/10 text-brand-gold border border-brand-gold/20",
  acknowledged: "bg-brand-gold/20 text-brand-gold border border-brand-gold/40 glow-gold",
  in_progress: "bg-brand-gold text-black shadow-glow-gold",
  delivered: "bg-green-500/10 text-green-400 border border-green-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  dispatched: "Dispatched",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  delivered: "Delivered",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDispatchId(id: string): string {
  return `LD-${id.slice(0, 6).toUpperCase()}`;
}

// Extract City, State from full address for the compact view
function getCityState(address: string) {
  const parts = address.split(",");
  if (parts.length >= 3) {
    return `${parts[1].trim()}, ${parts[2].trim().split(" ")[0]}`;
  }
  return address;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoadsClientProps {
  initialLoads: DispatchWithRelations[];
}

export function LoadsClient({ initialLoads }: LoadsClientProps) {
  const [loads] = useState(initialLoads);
  const [selectedLoad, setSelectedLoad] = useState<DispatchWithRelations | null>(null);
  const router = useRouter();

  // Cache loads for offline
  useEffect(() => {
    if (loads.length > 0) {
      cacheLoads(loads).catch(() => { });
    }
  }, [loads]);

  const handleStartDelivery = useCallback(
    (loadId: string) => {
      router.push(`/trucker/deliver?load=${loadId}`);
    },
    [router]
  );

  const handleCallDispatch = useCallback(() => {
    window.location.href = `tel:${JFT_COMPANY.phone.replace(/[^\d+]/g, "")}`;
  }, []);

  return (
    <div className="relative font-sans text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 flex justify-between items-end"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-gold">
            My Loads
          </h1>
          <p className="text-sm font-medium text-zinc-400 mt-1 uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
      </motion.div>

      {loads.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
            <Truck className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight mb-2">You're all caught up.</h3>
          <p className="text-sm text-zinc-400 text-center max-w-[200px] leading-relaxed">
            No active loads currently assigned to your rig.
          </p>
        </motion.div>
      ) : (
        /* Load List */
        <motion.div
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4 pb-12"
          variants={{
            hidden: { opacity: 0 },
            show: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {loads.map((load) => (
            <motion.div
              key={load.id}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200 } }
              }}
            >
              <SwipeActions
                className="rounded-3xl"
                threshold={90}
                rightActions={[
                  {
                    key: 'start',
                    label: 'Start Load',
                    icon: <Play className="w-6 h-6 mb-1" />,
                    color: '#22c55e', // text-green-500
                    onAction: () => handleStartDelivery(load.id)
                  }
                ]}
                leftActions={[
                  {
                    key: 'dispatch',
                    label: 'Dispatch',
                    icon: <Phone className="w-6 h-6 mb-1" />,
                    color: '#3b82f6', // text-blue-500
                    onAction: handleCallDispatch
                  }
                ]}
              >
                <div
                  onClick={() => setSelectedLoad(load)}
                  className="w-full text-left p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl active:scale-95 active:bg-white/10 transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">
                      {formatDispatchId(load.id)}
                    </span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        STATUS_STYLES[load.status] ?? "bg-zinc-800 text-zinc-300"
                      )}
                    >
                      {STATUS_LABELS[load.status] ?? load.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-black tracking-tight text-white mb-4">
                    {load.material?.name ?? "Material"}
                  </h3>

                  <div className="flex flex-col gap-3 relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[9px] top-6 bottom-5 w-0.5 bg-brand-gold/20 rounded-full" />

                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0 z-10 border border-brand-gold/30">
                        <div className="w-2 h-2 rounded-full bg-brand-gold" />
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="text-sm font-bold text-zinc-200">{load.pickup_site?.name}</p>
                        <p className="text-xs text-zinc-500">{getCityState(formatAddress(load.pickup_site))}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0 z-10 shadow-[0_0_10px_rgba(237,188,24,0.5)]">
                        <MapPin className="w-3 h-3 text-black" />
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="text-sm font-bold text-white">{load.delivery_site?.name}</p>
                        <p className="text-xs text-brand-gold/70">{getCityState(formatAddress(load.delivery_site))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeActions>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Load Details Bottom Sheet */}
      <LoadDetailsSheet
        load={selectedLoad}
        isOpen={!!selectedLoad}
        onClose={() => setSelectedLoad(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Load Details Sheet (Replaces inline clutter)
// ---------------------------------------------------------------------------

function LoadDetailsSheet({
  load,
  isOpen,
  onClose
}: {
  load: DispatchWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!load) return null;

  const handleCopy = (t: string) => { copyToClipboard(t); toast.success("Copied!"); };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[0.65, 0.95]} title={`Load ${formatDispatchId(load.id)}`}>
      <div className="flex flex-col gap-6 text-white pb-10">

        {/* Status & Material */}
        <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-gold/10 rounded-xl rounded-tl-sm text-brand-gold border border-brand-gold/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Material</p>
              <p className="text-lg font-black">{load.material?.name}</p>
            </div>
          </div>
          <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", STATUS_STYLES[load.status])}>
            {STATUS_LABELS[load.status]}
          </span>
        </div>

        {/* Addresses */}
        <div className="space-y-4">
          <AddressBlock
            type="pickup"
            siteName={load.pickup_site?.name ?? ""}
            address={formatAddress(load.pickup_site)}
            onCopy={() => handleCopy(formatAddress(load.pickup_site))}
            onMaps={() => openInMaps(formatAddress(load.pickup_site))}
          />
          <AddressBlock
            type="delivery"
            siteName={load.delivery_site?.name ?? ""}
            address={formatAddress(load.delivery_site)}
            onCopy={() => handleCopy(formatAddress(load.delivery_site))}
            onMaps={() => openInMaps(formatAddress(load.delivery_site))}
          />
        </div>

        {/* Extra Specs */}
        <div className="grid grid-cols-2 gap-3">
          {load.purchase_order?.po_number && (
            <div className="bg-black/20 border border-white/5 p-4 rounded-2xl">
              <Info className="w-5 h-5 text-zinc-500 mb-2" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">PO Number</p>
              <p className="font-mono text-white text-base mt-1">{load.purchase_order.po_number}</p>
            </div>
          )}
          {load.delivery_site?.gate_code && (
            <div className="bg-brand-gold/10 border border-brand-gold/20 p-4 rounded-2xl">
              <KeyRound className="w-5 h-5 text-brand-gold mb-2" />
              <p className="text-[10px] text-brand-gold/70 font-bold uppercase tracking-widest">Gate Code</p>
              <p className="font-mono text-brand-gold text-base mt-1 glow-gold">{load.delivery_site.gate_code}</p>
            </div>
          )}
        </div>

        {load.delivery_site?.special_instructions && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">Special Instructions</p>
            <p className="text-red-200 text-sm leading-relaxed">{load.delivery_site.special_instructions}</p>
          </div>
        )}

      </div>
    </BottomSheet>
  );
}

function AddressBlock({ type, siteName, address, onCopy, onMaps }: any) {
  const isDelivery = type === 'delivery';
  return (
    <div className={cn(
      "p-5 rounded-3xl border transition-colors",
      isDelivery ? "bg-white/5 border-brand-gold/30" : "bg-black/20 border-white/5"
    )}>
      <div className="flex items-start gap-4 mb-4">
        {isDelivery ? (
          <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(237,188,24,0.4)]">
            <MapPin className="w-5 h-5 text-black" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <div className="w-3 h-3 bg-zinc-400 rounded-full" />
          </div>
        )}
        <div className="flex-1 mt-1">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-1">{isDelivery ? "Deliver To" : "Pickup From"}</p>
          <p className={cn("text-lg font-black leading-tight", isDelivery ? "text-white" : "text-zinc-300")}>{siteName}</p>
          <p className="text-sm text-zinc-500 mt-1">{address}</p>
        </div>
      </div>
      <div className="flex gap-2 w-full mt-2">
        <button onClick={onCopy} className="flex-1 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Copy className="w-4 h-4" /> Copy
        </button>
        <button onClick={onMaps} className={cn("flex-1 active:scale-95 transition-all text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2", isDelivery ? "bg-brand-gold text-black hover:bg-gold-400" : "bg-white text-black hover:bg-zinc-200")}>
          <Navigation className="w-4 h-4" /> Nav
        </button>
      </div>
    </div>
  );
}
