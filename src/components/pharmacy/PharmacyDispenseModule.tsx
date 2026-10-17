"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Pill,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Package,
  Layers,
  ArrowRight,
  UserCheck,
  Building,
  History,
  Tag,
  Calendar,
  Sparkles,
  Send,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Code,
  LayoutGrid,
  LayoutList,
  ScrollText,
  Filter,
  Copy,
  FileCode,
  ExternalLink,
  Plus,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertCircle,
  Info,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PharmacyWorklistItem } from "@/lib/db/repositories/pharmacy-repo";
import { StockMutationItem } from "@/lib/satusehat/types";
import { EtiquettePrintModal } from "./EtiquettePrintModal";
import { useAuth } from "@/lib/auth/auth-context";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  PharmacyKpiSkeleton,
  PharmacyWorklistCardsSkeleton,
  PharmacyWorklistTableSkeleton,
  PharmacyInventoryTableSkeleton,
  PharmacyMutationsTableSkeleton,
  PharmacyLoadingBar,
} from "./PharmacySkeleton";
import {
  usePharmacyStore,
  type PharmacyMainTab as MainTab,
  type RxFilter,
  type InventoryFilter,
  type MutationFilter,
  type InventoryItem,
  type RxSort,
  type InventorySort,
  type MutationSort,
} from "@/stores/usePharmacyStore";
import { useShallow } from "zustand/react/shallow";

export type { MainTab, RxFilter, InventoryFilter, MutationFilter, InventoryItem };

