"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ChartPieIcon,
  SparklesIcon,
  CalendarIcon,
  ArrowRightCircleIcon,
} from "@heroicons/react/24/outline";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ComparisonItem = {
  id: number;
  document_name: string;
  version_old_label: string;
  version_new_label: string;
  created_at: string;
  overall_risk_level?: string | null;
  changes_count?: number;
  scope_impact_score?: number;
  timeline_impact_score?: number;
  cost_impact_score?: number;
  resource_impact_score?: number;
  risk_impact_score?: number;
  contract_impact_score?: number;
  stakeholder_impact_score?: number;
  architecture_impact_score?: number;
  risk_comment?: string;
};

const API_BASE_V2 = process.env.NEXT_PUBLIC_HISTORY_API ?? "/api/history";

type SortField = "name" | "date" | "risk" | "changes";
type SortDirection = "asc" | "desc";
type DateFilter = "ALL" | "TODAY" | "WEEK" | "MONTH";

// Helper function to format date in Bangkok timezone
const formatInBangkokTimezone = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

// Helper function to get date in Bangkok timezone for comparison
const getBangkokDate = (date: Date = new Date()): Date => {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
};

export default function HistoryPage() {
  const router = useRouter();
  
  // Core states
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [continuingId, setContinuingId] = useState<number | null>(null);

  // 🔍 Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");
  const [filterDateRange, setFilterDateRange] = useState<DateFilter>("ALL");

  // 📊 Sorting states
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // 🗑️ Bulk operations
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // 📈 Spider Graph states
  const [activeItem, setActiveItem] = useState<ComparisonItem | null>(null);
  const [hoveredRiskItem, setHoveredRiskItem] = useState<ComparisonItem | null>(null);

  // 📈 Statistics - Only total count remains
  const stats = useMemo(() => {
    const now = getBangkokDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: items.length,
      today: items.filter((i) => {
        const itemDate = new Date(i.created_at);
        return itemDate >= today;
      }).length,
    };
  }, [items]);

  // 🔄 Load data
  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_V2}/comparisons?limit=100`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail ||
            `ไม่สามารถโหลดข้อมูลได้ (รหัส ${res.status})`
        );
      }

      const data: ComparisonItem[] = await res.json();

      // Only map scores without any mock data
      const enhancedData = data.map(item => ({
        ...item,
        // Convert 0-5 scale to 0-100 if needed, but keep original values
        scope_impact_score: item.scope_impact_score,
        timeline_impact_score: item.timeline_impact_score,
        cost_impact_score: item.cost_impact_score,
        resource_impact_score: item.resource_impact_score,
        risk_impact_score: item.risk_impact_score,
        contract_impact_score: item.contract_impact_score,
        stakeholder_impact_score: item.stakeholder_impact_score,
        architecture_impact_score: item.architecture_impact_score,
      }));

      setItems(enhancedData);

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Continue comparison function
  const continueComparison = async (item: ComparisonItem) => {
    setContinuingId(item.id);

    try {
      const comparisonData = {
        baseId: item.id,
        docName: item.document_name,
        baseVersion: item.version_new_label || "Final",
      };

      localStorage.setItem(
        "continueComparison",
        JSON.stringify(comparisonData)
      );

      router.push(`/?continue=${item.id}`);
    } finally {
      setContinuingId(null);
    }
  };

  // 🔍 Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter((item) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const inName = item.document_name.toLowerCase().includes(searchLower);
        if (!inName) return false;
      }

      // Risk filter
      if (filterRisk !== "ALL" && item.overall_risk_level !== filterRisk) {
        return false;
      }

      // Date filter using Bangkok timezone
      if (filterDateRange !== "ALL") {
        const now = getBangkokDate();
        const itemDate = new Date(item.created_at);
        const diffTime = now.getTime() - itemDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (filterDateRange === "TODAY" && diffDays > 0) return false;
        if (filterDateRange === "WEEK" && diffDays > 7) return false;
        if (filterDateRange === "MONTH" && diffDays > 30) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.document_name.toLowerCase();
          bVal = b.document_name.toLowerCase();
          break;
        case "date":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "risk": {
          const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
          aVal = riskOrder[a.overall_risk_level as keyof typeof riskOrder] || 0;
          bVal = riskOrder[b.overall_risk_level as keyof typeof riskOrder] || 0;
          break;
        }
        case "changes":
          aVal = a.changes_count || 0;
          bVal = b.changes_count || 0;
          break;
        default:
          return 0;
      }

      return sortDirection === "asc"
        ? aVal > bVal
          ? 1
          : -1
        : aVal < bVal
        ? 1
        : -1;
    });

    return filtered;
  }, [items, searchTerm, filterRisk, filterDateRange, sortField, sortDirection]);

  // 🗑️ Delete single item
  const deleteItem = async (id: number) => {
    if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_V2}/comparisons/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("ลบไม่สำเร็จ");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
      if (activeItem?.id === id) {
        setActiveItem(null);
      }
    } catch (err: any) {
      alert("ลบไม่สำเร็จ: " + (err.message || "โปรดลองอีกครั้ง"));
    } finally {
      setDeletingId(null);
    }
  };

  // 🗑️ Bulk delete
  const deleteSelected = async () => {
    if (
      !selectedItems.length ||
      !confirm(`คุณต้องการลบ ${selectedItems.length} รายการที่เลือกใช่หรือไม่?`)
    )
      return;

    try {
      const promises = selectedItems.map((id) =>
        fetch(`${API_BASE_V2}/comparisons/${id}`, { method: "DELETE" }).then((res) =>
          res.ok ? { success: true, id } : { success: false, id }
        )
      );

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.success);

      if (failed.length > 0) {
        alert(`ลบ ${failed.length} รายการไม่สำเร็จ`);
      }

      fetchList();
      setSelectedItems([]);
    } catch {
      alert("เกิดข้อผิดพลาดในการลบหลายรายการ");
    }
  };

  // 📋 Bulk selection
  const toggleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredAndSortedItems.map((item) => item.id);
    if (selectedItems.length === visibleIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(visibleIds);
    }
  };

  // 🔄 Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // 📊 Risk badge with hover effect for spider graph
  const RiskBadge = ({ risk, item }: { risk?: string | null, item: ComparisonItem }) => {
    const base = "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 transform hover:scale-105";
    const level = risk || "UNKNOWN";

    const handleMouseEnter = () => {
      setHoveredRiskItem(item);
    };

    const handleMouseLeave = () => {
      setHoveredRiskItem(null);
    };

    const handleClick = () => {
      setActiveItem(item);
    };

    if (level.includes("HIGH")) {
      return (
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`${base} bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-red-500/40 cursor-pointer hover:shadow-xl relative group`}
        >
          <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
          <span className="text-white">ความเสี่ยงสูง</span>
          <div className="absolute invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
            คลิกเพื่อเปิดกราฟวิเคราะห์
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </button>
      );
    }
    if (level.includes("MEDIUM")) {
      return (
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`${base} bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-amber-500/40 cursor-pointer hover:shadow-xl relative group`}
        >
          <div className="h-2 w-2 rounded-full bg-white"></div>
          <span className="text-white">ความเสี่ยงกลาง</span>
          <div className="absolute invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
            คลิกเพื่อเปิดกราฟวิเคราะห์
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </button>
      );
    }
    if (level.includes("LOW")) {
      return (
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`${base} bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/40 cursor-pointer hover:shadow-xl relative group`}
        >
          <div className="h-2 w-2 rounded-full bg-white"></div>
          <span className="text-white">ความเสี่ยงต่ำ</span>
          <div className="absolute invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
            คลิกเพื่อเปิดกราฟวิเคราะห์
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </button>
      );
    }
    return (
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${base} bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-gray-500/40 cursor-pointer hover:shadow-xl relative group`}
      >
        <div className="h-2 w-2 rounded-full bg-white"></div>
        <span className="text-white">ไม่ระบุความเสี่ยง</span>
        <div className="absolute invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
          คลิกเพื่อเปิดกราฟวิเคราะห์
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </button>
    );
  };

  // 🕷️ Spider Graph Data - Using real backend data only
  const spiderData = useMemo(() => {
    const item = activeItem || hoveredRiskItem;
    if (!item) return [];

    return [
      { metric: "Scope", value: item.scope_impact_score ?? 0 },
      { metric: "Timeline", value: item.timeline_impact_score ?? 0 },
      { metric: "Cost", value: item.cost_impact_score ?? 0 },
      { metric: "Resource", value: item.resource_impact_score ?? 0 },
      { metric: "Risk", value: item.risk_impact_score ?? 0 },
      { metric: "Contract", value: item.contract_impact_score ?? 0 },
      { metric: "Stakeholder", value: item.stakeholder_impact_score ?? 0 },
      { metric: "Architecture", value: item.architecture_impact_score ?? 0 },
    ];
  }, [activeItem, hoveredRiskItem]);

  // Render Spider Graph Modal
  const renderSpiderGraphModal = () => {
    const item = activeItem;
    if (!item) return null;

    return (
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setActiveItem(null);
          }
        }}
      >
        <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <ChartPieIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">
                    กราฟวิเคราะห์ความเสี่ยง
                  </h3>
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="font-semibold">{item.document_name}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-600">ID: #{item.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="h-10 w-10 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Graph + Comment */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

    {/* LEFT → Radar Graph */}
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={spiderData}>
          <PolarGrid stroke="#d1d5db" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#1f2937", fontSize: 14, fontWeight: '500' }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            angle={30}
            tick={{ fill: "#4b5563", fontSize: 11 }}
          />
          <Radar
            name="คะแนนความเสี่ยง"
            dataKey="value"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.5}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              padding: '12px',
            }}
            formatter={(value) => [`${value} คะแนน`, 'ความเสี่ยง']}
            labelFormatter={(label) => `หมวดหมู่: ${label}`}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>

    {/* RIGHT → Risk Comment */}
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        คำอธิบายความเสี่ยง
      </h4>

      {item.risk_comment ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {item.risk_comment}
        </p>
      ) : (
        <div className="text-sm text-gray-400 italic">
          ไม่มีคำอธิบายความเสี่ยง
        </div>
      )}
    </div>

  </div>
