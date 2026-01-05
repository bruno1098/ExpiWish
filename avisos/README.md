# Centro de Avisos

Esta pasta concentra toda a base de conhecimento referente ao novo sistema de avisos globais.

## Estrutura

```
avisos/
├── README.md                # Documentação do módulo
├── media-catalog.ts         # Catálogo centralizado das mídias aprovadas
└── assets/                  # Artefatos de referência (não servidos pela Web)
    ├── images/
    └── videos/
```

As mídias realmente utilizadas na aplicação ficam em `public/avisos/*` para que o Next.js consiga servi-las diretamente. As subpastas em `avisos/assets` funcionam como repositório de referência e documentação interna.

## Fluxo sugerido para novos avisos

1. Adicione o arquivo (imagem ou vídeo) em `public/avisos/{images|videos}`.
2. (Opcional) Guarde um backup/desenho fonte em `avisos/assets/{images|videos}`.
3. Cadastre o item no `media-catalog.ts` informando `id`, `label`, `type` e caminho público (`/avisos/...`).
4. Publique o aviso pelo painel **Admin → Avisos** escolhendo a mídia cadastrada.

## Sobre o vídeo padrão

O modal inicia com um item chamado `zoom-tip-video`. Substitua o arquivo `public/avisos/videos/zoom-tip.mp4` pelo vídeo gravado (mantendo o mesmo nome) para que ele seja carregado automaticamente. Enquanto o arquivo não existir, o modal exibe a imagem padrão e uma mensagem amigável.