export function isOfficialSatusehatUuid(id?: string | null): boolean {
  if (!id) return false;
  if (id.startsWith("disp-ss-")) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export const STANDARD_DOSE_FORMS = [
  "Tablet",
  "Tablet Salut Selaput",
  "Tablet Kunyah",
  "Kaplet",
  "Kapsul",
  "Sirup",
  "Suspensi",
  "Drop / Tetes Oral",
  "Injeksi / Ampul",
  "Injeksi / Vial",
  "Salep / Krim",
  "Tetes Mata",
  "Tetes Telinga",
  "Inhaler / Aerosol",
  "Suppositoria",
  "Serbuk / Puyer",
  "Cairan Infus",
];

export const STANDARD_PACKAGE_UNITS = [
  "Tablet",
  "Kaplet",
  "Kapsul",
  "Botol",
  "Ampul",
  "Vial",
  "Tube",
  "Sachet",
  "Strip",
  "Box / Dus",
  "Pcs / Buah",
  "Pen",
  "Kolf / Labu",
];

export const STANDARD_CATEGORIES = [
  "Analgesik & Antipiretik",
  "Antibiotik & Antimikroba",
  "Antihipertensi & Kardiovaskular",
  "Antidiabetes Oral & Insulin",
  "Antasida & Saluran Cerna",
  "Antihistamin & Antialergi",
  "Kortikosteroid & Antiinflamasi",
  "Vitamin, Mineral & Suplemen",
  "Obat Batuk, Flu & Pernapasan",
  "Hipolipidemik (Statin)",
  "Obat Luar & Dermatologi",
  "Psikotropika & Sedatif",
  "Obat Bebas & Bebas Terbatas",
  "Obat Keras (G)",
  "Obat KFA Terdaftar",
];

export const STANDARD_TIMING_OPTIONS = [
  "Sesudah makan",
  "Sebelum makan (saat perut kosong)",
  "Bersama makanan",
  "Malam hari sebelum tidur",
  "Pagi hari sebelum sarapan",
  "Tiap 8 jam sesudah makan (Habiskan)",
  "Bila demam / nyeri (prn)",
  "Bebas / Kapan saja",
];

export const PRESET_FREQUENCIES = [
  "3x sehari 1 tablet",
  "2x sehari 1 tablet",
  "1x sehari 1 tablet",
  "3x sehari 1 cth (5 ml)",
  "1x sehari malam hari",
  "Bila demam/nyeri (prn)",
];

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

function PaginationFooter({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = "data",
}: PaginationFooterProps) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border-t border-slate-100 rounded-b-2xl text-xs text-slate-600">
      <div className="flex items-center gap-2 flex-wrap">
        <span>
          Menampilkan <strong>{from} - {to}</strong> dari <strong>{totalItems}</strong> {itemLabel}
        </span>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <CustomSelect<number>
            size="sm"
            value={pageSize}
            onChange={(val) => onPageSizeChange(val)}
            options={[
              { value: 5, label: "5" },
              { value: 10, label: "10" },
              { value: 25, label: "25" },
              { value: 50, label: "50" },
            ]}
            prefixLabel="Per hal:"
            className="w-24 shrink-0"
            buttonClassName="h-7 text-xs font-bold bg-slate-50 border-slate-200 hover:bg-white px-2"
            dropdownClassName="bottom-full top-auto mb-1.5 mt-0 w-28 min-w-[7rem] shadow-2xl z-[100] slide-in-from-bottom-1"
            accentColor="teal"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-7 px-2 text-xs border-slate-200 gap-1 text-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </Button>
        <span className="px-2 font-medium text-slate-700">
          Hal. {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-7 px-2 text-xs border-slate-200 gap-1 text-slate-700 disabled:opacity-40"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function PharmacyDispenseModule() {
  const { user, facility } = useAuth();

  // Zustand Pharmacy Store
  const {
    mainTab,
    rxFilter,
    inventoryFilter,
    mutationFilter,
    rxViewMode,
    rxSort,
    inventorySort,
    mutationSort,
    worklist,
    inventoryList,
    mutations,
    isLoadingWorklist,
    isLoadingInventory,
    isLoadingMutations,
    actionLoadingId,
    syncingId,
    setMainTab,
    setRxFilter,
    setInventoryFilter,
    setMutationFilter,
    setRxViewMode,
    setRxSort,
    setInventorySort,
    setMutationSort,
    loadWorklist,
    loadInventory,
    loadMutations,
    loadAll,
    reviewPrescription,
    preparePrescription,
    dispensePrescription,
    syncSatusehat,
    restockMedication,
    adjustStock,
    toggleMedicationActive,
  } = usePharmacyStore(
    useShallow((state) => ({
      mainTab: state.mainTab,
      rxFilter: state.rxFilter,
      inventoryFilter: state.inventoryFilter,
      mutationFilter: state.mutationFilter,
      rxViewMode: state.rxViewMode,
      rxSort: state.rxSort,
      inventorySort: state.inventorySort,
      mutationSort: state.mutationSort,
      worklist: state.worklist,
      inventoryList: state.inventoryList,
      mutations: state.mutations,
      isLoadingWorklist: state.isLoadingWorklist,
      isLoadingInventory: state.isLoadingInventory,
      isLoadingMutations: state.isLoadingMutations,
      actionLoadingId: state.actionLoadingId,
      syncingId: state.syncingId,
      setMainTab: state.setMainTab,
      setRxFilter: state.setRxFilter,
      setInventoryFilter: state.setInventoryFilter,
      setMutationFilter: state.setMutationFilter,
      setRxViewMode: state.setRxViewMode,
      setRxSort: state.setRxSort,
      setInventorySort: state.setInventorySort,
      setMutationSort: state.setMutationSort,
      loadWorklist: state.loadWorklist,
      loadInventory: state.loadInventory,
      loadMutations: state.loadMutations,
      loadAll: state.loadAll,
      reviewPrescription: state.reviewPrescription,
      preparePrescription: state.preparePrescription,
      dispensePrescription: state.dispensePrescription,
      syncSatusehat: state.syncSatusehat,
      restockMedication: state.restockMedication,
      adjustStock: state.adjustStock,
      toggleMedicationActive: state.toggleMedicationActive,
    }))
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const isLoading = isLoadingWorklist || isLoadingInventory || isLoadingMutations;

  // Modal States
  const [selectedItemForPrint, setSelectedItemForPrint] = useState<PharmacyWorklistItem | null>(null);
  const [selectedItemForPrepare, setSelectedItemForPrepare] = useState<PharmacyWorklistItem | null>(null);
  const [selectedItemForDispense, setSelectedItemForDispense] = useState<PharmacyWorklistItem | null>(null);
  const [selectedMedForRestock, setSelectedMedForRestock] = useState<InventoryItem | null>(null);
  const [selectedMedForAdjust, setSelectedMedForAdjust] = useState<InventoryItem | null>(null);
  const [selectedItemForFhirDetail, setSelectedItemForFhirDetail] = useState<PharmacyWorklistItem | null>(null);
  const [showTechnicalJson, setShowTechnicalJson] = useState(false);

  // Master Medication CRUD Modal States
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [selectedMedToEdit, setSelectedMedToEdit] = useState<InventoryItem | null>(null);
  const [selectedMedToToggle, setSelectedMedToToggle] = useState<InventoryItem | null>(null);
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  // KFA Lookup Search states
  const [kfaSearchKeyword, setKfaSearchKeyword] = useState("");
  const [kfaSearchResults, setKfaSearchResults] = useState<any[]>([]);
  const [isSearchingKfa, setIsSearchingKfa] = useState(false);
  const [selectedKfaProduct, setSelectedKfaProduct] = useState<any | null>(null);

  // Form fields for Add New Med
  const [newMedForm, setNewMedForm] = useState({
    kfaCode: "",
    name: "",
    genericName: "",
    form: "Tablet",
    strength: "",
    route: "Oral",
    category: "Analgesik & Antipiretik",
    unit: "Tablet",
    stock: 50,
    price: 15000,
    defaultDosage: "",
    defaultFrequency: "3x sehari 1 tablet",
    defaultTiming: "Sesudah makan",
  });

  // Form fields for Edit Med
  const [editMedForm, setEditMedForm] = useState({
    name: "",
    category: "",
    price: 0,
    unit: "",
    defaultDosage: "",
    defaultFrequency: "",
    defaultTiming: "",
  });

  // Custom manual input toggles for non-standard entries
  const [isCustomForm, setIsCustomForm] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Dynamic Options for Add Medication Modal (automatically incorporates any value from KFA)
  const addFormOptions = React.useMemo(() => {
    const list = [...STANDARD_DOSE_FORMS];
    if (newMedForm.form && !list.includes(newMedForm.form)) {
      list.unshift(newMedForm.form);
    }
    const options = list.map((f) => ({ value: f, label: f }));
    options.push({ value: "__custom__", label: "✍️ Ketik Manual (Kustom)..." });
    return options;
  }, [newMedForm.form]);

  const addUnitOptions = React.useMemo(() => {
    const list = [...STANDARD_PACKAGE_UNITS];
    if (newMedForm.unit && !list.includes(newMedForm.unit)) {
      list.unshift(newMedForm.unit);
    }
    const options = list.map((u) => ({ value: u, label: u }));
    options.push({ value: "__custom__", label: "✍️ Ketik Manual (Kustom)..." });
    return options;
  }, [newMedForm.unit]);

  const addCategoryOptions = React.useMemo(() => {
    const list = [...STANDARD_CATEGORIES];
    if (newMedForm.category && !list.includes(newMedForm.category)) {
      list.unshift(newMedForm.category);
    }
    const options = list.map((c) => ({ value: c, label: c }));
    options.push({ value: "__custom__", label: "✍️ Ketik Manual (Kustom)..." });
    return options;
  }, [newMedForm.category]);

  const addTimingOptions = React.useMemo(() => {
    const list = [...STANDARD_TIMING_OPTIONS];
    if (newMedForm.defaultTiming && !list.includes(newMedForm.defaultTiming)) {
      list.unshift(newMedForm.defaultTiming);
    }
    return list.map((t) => ({ value: t, label: t }));
  }, [newMedForm.defaultTiming]);

  // Dynamic Options for Edit Medication Modal
  const editUnitOptions = React.useMemo(() => {
    const list = [...STANDARD_PACKAGE_UNITS];
    if (editMedForm.unit && !list.includes(editMedForm.unit)) {
      list.unshift(editMedForm.unit);
    }
    return list.map((u) => ({ value: u, label: u }));
  }, [editMedForm.unit]);

  const editCategoryOptions = React.useMemo(() => {
    const list = [...STANDARD_CATEGORIES];
    if (editMedForm.category && !list.includes(editMedForm.category)) {
      list.unshift(editMedForm.category);
    }
    return list.map((c) => ({ value: c, label: c }));
  }, [editMedForm.category]);

  const editTimingOptions = React.useMemo(() => {
    const list = [...STANDARD_TIMING_OPTIONS];
    if (editMedForm.defaultTiming && !list.includes(editMedForm.defaultTiming)) {
      list.unshift(editMedForm.defaultTiming);
    }
    return list.map((t) => ({ value: t, label: t }));
  }, [editMedForm.defaultTiming]);

  // Form states for preparation
  const [batchInput, setBatchInput] = useState("");
  const [expiryInput, setExpiryInput] = useState("");
  const [counselingNotes, setCounselingNotes] = useState("Aturan minum obat dan indikasi telah dijelaskan kepada pasien/keluarga.");

  // Form states for restock & adjustment
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockNotes, setRestockNotes] = useState("Penerimaan faktur PBF / Distributor");
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("Stock Opname Rutin");

  // Lifecycle Data Hydration
  useEffect(() => {
    // Initial fetch jika store masih kosong
    if (worklist.length === 0 || inventoryList.length === 0) {
      loadAll();
    }
  }, [loadAll, worklist.length, inventoryList.length]);

  useEffect(() => {
    if (mainTab === "mutations" && mutations.length === 0) {
      loadMutations();
    }
  }, [mainTab, loadMutations, mutations.length]);

  // Handle Restock
  const handleConfirmRestock = async () => {
    if (!selectedMedForRestock || !restockQty || restockQty <= 0) return;

    const res = await restockMedication({
      kfaCode: selectedMedForRestock.kfaCode,
      quantity: restockQty,
      creatorName: user?.name || "Apoteker Farmasi",
      notes: restockNotes,
    });
    if (res.success) {
      toast.success("Restock Obat Berhasil", {
        description: `${selectedMedForRestock.name} bertambah +${restockQty} ${selectedMedForRestock.unit}. Stok saat ini: ${res.newStock}`,
      });
      setSelectedMedForRestock(null);
    }
  };

  // Handle Stock Opname Adjustment
  const handleConfirmAdjust = async () => {
    if (!selectedMedForAdjust) return;

    const res = await adjustStock({
      kfaCode: selectedMedForAdjust.kfaCode,
      newStock: adjustNewStock,
      reason: adjustReason,
      creatorName: user?.name || "Apoteker Farmasi",
    });
    if (res.success) {
      toast.success("Penyesuaian Stok Berhasil Disimpan", {
        description: `${selectedMedForAdjust.name} disesuaikan dari ${res.oldStock} menjadi ${res.newStock} ${selectedMedForAdjust.unit}.`,
      });
      setSelectedMedForAdjust(null);
    }
  };

  // Search KFA from Kemenkes API
  const handleSearchKfa = async (query: string) => {
    setKfaSearchKeyword(query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.length < 1) {
      setKfaSearchResults([]);
      return;
    }

    setIsSearchingKfa(true);
    try {
      const res = await fetch(`/api/satusehat/kfa?q=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Prioritaskan obat yang berawalan kata kunci (starts with) dibanding yang hanya mengandung (contains)
        const sorted = [...json.data].sort((a: any, b: any) => {
          const aName = (a.name || "").toLowerCase();
          const bName = (b.name || "").toLowerCase();
          const aStarts = aName.startsWith(trimmed) ? 0 : 1;
          const bStarts = bName.startsWith(trimmed) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return aName.localeCompare(bName);
        });
        setKfaSearchResults(sorted.slice(0, 20));
      } else {
        setKfaSearchResults([]);
      }
    } catch {
      toast.error("Gagal mencari database KFA Kemenkes.");
    } finally {
      setIsSearchingKfa(false);
    }
  };

  // Pilih produk KFA
  const handleSelectKfaProduct = (kfa: any) => {
    setSelectedKfaProduct(kfa);
    setNewMedForm((prev) => ({
      ...prev,
      kfaCode: kfa.kfaCode,
      name: kfa.name,
      genericName: kfa.genericName || kfa.name,
      form: kfa.form || "Tablet",
      strength: kfa.strength || "",
      route: kfa.route || "Oral",
      category: kfa.category || "Obat KFA",
      unit: kfa.unit || "Tablet",
      defaultDosage: kfa.defaultDosage || kfa.strength || "",
      defaultFrequency: kfa.defaultFrequency || "3x sehari 1 tablet",
      defaultTiming: kfa.defaultTiming || "Sesudah makan",
    }));
    setIsCustomForm(false);
    setIsCustomUnit(false);
    setIsCustomCategory(false);
    setKfaSearchResults([]);
  };

  // Submit Tambah / Update Master Obat
  const handleConfirmCreateMedication = async () => {
    const kfa = newMedForm.kfaCode.trim();
    const name = newMedForm.name.trim();
    const form = newMedForm.form.trim();
    const strength = newMedForm.strength.trim();
    const category = newMedForm.category.trim();

    if (!kfa || !name || !form || !strength || !category) {
      toast.error("Validasi Gagal", {
        description: "Kode KFA, Nama Obat, Bentuk Sediaan, Dosis, dan Kategori wajib diisi lengkap.",
      });
      return;
    }

    if (!/^\d{6,12}$/.test(kfa)) {
      toast.error("Format Kode KFA Tidak Valid", {
        description: "Kode KFA Kemenkes harus berupa angka 6-12 digit (contoh: 93000115).",
      });
      return;
    }

    if (newMedForm.price < 0 || newMedForm.stock < 0) {
      toast.error("Nilai Tidak Valid", {
        description: "Harga satuan dan stok awal tidak boleh bernilai negatif.",
      });
      return;
    }

    setIsSubmittingMed(true);
    try {
      const res = await fetch("/api/pharmacy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...newMedForm,
          creatorName: user?.name || "Apoteker Farmasi",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const isExisting = Boolean(data.data?.isExisting);
        if (isExisting) {
          toast.success("Master Obat Berhasil Diperbarui!", {
            description: `${newMedForm.name} (KFA: ${newMedForm.kfaCode}) sudah terdaftar di formularium faskes. Data katalog dan harga telah diperbarui. Stok fisik saat ini: ${data.data?.currentStock} ${newMedForm.unit}.`,
          });
        } else {
          toast.success("Master Obat KFA Berhasil Ditambahkan!", {
            description: `${newMedForm.name} (KFA: ${newMedForm.kfaCode}) siap digunakan dalam pelayanan farmasi.`,
          });
        }
        setIsAddMedModalOpen(false);
        setSelectedKfaProduct(null);
        setKfaSearchKeyword("");

        // Arahkan tampilan tabel inventori langsung ke obat yang baru disimpan/diperbarui agar langsung terlihat di baris teratas
        setMainTab("inventory");
        setInventoryFilter("all");
        setInventorySort("recently_updated");
        setSearchQuery(newMedForm.name);
        setCurrentPage(1);
        await loadInventory();
      } else {
        toast.error(data.error || "Gagal menambahkan obat baru.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmittingMed(false);
    }
  };

  // Buka dialog edit
  const openEditMedModal = (med: InventoryItem) => {
    setSelectedMedToEdit(med);
    setEditMedForm({
      name: med.name,
      category: med.category || "Obat KFA",
      price: med.price || 0,
      unit: med.unit || "Tablet",
      defaultDosage: med.defaultDosage || med.strength || "",
      defaultFrequency: med.defaultFrequency || "3x sehari 1 tablet",
      defaultTiming: med.defaultTiming || "Sesudah makan",
    });
  };

  // Submit Edit Obat
  const handleConfirmUpdateMedication = async () => {
    if (!selectedMedToEdit) return;
    if (!editMedForm.name.trim()) {
      toast.error("Nama obat tidak boleh kosong.");
      return;
    }
    if (editMedForm.price < 0) {
      toast.error("Harga satuan tidak boleh bernilai negatif.");
      return;
    }
    setIsSubmittingMed(true);

    try {
      const res = await fetch("/api/pharmacy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: selectedMedToEdit.id,
          ...editMedForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Master Obat Berhasil Diperbarui!", {
          description: `Perubahan data untuk ${selectedMedToEdit.name} telah disimpan.`,
        });
        setSelectedMedToEdit(null);
        loadInventory();
      } else {
        toast.error(data.error || "Gagal memperbarui obat.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmittingMed(false);
    }
  };

  // Submit Soft Delete / Toggle Active
  const handleConfirmToggleActive = async () => {
    if (!selectedMedToToggle) return;
    setIsSubmittingMed(true);

    const res = await toggleMedicationActive(selectedMedToToggle.id, !selectedMedToToggle.isActive);
    setIsSubmittingMed(false);
    if (res.success) {
      toast.success(
        res.isActive
          ? "Obat Berhasil Diaktifkan Kembali"
          : "Obat Berhasil Dinonaktifkan (Diarsipkan)",
        {
          description: res.isActive
            ? `${selectedMedToToggle.name} kini muncul kembali pada pencarian resep dokter.`
            : `${selectedMedToToggle.name} tidak akan muncul lagi di peresepan CPOE dokter.`,
        }
      );
      setSelectedMedToToggle(null);
    }
  };

  // Resep Counts
  const pendingCount = worklist.filter((w) => w.prescription.dispenseStatus === "pending_review").length;
  const preparingCount = worklist.filter((w) => w.prescription.dispenseStatus === "in_preparation").length;
  const readyCount = worklist.filter((w) => w.prescription.dispenseStatus === "ready").length;
  const dispensedCount = worklist.filter((w) => w.prescription.dispenseStatus === "dispensed").length;

  // Inventory Counts
  const activeCount = inventoryList.filter((i) => i.isActive).length;
  const inactiveCount = inventoryList.filter((i) => !i.isActive).length;
  const criticalCount = inventoryList.filter((i) => i.isActive && i.stock <= 10).length;
  const lowCount = inventoryList.filter((i) => i.isActive && i.stock > 10 && i.stock <= 30).length;
  const safeCount = inventoryList.filter((i) => i.isActive && i.stock > 30).length;

  // Mutation Counts
  const dispenseMutationsCount = mutations.filter((m) => m.type === "dispense").length;
  const restockMutationsCount = mutations.filter((m) => m.type !== "dispense").length;

  // Filtered Lists
  const filteredWorklist = worklist.filter((item) => {
    if (rxFilter !== "all" && item.prescription.dispenseStatus !== rxFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.patient.name.toLowerCase().includes(q) ||
        item.patient.mrn.toLowerCase().includes(q) ||
        item.prescription.medicationName.toLowerCase().includes(q) ||
        (item.encounter.registrationNumber && item.encounter.registrationNumber.toLowerCase().includes(q)) ||
        (item.encounter.doctorName && item.encounter.doctorName.toLowerCase().includes(q)) ||
        (item.encounter.clinicDepartment && item.encounter.clinicDepartment.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredInventory = inventoryList.filter((med) => {
    if (inventoryFilter === "active" && !med.isActive) return false;
    if (inventoryFilter === "inactive" && med.isActive) return false;
    if (inventoryFilter === "critical" && (!med.isActive || med.stock > 10)) return false;
    if (inventoryFilter === "low" && (!med.isActive || med.stock <= 10 || med.stock > 30)) return false;
    if (inventoryFilter === "safe" && (!med.isActive || med.stock <= 30)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        med.name.toLowerCase().includes(q) ||
        med.kfaCode.toLowerCase().includes(q) ||
        med.genericName.toLowerCase().includes(q) ||
        (med.category && med.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredMutations = mutations.filter((m) => {
    if (mutationFilter === "dispense" && m.type !== "dispense") return false;
    if (mutationFilter === "restock" && m.type === "dispense") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        m.kfaCode.toLowerCase().includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.createdBy && m.createdBy.toLowerCase().includes(q)) ||
        (m.type && m.type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Reset page when filter, sort, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [mainTab, rxFilter, inventoryFilter, mutationFilter, searchQuery, rxSort, inventorySort, mutationSort]);

  // Sorted Worklist
  const sortedWorklist = [...filteredWorklist].sort((a, b) => {
    if (rxSort === "status_priority") {
      const priorityWeights: Record<string, number> = {
        pending_review: 1,
        in_preparation: 2,
        ready: 3,
        dispensed: 4,
      };
      const statusA = a.prescription.dispenseStatus || "pending_review";
      const statusB = b.prescription.dispenseStatus || "pending_review";
      const weightA = priorityWeights[statusA] || 99;
      const weightB = priorityWeights[statusB] || 99;
      if (weightA !== weightB) return weightA - weightB;
      // Jika status sama, gunakan FIFO (waktu kunjungan terlama dilayani duluan)
      return a.encounter.visitDate.localeCompare(b.encounter.visitDate);
    }
    if (rxSort === "time_desc") {
      return b.encounter.visitDate.localeCompare(a.encounter.visitDate);
    }
    if (rxSort === "time_asc") {
      return a.encounter.visitDate.localeCompare(b.encounter.visitDate);
    }
    if (rxSort === "patient_name") {
      return a.patient.name.localeCompare(b.patient.name);
    }
    return 0;
  });

  // Sorted Inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    if (inventorySort === "name_asc") {
      return a.name.localeCompare(b.name);
    }
    if (inventorySort === "name_desc") {
      return b.name.localeCompare(a.name);
    }
    if (inventorySort === "stock_asc") {
      return a.stock - b.stock;
    }
    if (inventorySort === "stock_desc") {
      return b.stock - a.stock;
    }
    if (inventorySort === "recently_updated") {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    }
    return 0;
  });

  // Sorted Mutations
  const sortedMutations = [...filteredMutations].sort((a, b) => {
    if (mutationSort === "time_desc") {
      return b.createdAt.localeCompare(a.createdAt);
    }
    if (mutationSort === "time_asc") {
      return a.createdAt.localeCompare(b.createdAt);
    }
    if (mutationSort === "qty_desc") {
      return Math.abs(b.quantity) - Math.abs(a.quantity);
    }
    return 0;
  });

  // Pagination Calculations
  const totalWorklistPages = Math.ceil(sortedWorklist.length / pageSize) || 1;
  const paginatedWorklist = sortedWorklist.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalInventoryPages = Math.ceil(sortedInventory.length / pageSize) || 1;
  const paginatedInventory = sortedInventory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalMutationPages = Math.ceil(sortedMutations.length / pageSize) || 1;
  const paginatedMutations = sortedMutations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Action 1: Review
  const handleReview = async (item: PharmacyWorklistItem) => {
    await reviewPrescription(item, user?.name || "Apoteker Farmasi");
  };

  // Open Prepare Modal
  const openPrepareDialog = (item: PharmacyWorklistItem) => {
    setSelectedItemForPrepare(item);
    const d = new Date();
    setBatchInput(`BCH-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 2);
    setExpiryInput(expDate.toISOString().split("T")[0]);
  };

  // Action 2: Prepare & Deduct Stock
  const handleConfirmPrepare = async () => {
    if (!selectedItemForPrepare) return;
    const res = await preparePrescription(selectedItemForPrepare, {
      preparerName: user?.name || "Asisten Apoteker",
      batchNumber: batchInput,
      expiryDate: expiryInput,
      etiquetteType:
        selectedItemForPrepare.prescription.form.toLowerCase().includes("salep") ||
        selectedItemForPrepare.prescription.form.toLowerCase().includes("tetes") ||
        selectedItemForPrepare.prescription.form.toLowerCase().includes("injeksi")
          ? "blue"
          : "white",
    });
    if (res.success) {
      setSelectedItemForPrepare(null);
    }
  };

  // Open Dispense Modal
  const openDispenseDialog = (item: PharmacyWorklistItem) => {
    setSelectedItemForDispense(item);
    setCounselingNotes("Aturan minum obat dan edukasi efek samping telah disampaikan ke pasien.");
  };

  // Action 3: Dispense to Patient & Sync SATUSEHAT
  const handleConfirmDispense = async () => {
    if (!selectedItemForDispense) return;
    const res = await dispensePrescription(selectedItemForDispense, {
      dispenserName: user?.name || "Apoteker Farmasi",
      counselingNotes,
    });
    if (res.success) {
      setSelectedItemForDispense(null);
    }
  };

  // Action 4: Sync / Retry SatuSehat MedicationDispense
  const handleSyncSatusehat = async (item: PharmacyWorklistItem) => {
    await syncSatusehat(item);
  };

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Instalasi Farmasi & Apotek Terpadu
                </h1>
                <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 font-semibold border-teal-200">
                  CPOE & KFA
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Telaah Resep 5-Benar, Pemotongan Stok Fisik Otomatis, Cetak Etiket Thermal & Bridging SATUSEHAT MedicationDispense
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200 shrink-0"
              onClick={() => {
                loadAll();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Segarkan Data</span>
            </Button>
          </div>
        </div>

        {/* Primary Segmented Navigation */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
            <button
              type="button"
              style={{ outline: "none" }}
              onClick={() => {
                setMainTab("prescriptions");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                mainTab === "prescriptions"
                  ? "bg-white text-teal-900 shadow-xs ring-1 ring-slate-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Pill className="h-3.5 w-3.5 text-teal-700" />
              <span>Antrean Resep</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 font-mono text-slate-700 font-bold">
                {worklist.length}
              </span>
            </button>

            <button
              type="button"
              style={{ outline: "none" }}
              onClick={() => {
                setMainTab("inventory");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                mainTab === "inventory"
                  ? "bg-white text-emerald-900 shadow-xs ring-1 ring-slate-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Package className="h-3.5 w-3.5 text-emerald-700" />
              <span>Gudang & Stok Obat</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 font-mono text-slate-700 font-bold">
                {inventoryList.length}
              </span>
            </button>

            <button
              type="button"
              style={{ outline: "none" }}
              onClick={() => {
                setMainTab("mutations");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                mainTab === "mutations"
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <History className="h-3.5 w-3.5 text-slate-700" />
              <span>Kartu Mutasi Stok</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 font-mono text-slate-700 font-bold">
                {mutations.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
            {mainTab === "prescriptions" && "Memantau alur verifikasi resep & penyerahan obat"}
            {mainTab === "inventory" && "Katalog ketersediaan fisik obat & manajemen master KFA"}
            {mainTab === "mutations" && "Audit log real-time transaksi keluar-masuk fisik obat"}
          </div>
        </div>

        {/* Dynamic Contextual KPI / Filter Cards */}
        {mainTab === "prescriptions" && (
          isLoadingWorklist && worklist.length === 0 ? (
            <PharmacyKpiSkeleton />
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3">
            {/* 0. Semua Resep */}
            <div
              onClick={() => setRxFilter("all")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                rxFilter === "all"
                  ? "bg-teal-50/90 border-teal-500 ring-2 ring-teal-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${rxFilter === "all" ? "text-teal-800" : "text-slate-600"}`}>
                  Semua Resep
                </span>
                <Badge className={`${rxFilter === "all" ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"} font-bold text-xs transition-colors`}>
                  {worklist.length}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {worklist.length} <span className="text-[11px] font-normal text-slate-500">Resep</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Seluruh antrean poli</div>
            </div>

            {/* 1. Menunggu Telaah */}
            <div
              onClick={() => setRxFilter(rxFilter === "pending_review" ? "all" : "pending_review")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                rxFilter === "pending_review"
                  ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  1. Menunggu Telaah
                </span>
                <Badge className={`${rxFilter === "pending_review" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"} font-bold text-xs transition-colors`}>
                  {pendingCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {pendingCount} <span className="text-[11px] font-normal text-slate-500">Resep</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Verifikasi 5-Benar & alergi</div>
            </div>

            {/* 2. Sedang Diracik */}
            <div
              onClick={() => setRxFilter(rxFilter === "in_preparation" ? "all" : "in_preparation")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                rxFilter === "in_preparation"
                  ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                  2. Sedang Diracik
                </span>
                <Badge className={`${rxFilter === "in_preparation" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800 hover:bg-blue-200"} font-bold text-xs transition-colors`}>
                  {preparingCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {preparingCount} <span className="text-[11px] font-normal text-slate-500">Resep</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Penyiapan & potong stok</div>
            </div>

            {/* 3. Siap Diserahkan */}
            <div
              onClick={() => setRxFilter(rxFilter === "ready" ? "all" : "ready")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                rxFilter === "ready"
                  ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  3. Siap Diserahkan
                </span>
                <Badge className={`${rxFilter === "ready" ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-800 hover:bg-purple-200"} font-bold text-xs transition-colors`}>
                  {readyCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {readyCount} <span className="text-[11px] font-normal text-slate-500">Resep</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Cetak etiket & panggil</div>
            </div>

            {/* 4. Selesai Diserahkan */}
            <div
              onClick={() => setRxFilter(rxFilter === "dispensed" ? "all" : "dispensed")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                rxFilter === "dispensed"
                  ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  4. Selesai Diserahkan
                </span>
                <Badge className={`${rxFilter === "dispensed" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"} font-bold text-xs transition-colors`}>
                  {dispensedCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {dispensedCount} <span className="text-[11px] font-normal text-slate-500">Resep</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Tersinkron SATUSEHAT</div>
            </div>
          </div>
          )
        )}

        {mainTab === "inventory" && (
          isLoadingInventory && inventoryList.length === 0 ? (
            <PharmacyKpiSkeleton />
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3">
            {/* 1. Semua Master */}
            <div
              onClick={() => setInventoryFilter("all")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                inventoryFilter === "all"
                  ? "bg-slate-100 border-slate-500 ring-2 ring-slate-300 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Semua Obat
                </span>
                <Badge className={`${inventoryFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"} font-bold text-xs transition-colors`}>
                  {inventoryList.length}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {inventoryList.length} <span className="text-[11px] font-normal text-slate-500">Item</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Total seluruh master KFA</div>
            </div>

            {/* 2. Formularium Aktif */}
            <div
              onClick={() => setInventoryFilter(inventoryFilter === "active" ? "all" : "active")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                inventoryFilter === "active"
                  ? "bg-teal-50/90 border-teal-500 ring-2 ring-teal-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Formularium Aktif
                </span>
                <Badge className={`${inventoryFilter === "active" ? "bg-teal-700 text-white" : "bg-teal-100 text-teal-800 hover:bg-teal-200"} font-bold text-xs transition-colors`}>
                  {activeCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {activeCount} <span className="text-[11px] font-normal text-slate-500">Item</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Tersedia untuk resep CPOE</div>
            </div>

            {/* 3. Stok Kritis */}
            <div
              onClick={() => setInventoryFilter(inventoryFilter === "critical" ? "all" : "critical")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                inventoryFilter === "critical"
                  ? "bg-red-50/90 border-red-500 ring-2 ring-red-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
                  Stok Kritis / Habis
                </span>
                <Badge className={`${inventoryFilter === "critical" ? "bg-red-600 text-white" : "bg-red-100 text-red-800 hover:bg-red-200"} font-bold text-xs transition-colors`}>
                  {criticalCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {criticalCount} <span className="text-[11px] font-normal text-slate-500">Item</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Sisa ≤ 10 unit fisik rak</div>
            </div>

            {/* 4. Stok Menipis */}
            <div
              onClick={() => setInventoryFilter(inventoryFilter === "low" ? "all" : "low")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                inventoryFilter === "low"
                  ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Stok Menipis
                </span>
                <Badge className={`${inventoryFilter === "low" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"} font-bold text-xs transition-colors`}>
                  {lowCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {lowCount} <span className="text-[11px] font-normal text-slate-500">Item</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Sisa 11 - 30 unit (reorder)</div>
            </div>

            {/* 5. Non-aktif / Diarsipkan */}
            <div
              onClick={() => setInventoryFilter(inventoryFilter === "inactive" ? "all" : "inactive")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                inventoryFilter === "inactive"
                  ? "bg-slate-200 border-slate-600 ring-2 ring-slate-400 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Diarsipkan (Non-aktif)
                </span>
                <Badge className={`${inventoryFilter === "inactive" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"} font-bold text-xs transition-colors`}>
                  {inactiveCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-700 mt-1">
                {inactiveCount} <span className="text-[11px] font-normal text-slate-500">Item</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Disembunyikan dari CPOE</div>
            </div>
          </div>
          )
        )}

        {mainTab === "mutations" && (
          isLoadingMutations && mutations.length === 0 ? (
            <PharmacyKpiSkeleton />
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
            <div
              onClick={() => setMutationFilter("all")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                mutationFilter === "all"
                  ? "bg-slate-100 border-slate-500 ring-2 ring-slate-300 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Semua Log Mutasi
                </span>
                <Badge className={`${mutationFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"} font-bold text-xs transition-colors`}>
                  {mutations.length}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {mutations.length} <span className="text-[11px] font-normal text-slate-500">Catatan</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Seluruh transaksi keluar-masuk</div>
            </div>

            <div
              onClick={() => setMutationFilter(mutationFilter === "dispense" ? "all" : "dispense")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                mutationFilter === "dispense"
                  ? "bg-red-50/90 border-red-500 ring-2 ring-red-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
                  Pengeluaran Resep
                </span>
                <Badge className={`${mutationFilter === "dispense" ? "bg-red-600 text-white" : "bg-red-100 text-red-800 hover:bg-red-200"} font-bold text-xs transition-colors`}>
                  {dispenseMutationsCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {dispenseMutationsCount} <span className="text-[11px] font-normal text-slate-500">Pengeluaran</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Pemotongan otomatis saat racik</div>
            </div>

            <div
              onClick={() => setMutationFilter(mutationFilter === "restock" ? "all" : "restock")}
              className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                mutationFilter === "restock"
                  ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-300/80 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Penerimaan & Opname
                </span>
                <Badge className={`${mutationFilter === "restock" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"} font-bold text-xs transition-colors`}>
                  {restockMutationsCount}
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {restockMutationsCount} <span className="text-[11px] font-normal text-slate-500">Transaksi</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">Faktur PBF & penyesuaian fisik</div>
            </div>
          </div>
          )
        )}
      </div>

      {/* Unified Action Bar: Contextual Active Filter Indicator + Permanent Search & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Left: Active Filter Status Feedback */}
        <div className="flex items-center gap-2">
          {mainTab === "prescriptions" && (
            rxFilter !== "all" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Filter Aktif:</span>
                <button
                  type="button"
                  onClick={() => setRxFilter("all")}
                  className="inline-flex items-center gap-1.5 py-0.5 pl-2.5 pr-1.5 rounded-full bg-teal-50 hover:bg-teal-100/90 text-teal-800 border border-teal-200 text-xs font-semibold transition-all cursor-pointer group shadow-2xs"
                  title="Klik untuk menghapus filter ini"
                >
                  <span>
                    {rxFilter === "pending_review" && "1. Menunggu Telaah"}
                    {rxFilter === "in_preparation" && "2. Sedang Diracik"}
                    {rxFilter === "ready" && "3. Siap Diserahkan"}
                    {rxFilter === "dispensed" && "4. Selesai Diserahkan"}
                  </span>
                  <span className="rounded-full p-0.5 hover:bg-teal-200/80 text-teal-600 group-hover:text-teal-900 transition-colors">
                    <X className="h-3 w-3" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span>Menampilkan Seluruh Antrean Resep ({filteredWorklist.length} item)</span>
              </div>
            )
          )}

          {mainTab === "inventory" && (
            inventoryFilter !== "all" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Filter Aktif:</span>
                <button
                  type="button"
                  onClick={() => setInventoryFilter("all")}
                  className="inline-flex items-center gap-1.5 py-0.5 pl-2.5 pr-1.5 rounded-full bg-teal-50 hover:bg-teal-100/90 text-teal-800 border border-teal-200 text-xs font-semibold transition-all cursor-pointer group shadow-2xs"
                  title="Klik untuk menghapus filter ini"
                >
                  <span>
                    {inventoryFilter === "active" && "Formularium Aktif"}
                    {inventoryFilter === "critical" && "Stok Kritis / Habis (≤10)"}
                    {inventoryFilter === "low" && "Stok Menipis (≤30)"}
                    {inventoryFilter === "safe" && "Stok Aman & Cukup (>30)"}
                    {inventoryFilter === "inactive" && "Diarsipkan (Non-aktif)"}
                  </span>
                  <span className="rounded-full p-0.5 hover:bg-teal-200/80 text-teal-600 group-hover:text-teal-900 transition-colors">
                    <X className="h-3 w-3" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span>Menampilkan Seluruh Master Obat ({filteredInventory.length} item)</span>
              </div>
            )
          )}

          {mainTab === "mutations" && (
            mutationFilter !== "all" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Filter Aktif:</span>
                <button
                  type="button"
                  onClick={() => setMutationFilter("all")}
                  className="inline-flex items-center gap-1.5 py-0.5 pl-2.5 pr-1.5 rounded-full bg-teal-50 hover:bg-teal-100/90 text-teal-800 border border-teal-200 text-xs font-semibold transition-all cursor-pointer group shadow-2xs"
                  title="Klik untuk menghapus filter ini"
                >
                  <span>
                    {mutationFilter === "dispense" && "Pengeluaran Resep"}
                    {mutationFilter === "restock" && "Penerimaan & Opname"}
                  </span>
                  <span className="rounded-full p-0.5 hover:bg-teal-200/80 text-teal-600 group-hover:text-teal-900 transition-colors">
                    <X className="h-3 w-3" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span>Menampilkan Seluruh Catatan Mutasi ({filteredMutations.length} item)</span>
              </div>
            )
          )}
        </div>

        {/* Right: View Mode Toggle & Permanent Fixed-width Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {mainTab === "prescriptions" && (
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 shrink-0">
              <button
                type="button"
                style={{ outline: "none" }}
                onClick={() => setRxViewMode("cards")}
                className={`p-1.5 rounded-md text-xs transition-all ${
                  rxViewMode === "cards"
                    ? "bg-white text-teal-800 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Kartu Alur"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                style={{ outline: "none" }}
                onClick={() => setRxViewMode("table")}
                className={`p-1.5 rounded-md text-xs transition-all ${
                  rxViewMode === "table"
                    ? "bg-white text-teal-800 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Tabel Ramping"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Sorting CustomSelect Controls (Consistent SIMRS UI) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {mainTab === "prescriptions" && (
              <CustomSelect<"status_priority" | "time_desc" | "time_asc" | "patient_name">
                size="sm"
                value={rxSort}
                onChange={(val) => setRxSort(val)}
                prefixIcon={<ArrowUpDown className="h-3.5 w-3.5 text-teal-700" />}
                options={[
                  { value: "status_priority", label: "Prioritas Alur", description: "Menunggu Telaah > Sedang Diracik > Siap Diserahkan" },
                  { value: "time_desc", label: "Waktu Kunjungan Terbaru", description: "Waktu kunjungan/resep paling baru" },
                  { value: "time_asc", label: "Waktu Kunjungan Terlama (FIFO)", description: "Pasien antrean awal dilayani duluan" },
                  { value: "patient_name", label: "Nama Pasien (A - Z)", description: "Urut abjad nama pasien" },
                ]}
                className="w-48 sm:w-56"
                buttonClassName="h-8 text-xs font-semibold bg-slate-50/90 border-slate-200 hover:bg-white"
                dropdownClassName="w-72 shadow-xl z-50"
                accentColor="teal"
              />
            )}

            {mainTab === "inventory" && (
              <CustomSelect<"name_asc" | "name_desc" | "stock_asc" | "stock_desc" | "recently_updated">
                size="sm"
                value={inventorySort}
                onChange={(val) => setInventorySort(val)}
                prefixIcon={<ArrowUpDown className="h-3.5 w-3.5 text-emerald-700" />}
                options={[
                  { value: "name_asc", label: "Nama Obat (A - Z)", description: "Standar tata lemari rak farmasi" },
                  { value: "name_desc", label: "Nama Obat (Z - A)", description: "Urut abjad terbalik Z ke A" },
                  { value: "stock_asc", label: "Stok Terendah / Kritis", description: "Prioritas pengadaan & PO PBF" },
                  { value: "stock_desc", label: "Stok Terbanyak Duluan", description: "Obat fast-moving / stok tinggi" },
                  { value: "recently_updated", label: "Terakhir Diperbarui", description: "Obat yang baru di-input atau diedit" },
                ]}
                className="w-52 sm:w-60"
                buttonClassName="h-8 text-xs font-semibold bg-slate-50/90 border-slate-200 hover:bg-white"
                dropdownClassName="w-72 shadow-xl z-50"
                accentColor="teal"
              />
            )}

            {mainTab === "mutations" && (
              <CustomSelect<"time_desc" | "time_asc" | "qty_desc">
                size="sm"
                value={mutationSort}
                onChange={(val) => setMutationSort(val)}
                prefixIcon={<ArrowUpDown className="h-3.5 w-3.5 text-slate-700" />}
                options={[
                  { value: "time_desc", label: "Waktu Transaksi Terbaru", description: "Audit trail transaksi real-time" },
                  { value: "time_asc", label: "Waktu Transaksi Terlama", description: "Riwayat awal transaksi mutasi" },
                  { value: "qty_desc", label: "Jumlah Mutasi Terbesar", description: "Volume pergerakan stok terbesar" },
                ]}
                className="w-52 sm:w-60"
                buttonClassName="h-8 text-xs font-semibold bg-slate-50/90 border-slate-200 hover:bg-white"
                dropdownClassName="w-72 shadow-xl z-50"
                accentColor="teal"
              />
            )}
          </div>

          {/* Permanent Search Bar */}
          <div className="relative w-full sm:w-56 md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={
                mainTab === "prescriptions"
                  ? "Cari pasien, no. RM, obat..."
                  : mainTab === "inventory"
                  ? "Cari nama obat, kode KFA..."
                  : "Cari riwayat KFA, keterangan..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-8 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-teal-600 focus-visible:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200/70 transition-colors"
                title="Hapus filter pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {mainTab === "inventory" ? (
        /* TAB GUDANG & MANAJEMEN STOK OBAT */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Katalog & Manajemen Stok Obat Gudang</h2>
              <p className="text-[11px] text-slate-500">Katalog resmi KFA Kemenkes, formularium faskes, restock penerimaan faktur, dan opname stok</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 font-semibold shadow-xs cursor-pointer"
                onClick={() => {
                  setNewMedForm({
                    kfaCode: "",
                    name: "",
                    genericName: "",
                    form: "Tablet",
                    strength: "",
                    route: "Oral",
                    category: "Analgesik & Antipiretik",
                    unit: "Tablet",
                    stock: 50,
                    price: 15000,
                    defaultDosage: "",
                    defaultFrequency: "3x sehari 1 tablet",
                    defaultTiming: "Sesudah makan",
                  });
                  setSelectedKfaProduct(null);
                  setKfaSearchKeyword("");
                  setKfaSearchResults([]);
                  setIsAddMedModalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Obat (KFA)</span>
              </Button>
              <Badge variant="outline" className="text-xs font-mono">
                {filteredInventory.length} dari {inventoryList.length} Item
              </Badge>
            </div>
          </div>

          {isLoadingInventory && inventoryList.length > 0 && <PharmacyLoadingBar />}

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full min-w-[960px] text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50/95 backdrop-blur-xs text-slate-600 font-semibold border-b border-slate-200/70 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">Nama Obat</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kode KFA</th>
                  <th className="py-3 px-4 min-w-[140px] whitespace-nowrap">Bentuk & Dosis</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kategori</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Stok Fisik</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Harga Satuan</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoadingInventory && inventoryList.length === 0 ? (
                  <PharmacyInventoryTableSkeleton rows={6} />
                ) : paginatedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada obat yang cocok dengan filter atau kata kunci pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedInventory.map((med) => {
                    const isLow = med.stock <= 30 && med.stock > 10;
                    const isCritical = med.stock <= 10;

                    return (
                      <tr key={med.id} className={`hover:bg-slate-50/50 ${!med.isActive ? "opacity-60 bg-slate-50/40" : ""}`}>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{med.name}</span>
                            {!med.isActive && (
                              <Badge className="bg-slate-200 text-slate-600 text-[9px] py-0 px-1 border-slate-300">
                                Non-aktif
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-teal-700 font-semibold">{med.kfaCode}</td>
                        <td className="py-3 px-4 text-slate-600">{med.form} • {med.strength}</td>
                        <td className="py-3 px-4 text-slate-500">{med.category}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                          {med.stock} <span className="text-[10px] font-normal text-slate-400">{med.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {med.isActive ? (
                              <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] py-0 px-1.5 font-semibold">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] py-0 px-1.5 font-semibold">
                                Diarsipkan
                              </Badge>
                            )}

                            {isCritical ? (
                              <Badge className="bg-red-50 text-red-700 hover:bg-red-100/70 border-red-200 text-[9px] py-0 px-1.5 transition-colors">Kritis</Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100/70 border-amber-200 text-[9px] py-0 px-1.5 transition-colors">Menipis</Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border-emerald-200 text-[9px] py-0 px-1.5 transition-colors">Aman</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          Rp {med.price?.toLocaleString("id-ID") || "0"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2 gap-1 border-teal-200 text-teal-700 hover:bg-teal-50 cursor-pointer"
                              onClick={() => {
                                setSelectedMedForRestock(med);
                                setRestockQty(50);
                                setRestockNotes(`Penerimaan faktur ${med.name}`);
                              }}
                              title="Penerimaan stok dari faktur PBF"
                            >
                              <span>+ Restock</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] px-2 text-slate-600 hover:text-slate-900 cursor-pointer"
                              onClick={() => {
                                setSelectedMedForAdjust(med);
                                setAdjustNewStock(med.stock);
                                setAdjustReason("Penyesuaian Fisik Rak");
                              }}
                              title="Stock Opname fisik rak"
                            >
                              <span>Opname</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-teal-700 cursor-pointer"
                              onClick={() => openEditMedModal(med)}
                              title="Edit data master obat"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 cursor-pointer ${
                                med.isActive
                                  ? "text-slate-400 hover:text-red-600"
                                  : "text-slate-400 hover:text-emerald-600"
                              }`}
                              onClick={() => setSelectedMedToToggle(med)}
                              title={med.isActive ? "Nonaktifkan / Arsipkan obat" : "Aktifkan kembali ke formularium"}
                            >
                              {med.isActive ? (
                                <Archive className="h-3.5 w-3.5" />
                              ) : (
                                <ArchiveRestore className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalInventoryPages}
            totalItems={filteredInventory.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="item obat"
          />
        </div>
      ) : mainTab === "mutations" ? (
        /* TAB KARTU MUTASI STOK */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Kartu Mutasi Stok Obat (Audit Log)</h2>
              <p className="text-[11px] text-slate-500">Riwayat pencatatan keluar-masuk fisik obat farmasi secara real-time</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredMutations.length} dari {mutations.length} Catatan
            </Badge>
          </div>

          {isLoadingMutations && mutations.length > 0 && <PharmacyLoadingBar />}

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full min-w-[920px] text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50/95 backdrop-blur-xs text-slate-600 font-semibold border-b border-slate-200/70 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-3 px-4 w-[170px] whitespace-nowrap">Waktu Transaksi</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kode KFA</th>
                  <th className="py-3 px-4 whitespace-nowrap">Jenis Transaksi</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Stok Awal</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Mutasi</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Stok Akhir</th>
                  <th className="py-3 px-4 min-w-[180px]">Keterangan</th>
                  <th className="py-3 px-4 whitespace-nowrap">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoadingMutations && mutations.length === 0 ? (
                  <PharmacyMutationsTableSkeleton rows={6} />
                ) : paginatedMutations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada catatan mutasi stok obat yang cocok.
                    </td>
                  </tr>
                ) : (
                  paginatedMutations.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              {new Date(m.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                            <Clock className="h-3 w-3 text-teal-600/80 shrink-0" />
                            <span>
                              {new Date(m.createdAt)
                                .toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                                .replace(/\./g, ":")}{" "}
                              WIB
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {m.kfaCode}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          className={
                            m.type === "dispense"
                              ? "bg-red-50 text-red-700 hover:bg-red-100/70 border-red-200 transition-colors font-medium text-[10px] py-0.5 px-2"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border-emerald-200 transition-colors font-medium text-[10px] py-0.5 px-2"
                          }
                        >
                          {m.type === "dispense" ? "Pengeluaran Resep" : "Restock Gudang"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-600">{m.stockBefore}</td>
                      <td
                        className={`py-3 px-4 text-center font-mono font-bold text-xs ${
                          m.quantity < 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-900">
                        {m.stockAfter}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs min-w-[180px]">{m.notes || "-"}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 text-xs whitespace-nowrap">{m.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalMutationPages}
            totalItems={filteredMutations.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="catatan mutasi"
          />
        </div>
      ) : (
        /* WORKLIST RESEP OBAT */
        <div className="space-y-3">
          {isLoadingWorklist && worklist.length > 0 && (
            <div className="rounded-xl overflow-hidden shadow-2xs">
              <PharmacyLoadingBar />
            </div>
          )}

          {isLoadingWorklist && worklist.length === 0 ? (
            rxViewMode === "cards" ? (
              <PharmacyWorklistCardsSkeleton count={3} />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ScrollText className="h-3.5 w-3.5 text-teal-600" />
                    <span>Daftar Antrean Resep Farmasi</span>
                  </span>
                  <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                    Memuat antrean resep...
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  <table className="w-full min-w-[1060px] text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50/95 backdrop-blur-xs text-slate-600 font-semibold border-b border-slate-200/70 sticky top-0 z-10 shadow-2xs">
                      <tr>
                        <th className="py-3 px-3.5 w-[140px] whitespace-nowrap">Antrean & RM</th>
                        <th className="py-3 px-3.5 w-[170px] whitespace-nowrap">Pasien</th>
                        <th className="py-3 px-3.5 w-[180px] whitespace-nowrap">Poli / DPJP</th>
                        <th className="py-3 px-3.5 min-w-[220px]">Obat & KFA</th>
                        <th className="py-3 px-3.5 w-[160px] whitespace-nowrap">Aturan Pakai</th>
                        <th className="py-3 px-3.5 w-[130px] text-center whitespace-nowrap">Jumlah & Stok</th>
                        <th className="py-3 px-3.5 w-[120px] text-center whitespace-nowrap">Status</th>
                        <th className="py-3 px-3.5 w-[140px] text-center whitespace-nowrap">Aksi Alur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <PharmacyWorklistTableSkeleton rows={5} />
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : filteredWorklist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <Pill className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">Tidak Ada Resep pada Kategori Ini</h3>
              <p className="text-xs text-slate-400 mt-1">
                Semua resep obat telah selesai diproses atau belum ada resep masuk dari poli.
              </p>
            </div>
          ) : rxViewMode === "table" ? (
            /* COMPACT QUEUE TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ScrollText className="h-3.5 w-3.5 text-teal-600" />
                  <span>Daftar Antrean Resep Farmasi</span>
                </span>
                <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                  Tabel dapat digeser horizontal jika layar terbatas &rarr;
                </span>
              </div>
              <div className="overflow-x-auto max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full min-w-[1060px] text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50/95 backdrop-blur-xs text-slate-600 font-semibold border-b border-slate-200/70 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-3.5 w-[140px] whitespace-nowrap">Antrean & RM</th>
                      <th className="py-3 px-3.5 w-[170px] whitespace-nowrap">Pasien</th>
                      <th className="py-3 px-3.5 w-[180px] whitespace-nowrap">Poli / DPJP</th>
                      <th className="py-3 px-3.5 min-w-[220px]">Obat & KFA</th>
                      <th className="py-3 px-3.5 w-[160px] whitespace-nowrap">Aturan Pakai</th>
                      <th className="py-3 px-3.5 w-[130px] text-center whitespace-nowrap">Jumlah & Stok</th>
                      <th className="py-3 px-3.5 w-[120px] text-center whitespace-nowrap">Status</th>
                      <th className="py-3 px-3.5 w-[140px] text-center whitespace-nowrap">Aksi Alur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedWorklist.map((item) => {
                      const { prescription, patient, encounter, inventory } = item;
                      const isActionLoading = actionLoadingId === prescription.id;
                      const isStockCritical = inventory.currentStock < prescription.quantity;
                      const hasAllergyConflict =
                        patient.allergies &&
                        patient.allergies.some((allergy) =>
                          prescription.medicationName.toLowerCase().includes(allergy.toLowerCase())
                        );

                      return (
                        <tr key={prescription.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono">
                              {encounter.queueNumber && (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-300 px-1.5 py-0.5 shrink-0"
                                >
                                  {encounter.queueNumber}
                                </Badge>
                              )}
                              <span className="font-semibold text-slate-700 text-xs tracking-tight shrink-0">
                                {patient.mrn}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-xs truncate max-w-[160px]" title={patient.name}>
                              {patient.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <span>{patient.gender === "male" ? "Laki-laki" : "Perempuan"}</span>
                              {patient.paymentPayer && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-teal-700 font-semibold">{patient.paymentPayer}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 text-xs">
                              {encounter.clinicDepartment}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[190px] mt-0.5" title={encounter.doctorName}>
                              DPJP: <span className="text-slate-700 font-medium">{encounter.doctorName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 min-w-[220px]">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{prescription.medicationName}</span>
                              {hasAllergyConflict && (
                                <Badge className="bg-red-50 text-red-700 hover:bg-red-100/70 border-red-200 text-[9px] py-0.5 px-1.5 font-bold transition-colors shrink-0">
                                  ⚠️ Alergi!
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-teal-700 font-semibold mt-0.5">
                              KFA: {prescription.kfaCode}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 text-xs">
                              {prescription.frequency}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {prescription.timing}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {prescription.quantity}{" "}
                              <span className="font-normal text-slate-500 text-[11px]">{prescription.unit}</span>
                            </div>
                            <div className="mt-1">
                              <span
                                className={`inline-block font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                                  isStockCritical
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                Stok: {inventory.currentStock}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {prescription.dispenseStatus === "pending_review" && (
                              <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-100/70 border-amber-200 text-[10px] py-0.5 px-2 font-bold transition-colors">
                                1. Telaah
                              </Badge>
                            )}
                            {prescription.dispenseStatus === "in_preparation" && (
                              <Badge className="bg-blue-50 text-blue-800 hover:bg-blue-100/70 border-blue-200 text-[10px] py-0.5 px-2 font-bold transition-colors">
                                2. Diracik
                              </Badge>
                            )}
                            {prescription.dispenseStatus === "ready" && (
                              <Badge className="bg-purple-50 text-purple-800 hover:bg-purple-100/70 border-purple-200 text-[10px] py-0.5 px-2 font-bold transition-colors">
                                3. Siap
                              </Badge>
                            )}
                            {prescription.dispenseStatus === "dispensed" && (
                              <div className="flex flex-col items-center gap-1">
                                <Badge className="bg-teal-50 text-teal-800 hover:bg-teal-100/70 border-teal-200 text-[10px] py-0.5 px-2 font-bold transition-colors">
                                  4. Selesai
                                </Badge>
                                {isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId) ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                    SATUSEHAT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    ID Lokal
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {prescription.dispenseStatus === "pending_review" && (
                                <Button
                                  size="sm"
                                  className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white gap-1 px-2.5 shadow-2xs font-semibold cursor-pointer active:scale-95 transition-all"
                                  onClick={() => handleReview(item)}
                                  disabled={isActionLoading}
                                >
                                  {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                  <span>Setujui</span>
                                </Button>
                              )}
                              {prescription.dispenseStatus === "in_preparation" && (
                                <Button
                                  size="sm"
                                  className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5 shadow-2xs font-semibold cursor-pointer active:scale-95 transition-all"
                                  onClick={() => openPrepareDialog(item)}
                                  disabled={isActionLoading}
                                >
                                  {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                                  <span>Racik</span>
                                </Button>
                              )}
                              {(prescription.dispenseStatus === "ready" || prescription.dispenseStatus === "dispensed") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-2.5 gap-1.5 shadow-2xs font-semibold cursor-pointer active:scale-95 transition-all"
                                  onClick={() => setSelectedItemForPrint(item)}
                                >
                                  <Printer className="h-3 w-3 text-teal-700" />
                                  <span>Etiket</span>
                                </Button>
                              )}
                              {prescription.dispenseStatus === "ready" && (
                                <Button
                                  size="sm"
                                  className="h-7 text-[11px] bg-teal-700 hover:bg-teal-800 text-white px-2.5 gap-1.5 shadow-2xs font-semibold cursor-pointer active:scale-95 transition-all"
                                  onClick={() => openDispenseDialog(item)}
                                  disabled={isActionLoading}
                                >
                                  {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  <span>Serahkan</span>
                                </Button>
                              )}
                              {prescription.dispenseStatus === "dispensed" && (
                                <>
                                  {isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-[11px] text-teal-700 hover:text-teal-800 hover:bg-teal-50 px-2 gap-1 border border-teal-200"
                                      onClick={() => setSelectedItemForFhirDetail(item)}
                                      title="Lihat Status Penyerahan Obat & Bukti Bridging Kemenkes"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>Status Penyerahan</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2 gap-1 font-medium shadow-2xs"
                                      onClick={() => handleSyncSatusehat(item)}
                                      disabled={syncingId === prescription.id}
                                      title="Kirim ke gateway SATUSEHAT Kemenkes"
                                    >
                                      {syncingId === prescription.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      <span>Sinkron</span>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationFooter
                currentPage={currentPage}
                totalPages={totalWorklistPages}
                totalItems={filteredWorklist.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                itemLabel="resep"
              />
            </div>
          ) : (
            /* DETAILED CARD VIEW */
            <div className="space-y-3">
              {paginatedWorklist.map((item) => {
              const { prescription, patient, encounter, inventory } = item;
              const isActionLoading = actionLoadingId === prescription.id;

              // Check allergy conflict
              const hasAllergyConflict =
                patient.allergies &&
                patient.allergies.some((allergy) =>
                  prescription.medicationName.toLowerCase().includes(allergy.toLowerCase())
                );

              const isStockCritical = inventory.currentStock < prescription.quantity;

              return (
                <div
                  key={prescription.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all"
                >
                  {/* Top Bar: Pasien & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {patient.gender === "male" ? "L" : "P"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
                          <span className="text-xs font-mono text-slate-500">RM: {patient.mrn}</span>
                          {encounter.queueNumber && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Antrean: {encounter.queueNumber}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{encounter.clinicDepartment}</span>
                          <span>•</span>
                          <span>DPJP: {encounter.doctorName}</span>
                          {patient.paymentPayer && (
                            <>
                              <span>•</span>
                              <span className="text-teal-700 font-semibold">{patient.paymentPayer}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {prescription.dispenseStatus === "pending_review" && (
                        <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-100/70 border-amber-200 gap-1 text-xs transition-colors">
                          <Clock className="h-3 w-3" />
                          <span>1. Menunggu Telaah</span>
                        </Badge>
                      )}
                      {prescription.dispenseStatus === "in_preparation" && (
                        <Badge className="bg-blue-50 text-blue-800 hover:bg-blue-100/70 border-blue-200 gap-1 text-xs transition-colors">
                          <Package className="h-3 w-3" />
                          <span>2. Sedang Diracik</span>
                        </Badge>
                      )}
                      {prescription.dispenseStatus === "ready" && (
                        <Badge className="bg-purple-50 text-purple-800 hover:bg-purple-100/70 border-purple-200 gap-1 text-xs transition-colors">
                          <Printer className="h-3 w-3" />
                          <span>3. Siap Diserahkan</span>
                        </Badge>
                      )}
                      {prescription.dispenseStatus === "dispensed" && (
                        <Badge className="bg-teal-50 text-teal-800 hover:bg-teal-100/70 border-teal-200 gap-1 text-xs transition-colors">
                          <CheckCircle2 className="h-3 w-3 text-teal-600" />
                          <span>4. Selesai Diserahkan</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Allergy Alert Warning (Critical Safety Check) */}
                  {hasAllergyConflict && (
                    <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 font-medium">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      <span>
                        PERINGATAN ALERGI: Pasien memiliki riwayat alergi terhadap{" "}
                        <strong className="underline">{prescription.medicationName}</strong>. Harap konfirmasi dengan dokter DPJP sebelum meracik!
                      </span>
                    </div>
                  )}

                  {/* Medication Details Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 text-xs">
                    {/* Col 1: Nama Obat & KFA */}
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Obat & Kode KFA</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{prescription.medicationName}</div>
                      <div className="text-[11px] font-mono text-teal-700 mt-0.5">KFA: {prescription.kfaCode}</div>
                      <div className="text-[11px] text-slate-500">
                        Bentuk: {prescription.form} • Dosis: {prescription.dosage}
                      </div>
                    </div>

                    {/* Col 2: Aturan Pakai & Instruksi */}
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Aturan Pakai & Waktu</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">{prescription.frequency}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{prescription.timing}</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">
                        &quot;{prescription.instructions || "Sesuai anjuran dokter"}&quot;
                      </div>
                    </div>

                    {/* Col 3: Kuantitas & Sisa Stok Gudang */}
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Jumlah & Ketersediaan Stok</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-black text-slate-900 text-sm">
                            {prescription.quantity} {prescription.unit}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span
                            className={`text-xs font-semibold ${
                              isStockCritical ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            Stok: {inventory.currentStock} {prescription.unit}
                          </span>
                        </div>
                      </div>

                      {prescription.batchNumber && (
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Batch: {prescription.batchNumber} • ED: {prescription.expiryDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dispense & SATUSEHAT Status Banner for Dispensed Items */}
                  {prescription.dispenseStatus === "dispensed" && (
                    <div className="mt-3 p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/80 border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId)
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId) ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-700" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId)
                                ? "SATUSEHAT Kemenkes Terverifikasi"
                                : "Tersimpan Lokal Farmasi (Belum Terkirim ke SATUSEHAT)"}
                            </span>
                            <Badge className={`text-[10px] py-0 px-1.5 font-semibold ${
                              isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId)
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId) ? "FHIR R4 Resmi" : "ID Lokal"}
                            </Badge>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>ID: {prescription.satusehatMedicationDispenseId || "-"}</span>
                            {prescription.satusehatMedicationDispenseId && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(prescription.satusehatMedicationDispenseId || "");
                                  toast.success("ID disalin ke clipboard!");
                                }}
                                className="hover:text-slate-800 inline-flex items-center gap-0.5 text-[10px] text-teal-700 underline cursor-pointer ml-1"
                                title="Salin ID"
                              >
                                <Copy className="h-2.5 w-2.5" /> Salin
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOfficialSatusehatUuid(prescription.satusehatMedicationDispenseId) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-teal-200 text-teal-800 hover:bg-teal-50 gap-1.5 font-medium shadow-2xs"
                            onClick={() => setSelectedItemForFhirDetail(item)}
                            title="Lihat Status Penyerahan Obat & Bukti Bridging Kemenkes"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Status Penyerahan</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold shadow-2xs"
                            onClick={() => handleSyncSatusehat(item)}
                            disabled={syncingId === prescription.id}
                          >
                            {syncingId === prescription.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            <span>Sinkronkan ke SATUSEHAT</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Bar (Workflow Stepper) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      {prescription.reviewedBy && (
                        <span>Ditinjau oleh: <strong className="text-slate-600">{prescription.reviewedBy}</strong></span>
                      )}
                      {prescription.preparedBy && (
                        <span>• Diracik oleh: <strong className="text-slate-600">{prescription.preparedBy}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Step 1: Telaah Resep */}
                      {prescription.dispenseStatus === "pending_review" && (
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-sm"
                          onClick={() => handleReview(item)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          <span>Telaah & Setujui Resep</span>
                        </Button>
                      )}

                      {/* Step 2: Siapkan & Potong Stok */}
                      {prescription.dispenseStatus === "in_preparation" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
                          onClick={() => openPrepareDialog(item)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                          <span>Siapkan & Potong Stok</span>
                        </Button>
                      )}

                      {/* Step 3: Cetak Etiket Obat */}
                      {(prescription.dispenseStatus === "ready" || prescription.dispenseStatus === "dispensed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                          onClick={() => setSelectedItemForPrint(item)}
                        >
                          <Printer className="h-3.5 w-3.5 text-teal-700" />
                          <span>Cetak Etiket</span>
                        </Button>
                      )}

                      {/* Step 4: Serahkan ke Pasien */}
                      {prescription.dispenseStatus === "ready" && (
                        <Button
                          size="sm"
                          className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 shadow-sm"
                          onClick={() => openDispenseDialog(item)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          <span>Serahkan ke Pasien</span>
                        </Button>
                      )}

                      {prescription.dispenseStatus === "dispensed" && (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border-emerald-200 text-xs gap-1 py-1 px-2.5 transition-colors">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Obat Telah Diterima Pasien</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalWorklistPages}
              totalItems={filteredWorklist.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemLabel="resep"
            />
          </div>
        )}
      </div>
    )}

      {/* Modal Dialog 1: Konfirmasi Penyiapan & Potong Stok */}
      <Dialog
        open={Boolean(selectedItemForPrepare)}
        onOpenChange={(open) => !open && setSelectedItemForPrepare(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Konfirmasi Penyiapan & Pemotongan Stok
            </DialogTitle>
          </DialogHeader>

          {selectedItemForPrepare && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedItemForPrepare.prescription.medicationName}
                </div>
                <div className="text-slate-600 mt-1">
                  Jumlah resep: <strong>{selectedItemForPrepare.prescription.quantity} {selectedItemForPrepare.prescription.unit}</strong>
                </div>
                <div className="text-slate-600">
                  Sisa stok gudang: <strong>{selectedItemForPrepare.inventory.currentStock} {selectedItemForPrepare.prescription.unit}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nomor Batch Obat</Label>
                <Input
                  type="text"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder="Contoh: BCH-202609-01"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tanggal Kedaluwarsa (Expired Date)</Label>
                <Input
                  type="date"
                  value={expiryInput}
                  onChange={(e) => setExpiryInput(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11px]">
                Sistem akan secara otomatis memotong <strong>{selectedItemForPrepare.prescription.quantity}</strong> dari master stok fisik dan mencatat entri pada kartu mutasi stok farmasi.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedItemForPrepare(null)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
              className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-sm gap-1.5 font-semibold"
              onClick={handleConfirmPrepare}
              disabled={Boolean(actionLoadingId)}
            >
              {actionLoadingId ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Package className="h-3.5 w-3.5 text-white" />}
              <span className="text-white font-semibold">Konfirmasi & Potong Stok</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog 2: Penyerahan ke Pasien & Konseling */}
      <Dialog
        open={Boolean(selectedItemForDispense)}
        onOpenChange={(open) => !open && setSelectedItemForDispense(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Penyerahan Obat & Konseling Pasien
            </DialogTitle>
          </DialogHeader>

          {selectedItemForDispense && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 text-teal-900">
                <div className="font-bold text-sm">
                  Pasien: {selectedItemForDispense.patient.name} ({selectedItemForDispense.patient.mrn})
                </div>
                <div className="text-xs mt-1">
                  Obat: <strong>{selectedItemForDispense.prescription.medicationName}</strong> ({selectedItemForDispense.prescription.quantity} {selectedItemForDispense.prescription.unit})
                </div>
                <div className="text-xs mt-0.5">
                  Aturan: {selectedItemForDispense.prescription.frequency} ({selectedItemForDispense.prescription.timing})
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Catatan Konseling / Edukasi Pasien</Label>
                <textarea
                  value={counselingNotes}
                  onChange={(e) => setCounselingNotes(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600"
                  placeholder="Instruksi dan pemahaman pasien mengenai cara minum obat..."
                />
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Penyerahan obat ini akan menerbitkan resource resmi <strong>SATUSEHAT MedicationDispense</strong>.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedItemForDispense(null)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              style={{ backgroundColor: "#0f766e", color: "#ffffff" }}
              className="bg-teal-700 hover:bg-teal-800 text-white border border-teal-700 shadow-sm gap-1.5 font-semibold"
              onClick={handleConfirmDispense}
              disabled={Boolean(actionLoadingId)}
            >
              {actionLoadingId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  <span className="text-white font-semibold">Menyerahkan & Bridging SATUSEHAT...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-white" />
                  <span className="text-white font-semibold">Selesaikan Penyerahan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Status Klinis Penyerahan Obat & Bridging SATUSEHAT */}
      <Dialog
        open={Boolean(selectedItemForFhirDetail)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItemForFhirDetail(null);
            setShowTechnicalJson(false);
          }
        }}
      >
        <DialogContent className="max-w-xl bg-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-teal-800">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Status Penyerahan Obat & Bridging Kemenkes
                </DialogTitle>
                <p className="text-[11px] text-slate-500 font-normal">
                  Rincian klinis penyerahan obat ke pasien dan status interoperabilitas SATUSEHAT
                </p>
              </div>
            </div>
          </DialogHeader>

          {selectedItemForFhirDetail && (
            <div className="space-y-3 py-2 text-xs overflow-y-auto pr-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Pasien & Rekam Medis</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedItemForFhirDetail.patient.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">RM: {selectedItemForFhirDetail.patient.mrn}</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Obat & Aturan Pakai</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedItemForFhirDetail.prescription.medicationName}</div>
                  <div className="text-teal-700 font-mono text-[11px]">
                    {selectedItemForFhirDetail.prescription.quantity} {selectedItemForFhirDetail.prescription.unit} • {selectedItemForFhirDetail.prescription.frequency}
                  </div>
                </div>
              </div>

              {/* Status Alur Farmasi Klinis */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">Status Alur Resep:</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[11px]">
                    {selectedItemForFhirDetail.prescription.dispenseStatus === "dispensed"
                      ? "✓ Selesai Diserahkan ke Pasien"
                      : selectedItemForFhirDetail.prescription.dispenseStatus === "ready"
                      ? "Siap Diserahkan"
                      : "Menunggu Telaah"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400">Petugas Farmasi:</span>
                    <div className="font-medium text-slate-800">
                      {selectedItemForFhirDetail.prescription.dispensedBy ||
                        selectedItemForFhirDetail.prescription.preparedBy ||
                        "Apoteker Farmasi"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Batch & Kedaluwarsa:</span>
                    <div className="font-medium text-slate-800 font-mono">
                      {selectedItemForFhirDetail.prescription.batchNumber || "-"} ({selectedItemForFhirDetail.prescription.expiryDate || "-"})
                    </div>
                  </div>
                </div>
                {selectedItemForFhirDetail.prescription.counselingNotes && (
                  <div className="pt-1.5 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-400">Catatan Edukasi Pasien:</span>
                    <div className="text-slate-700 italic mt-0.5">
                      &quot;{selectedItemForFhirDetail.prescription.counselingNotes}&quot;
                    </div>
                  </div>
                )}
              </div>

              {/* Status Interoperabilitas SATUSEHAT */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-teal-900 font-semibold text-[11px]">
                    <img
                      src="/satusehat-default-logo.svg"
                      alt="SATUSEHAT"
                      className="h-3.5 w-3.5 object-contain shrink-0"
                    />
                    <span>Kemenkes SATUSEHAT (MedicationDispense)</span>
                  </div>
                  <Badge className="bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-100 text-[10px]">
                    {selectedItemForFhirDetail.prescription.satusehatMedicationDispenseId ? "Tersinkron Resmi" : "Tersimpan Lokal"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between bg-white/80 p-2 rounded-lg border border-teal-200/60 text-[11px]">
                  <span className="font-mono text-slate-600 truncate max-w-[340px]">
                    UUID: {selectedItemForFhirDetail.prescription.satusehatMedicationDispenseId || "Belum ada UUID Kemenkes"}
                  </span>
                  {selectedItemForFhirDetail.prescription.satusehatMedicationDispenseId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedItemForFhirDetail.prescription.satusehatMedicationDispenseId || "");
                        toast.success("UUID SATUSEHAT disalin ke clipboard!");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 underline shrink-0 cursor-pointer ml-2"
                    >
                      <Copy className="h-3 w-3" /> Salin
                    </button>
                  )}
                </div>
              </div>

              {/* Progressive Disclosure: Payload Teknis FHIR JSON (Hanya jika dibuka oleh IT / Audit) */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTechnicalJson(!showTechnicalJson)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium text-[11px]">
                    <Code className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {showTechnicalJson
                        ? "Sembunyikan Payload Teknis FHIR (Mode IT)"
                        : "Tampilkan Payload Teknis FHIR (Mode IT / Debug)"}
                    </span>
                  </span>
                  {showTechnicalJson ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>

                {showTechnicalJson && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-700">Preview FHIR R4 JSON Payload</Label>
                      <span className="text-[10px] text-slate-400 font-mono">resourceType: &quot;MedicationDispense&quot;</span>
                    </div>
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[10px] overflow-x-auto max-h-[220px] border border-slate-800 scrollbar-thin">
                      <pre>
                        {JSON.stringify(
                          {
                            resourceType: "MedicationDispense",
                            id: selectedItemForFhirDetail.prescription.satusehatMedicationDispenseId,
                            status: "completed",
                            category: {
                              coding: [
                                {
                                  system: "http://terminology.hl7.org/CodeSystem/medicationdispense-category",
                                  code: "outpatient",
                                  display: "Outpatient",
                                },
                              ],
                            },
                            medicationReference: {
                              reference: `Medication/${selectedItemForFhirDetail.prescription.satusehatMedicationId || selectedItemForFhirDetail.prescription.kfaCode || "-"}`,
                              display: selectedItemForFhirDetail.prescription.medicationName,
                            },
                            subject: {
                              reference: `Patient/${selectedItemForFhirDetail.patient.satusehatId || selectedItemForFhirDetail.patient.id}`,
                              display: selectedItemForFhirDetail.patient.name,
                            },
                            context: {
                              reference: `Encounter/${selectedItemForFhirDetail.encounter.satusehatEncounterId || selectedItemForFhirDetail.encounter.id}`,
                            },
                            authorizingPrescription: [
                              {
                                reference: `MedicationRequest/${selectedItemForFhirDetail.prescription.satusehatMedicationRequestId || selectedItemForFhirDetail.prescription.id}`,
                              },
                            ],
                            quantity: {
                              value: selectedItemForFhirDetail.prescription.quantity,
                              unit: selectedItemForFhirDetail.prescription.unit,
                            },
                            daysSupply: {
                              value: 3,
                              unit: "Day",
                            },
                            whenHandedOver: new Date().toISOString(),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedItemForFhirDetail(null);
                setShowTechnicalJson(false);
              }}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog 3: Cetak Etiket Thermal */}
      <EtiquettePrintModal
        isOpen={Boolean(selectedItemForPrint)}
        onClose={() => setSelectedItemForPrint(null)}
        item={selectedItemForPrint}
        facilityName={facility?.name || "Instalasi Farmasi"}
        facilityAddress={facility?.address || ""}
      />

      {/* Modal Dialog 4: Restock Obat (Penerimaan Faktur Masuk) */}
      <Dialog
        open={Boolean(selectedMedForRestock)}
        onOpenChange={(open) => !open && setSelectedMedForRestock(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Penerimaan / Restock Obat Gudang
            </DialogTitle>
          </DialogHeader>

          {selectedMedForRestock && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950">
                <div className="font-bold text-sm">{selectedMedForRestock.name}</div>
                <div className="text-[11px] text-emerald-700 font-mono mt-0.5">KFA: {selectedMedForRestock.kfaCode}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Stok saat ini: <strong>{selectedMedForRestock.stock} {selectedMedForRestock.unit}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Jumlah Masuk ({selectedMedForRestock.unit})</Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => Math.max(1, (prev || 0) + 10))}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => Math.max(1, (prev || 0) + 50))}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => Math.max(1, (prev || 0) + 100))}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      +100
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value, 10) || 0)}
                  className="h-9 text-xs font-mono font-bold bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nomor Faktur / Catatan Penerimaan</Label>
                <Input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="Contoh: Faktur PO-2026-0901 PT. Kimia Farma"
                  className="h-8 text-xs"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                Total perkiraan stok setelah restock: <strong>{selectedMedForRestock.stock + (restockQty || 0)} {selectedMedForRestock.unit}</strong>.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMedForRestock(null)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              style={{ backgroundColor: "#0f766e", color: "#ffffff" }}
              className="bg-teal-700 hover:bg-teal-800 text-white border border-teal-700 shadow-sm gap-1.5 font-semibold"
              onClick={handleConfirmRestock}
              disabled={Boolean(actionLoadingId)}
            >
              {actionLoadingId ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Package className="h-3.5 w-3.5 text-white" />}
              <span className="text-white font-semibold">Simpan Penerimaan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog 5: Penyesuaian Stok (Stock Opname) */}
      <Dialog
        open={Boolean(selectedMedForAdjust)}
        onOpenChange={(open) => !open && setSelectedMedForAdjust(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Penyesuaian Stok (Stock Opname)
            </DialogTitle>
          </DialogHeader>

          {selectedMedForAdjust && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-sm text-slate-900">{selectedMedForAdjust.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">KFA: {selectedMedForAdjust.kfaCode}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Stok tercatat sistem: <strong>{selectedMedForAdjust.stock} {selectedMedForAdjust.unit}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Hitungan Fisik Nyata di Rak ({selectedMedForAdjust.unit})</Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAdjustNewStock((prev) => Math.max(0, (prev || 0) - 1))}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustNewStock((prev) => (prev || 0) + 1)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustNewStock((prev) => (prev || 0) + 10)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      +10
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(parseInt(e.target.value, 10) || 0)}
                  className="h-9 text-xs font-mono font-bold bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Alasan Penyesuaian</Label>
                <Input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Selisih hitung fisik bulanan / Botol pecah"
                  className="h-8 text-xs"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                Selisih penyesuaian:{" "}
                <strong className={adjustNewStock - selectedMedForAdjust.stock < 0 ? "text-red-600" : "text-emerald-700"}>
                  {adjustNewStock - selectedMedForAdjust.stock > 0 ? `+${adjustNewStock - selectedMedForAdjust.stock}` : adjustNewStock - selectedMedForAdjust.stock} {selectedMedForAdjust.unit}
                </strong>
                . Mutasi akan dicatat di audit log.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMedForAdjust(null)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              style={{ backgroundColor: "#1e293b", color: "#ffffff" }}
              className="bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 shadow-sm gap-1.5 font-semibold"
              onClick={handleConfirmAdjust}
              disabled={Boolean(actionLoadingId)}
            >
              {actionLoadingId ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <ShieldCheck className="h-3.5 w-3.5 text-white" />}
              <span className="text-white font-semibold">Simpan Penyesuaian</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog 6: Tambah Master Obat Baru (Integrasi KFA Kemenkes) */}
      <Dialog
        open={isAddMedModalOpen}
        onOpenChange={(open) => !open && setIsAddMedModalOpen(false)}
      >
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 text-teal-800">
              <Plus className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-800">
                Tambah Master Obat (Katalog Resmi KFA Kemenkes)
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 pb-1 text-xs overflow-y-auto overflow-x-hidden pr-1">
            {/* Step 1: KFA Autocomplete Search */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-teal-700" />
                  <span>1. Cari Obat di Kamus Farmasi (KFA) Kemenkes</span>
                </Label>
                <span className="text-[10px] text-teal-700 font-mono">http://sys-ids.kemkes.go.id/kfa</span>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ketik nama zat aktif, merk dagang, atau kode KFA (contoh: Paracetamol, Amlodipine)..."
                  value={kfaSearchKeyword}
                  onChange={(e) => handleSearchKfa(e.target.value)}
                  className="h-8 text-xs bg-white border-teal-300 pr-8"
                />
                {isSearchingKfa && (
                  <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-teal-600" />
                )}
              </div>

              {/* KFA Search Results Dropdown List */}
              {kfaSearchResults.length > 0 && (
                <div className="mt-1 bg-white border border-teal-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100 shadow-md">
                  <div className="px-2.5 py-1.5 bg-slate-50 text-[10px] text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between">
                    <span>Ditemukan {kfaSearchResults.length} obat KFA (klik untuk memilih):</span>
                    <span className="text-teal-700 font-mono">Prioritas: Awalan &quot;{kfaSearchKeyword}&quot;</span>
                  </div>
                  {kfaSearchResults.map((kfa) => (
                    <div
                      key={kfa.kfaCode}
                      onClick={() => handleSelectKfaProduct(kfa)}
                      className="p-2 hover:bg-teal-50/80 cursor-pointer transition-colors flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{kfa.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {kfa.form} • {kfa.strength} • Kategori: {kfa.category}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className="bg-teal-100 text-teal-800 font-mono text-[10px] hover:bg-teal-100">
                          KFA: {kfa.kfaCode}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {kfaSearchKeyword.trim().length > 0 && !isSearchingKfa && kfaSearchResults.length === 0 && !selectedKfaProduct && (
                <div className="mt-1 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Tidak ditemukan obat di Kamus KFA Kemenkes dengan kata kunci <strong>&quot;{kfaSearchKeyword}&quot;</strong>.</span>
                </div>
              )}

              {selectedKfaProduct && (
                <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-emerald-900 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Terpilih: {selectedKfaProduct.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                      Kode KFA Kemenkes: {selectedKfaProduct.kfaCode} ({selectedKfaProduct.form} • {selectedKfaProduct.strength})
                    </div>
                  </div>
                  <Badge className="bg-emerald-700 text-white text-[10px]">Terverifikasi KFA</Badge>
                </div>
              )}

              {/* Peringatan & Status Bila Obat Sudah Terdaftar di Faskes */}
              {(() => {
                const existing = inventoryList.find((item) => item.kfaCode === newMedForm.kfaCode);
                if (!existing) return null;
                return (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <span>Obat ini sudah terdaftar di Formularium Faskes Anda!</span>
                        <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[10px]">Sudah Ada</Badge>
                      </div>
                      <div className="text-[11px] text-amber-800 leading-relaxed">
                        Obat dengan Kode KFA <strong>{newMedForm.kfaCode}</strong> telah aktif di sistem dengan stok fisik:{" "}
                        <strong className="underline text-amber-950">{existing.stock} {existing.unit}</strong>.
                        Menyimpan form ini akan <strong>memperbarui harga satuan, aturan pakai CPOE dokter, dan profil obat</strong> yang sudah ada tanpa menduplikasi baris.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Step 2: Form Detail Formularium Faskes */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-800 border-b pb-1 flex items-center justify-between">
                <span>2. Detail Formularium & Data Fisik Faskes</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Field terstandarisasi untuk keseragaman resep & bridging SATUSEHAT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Kode KFA (Resmi Kemenkes)*</Label>
                    {selectedKfaProduct && (
                      <span className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Terverifikasi KFA
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      value={newMedForm.kfaCode}
                      onChange={(e) => setNewMedForm({ ...newMedForm, kfaCode: e.target.value })}
                      placeholder="9300xxxx"
                      readOnly={Boolean(selectedKfaProduct)}
                      className={cn(
                        "h-8 text-xs font-mono font-bold",
                        selectedKfaProduct ? "bg-teal-50/70 text-teal-900 border-teal-300 pr-7" : ""
                      )}
                    />
                    {selectedKfaProduct && (
                      <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-teal-600" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Nama Obat di SIMRS*</Label>
                  <Input
                    type="text"
                    value={newMedForm.name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                    placeholder="Contoh: Paracetamol 500 mg Tablet"
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Bentuk Sediaan*</Label>
                    {isCustomForm && (
                      <button
                        type="button"
                        onClick={() => setIsCustomForm(false)}
                        className="text-[10px] text-teal-700 hover:underline font-medium"
                      >
                        Pilih Daftar
                      </button>
                    )}
                  </div>
                  {isCustomForm ? (
                    <Input
                      type="text"
                      value={newMedForm.form}
                      onChange={(e) => setNewMedForm({ ...newMedForm, form: e.target.value })}
                      placeholder="Ketik bentuk sediaan..."
                      className="h-8 text-xs"
                      autoFocus
                    />
                  ) : (
                    <CustomSelect<string>
                      value={newMedForm.form}
                      onChange={(val) => {
                        if (val === "__custom__") {
                          setIsCustomForm(true);
                          setNewMedForm({ ...newMedForm, form: "" });
                        } else {
                          setNewMedForm({ ...newMedForm, form: val });
                        }
                      }}
                      size="sm"
                      className="w-full"
                      buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                      dropdownClassName="z-[110] max-h-52"
                      accentColor="teal"
                      options={addFormOptions}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Kekuatan / Dosis*</Label>
                  <Input
                    type="text"
                    value={newMedForm.strength}
                    onChange={(e) => setNewMedForm({ ...newMedForm, strength: e.target.value })}
                    placeholder="Contoh: 500 mg"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Satuan Kemasan (Unit)*</Label>
                    {isCustomUnit && (
                      <button
                        type="button"
                        onClick={() => setIsCustomUnit(false)}
                        className="text-[10px] text-teal-700 hover:underline font-medium"
                      >
                        Pilih Daftar
                      </button>
                    )}
                  </div>
                  {isCustomUnit ? (
                    <Input
                      type="text"
                      value={newMedForm.unit}
                      onChange={(e) => setNewMedForm({ ...newMedForm, unit: e.target.value })}
                      placeholder="Ketik satuan kemasan..."
                      className="h-8 text-xs"
                      autoFocus
                    />
                  ) : (
                    <CustomSelect<string>
                      value={newMedForm.unit}
                      onChange={(val) => {
                        if (val === "__custom__") {
                          setIsCustomUnit(true);
                          setNewMedForm({ ...newMedForm, unit: "" });
                        } else {
                          setNewMedForm({ ...newMedForm, unit: val });
                        }
                      }}
                      size="sm"
                      align="right"
                      className="w-full"
                      buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                      dropdownClassName="z-[110] max-h-52 w-48 right-0"
                      accentColor="teal"
                      options={addUnitOptions}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Kategori Obat</Label>
                    {isCustomCategory && (
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(false)}
                        className="text-[10px] text-teal-700 hover:underline font-medium"
                      >
                        Pilih Daftar
                      </button>
                    )}
                  </div>
                  {isCustomCategory ? (
                    <Input
                      type="text"
                      value={newMedForm.category}
                      onChange={(e) => setNewMedForm({ ...newMedForm, category: e.target.value })}
                      placeholder="Ketik kategori..."
                      className="h-8 text-xs"
                      autoFocus
                    />
                  ) : (
                    <CustomSelect<string>
                      value={newMedForm.category}
                      onChange={(val) => {
                        if (val === "__custom__") {
                          setIsCustomCategory(true);
                          setNewMedForm({ ...newMedForm, category: "" });
                        } else {
                          setNewMedForm({ ...newMedForm, category: val });
                        }
                      }}
                      size="sm"
                      placement="top"
                      className="w-full"
                      buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                      dropdownClassName="z-[110] max-h-52 min-w-full"
                      accentColor="teal"
                      options={addCategoryOptions}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Harga Satuan Faskes (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-mono font-semibold pointer-events-none">Rp</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={newMedForm.price ? new Intl.NumberFormat("id-ID").format(newMedForm.price) : ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const parsed = raw ? parseInt(raw, 10) : 0;
                        setNewMedForm({ ...newMedForm, price: parsed });
                      }}
                      className="h-8 text-xs font-mono font-semibold pl-8"
                    />
                  </div>
                </div>

                {(() => {
                  const existing = inventoryList.find((item) => item.kfaCode === newMedForm.kfaCode);
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          {existing ? "Stok Fisik Saat Ini" : "Stok Awal Fisik (Rak)"}
                        </Label>
                        {existing && (
                          <span className="text-[10px] text-teal-700 font-medium">Tersedia</span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          disabled={Boolean(existing)}
                          value={existing ? existing.stock : (newMedForm.stock === 0 ? "" : newMedForm.stock)}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                            setNewMedForm({ ...newMedForm, stock: val });
                          }}
                          className={cn(
                            "h-8 text-xs font-mono font-bold pr-14",
                            existing ? "bg-slate-100 text-slate-700 cursor-not-allowed" : ""
                          )}
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-medium pointer-events-none truncate max-w-[3rem]">
                          {newMedForm.unit || "Unit"}
                        </span>
                      </div>
                      {existing && (
                        <span className="text-[10px] text-slate-500 block leading-tight">
                          *Untuk menambah stok fisik, gunakan tombol <strong>Restock (+ Stok)</strong> di tabel inventori.
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Default Aturan Pakai (CPOE Dokter)</Label>
                    <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                  </div>
                  <Input
                    type="text"
                    value={newMedForm.defaultFrequency}
                    onChange={(e) => setNewMedForm({ ...newMedForm, defaultFrequency: e.target.value })}
                    placeholder="Contoh: 3x sehari 1 tablet"
                    className="h-8 text-xs font-medium"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {PRESET_FREQUENCIES.map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setNewMedForm({ ...newMedForm, defaultFrequency: freq })}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] transition-colors border select-none",
                          newMedForm.defaultFrequency === freq
                            ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-xs"
                            : "bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-800 border-slate-200"
                        )}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-700">Default Waktu Minum</Label>
                  <CustomSelect<string>
                    value={newMedForm.defaultTiming}
                    onChange={(val) => setNewMedForm({ ...newMedForm, defaultTiming: val })}
                    size="sm"
                    placement="top"
                    align="right"
                    className="w-full"
                    buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                    dropdownClassName="z-[110] max-h-52 w-64 right-0"
                    accentColor="teal"
                    options={addTimingOptions}
                  />
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    Petunjuk konsumsi obat otomatis pada etiket &amp; resume medis pasien.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddMedModalOpen(false)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            {(() => {
              const isExisting = inventoryList.some((item) => item.kfaCode === newMedForm.kfaCode);
              return (
                <Button
                  type="button"
                  size="sm"
                  style={{ backgroundColor: isExisting ? "#0284c7" : "#0f766e", color: "#ffffff" }}
                  className={`${isExisting ? "bg-sky-600 hover:bg-sky-700 border-sky-600" : "bg-teal-700 hover:bg-teal-800 border-teal-700"} text-white shadow-sm gap-1.5 font-semibold`}
                  onClick={handleConfirmCreateMedication}
                  disabled={isSubmittingMed}
                >
                  {isSubmittingMed ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : isExisting ? (
                    <RefreshCw className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-white" />
                  )}
                  <span className="text-white font-semibold">
                    {isExisting ? "Perbarui Data Master Obat" : "Simpan Master Obat Baru"}
                  </span>
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog 7: Edit Master Data Obat */}
      <Dialog
        open={Boolean(selectedMedToEdit)}
        onOpenChange={(open) => !open && setSelectedMedToEdit(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <Edit3 className="h-4 w-4 text-teal-700" />
              <DialogTitle className="text-base font-bold text-slate-800">
                Edit Master Data Obat
              </DialogTitle>
            </div>
          </DialogHeader>

          {selectedMedToEdit && (
            <div className="space-y-3 pt-2 pb-1 text-xs overflow-y-auto overflow-x-hidden">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Kode KFA Terintegrasi</div>
                  <div className="font-mono font-bold text-teal-800 text-sm mt-0.5">{selectedMedToEdit.kfaCode}</div>
                </div>
                <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-semibold">
                  Terkunci SATUSEHAT
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nama Sediaan Obat</Label>
                <Input
                  type="text"
                  value={editMedForm.name}
                  onChange={(e) => setEditMedForm({ ...editMedForm, name: e.target.value })}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Kategori</Label>
                  <CustomSelect<string>
                    value={editMedForm.category}
                    onChange={(val) => setEditMedForm({ ...editMedForm, category: val })}
                    size="sm"
                    placement="top"
                    className="w-full"
                    buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                    dropdownClassName="z-[110] max-h-52 min-w-full"
                    accentColor="teal"
                    options={editCategoryOptions}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Satuan (Unit)</Label>
                  <CustomSelect<string>
                    value={editMedForm.unit}
                    onChange={(val) => setEditMedForm({ ...editMedForm, unit: val })}
                    size="sm"
                    align="right"
                    className="w-full"
                    buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                    dropdownClassName="z-[110] max-h-52 w-48 right-0"
                    accentColor="teal"
                    options={editUnitOptions}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Harga Satuan Faskes (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-mono font-semibold pointer-events-none">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={editMedForm.price ? new Intl.NumberFormat("id-ID").format(editMedForm.price) : ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const parsed = raw ? parseInt(raw, 10) : 0;
                      setEditMedForm({ ...editMedForm, price: parsed });
                    }}
                    className="h-8 text-xs font-mono font-bold pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Default Frekuensi CPOE</Label>
                    <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                  </div>
                  <Input
                    type="text"
                    value={editMedForm.defaultFrequency}
                    onChange={(e) => setEditMedForm({ ...editMedForm, defaultFrequency: e.target.value })}
                    placeholder="3x sehari 1 tablet"
                    className="h-8 text-xs font-medium"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {PRESET_FREQUENCIES.map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setEditMedForm({ ...editMedForm, defaultFrequency: freq })}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] transition-colors border select-none",
                          editMedForm.defaultFrequency === freq
                            ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-xs"
                            : "bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-800 border-slate-200"
                        )}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Default Waktu Minum</Label>
                  <CustomSelect<string>
                    value={editMedForm.defaultTiming}
                    onChange={(val) => setEditMedForm({ ...editMedForm, defaultTiming: val })}
                    size="sm"
                    placement="top"
                    align="right"
                    className="w-full"
                    buttonClassName="h-8 text-xs bg-white border-slate-300 font-medium px-2 py-0.5"
                    dropdownClassName="z-[110] max-h-52 w-64 right-0"
                    accentColor="teal"
                    options={editTimingOptions}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMedToEdit(null)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              style={{ backgroundColor: "#0f766e", color: "#ffffff" }}
              className="bg-teal-700 hover:bg-teal-800 text-white border border-teal-700 shadow-sm gap-1.5 font-semibold"
              onClick={handleConfirmUpdateMedication}
              disabled={isSubmittingMed}
            >
              {isSubmittingMed ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Check className="h-3.5 w-3.5 text-white" />}
              <span className="text-white font-semibold">Simpan Perubahan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog 8: Konfirmasi Nonaktifkan / Aktifkan Kembali Obat (Soft Delete) */}
      <Dialog
        open={Boolean(selectedMedToToggle)}
        onOpenChange={(open) => !open && setSelectedMedToToggle(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedMedToToggle?.isActive ? (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              <DialogTitle className="text-base font-bold text-slate-800">
                {selectedMedToToggle?.isActive
                  ? "Nonaktifkan Obat dari Formularium?"
                  : "Aktifkan Kembali Obat ke Formularium?"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {selectedMedToToggle && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-900 text-sm">{selectedMedToToggle.name}</div>
                <div className="font-mono text-teal-700 text-xs mt-0.5">Kode KFA: {selectedMedToToggle.kfaCode}</div>
                <div className="text-slate-500 mt-1">
                  Stok saat ini: <strong>{selectedMedToToggle.stock} {selectedMedToToggle.unit}</strong>
                </div>
              </div>

              {selectedMedToToggle.isActive ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                  <strong>Pemberitahuan Klinis & Kemenkes:</strong> Obat ini akan disembunyikan dari pilihan resep dokter di poli (CPOE). Seluruh riwayat resep masa lalu, catatan mutasi stok, dan rujukan SATUSEHAT tetap tersimpan aman (Kepatuhan FHIR R4).
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] leading-relaxed">
                  Obat ini akan kembali dapat dicari dan diresepkan oleh dokter pada modul Rawat Jalan / EMR CPOE.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMedToToggle(null)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              style={{
                backgroundColor: selectedMedToToggle?.isActive ? "#d97706" : "#0f766e",
                color: "#ffffff",
              }}
              className={`${
                selectedMedToToggle?.isActive
                  ? "bg-amber-600 hover:bg-amber-700 border-amber-600"
                  : "bg-teal-700 hover:bg-teal-800 border-teal-700"
              } text-white shadow-sm gap-1.5 font-semibold`}
              onClick={handleConfirmToggleActive}
              disabled={isSubmittingMed}
            >
              {isSubmittingMed ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : selectedMedToToggle?.isActive ? (
                <Archive className="h-3.5 w-3.5 text-white" />
              ) : (
                <ArchiveRestore className="h-3.5 w-3.5 text-white" />
              )}
              <span className="text-white font-semibold">
                {selectedMedToToggle?.isActive ? "Nonaktifkan Obat" : "Aktifkan Kembali"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
