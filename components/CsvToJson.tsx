// components/CsvToJson.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type JsonRow = Record<string, string>;

function parseCsv(text: string): JsonRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    return headers.reduce<JsonRow>((row, header, i) => {
      row[header] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
      return row;
    }, {});
  });
}

const swalBase = {
  confirmButtonColor: "#17a7ce",
  cancelButtonColor: "#e5e7eb",
  customClass: {
    popup: "rounded-2xl font-sans text-sm",
    confirmButton: "rounded-lg px-5 py-2 text-sm font-medium",
    cancelButton: "rounded-lg px-5 py-2 text-sm font-medium !text-gray-700",
  },
};

export default function CsvToJson() {
  const [json, setJson] = useState<JsonRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      Swal.fire({
        ...swalBase,
        icon: "error",
        title: "Invalid file type",
        text: "Please upload a valid .csv file.",
      });
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      Swal.fire({
        ...swalBase,
        title: "Converting...",
        html: `<span style="color:#6b7280;font-size:13px;">Parsing <strong>${file.name}</strong></span>`,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();

          setTimeout(() => {
            try {
              const text = e.target?.result as string;
              const result = parseCsv(text);

              if (result.length === 0) {
                Swal.fire({
                  ...swalBase,
                  icon: "warning",
                  title: "Empty file",
                  text: "The CSV file appears to be empty or has no data rows.",
                });
                setJson(null);
              } else {
                setJson(result);
                Swal.fire({
                  ...swalBase,
                  icon: "success",
                  title: "Conversion successful",
                  text: `${result.length} row${result.length !== 1 ? "s" : ""} converted from "${file.name}".`,
                  timer: 2500,
                  showConfirmButton: false,
                });
              }
            } catch {
              Swal.fire({
                ...swalBase,
                icon: "error",
                title: "Parse error",
                text: "Failed to parse the CSV file. Please check the format.",
              });
              setJson(null);
            }
          }, 600);
        },
      });
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleCopy = async () => {
    if (!json) return;
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Swal.fire({
      ...swalBase,
      icon: "success",
      title: "Copied!",
      text: "JSON copied to clipboard.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleDownload = () => {
    if (!json) return;
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? fileName.replace(/\.csv$/i, ".json") : "output.json";
    a.click();
    URL.revokeObjectURL(url);

    Swal.fire({
      ...swalBase,
      icon: "success",
      title: "Download started",
      text: `Saved as ${a.download}`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      ...swalBase,
      icon: "question",
      title: "Reset?",
      text: "This will clear the current conversion.",
      showCancelButton: true,
      confirmButtonText: "Yes, reset",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setJson(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f9fd] flex flex-col items-center justify-center p-6 font-sans">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#17a7ce] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CSV to JSON</h1>
        </div>
        <p className="text-sm text-gray-500">Upload a CSV file and instantly convert it to JSON</p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {/* Upload Card */}
        <Card className="border border-[#bae6f5] shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-800">Upload File</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Supports standard CSV with comma delimiters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-[#17a7ce] bg-[#e8f7fd]"
                  : "border-[#bae6f5] hover:border-[#17a7ce] hover:bg-[#f0f9fd]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-[#17a7ce]" : "bg-[#e8f7fd]"}`}>
                  <svg className={`w-5 h-5 transition-colors ${isDragging ? "text-white" : "text-[#17a7ce]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                {fileName ? (
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{ backgroundColor: "#e8f7fd", color: "#17a7ce", border: "1px solid #bae6f5" }}
                      className="text-xs font-medium px-2 py-0.5"
                    >
                      {fileName}
                    </Badge>
                    <span className="text-xs text-gray-400">— click to replace</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Drop your CSV here</p>
                    <p className="text-xs text-gray-400">or click to browse files</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Card */}
        {json && (
          <Card className="border border-[#bae6f5] shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-gray-800">JSON Output</CardTitle>
                  <CardDescription className="text-xs text-gray-400 mt-0.5">
                    {json.length} row{json.length !== 1 ? "s" : ""} &bull; {Object.keys(json[0]).length} fields
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    className="bg-[#17a7ce] hover:bg-[#1292b5] text-white text-xs h-8 px-3 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="text-xs h-8 px-3 rounded-lg border-[#bae6f5] text-[#17a7ce] hover:bg-[#f0f9fd]"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReset}
                    className="text-xs h-8 px-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <pre className="bg-[#f8fcfe] border border-[#daf0f8] rounded-xl p-4 text-xs text-[#0e7a9e] overflow-auto max-h-[400px] leading-relaxed">
                {JSON.stringify(json, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-300">All processing happens in your browser — no data is uploaded.</p>
    </div>
  );
}