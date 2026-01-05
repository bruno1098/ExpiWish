"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NoticeRecord } from "@/lib/notice-service"
import { NoticeMediaItem } from "@/avisos/media-catalog"
import { cn } from "@/lib/utils"
import { Sparkles, ShieldCheck } from "lucide-react"

interface NoticeModalProps {
  open: boolean
  notice: NoticeRecord
  media?: NoticeMediaItem | null
  onClose: () => void
  onNeverShow: () => void
}

const guessVideoMimeType = (source?: string) => {
  if (!source) return "video/mp4"
  const extension = source.split("?")[0]?.split(".").pop()?.toLowerCase()
  switch (extension) {
    case "webm":
      return "video/webm"
    case "ogv":
    case "ogg":
      return "video/ogg"
    default:
      return "video/mp4"
  }
}

const NoticeModal = ({ open, notice, media, onClose, onNeverShow }: NoticeModalProps) => {
  const [mediaError, setMediaError] = useState(false)

  const previewImage = useMemo(() => media?.thumbnail ?? notice.mediaThumbnail ?? null, [media?.thumbnail, notice.mediaThumbnail])
  const mediaSource = media?.src ?? notice.mediaSrc
  const resolvedMediaSource = useMemo(() => {
    if (!mediaSource) return ""
    try {
      const normalized = mediaSource.startsWith("/") ? mediaSource : `/${mediaSource}`
      return encodeURI(normalized)
    } catch (error) {
      console.warn("Não foi possível normalizar o caminho da mídia do aviso", error)
      return mediaSource
    }
  }, [mediaSource])

  const showVideo = media?.type === "video" && !mediaError

  const handleNeverShow = () => {
    onNeverShow()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="max-w-6xl border-none bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-900 text-white p-0 overflow-hidden">
        <div className="relative flex flex-col gap-6 p-6 lg:p-10">
          <div className="flex flex-col gap-4 text-center">
            <Badge className="self-center w-fit bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/40">
              <Sparkles className="h-4 w-4 mr-2" /> Aviso Importante
            </Badge>
            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-semibold leading-tight text-white">{notice.title}</h2>
              <p className="text-slate-200 text-base leading-relaxed max-w-3xl mx-auto">{notice.subtitle}</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-4xl">
            <div className="absolute inset-0 blur-3xl bg-fuchsia-500/20 opacity-40" aria-hidden="true" />
            <div className={cn(
              "relative rounded-[36px] border border-white/15 bg-black/50 shadow-2xl overflow-hidden",
              showVideo ? "aspect-[16/9]" : "h-[420px]"
            )}>
              {showVideo ? (
                <video
                  key={resolvedMediaSource}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  poster={previewImage ?? undefined}
                  onError={() => setMediaError(true)}
                >
                  <source src={resolvedMediaSource} type={guessVideoMimeType(mediaSource)} />
                </video>
              ) : (
                <div className="relative h-full">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt={media?.label ?? notice.mediaLabel}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 800px"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-900" />
                  )}
                  {media?.type === "video" && (
                    <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-slate-900/80 border border-white/10 px-4 py-3 text-sm text-slate-100">
                      Não foi possível carregar o vídeo deste aviso. Verifique o arquivo em public/avisos/videos/.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {media?.description && (
            <p className="text-sm text-slate-300 leading-relaxed text-center max-w-2xl mx-auto">
              {media.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" onClick={onClose}>
              Entendi, obrigado
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10" onClick={handleNeverShow}>
              Não mostrar novamente
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4" /> Avisos configurados pelo time administrativo
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default NoticeModal
