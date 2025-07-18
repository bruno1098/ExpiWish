# Pasta Public - Arquivos Estáticos

Esta pasta contém arquivos que serão servidos diretamente pelo Next.js.

## Favicon Atual

### Arquivo Configurado:
- `WishExpi.png` - Logo da WISH Expi (favicon atual)

### Configuração no Layout:
O favicon está configurado em `app/layout.tsx`:
```typescript
icons: {
  icon: '/WishExpi.png',
  shortcut: '/WishExpi.png',
  apple: '/WishExpi.png',
},
```

### Como Funciona:
- O Next.js automaticamente serve arquivos da pasta `public/`
- `public/WishExpi.png` → acessível em `http://localhost:3000/WishExpi.png`
- O favicon aparece na aba do navegador e nos favoritos

### Para Otimizar (Opcional):
Se quiser melhorar a performance, você pode:

1. **Criar versões otimizadas:**
   - `favicon.ico` (16x16, 32x32, 48x48 pixels)
   - `apple-touch-icon.png` (180x180 pixels)
   - `favicon-16x16.png` (16x16 pixels)
   - `favicon-32x32.png` (32x32 pixels)

2. **Atualizar o layout:**
   ```typescript
   icons: {
     icon: [
       { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
       { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
     ],
     shortcut: '/favicon.ico',
     apple: '/apple-touch-icon.png',
   },
   ```

### Ferramentas para Otimizar:
- [favicon.io](https://favicon.io/) - Conversor online
- [realfavicongenerator.net](https://realfavicongenerator.net/) - Gerador completo
- Photoshop/Illustrator - Exportar nos tamanhos corretos

### Outros Arquivos Estáticos:
- Imagens: `/images/`
- Documentos: `/docs/`
- Downloads: `/downloads/` 