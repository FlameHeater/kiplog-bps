// pdfmake ships no browser-build type declarations; this is a minimal
// ambient shim covering only what lib/reporting/pdf-data-dukung.ts uses.
declare module 'pdfmake/build/pdfmake' {
  interface TCreatedPdf {
    getBlob(callback: (blob: Blob) => void): void;
  }

  interface PdfMakeStatic {
    vfs: Record<string, string>;
    createPdf(docDefinition: Record<string, unknown>): TCreatedPdf;
  }

  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;
  export default vfs;
}
