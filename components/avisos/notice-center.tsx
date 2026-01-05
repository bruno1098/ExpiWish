"use client"

import { useEffect, useMemo, useState } from "react"
import NoticeModal from "./notice-modal"
import { fetchActiveNotices, NoticeRecord } from "@/lib/notice-service"
import { NoticeMediaItem } from "@/avisos/media-catalog"
import { useAuth } from "@/lib/auth-context"

const buildDismissKey = (notice: NoticeRecord) => {
  const revision = notice.updatedAt?.getTime() ?? notice.createdAt?.getTime() ?? 0
  return `notice-dismissed-${notice.id}-${revision}`
}

const hasDismissed = (notice: NoticeRecord) => {
  if (typeof window === "undefined") return false
  const key = buildDismissKey(notice)
  return Boolean(window.localStorage.getItem(key))
}

const markDismissed = (notice: NoticeRecord) => {
  if (typeof window === "undefined") return
  try {
    const key = buildDismissKey(notice)
    window.localStorage.setItem(key, new Date().toISOString())
  } catch (error) {
    console.warn("Não foi possível persistir a decisão do aviso", error)
  }
}

export const NoticeCenter = () => {
  const { isAuthenticated } = useAuth()
  const [currentNotice, setCurrentNotice] = useState<NoticeRecord | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let cancelled = false

    const loadNotice = async () => {
      try {
        const notices = await fetchActiveNotices()
        const candidate = notices.find((notice) => !hasDismissed(notice)) ?? null

        if (!cancelled && candidate) {
          setCurrentNotice(candidate)
          setOpen(true)
        }
      } catch (error) {
        console.error("Erro ao buscar avisos ativos", error)
      }
    }

    loadNotice()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const media: NoticeMediaItem | null = useMemo(() => {
    if (!currentNotice) return null
    return {
      id: currentNotice.mediaId,
      label: currentNotice.mediaLabel,
      type: currentNotice.mediaType,
      src: currentNotice.mediaSrc,
      thumbnail: currentNotice.mediaThumbnail ?? undefined,
      description: currentNotice.subtitle,
    }
  }, [currentNotice])

  if (!currentNotice) {
    return null
  }

  return (
    <NoticeModal
      open={open}
      notice={currentNotice}
      media={media}
      onClose={() => setOpen(false)}
      onNeverShow={() => markDismissed(currentNotice)}
    />
  )
}

export default NoticeCenter
