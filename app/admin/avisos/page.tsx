"use client"

import { useEffect, useMemo, useState } from "react"
import { Megaphone, Plus, Trash2, Edit2, CalendarDays, RefreshCcw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NoticeMediaItem, NoticeMediaKind } from "@/avisos/media-catalog"
import { NoticeRecord, createNotice, deleteNotice, fetchAllNotices, updateNotice } from "@/lib/notice-service"
import Image from "next/image"

interface NoticeFormState {
  title: string
  subtitle: string
  mediaType: NoticeMediaKind
  mediaId: string
  isPublished: boolean
  isPermanent: boolean
  startAt: string
  endAt: string
}

const formatDateTimeLocal = (value?: Date | null) => {
  if (!value || isNaN(value.getTime())) {
    return ""
  }
  const pad = (num: number) => String(num).padStart(2, "0")
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

const buildInitialState = (notice?: NoticeRecord | null): NoticeFormState => {
  if (notice) {
    return {
      title: notice.title,
      subtitle: notice.subtitle,
      mediaType: notice.mediaType,
      mediaId: notice.mediaId,
      isPublished: notice.isPublished,
      isPermanent: notice.isPermanent,
      startAt: formatDateTimeLocal(notice.startAt ?? new Date()),
      endAt: notice.isPermanent ? "" : formatDateTimeLocal(notice.endAt ?? notice.startAt ?? new Date()),
    }
  }

  return {
    title: "Alerta de Visualização",
    subtitle: "Redefina o zoom do navegador para 100% e veja todos os gráficos com nitidez.",
    mediaType: "video",
    mediaId: "",
    isPublished: true,
    isPermanent: true,
    startAt: formatDateTimeLocal(new Date()),
    endAt: "",
  }
}

const AdminAvisosPage = () => {
  const { toast } = useToast()
  const [notices, setNotices] = useState<NoticeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [formState, setFormState] = useState<NoticeFormState>(() => buildInitialState())
  const [editingNotice, setEditingNotice] = useState<NoticeRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NoticeRecord | null>(null)
  const [mediaLibrary, setMediaLibrary] = useState<NoticeMediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)

  useEffect(() => {
    const loadNotices = async () => {
      setLoading(true)
      try {
        const data = await fetchAllNotices()
        setNotices(data)
      } catch (error) {
        console.error("Erro ao carregar avisos", error)
        toast({
          title: "Não foi possível carregar os avisos",
          description: "Verifique sua conexão e tente novamente.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadNotices()
  }, [toast])

  useEffect(() => {
    let isMounted = true

    const loadMediaLibrary = async () => {
      setMediaLoading(true)
      setMediaError(null)
      try {
        const response = await fetch("/api/notice-media")
        if (!response.ok) {
          throw new Error("Falha ao carregar arquivos de mídia")
        }
        const payload = await response.json()
        if (isMounted) {
          setMediaLibrary(Array.isArray(payload.items) ? payload.items : [])
        }
      } catch (error: any) {
        console.error("Erro ao buscar mídias de aviso", error)
        if (isMounted) {
          setMediaLibrary([])
          setMediaError(error?.message ?? "Não foi possível carregar os arquivos disponíveis")
        }
      } finally {
        if (isMounted) {
          setMediaLoading(false)
        }
      }
    }

    loadMediaLibrary()

    return () => {
      isMounted = false
    }
  }, [])

  const resetForm = () => {
    setEditingNotice(null)
    setFormState(buildInitialState())
  }

  const mediaOptions = useMemo(() => mediaLibrary.filter((item) => item.type === formState.mediaType), [mediaLibrary, formState.mediaType])

  const currentMedia = useMemo<NoticeMediaItem | undefined>(() => {
    return mediaOptions.find((item) => item.id === formState.mediaId)
  }, [mediaOptions, formState.mediaId])

  const fallbackMedia = useMemo<NoticeMediaItem | null>(() => {
    if (currentMedia || !formState.mediaId) {
      return null
    }

    if (editingNotice) {
      return {
        id: editingNotice.mediaId,
        type: editingNotice.mediaType,
        label: editingNotice.mediaLabel,
        src: editingNotice.mediaSrc,
        thumbnail: editingNotice.mediaThumbnail ?? undefined,
      }
    }

    return null
  }, [currentMedia, editingNotice, formState.mediaId])

  const selectableMedia = useMemo(() => (fallbackMedia ? [...mediaOptions, fallbackMedia] : mediaOptions), [fallbackMedia, mediaOptions])

  const effectiveMedia = currentMedia ?? fallbackMedia ?? null

  useEffect(() => {
    if (!formState.mediaId && mediaOptions.length) {
      setFormState((prev) => ({ ...prev, mediaId: mediaOptions[0].id }))
    }
  }, [formState.mediaId, mediaOptions])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formState.title.trim() || !formState.subtitle.trim()) {
      toast({
        title: "Preencha título e subtítulo",
        description: "Eles são exibidos diretamente para os usuários.",
        variant: "destructive",
      })
      return
    }

    const mediaItem = effectiveMedia ?? mediaOptions[0]

    if (!mediaItem) {
      toast({
        title: "Selecione uma mídia",
        description: mediaError ?? "Inclua algum arquivo em public/avisos para habilitar esta etapa.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      title: formState.title,
      subtitle: formState.subtitle,
      mediaId: mediaItem.id,
      mediaLabel: mediaItem.label,
      mediaType: mediaItem.type,
      mediaSrc: mediaItem.src,
      mediaThumbnail: mediaItem.thumbnail,
      isPublished: formState.isPublished,
      isPermanent: formState.isPermanent,
      startAt: formState.startAt ? new Date(formState.startAt) : new Date(),
      endAt: formState.isPermanent ? null : (formState.endAt ? new Date(formState.endAt) : null),
    }

    setBusy(true)
    try {
      if (editingNotice) {
        await updateNotice(editingNotice.id, payload)
        toast({
          title: "Aviso atualizado",
          description: `“${payload.title}” foi salvo com sucesso.`,
        })
      } else {
        await createNotice(payload)
        toast({
          title: "Aviso criado",
          description: "Novo aviso publicado para todos os usuários.",
        })
      }

      const data = await fetchAllNotices()
      setNotices(data)
      setFormOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Erro ao salvar aviso", error)
      toast({
        title: "Falha ao salvar",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleEdit = (notice: NoticeRecord) => {
    setEditingNotice(notice)
    setFormState(buildInitialState(notice))
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setBusy(true)
    try {
      await deleteNotice(deleteTarget.id)
      setNotices(await fetchAllNotices())
      toast({
        title: "Aviso removido",
        description: "O modal não será mais exibido.",
      })
    } catch (error: any) {
      console.error("Erro ao excluir aviso", error)
      toast({
        title: "Não foi possível excluir",
        description: error?.message ?? "Recarregue a página e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
      setDeleteTarget(null)
    }
  }

  const togglePublish = async (notice: NoticeRecord) => {
    setBusy(true)
    try {
      await updateNotice(notice.id, {
        title: notice.title,
        subtitle: notice.subtitle,
        mediaId: notice.mediaId,
        mediaLabel: notice.mediaLabel,
        mediaType: notice.mediaType,
        mediaSrc: notice.mediaSrc,
        mediaThumbnail: notice.mediaThumbnail,
        isPublished: !notice.isPublished,
        isPermanent: notice.isPermanent,
        startAt: notice.startAt ?? new Date(),
        endAt: notice.endAt ?? (notice.isPermanent ? null : notice.startAt),
      })
      setNotices(await fetchAllNotices())
    } catch (error) {
      console.error("Erro ao alternar publicação", error)
      toast({
        title: "Não foi possível atualizar o status",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const renderAvailability = (notice: NoticeRecord) => {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    })

    if (notice.isPermanent) {
      return "Até o usuário optar por ocultar"
    }

    const start = notice.startAt ? formatter.format(notice.startAt) : "imediato"
    const end = notice.endAt ? formatter.format(notice.endAt) : "sem data"

    return `${start} → ${end}`
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 space-y-4 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-900 text-white border-slate-800">
          <div className="flex items-center gap-3 text-white/90">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-white/60">Fluxo de onboarding</p>
              <h2 className="text-2xl font-semibold">Avisos Globais</h2>
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Tudo que for comunicado aqui aparece automaticamente para todos os colaboradores (controle por dispositivo). Use para
            dicas rápidas, incidentes ou lembretes de governança de dados.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-white/10 text-white border-white/20">LocalStorage por dispositivo</Badge>
            <Badge className="bg-white/10 text-white border-white/20">Multimídia</Badge>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4 justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Resumo</p>
            <h3 className="text-2xl font-semibold">{notices.filter((notice) => notice.isPublished).length} ativos</h3>
            <p className="text-sm text-muted-foreground">{notices.length} cadastrados no total</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => { resetForm(); setFormOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Novo aviso
            </Button>
            <Button variant="outline" onClick={async () => {
              setLoading(true)
              try {
                setNotices(await fetchAllNotices())
              } finally {
                setLoading(false)
              }
            }}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Avisos cadastrados</h3>
          <span className="text-sm text-muted-foreground">Exibindo {notices.length} itens</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conteúdo</TableHead>
                <TableHead className="hidden md:table-cell">Mídia</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    {loading ? "Carregando avisos..." : "Nenhum aviso cadastrado ainda."}
                  </TableCell>
                </TableRow>
              )}
              {notices.map((notice) => (
                <TableRow key={notice.id} className="align-top">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold">{notice.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notice.subtitle}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-20 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={notice.mediaThumbnail ?? "/avisos/images/zoom-tip-cover.svg"}
                          alt={notice.mediaLabel}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{notice.mediaLabel}</p>
                        <p className="text-xs text-muted-foreground capitalize">{notice.mediaType}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {renderAvailability(notice)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={notice.isPublished ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-200 text-slate-600"}>
                      {notice.isPublished ? "Publicado" : "Rascunho"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          •••
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(notice)}>
                          <Edit2 className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublish(notice)}>
                          {notice.isPublished ? "Mover para rascunho" : "Publicar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(notice)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={formOpen} onOpenChange={(value) => {
        setFormOpen(value)
        if (!value) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingNotice ? "Editar aviso" : "Novo aviso"}</DialogTitle>
            <DialogDescription>
              Preencha o título, subtítulo, período e escolha uma mídia (vídeo ou imagem) da pasta `avisos`.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formState.title}
                    onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Ex: Ajuste o zoom para 100%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtítulo</Label>
                  <Textarea
                    id="subtitle"
                    value={formState.subtitle}
                    onChange={(event) => setFormState((prev) => ({ ...prev, subtitle: event.target.value }))}
                    rows={4}
                    placeholder="Detalhe o que o usuário precisa fazer."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exibição</Label>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Publicar imediatamente</p>
                        <p className="text-xs text-muted-foreground">Desative para salvar como rascunho</p>
                      </div>
                      <Switch
                        checked={formState.isPublished}
                        onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isPublished: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Permanente</p>
                        <p className="text-xs text-muted-foreground">Só sai quando o usuário clicar em “não mostrar novamente”</p>
                      </div>
                      <Switch
                        checked={formState.isPermanent}
                        onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isPermanent: checked, endAt: checked ? "" : formatDateTimeLocal(new Date()) }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <Label>Início</Label>
                  <Input
                    type="datetime-local"
                    value={formState.startAt}
                    onChange={(event) => setFormState((prev) => ({ ...prev, startAt: event.target.value }))}
                  />
                </div>
                <div className="grid gap-3">
                  <Label>Fim</Label>
                  <Input
                    type="datetime-local"
                    value={formState.endAt}
                    onChange={(event) => setFormState((prev) => ({ ...prev, endAt: event.target.value }))}
                    disabled={formState.isPermanent}
                  />
                </div>
                <div className="grid gap-3">
                  <Label>Mídia</Label>
                  <Select
                    value={formState.mediaType}
                    onValueChange={(value: NoticeMediaKind) => {
                      const nextType = value
                      const fallback = mediaLibrary.find((item) => item.type === nextType)?.id ?? ""
                      setFormState((prev) => ({ ...prev, mediaType: nextType, mediaId: fallback }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={formState.mediaId}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, mediaId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um arquivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableMedia.map((media) => (
                        <SelectItem key={media.id} value={media.id}>
                          {media.label}
                        </SelectItem>
                      ))}
                      {(!mediaOptions.length && !mediaLoading) && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Nenhum arquivo encontrado em /public/avisos/{formState.mediaType === "video" ? "videos" : "images"}.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Basta enviar arquivos para <span className="font-semibold">public/avisos/{formState.mediaType === "video" ? "videos" : "images"}</span>. Eles aparecem automaticamente aqui.
                    {mediaLoading && <span className="ml-1 text-muted-foreground/80">Carregando...</span>}
                    {mediaError && <span className="ml-1 text-red-500">{mediaError}</span>}
                  </div>
                </div>
                {effectiveMedia && (
                  <div className="rounded-2xl border overflow-hidden">
                    {effectiveMedia.type === "image" ? (
                      <div className="relative h-48 w-full">
                        <Image
                          src={effectiveMedia.src}
                          alt={effectiveMedia.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                      </div>
                    ) : (
                      <div className="h-48 w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-900 text-white">
                        <p className="text-sm opacity-80">Pré-visualização de vídeo</p>
                        <p className="text-lg font-medium mt-2 text-center px-6 break-words">{effectiveMedia.label}</p>
                      </div>
                    )}
                    <div className="p-3 text-sm">
                      <p className="font-medium">{effectiveMedia.label}</p>
                      <p className="text-xs text-muted-foreground">{effectiveMedia.description ?? (effectiveMedia.type === "video" ? "Arquivo de vídeo (mp4, mov, webm)" : "Arquivo de imagem")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando..." : (editingNotice ? "Atualizar aviso" : "Publicar aviso")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(value) => {
        if (!value) setDeleteTarget(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aviso</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o aviso permanentemente. Os usuários não verão mais este conteúdo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminAvisosPage
