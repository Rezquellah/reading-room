"use client";
export default function PrintControls() {
  return (
    <div className="print-controls">
      <button onClick={() => window.print()}>Print / Save as PDF</button>
      <span>
        Choose “Save as PDF” in your print dialog. Enable headers and footers
        for page numbers.
      </span>
    </div>
  );
}
