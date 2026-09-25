import { apiRequest } from "./client";

export type CertificateFileType = "pdf" | "preview";

export const certificateFilesApi = {
  getCertificateFile: (certificateId: string, type: CertificateFileType): Promise<Blob> =>
    apiRequest<Blob>(
      `/certificates/${encodeURIComponent(certificateId)}/file?type=${type}`,
      { responseType: "blob" },
    ),
};