</div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  item.overall_risk_level === 'HIGH' 
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
                    : item.overall_risk_level === 'MEDIUM'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                    : item.overall_risk_level === 'LOW'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                } shadow-sm`}>
                  {item.overall_risk_level === 'HIGH' 
                    ? 'ความเสี่ยงสูง'
                    : item.overall_risk_level === 'MEDIUM'
                    ? 'ความเสี่ยงกลาง'
                    : item.overall_risk_level === 'LOW'
                    ? 'ความเสี่ยงต่ำ'
                    : 'ไม่ระบุ'
                  }
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  จำนวนการเปลี่ยนแปลง: {item.changes_count || 0} รายการ
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/compare/${item.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 font-medium"
                >
                  <EyeIcon className="h-4 w-4" />
                  ดูรายงาน
                </Link>
                <button
                  onClick={() => continueComparison(item)}
                  disabled={continuingId === item.id}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {continuingId === item.id ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightCircleIcon className="h-4 w-4" />
                  )}
                  เทียบต่อ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Mini Spider Graph Tooltip
  const renderMiniSpiderGraph = () => {
    if (!hoveredRiskItem || activeItem) return null;

    const miniSpiderData = [
      { metric: "Scope", value: hoveredRiskItem.scope_impact_score ?? 0 },
      { metric: "Timeline", value: hoveredRiskItem.timeline_impact_score ?? 0 },
      { metric: "Cost", value: hoveredRiskItem.cost_impact_score ?? 0 },
      { metric: "Resource", value: hoveredRiskItem.resource_impact_score ?? 0 },
      { metric: "Risk", value: hoveredRiskItem.risk_impact_score ?? 0 },
      { metric: "Contract", value: hoveredRiskItem.contract_impact_score ?? 0 },
      { metric: "Stakeholder", value: hoveredRiskItem.stakeholder_impact_score ?? 0 },
      { metric: "Architecture", value: hoveredRiskItem.architecture_impact_score ?? 0 },
    ];

    return (
      <div className="fixed z-40 pointer-events-none" 
           style={{
             left: '70%',
             top: '50%',
             transform: 'translateY(-50%)',
           }}>
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64">
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Hovering Risk Analysis</div>
            <div className="text-sm font-semibold text-gray-900 truncate">
              {hoveredRiskItem.document_name}
            </div>
          </div>
          
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={miniSpiderData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "#4b5563", fontSize: 10 }}
                />
                <Radar
                  name="คะแนน"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-700">Scope</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.scope_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Timeline</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.timeline_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Cost</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.cost_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Resource</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.resource_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Risk</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.risk_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Contract</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.contract_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Stakeholder</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.stakeholder_impact_score ?? 0}/100</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-700">Architecture</span>
              <span className="font-semibold text-gray-900">{hoveredRiskItem.architecture_impact_score ?? 0}/100</span>
            </div>
          </div>
          
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-gray-200 rotate-45"></div>
        </div>
      </div>
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterRisk("ALL");
    setFilterDateRange("ALL");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6 font-sans">
      {renderSpiderGraphModal()}
      {renderMiniSpiderGraph()}

      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-700">
            <Link href="/" className="hover:text-blue-700 transition-colors font-medium">
              หน้าแรก
            </Link>
            <ChevronRightIcon className="h-3 w-3 text-gray-500" />
            <span className="font-semibold text-blue-700">ประวัติการเปรียบเทียบ</span>
          </nav>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <ClockIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    ประวัติการเปรียบเทียบเอกสาร
                  </h1>
                  <p className="text-gray-700 mt-1 font-medium">
                    จัดการและติดตามการเปรียบเทียบเอกสารทั้งหมดของคุณ
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                เปรียบเทียบใหม่
              </Link>
              <button
                onClick={fetchList}
                disabled={loading}
                className="h-11 w-11 rounded-lg border border-gray-300 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats Summary - Only total count remains */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">เอกสารทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs font-medium text-gray-600 mt-1">
                    {stats.today} รายการในวันนี้
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DocumentMagnifyingGlassIcon className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">ตัวกรองข้อมูล</h2>
                <FunnelIcon className="h-5 w-5 text-gray-600" />
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    ค้นหาเอกสาร
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ชื่อเอกสาร..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900 font-medium"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                  </div>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    ระดับความเสี่ยง
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "ALL", label: "ทั้งหมด", color: "bg-gray-500" },
                      { value: "HIGH", label: "สูง", color: "bg-red-600" },
                      { value: "MEDIUM", label: "กลาง", color: "bg-amber-600" },
                      { value: "LOW", label: "ต่ำ", color: "bg-emerald-600" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterRisk(option.value)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg ${
                          filterRisk === option.value
                            ? "bg-blue-50 border border-blue-300"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${option.color}`}></div>
                          <span className="text-sm font-medium text-gray-800">{option.label}</span>
                        </div>
                        {filterRisk === option.value && (
                          <CheckIcon className="h-4 w-4 text-blue-700" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    ช่วงเวลา
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "ALL", label: "ทุกเวลา" },
                      { value: "TODAY", label: "วันนี้" },
                      { value: "WEEK", label: "สัปดาห์นี้" },
                      { value: "MONTH", label: "เดือนนี้" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterDateRange(option.value as DateFilter)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg ${
                          filterDateRange === option.value
                            ? "bg-blue-50 border border-blue-300"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-800">{option.label}</span>
                        {filterDateRange === option.value && (
                          <CheckIcon className="h-4 w-4 text-blue-700" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results Count */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">พบทั้งหมด</span>
                      <span className="font-bold text-gray-900">{filteredAndSortedItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">จากทั้งหมด</span>
                      <span className="font-bold text-gray-900">{items.length}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={fetchList}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 font-semibold disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรชข้อมูล
                  </button>
                  {(searchTerm || filterRisk !== "ALL" || filterDateRange !== "ALL") && (
                    <button
                      onClick={clearAllFilters}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-800 rounded-xl hover:bg-amber-100 font-semibold"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      ล้างตัวกรองทั้งหมด
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Table */}
          <div className="lg:w-3/4">
            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mb-6 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white font-bold">
                      {selectedItems.length}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        เลือก {selectedItems.length} รายการ
                      </h3>
                      <p className="text-blue-100 font-medium">
                        เลือกดำเนินการกับรายการที่เลือกทั้งหมด
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={deleteSelected}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-red-700 rounded-xl hover:bg-red-50 font-bold"
                    >
                      <TrashIcon className="h-4 w-4" />
                      ลบที่เลือก
                    </button>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="px-4 py-2.5 text-white hover:text-blue-100 font-semibold"
                    >
                      ยกเลิกการเลือก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table Header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="p-5 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">รายการเปรียบเทียบ</h3>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      นำเมาส์ไปชี้ที่ปุ่มความเสี่ยงเพื่อดูกราฟแบบรวดเร็ว • คลิกเพื่อเปิดกราฟแบบเต็ม
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    >
                      <option value="date">เรียงตามวันที่</option>
                      <option value="name">เรียงตามชื่อ</option>
                      <option value="risk">เรียงตามความเสี่ยง</option>
                      <option value="changes">เรียงตามการเปลี่ยนแปลง</option>
                    </select>
                    <button
                      onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                      className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100"
                    >
                      {sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 text-gray-700" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Filters */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {filterRisk !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      ความเสี่ยง: {filterRisk === "HIGH" ? "สูง" : filterRisk === "MEDIUM" ? "กลาง" : "ต่ำ"}
                      <button onClick={() => setFilterRisk("ALL")} className="ml-1">
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Table Content */}
              {loading && (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center">
                    <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-700" />
                  </div>
                  <p className="mt-6 text-gray-800 font-semibold">กำลังโหลดข้อมูล...</p>
                  <p className="text-sm font-medium text-gray-600 mt-2">กรุณารอสักครู่</p>
                </div>
              )}

              {error && !loading && (
                <div className="p-12 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 mb-6">
                    <ExclamationTriangleIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ไม่สามารถโหลดข้อมูล</h3>
                  <p className="text-gray-700 mb-6 max-w-md mx-auto font-medium">{error}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={fetchList}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 font-semibold"
                    >
                      ลองอีกครั้ง
                    </button>
                    <Link
                      href="/"
                      className="px-5 py-2.5 bg-gray-100 border border-gray-300 text-gray-800 rounded-xl hover:bg-gray-200 font-semibold"
                    >
                      ไปเปรียบเทียบใหม่
                    </Link>
                  </div>
                </div>
              )}

              {!loading && !error && filteredAndSortedItems.length === 0 && (
                <div className="p-12 text-center">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 mb-6">
                    <DocumentMagnifyingGlassIcon className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {items.length === 0 ? "ยังไม่มีประวัติการเปรียบเทียบ" : "ไม่พบผลลัพธ์"}
                  </h3>
                  <p className="text-gray-700 mb-8 max-w-md mx-auto font-medium">
                    {items.length === 0
                      ? "เริ่มต้นด้วยการเปรียบเทียบเอกสารสองเวอร์ชันเพื่อสร้างประวัติแรกของคุณ"
                      : "ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูผลลัพธ์อื่นๆ"}
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90"
                  >
                    <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                    เริ่มเปรียบเทียบเอกสาร
                  </Link>
                </div>
              )}

              {!loading && !error && filteredAndSortedItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-4">
                          <input
                            type="checkbox"
                            checked={
                              selectedItems.length > 0 &&
                              selectedItems.length === filteredAndSortedItems.length
                            }
                            onChange={selectAllVisible}
                            className="h-4 w-4 rounded border-gray-400 text-blue-700 focus:ring-blue-500"
                          />
                        </th>
                        <th className="p-4 text-left text-sm font-bold text-gray-800">เอกสาร</th>
                        <th className="p-4 text-left text-sm font-bold text-gray-800">วันที่</th>
                        <th className="p-4 text-left text-sm font-bold text-gray-800">ความเสี่ยง</th>
                        <th className="p-4 text-left text-sm font-bold text-gray-800">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredAndSortedItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-gray-100 ${selectedItems.includes(item.id) ? "bg-blue-50" : ""
                            }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleSelectItem(item.id)}
                              className="h-4 w-4 rounded border-gray-400 text-blue-700 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-bold text-gray-900 mb-1">
                                {item.document_name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded font-medium">
                                  ID: {item.id}
                                </span>
                                {item.changes_count !== undefined && (
                                  <span className="text-xs px-2 py-1 bg-violet-100 text-violet-800 rounded font-semibold">
                                    {item.changes_count} การเปลี่ยนแปลง
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-medium text-gray-600 mt-2">
                                เวอร์ชัน: {item.version_old_label} → {item.version_new_label}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatInBangkokTimezone(item.created_at)}
                            </div>
                          </td>
                          <td className="p-4">
                            <RiskBadge risk={item.overall_risk_level} item={item} />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/compare/${item.id}`}
                                className="p-2 text-gray-700 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                title="ดูรายงาน"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => setActiveItem(item)}
                                className="p-2 text-gray-700 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                                title="ดูกราฟวิเคราะห์"
                              >
                                <ChartPieIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => continueComparison(item)}
                                disabled={continuingId === item.id}
                                className="p-2 text-gray-700 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                                title="เทียบต่อจากเวอร์ชันนี้"
                              >
                                {continuingId === item.id ? (
                                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                ) : (
                                  <ArrowRightCircleIcon className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                disabled={deletingId === item.id}
                                className="p-2 text-gray-700 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                title="ลบรายการ"
                              >
                                {deletingId === item.id ? (
                                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                ) : (
                                  <TrashIcon className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer */}
              {!loading && !error && filteredAndSortedItems.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-sm font-medium text-gray-700">
                      แสดง {filteredAndSortedItems.length} จาก {items.length} รายการ
                      {searchTerm && ` สำหรับ "${searchTerm}"`}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-700">
                        เรียงตาม <span className="font-bold text-gray-900">
                          {sortField === "date" ? "วันที่" : 
                           sortField === "name" ? "ชื่อ" : 
                           sortField === "risk" ? "ความเสี่ยง" : "การเปลี่ยนแปลง"}
                        </span> (
                        {sortDirection === "desc" ? "มากไปน้อย" : "น้อยไปมาก"})
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}