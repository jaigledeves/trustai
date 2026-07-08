import { useMutation } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { UploadAssetResponse } from "../types";

/** Multipart upload — MIME pre-validation happens in `UploadStep`, before this ever runs. */
export function useUploadAsset() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.set("file", file);
      return clientFetch<UploadAssetResponse>("/assets", {
        method: "POST",
        formData,
      });
    },
  });
}
