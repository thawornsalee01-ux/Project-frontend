
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MarkdownContent } from "../components/MarkdownContent";
import {
  DocumentMagnifyingGlassIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

type CompareResult = {
  doc_name: string;
  v1_label: string;
  v2_label: string;
  pages_v1: number;
  pages_v2: number;
  paragraphs_v1: number;
  paragraphs_v2: number;
  changes_count: number;
  overall_risk_level: string;
  summary_text: string;
  run_id: number;
  html_report_url: string;
  json_report_url: string;
};

type BaseComparison = {
  id: number;
  document_name: string;
  version_new_label: string;
  file_v2_url?: string;
};

// ชัดเจนกว่าเดิม
const COMPARE_API = process.env.NEXT_PUBLIC_COMPARE_API ?? "/api/compare";
const HISTORY_API = process.env.NEXT_PUBLIC_HISTORY_API ?? "/api/history";
const HISTORY_CONTINUE_API = process.env.NEXT_PUBLIC_HISTORY_CONTINUE_API ?? "/api/history";

// Facebook Color Palette
const COLORS = {
  primary: "#1877F2",
  primaryLight: "#E7F3FF",
  primaryHover: "#166FE5",
  secondary: "#1b68edff",
  secondaryHover: "#1a35e8ff",
  success: "#1877F2",
  successLight: "#E9F7E8",
  warning: "#1a35e8ff",
  warningLight: "#FFF8E6",
  danger: "#FA383E",
  dangerLight: "#FFEBEE",
  background: "#F0F2F5",
  light: "#FFFFFF",
  gray: "#65676B",
  grayLight: "#E4E6EB",
  grayLighter: "#F0F2F5",
  dark: "#050505",
  continue: "#10B981",
  continueLight: "#D1FAE5",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}
         style={{
           boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)"
         }}>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center space-x-3">
      <div className="relative">
        <div className="w-5 h-5 border-2 border-blue-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-5 h-5 border-2 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <span className="text-sm font-medium text-gray-700">กำลังประมวลผล...</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueId = searchParams.get('continue');
  
  const [docName, setDocName] = useState("");
  const [showDocName, setShowDocName] = useState(false);
  const [v1Label, setV1Label] = useState("Draft");
  const [v2Label, setV2Label] = useState("Final");
  const [fileV1, setFileV1] = useState<File | null>(null);
  const [fileV2, setFileV2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = React.useRef<HTMLDivElement>(null);

  
  // States for continue mode
  const [isContinueMode, setIsContinueMode] = useState(false);
  const [baseComparison, setBaseComparison] = useState<BaseComparison | null>(null);
  const [loadingBase, setLoadingBase] = useState(false);

  // Initialize mode based on URL
  useEffect(() => {
    if (continueId) {
      setIsContinueMode(true);
      loadBaseComparison(continueId);
    }
  }, [continueId]);

  useEffect(() => {
  if (logRef.current) {
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }
}, [logs]);

  const loadBaseComparison = async (id: string) => {
    setLoadingBase(true);
    try {
      const res = await fetch(`${HISTORY_API}/comparisons/${id}`);
      if (!res.ok) throw new Error('ไม่พบข้อมูลการเปรียบเทียบเดิม');
      
      const data = await res.json();
      setBaseComparison({
        id: data.id,
        document_name: data.document_name,
        version_new_label: data.version_new_label,
      });
      
      // Auto-fill form
      setDocName(data.document_name);
      setV1Label(data.version_new_label || "Base Version");
      setV2Label("New Version");
      
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลเดิมได้');
      setIsContinueMode(false);
    } finally {
      setLoadingBase(false);
    }
  };

  const exitContinueMode = () => {
    setIsContinueMode(false);
    setBaseComparison(null);
    setDocName("");
    setV1Label("Draft");
    setV2Label("Final");
    setFileV1(null);
    setFileV2(null);
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validate based on mode
    if (isContinueMode) {
      if (!fileV2) {
        setError("กรุณาเลือกไฟล์เวอร์ชันใหม่ที่ต้องการเปรียบเทียบ");
        return;
      }
    } else {
      if (!fileV1 || !fileV2) {
        setError("กรุณาเลือกไฟล์ทั้งสองเวอร์ชัน");
        return;
      }
    }

    const safeDocName = docName?.trim() || (fileV1?.name ? fileV1.name.replace(/\.pdf$/i, "") : "document");
    const safeV1 = v1Label?.trim() || "v1";
    const safeV2 = v2Label?.trim() || "v2";

    const formData = new FormData();
    formData.append("doc_name", safeDocName);
    formData.append("v1_label", safeV1);
    formData.append("v2_label", safeV2);
    
    if (isContinueMode && baseComparison) {
  // ✅ ตรงกับ FastAPI ของ History
  formData.append("document_id", baseComparison.id.toString());
  formData.append("v2_label", safeV2);   // <-- แก้ชื่อให้ตรง backend
  formData.append("file_v2", fileV2!);
} else {
  formData.append("file_v1", fileV1!);
  formData.append("file_v2", fileV2!);
}

    setProgress(0);
    setCurrentStep("");
    setLogs([]);

    setLoading(true);
try {
  const endpoint = isContinueMode
    ? `${HISTORY_CONTINUE_API}/compare/continue/start`
    : `${COMPARE_API}/compare`;

  // --------- 1) ส่งงาน (ได้ job_id) ---------
  const startRes = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`API error ${startRes.status}: ${text}`);
  }

  const { job_id } = await startRes.json();
  setJobId(job_id);
  setPollingActive(true);


const interval = setInterval(async () => {
  try {
    // ===== แยก URL ตามโหมด (ตรง Swagger) =====
    const statusUrl = isContinueMode
      ? `${HISTORY_CONTINUE_API}/compare/continue/status/${job_id}`
      : `${COMPARE_API}/compare/status/${job_id}`;

    const resultUrl = isContinueMode
      ? `${HISTORY_CONTINUE_API}/compare/continue/result/${job_id}`
      : `${COMPARE_API}/compare/result/${job_id}`;

    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();
    setProgress(statusData.progress ?? 0);
    setCurrentStep(statusData.current_step ?? "");
    setLogs(statusData.logs ?? []);

    console.log("Status:", statusData.status);

    if (statusData.status === "done") {
      setProgress(100);
      clearInterval(interval);
      setPollingActive(false);

      const resultRes = await fetch(resultUrl);

      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`Result error: ${text}`);
      }

      const finalResult: CompareResult = await resultRes.json();
      setResult(finalResult);
      setLoading(false);
    }

    if (statusData.status === "error") {
      clearInterval(interval);
      setPollingActive(false);
      setLoading(false);
      setError("Backend ประมวลผลล้มเหลว");
    }
  } catch (err: any) {
    clearInterval(interval);
    setPollingActive(false);
    setLoading(false);
    setError(err?.message || "เกิดข้อผิดพลาดระหว่างรอผลลัพธ์");
  }
}, 5000);


} catch (err: any) {
  setLoading(false);
  setError(err?.message || "เกิดข้อผิดพลาดในการประมวลผล");
}
  }

  const handleReset = () => {
    setDocName("");
    setV1Label(isContinueMode ? baseComparison?.version_new_label || "Base Version" : "Draft");
    setV2Label("Final");
    setFileV1(null);
    setFileV2(null);
    setError(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      <div className="relative max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4"
            style={{ backgroundColor: isContinueMode ? COLORS.continue : COLORS.primary }}>
            <DocumentMagnifyingGlassIcon className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: COLORS.dark }}>
            {isContinueMode ? "เทียบต่อจากเอกสารเดิม" : "เปรียบเทียบเอกสาร PDF"}
          </h1>
          <p className="text-gray-600 mb-4" style={{ color: COLORS.gray }}>
            {isContinueMode 
              ? "อัปโหลดเวอร์ชันใหม่เพื่อเปรียบเทียบกับเอกสารเดิม" 
              : "อัปโหลดเอกสาร 2 เวอร์ชันเพื่อวิเคราะห์ความแตกต่างและประเมินความเสี่ยง"}
          </p>
          
          {/* Quick navigation */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium hover:opacity-80 transition-opacity"
              style={{
                borderColor: COLORS.primary,
                color: COLORS.primary,
                backgroundColor: COLORS.light
              }}
            >
              <ChartBarIcon className="h-4 w-4" />
              ดูประวัติ
            </Link>
            
            {isContinueMode && (
              <button
                onClick={exitContinueMode}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium hover:opacity-80 transition-opacity"
                style={{
                  borderColor: COLORS.grayLight,
                  color: COLORS.gray,
                  backgroundColor: COLORS.light
                }}
              >
                <XMarkIcon className="h-4 w-4" />
                ออกจากโหมดเทียบต่อ
              </button>
            )}
          </div>
        </div>

        {/* Mode Indicator */}
        {isContinueMode && baseComparison && (
          <Card className="p-4 mb-6 border-l-4" style={{ borderLeftColor: COLORS.continue, backgroundColor: COLORS.continueLight }}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "white" }}>
                <ClockIcon className="h-5 w-5" style={{ color: COLORS.continue }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: COLORS.dark }}>
                    กำลังเทียบต่อจากประวัติ
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.continue, color: "white" }}>
                    โหมดเทียบต่อ
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: COLORS.gray }}>
                  เอกสาร: <span className="font-medium">{baseComparison.document_name}</span> • 
                  เวอร์ชันฐาน: <span className="font-medium">{baseComparison.version_new_label}</span> • 
                  ID: <span className="font-medium">#{baseComparison.id}</span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Upload Form */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg" style={{ backgroundColor: isContinueMode ? COLORS.continueLight : COLORS.primaryLight }}>
                <DocumentTextIcon className="h-5 w-5" style={{ color: isContinueMode ? COLORS.continue : COLORS.primary }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: COLORS.dark }}>
                {isContinueMode ? "อัปโหลดเวอร์ชันใหม่" : "อัปโหลดเอกสาร"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Document Name Toggle */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowDocName(!showDocName)}
                  className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: isContinueMode ? COLORS.continue : COLORS.primary }}
                >
                  {showDocName ? (
                    <>
                      <EyeSlashIcon className="h-4 w-4" />
                      ซ่อนการตั้งชื่อเอกสาร
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-4 w-4" />
                      ตั้งชื่อเอกสาร (เพิ่มเติม)
                    </>
                  )}
                  {showDocName ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>

                {/* Document Info - Collapsible */}
                {showDocName && (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: COLORS.dark }}>
                        ชื่อเอกสาร
                      </label>
                      <input
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="เช่น ใบเสนอราคา-บริษัท-ABC หรือ สัญญาเช่าที่ดิน"
                        className="w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all"
                        style={{ 
                          backgroundColor: COLORS.light,
                          borderColor: COLORS.grayLight,
                          color: COLORS.dark,
                        }}
                      />
                      <p className="text-xs mt-1" style={{ color: COLORS.gray }}>
                        ชื่อนี้จะปรากฏในรายงานและประวัติการตรวจสอบ
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: COLORS.dark }}>
                          {isContinueMode ? "เวอร์ชันฐาน (จากประวัติ)" : "เวอร์ชันต้นฉบับ"}
                        </label>
                        <input
                          value={v1Label}
                          onChange={isContinueMode ? undefined : (e) => setV1Label(e.target.value)}
                          readOnly={isContinueMode}
                          placeholder={isContinueMode ? "จากประวัติ" : "เช่น Draft, ฉบับร่าง"}
                          className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${
                            isContinueMode ? "bg-gray-50" : "bg-white"
                          }`}
                          style={{ 
                            borderColor: COLORS.grayLight,
                            color: COLORS.dark,
                          }}
                        />
                        {isContinueMode && (
                          <p className="text-xs mt-1" style={{ color: COLORS.gray }}>
                            ใช้จากประวัติการเปรียบเทียบเดิม
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: COLORS.dark }}>
                          เวอร์ชัน{isContinueMode ? "ใหม่" : "แก้ไข"}
                        </label>
                        <input
                          value={v2Label}
                          onChange={(e) => setV2Label(e.target.value)}
                          placeholder={isContinueMode ? "เช่น Draft v3, Final Updated" : "เช่น Final, ฉบับสมบูรณ์"}
                          className="w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all"
                          style={{ 
                            backgroundColor: COLORS.light,
                            borderColor: COLORS.grayLight,
                            color: COLORS.dark,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div className={`grid gap-4 ${isContinueMode ? '' : 'md:grid-cols-2'}`}>
                  {/* Version 1 - Hide in continue mode */}
                  {!isContinueMode && (
                    <div className={`
                      rounded-xl p-4 transition-all duration-300
                      ${fileV1 
                        ? "border-2 bg-blue-50" 
                        : "border-2 border-dashed hover:border-blue-400"
                      }
                    `}
                    style={{ 
                      borderColor: fileV1 ? COLORS.primary : COLORS.grayLight,
                      backgroundColor: fileV1 ? COLORS.primaryLight : COLORS.light
                    }}>
                      <div className="text-center mb-4">
                        <div className={`
                          inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3
                          ${fileV1 ? "bg-white" : "bg-gray-100"}
                        `}>
                          <CloudArrowUpIcon className={`h-6 w-6 ${fileV1 ? "text-blue-600" : "text-gray-400"}`} />
                        </div>
                        <p className={`text-sm font-medium mb-1 ${fileV1 ? "text-blue-700" : "text-gray-700"}`}>
                          {fileV1 ? "✅ ไฟล์ที่เลือกแล้ว" : "เลือกไฟล์เวอร์ชันต้นฉบับ"}
                        </p>
                        {fileV1 ? (
                          <p className="text-xs text-gray-600 truncate bg-white rounded px-2 py-1 mt-2">
                            📄 {fileV1.name}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">PDF หรือ Word</p>
                        )}
                      </div>
                      <div className="mt-4">
                        <label className="block">
                          <span className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                              backgroundColor: fileV1 ? COLORS.success : COLORS.primary,
                              color: "white"
                            }}
                            onMouseEnter={(e) => {
                              if (fileV1) {
                                e.currentTarget.style.backgroundColor = COLORS.secondaryHover;
                              } else {
                                e.currentTarget.style.backgroundColor = COLORS.primaryHover;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (fileV1) {
                                e.currentTarget.style.backgroundColor = COLORS.success;
                              } else {
                                e.currentTarget.style.backgroundColor = COLORS.primary;
                              }
                            }}>
                            {fileV1 ? (
                              <>
                                <ArrowPathIcon className="h-4 w-4 mr-2" />
                                เปลี่ยนไฟล์
                              </>
                            ) : (
                              <>
                                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                อัปโหลดไฟล์
                              </>
                            )}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => setFileV1(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Version 2 - Always show */}
                  <div className={`
                    rounded-xl p-4 transition-all duration-300
                    ${fileV2 
                      ? "border-2 bg-green-50" 
                      : "border-2 border-dashed hover:border-green-400"
                    }
                  `}
                  style={{ 
                    borderColor: fileV2 ? COLORS.success : COLORS.grayLight,
                    backgroundColor: fileV2 ? COLORS.successLight : COLORS.light
                  }}>
                    <div className="text-center mb-4">
                      <div className={`
                        inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3
                        ${fileV2 ? "bg-white" : "bg-gray-100"}
                      `}>
                        <CloudArrowUpIcon className={`h-6 w-6 ${fileV2 ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <p className={`text-sm font-medium mb-1 ${fileV2 ? "text-green-700" : "text-gray-700"}`}>
                        {fileV2 
                          ? "✅ ไฟล์ที่เลือกแล้ว" 
                          : isContinueMode 
                            ? "เลือกไฟล์เวอร์ชันใหม่" 
                            : "เลือกไฟล์เวอร์ชันแก้ไข"}
                      </p>
                      {fileV2 ? (
                        <p className="text-xs text-gray-600 truncate bg-white rounded px-2 py-1 mt-2">
                          📄 {fileV2.name}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">PDF หรือ Word</p>
                      )}
                    </div>
                    <div className="mt-4">
                      <label className="block">
                        <span className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: fileV2 ? COLORS.warning : COLORS.success,
                            color: "white"
                          }}
                          onMouseEnter={(e) => {
                            if (fileV2) {
                              e.currentTarget.style.backgroundColor = "#1c08f3ff";
                            } else {
                              e.currentTarget.style.backgroundColor = COLORS.secondaryHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (fileV2) {
                              e.currentTarget.style.backgroundColor = COLORS.warning;
                            } else {
                              e.currentTarget.style.backgroundColor = COLORS.success;
                            }
                          }}>
                          {fileV2 ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 mr-2" />
                              เปลี่ยนไฟล์
                            </>
                          ) : (
                            <>
                              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                              {isContinueMode ? "อัปโหลดเวอร์ชันใหม่" : "อัปโหลดไฟล์"}
                            </>
                          )}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => setFileV2(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Note for continue mode */}
                {isContinueMode && (
                  <div className="rounded-lg border p-4" style={{ backgroundColor: COLORS.continueLight, borderColor: COLORS.continue }}>
                    <div className="flex items-start gap-3">
                      <InformationCircleIcon className="h-5 w-5" style={{ color: COLORS.continue }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: COLORS.dark }}>กำลังใช้งานโหมดเทียบต่อ</p>
                        <p className="text-xs mt-1" style={{ color: COLORS.gray }}>
                          ไฟล์เวอร์ชันฐานจะถูกใช้จากประวัติการเปรียบเทียบเดิม คุณไม่จำเป็นต้องอัปโหลดไฟล์เวอร์ชันฐานอีกครั้ง
                          {baseComparison && ` (ID: #${baseComparison.id})`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border p-4 animate-fadeIn"
                  style={{ 
                    backgroundColor: COLORS.dangerLight,
                    borderColor: "#2f51e8ff"
                  }}>
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || (isContinueMode ? !fileV2 : !fileV1 || !fileV2)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isContinueMode ? COLORS.continue : COLORS.primary,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && (isContinueMode ? fileV2 : fileV1 && fileV2)) {
                      e.currentTarget.style.backgroundColor = isContinueMode ? "#0DA271" : COLORS.primaryHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && (isContinueMode ? fileV2 : fileV1 && fileV2)) {
                      e.currentTarget.style.backgroundColor = isContinueMode ? COLORS.continue : COLORS.primary;
                    }
                  }}
                >
                  {loading ? (
                  <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  {currentStep || "เริ่มประมวลผล..."}
                  </>
                  ) : (
                  <>
                  {isContinueMode ? "เริ่มเปรียบเทียบกับเวอร์ชันใหม่" : "เริ่มเปรียบเทียบ"}
                  <ArrowRightIcon className="h-4 w-4" />
                  </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg border font-medium hover:opacity-80 transition-all disabled:opacity-50"
                  style={{
                    borderColor: COLORS.grayLight,
                    color: COLORS.gray,
                    backgroundColor: COLORS.light
                  }}
                >
                  ล้างข้อมูล
                </button>

                {isContinueMode && (
                  <button
                    type="button"
                    onClick={exitContinueMode}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg border font-medium hover:opacity-80 transition-all disabled:opacity-50"
                    style={{
                      borderColor: COLORS.grayLight,
                      color: COLORS.gray,
                      backgroundColor: COLORS.light
                    }}
                  >
                    เริ่มใหม่ทั้งหมด
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: COLORS.dark }}>ผลการวิเคราะห์</h2>
                <div className="flex items-center gap-2">
                  {isContinueMode && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.continueLight, color: COLORS.continue }}>
                      เทียบต่อจาก #{baseComparison?.id}
                    </span>
                  )}
                  <span className="text-sm" style={{ color: COLORS.gray }}>Run ID: {result.run_id}</span>
                </div>
              </div>

              <Card className="p-6">
                {/* Document Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.dark }}>
                    {result.doc_name}
                  </h3>
                  <div className="flex items-center gap-2" style={{ color: COLORS.gray }}>
                    <span className="font-medium" style={{ color: isContinueMode ? COLORS.continue : COLORS.primary }}>{result.v1_label}</span>
                    <ArrowRightIcon className="h-4 w-4" />
                    <span className="font-medium" style={{ color: COLORS.success }}>{result.v2_label}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg p-4" style={{ backgroundColor: isContinueMode ? COLORS.continueLight : COLORS.primaryLight }}>
                    <p className="text-sm mb-1" style={{ color: COLORS.gray }}>จำนวนหน้า</p>
                    <p className="text-xl font-bold" style={{ color: COLORS.dark }}>
                      {result.pages_v1} → {result.pages_v2}
                    </p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.successLight }}>
                    <p className="text-sm mb-1" style={{ color: COLORS.gray }}>จำนวนย่อหน้า</p>
                    <p className="text-xl font-bold" style={{ color: COLORS.dark }}>
                      {result.paragraphs_v1} → {result.paragraphs_v2}
                    </p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.warningLight }}>
                    <p className="text-sm mb-1" style={{ color: COLORS.gray }}>การเปลี่ยนแปลง</p>
                    <p className="text-xl font-bold" style={{ color: COLORS.dark }}>{result.changes_count}</p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: "#FEF2F2" }}>
                    <p className="text-sm mb-1" style={{ color: COLORS.gray }}>ระดับความเสี่ยง</p>
                    <div className="mt-1">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        result.overall_risk_level.includes('สูง') || result.overall_risk_level.includes('HIGH')
                          ? 'bg-red-100 text-red-800'
                          : result.overall_risk_level.includes('กลาง') || result.overall_risk_level.includes('MEDIUM')
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {result.overall_risk_level}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.dark }}>สรุปผลการวิเคราะห์</h4>
                  <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.background }}>
                    <div style={{ color: COLORS.dark }}>
                      <MarkdownContent content={result.summary_text} />
                    </div>
                  </div>
                </div>

                {/* Report Links */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`${COMPARE_API}${result.html_report_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium hover:opacity-80 transition-opacity"
                    style={{
                      borderColor: isContinueMode ? COLORS.continue : COLORS.primary,
                      color: isContinueMode ? COLORS.continue : COLORS.primary,
                      backgroundColor: COLORS.light
                    }}
                  >
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                    ดูรายงาน HTML
                  </a>
                  <a
                    href={`${COMPARE_API}${result.json_report_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium hover:opacity-80 transition-opacity"
                    style={{
                      borderColor: COLORS.grayLight,
                      color: COLORS.gray,
                      backgroundColor: COLORS.light
                    }}
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    ดาวน์โหลด JSON
                  </a>
                  <Link
                    href="/history"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium hover:opacity-80 transition-opacity text-center"
                    style={{
                      backgroundColor: COLORS.primary,
                      color: COLORS.light
                    }}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    ดูประวัติทั้งหมด
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: COLORS.primaryLight }}>
                <DocumentMagnifyingGlassIcon className="h-5 w-5" style={{ color: COLORS.primary }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: COLORS.dark }}>วิเคราะห์ละเอียด</h3>
              <p className="text-sm" style={{ color: COLORS.gray }}>
                ตรวจจับความแตกต่างทุกจุดในเอกสาร ทั้งข้อความ รูปแบบ และโครงสร้าง
              </p>
            </Card>
            
            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: "#F3E8FF" }}>
                <SparklesIcon className="h-5 w-5" style={{ color: "#8B5CF6" }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: COLORS.dark }}>AI ประเมินความเสี่ยง</h3>
              <p className="text-sm" style={{ color: COLORS.gray }}>
                ระบบ AI วิเคราะห์ความเสี่ยง 3 มิติ: กฎหมาย การเงิน การดำเนินงาน
              </p>
            </Card>
            
            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: COLORS.successLight }}>
                <ChartBarIcon className="h-5 w-5" style={{ color: COLORS.success }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: COLORS.dark }}>รายงานอัจฉริยะ</h3>
              <p className="text-sm" style={{ color: COLORS.gray }}>
                สร้างรายงานพร้อมกราฟ Spider และสถิติเข้าใจง่าย
              </p>
            </Card>

            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: COLORS.continueLight }}>
                <ClockIcon className="h-5 w-5" style={{ color: COLORS.continue }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: COLORS.dark }}>ติดตามประวัติ</h3>
              <p className="text-sm" style={{ color: COLORS.gray }}>
                ดูและทำงานต่อจากประวัติการเปรียบเทียบย้อนหลัง
              </p>
            </Card>
          </div>

          {/* Quick Guide */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.dark }}>
              {isContinueMode ? "วิธีใช้งานโหมดเทียบต่อ" : "วิธีใช้งาน"}
            </h3>
            <div className="space-y-3">
              {isContinueMode ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.continueLight, color: COLORS.continue }}>
                      <CheckCircleIcon className="h-3 w-3" />
                    </div>
                    <p style={{ color: COLORS.gray }}>ไฟล์เวอร์ชันฐานถูกโหลดจากประวัติอัตโนมัติ</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.continueLight, color: COLORS.continue }}>
                      1
                    </div>
                    <p style={{ color: COLORS.gray }}>เลือกไฟล์เวอร์ชันใหม่ที่ต้องการเปรียบเทียบ</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.continueLight, color: COLORS.continue }}>
                      2
                    </div>
                    <p style={{ color: COLORS.gray }}>กดปุ่ม "เริ่มเปรียบเทียบกับเวอร์ชันใหม่"</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.continueLight, color: COLORS.continue }}>
                      3
                    </div>
                    <p style={{ color: COLORS.gray }}>ดูผลการวิเคราะห์และดาวน์โหลดรายงาน</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primary }}>
                      1
                    </div>
                    <p style={{ color: COLORS.gray }}>เลือกไฟล์ PDF หรือ Word ทั้งสองเวอร์ชันที่ต้องการเปรียบเทียบ</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primary }}>
                      2
                    </div>
                    <p style={{ color: COLORS.gray }}>กดปุ่ม "เริ่มเปรียบเทียบ" เพื่อวิเคราะห์ความแตกต่าง</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primary }}>
                      3
                    </div>
                    <p style={{ color: COLORS.gray }}>ดูผลการวิเคราะห์และดาวน์โหลดรายงาน</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: COLORS.continueLight, color: COLORS.continue }}>
                      4
                    </div>
                    <p style={{ color: COLORS.gray }}>ดูประวัติและทำงานต่อจากเอกสารเดิมในหน้า History</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Facebook-like focus styles */
        input:focus, button:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.2);
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #F0F2F5;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #BCC0C4;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #8A8D91;
        }
      `}</style>
    </div>
  );
}
