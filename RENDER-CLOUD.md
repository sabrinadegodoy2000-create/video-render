# Renderizar o "Layout do Vídeo" na nuvem (grátis, sem ocupar seu PC)

Este guia usa o **GitHub Actions** pra rodar o render do componente `FloatingPhone`
(o mesmo da seção "Layout do Vídeo") nos servidores do GitHub. Seu PC fica livre.

O render usa **exatamente o mesmo Remotion / componente** que você usa local —
mesma borda neon, blur fill, logo e loop das mídias. Só o "motor" roda na nuvem.

---

## Parte 1 — Configuração inicial (faz uma vez só)

### 1. Criar conta no GitHub
Se ainda não tem: https://github.com/signup (grátis).

### 2. Criar o repositório e subir o projeto
No seu PC, dentro da pasta `video_editor_app`, rode (uma vez):

```bash
git init
git add .
git commit -m "Projeto do video editor"
```

Depois crie um repositório vazio em https://github.com/new
(pode ser **privado**), e conecte:

```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git branch -M main
git push -u origin main
```

> O `.gitignore` já evita subir `node_modules`, uploads e vídeos pesados —
> só o código vai pro GitHub.

Pronto. A configuração acabou. As próximas vezes são só os passos da Parte 2.

---

## Parte 2 — Renderizar um vídeo (cada vez que quiser um render)

### 1. Criar um Release com as mídias
No GitHub, abra seu repositório e vá em **Releases** (lado direito) →
**"Draft a new release"** (ou **"Create a new release"**).

- Em **"Choose a tag"**, digite uma tag nova, ex: `render-001` → **"Create new tag"**
- **Arraste** para a área de anexos ("Attach binaries"):
  - O vídeo **9:16** (portrait)
  - O **logo**
  - Todas as **fotos/vídeos do 16:9**
- Clique em **"Publish release"** (pode esperar o upload dos 700MB terminar)

> É aqui que entra o upload das mídias. Demora conforme sua internet,
> mas **não usa CPU** — pode usar o PC normalmente enquanto sobe.

### 2. Apontar o `render-job.json` para esses arquivos
Edite o arquivo `render-job.json` (pode editar direto no GitHub: abra o arquivo →
ícone de lápis ✏️). Coloque os nomes **exatamente** como você subiu:

```json
{
  "portrait": "meu-video-9-16.mp4",
  "logo": "logo.png",
  "wide": [
    { "file": "foto1.jpg", "type": "photo" },
    { "file": "clipe1.mp4", "type": "video" },
    { "file": "foto2.jpg", "type": "photo" }
  ],
  "secondsPerItem": 3
}
```

- A **ordem** da lista `wide` é a ordem que aparece no 16:9.
- O `type` é opcional (detecto pela extensão), mas pode deixar pra garantir.
- As mídias se **repetem em loop** até preencher a duração do vídeo 9:16.
- Vídeos **avançam** o trecho a cada repetição (0-3s, 3-6s...) e voltam ao início no fim.

Salve (**"Commit changes"**).

### 3. Disparar o render
Vá na aba **Actions** → **"Render FloatingPhone"** (menu à esquerda) →
botão **"Run workflow"**:

- **release_tag**: a tag que você criou (ex: `render-001`)
- **concurrency**: deixe `2` (ou `4` pra tentar mais rápido)
- **"Run workflow"**

### 4. Acompanhar o status
- Clique no run que aparecer (🟡 girando = rodando).
- Abra o passo **"Renderizar com Remotion"** pra ver o **progresso %** ao vivo.
- O GitHub te manda **e-mail** quando terminar (✅ ou ❌).

### 5. Baixar o vídeo pronto
Quando terminar (✅):
- Volte em **Releases → `render-001`**: o arquivo **`floating-phone-output.mp4`** estará lá.
- (Backup: na própria página do run, em **"Artifacts"**, também dá pra baixar.)

Pode **apagar o release** depois pra não acumular mídia.

---

## Dicas

- **Velocidade:** parecido com o seu PC, talvez um pouco mais rápido. O ganho real
  é seu PC ficar **100% livre**. Cada render tem ~2-5 min de preparação (instalar
  Chrome/ffmpeg) antes do render em si.
- **Vários renders:** é só criar releases com tags diferentes (`render-002`, etc.).
- **Erros comuns:**
  - "Arquivo não encontrado" → o nome no `render-job.json` não bate com o do release.
  - Confira maiúsculas/minúsculas e a extensão (`.mp4`, `.webp`, etc.).
