import { useCallback, useEffect, useState } from "react";
import {
  certificateFilesApi,
  type CertificateFileType,
} from "@/api/certificateFilesApi";

interface ProtectedCertificateFileState {
  url: string | null;
  isLoading: boolean;
  error: unknown | null;
  retry: () => void;
}

export function useProtectedCertificateFile(
  certificateId: string,
  type: CertificateFileType,
  enabled = true,
): ProtectedCertificateFileState {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let currentObjectUrl: string | null = null;

    setUrl(null);
    setError(null);

    if (!enabled || !certificateId) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);

    certificateFilesApi.getCertificateFile(certificateId, type).then(
      (blob) => {
        if (!active) return;

        currentObjectUrl = URL.createObjectURL(blob);
        setUrl(currentObjectUrl);
        setIsLoading(false);
      },
      (requestError: unknown) => {
        if (!active) return;

        setError(requestError);
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
      if (currentObjectUrl && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [certificateId, enabled, retryKey, type]);

  return { url, isLoading, error, retry };
}
