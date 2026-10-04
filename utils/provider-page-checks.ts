import type {
  ExtractionPreview,
  RuntimeMessage,
} from "../model/provider-runtime.model";

export type PageCheckResult = { page: string; preview: ExtractionPreview };

/** Correlate checks independently of selection commands and redirected page URLs. */
export class ProviderPageChecks {
  private pending: {
    page: string;
    requestId?: string;
    documentId?: string;
    inFlight?: boolean;
    preview?: ExtractionPreview;
  } | null = null;
  private sequence = 0;

  start(page: string) {
    this.pending = { page };
  }

  cancel() {
    this.pending = null;
  }

  command(documentId: string, page = this.pending?.page) {
    if (!this.pending) return null;
    if (this.pending.page !== page || this.pending.inFlight) return null;
    if (this.pending.documentId && this.pending.documentId !== documentId)
      return null;
    const requestId = "page-check-" + ++this.sequence;
    this.pending = { ...this.pending, requestId, documentId, inFlight: true };
    return { type: "extract", requestId, documentId };
  }

  accept(message: RuntimeMessage): PageCheckResult | null {
    if (
      message.type !== "extraction" ||
      !this.pending ||
      message.requestId !== this.pending.requestId ||
      message.documentId !== this.pending.documentId
    )
      return null;
    this.pending.preview = message.preview;
    this.pending.inFlight = false;
    // Sites can populate their series information after DOMContentLoaded. Keep retrying.
    return message.preview.valid ? this.finish() : null;
  }

  finish(): PageCheckResult | null {
    if (!this.pending) return null;
    const result = {
      page: this.pending.page,
      preview: this.pending.preview ?? {
        title: "",
        episode: 0,
        episodeCount: 0,
        valid: false,
        errors: [
          "The page did not finish loading. Check the website and retry this example.",
        ],
      },
    };
    this.pending = null;
    return result;
  }
}
