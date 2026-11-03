# Hubclass: site institucional

Home + duas páginas de oferta, em Vite multipágina com HTML, CSS e JS puros.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera dist/
npm run preview   # serve dist/ em http://localhost:4173
npm run media       # regenera retratos, workbook e ícones a partir de _raw-media/
npm run hero-video  # remonta o loop do hero e as fotos do filme (ffmpeg via npm)
node scripts/qa.mjs shots|perf|record|checks [url]  # Processo Testador (Chrome instalado)
node scripts/compare.mjs                              # comparativos antes | depois em qa/
```

## Páginas

| Rota | Conteúdo | CTA principal |
| --- | --- | --- |
| `/` | Filme do Hub Experience em tela cheia que, na rolagem, se recolhe para um quadro; sintomas riscados à mão; dois caminhos com um "ou" desenhado; pilares do método preenchidos pela rolagem; quem conduz; dúvidas | WhatsApp do time comercial |
| `/formacao-varejo/` | "6" gigante circulado à mão (peso variável no cursor); jornada em trilha horizontal conduzida pela rolagem; texto que acende palavra por palavra; Workbook com tilt e inclusões como adesivos; dúvidas | WhatsApp, com mensagem sobre a Formação |
| `/assessoria-m7/` | "Tráfego" rabiscado e lead digitado ao vivo; odômetro de 1 a 8 com linhas à mão até cada papel; origem com citação que acende na leitura; condições com checks desenhados; dúvidas | Formulário de diagnóstico gratuito (Yay Forms) |

Cabeçalho e rodapé ficam em `src/partials/` e são injetados em todas as páginas pelo `vite.config.js`. Cada página escreve o próprio CTA final.

## Direção visual

- **Paleta:** ciano `#22E4F2` → azul `#2D5BFF` → índigo `#1A1F9C` sobre o marinho noturno dos eventos (`#04081A`). O rodapé é azul chapado.
- **Tipografia:** **Sora** (títulos, com eixo de peso variável), **Manrope** (texto) e **Caveat** (anotações à mão), todas via `@fontsource`.
- **Traço à mão:** doodles SVG de um só traço (sublinhado, círculo, risco, balão, setas, checks) com um filtro de turbulência que deixa a linha irregular, como no Paint. Desenham-se ao entrar ou acompanham a rolagem.
- **Rodapé** (referência: Deepbook): colunas limpas, links com letras que rolam no hover e a palavra "hubclass" gigante cortada pela base. Ele mora por baixo do conteúdo: a última folha, de cantos arredondados, sobe e o descobre (referência: Tengile).

## Movimento

- **Abertura** (referência: Spyker; só na primeira entrada pela home, uma vez por sessão; nunca com âncora, voltar/recarregar ou movimento reduzido): a marca se escreve no papel com um traço por baixo; a página sobe por baixo e empurra a marca até o cabeçalho (~3 s). Rolar, tocar ou teclar a apressa. O vídeo só carrega depois dela.
- **Rolagem:** Lenis interpola a roda do mouse quadro a quadro (no toque, a rolagem é nativa). As cenas rodam num único laço de `requestAnimationFrame`, com leitura antes de escrita, e ainda perseguem o valor real com amortecimento exponencial (τ ≈ 70 ms).
- **Texto:** títulos entram por linhas dentro de uma máscara; kickers e frases-chave são digitados ao vivo com cursor; parágrafos longos acendem com a leitura; links e botões rolam as letras no hover; palavras grandes mudam de peso perto do cursor.
- **Cursor:** cartões com tilt e luz que segue o mouse; botões-ímã.
- **Dúvidas:** o acordeão anima a altura real (Web Animations API), uma resposta por vez.
- **Rolagem rápida/âncora:** tudo que fica acima da dobra é revelado, nada continua invisível.

## O filme do hero

O Reel é um filme horizontal 2,35:1 gravado de lado no arquivo do Instagram (1080×1920). `scripts/build-hero-video.mjs` gira, corta as tarjas e monta um loop de ~9 s com seis planos (palco com a marca no telão, palestrante, microfone, sócios, salão, palco escuro):

- `hero-wide.webm/.mp4` (1600×684, ~1,8 MB) para telas horizontais;
- `hero-tall.webm/.mp4` (480×852, ~0,75 MB), recorte vertical com centro ajustado por plano;
- pôsteres = primeiro quadro do loop, então a troca pôster → vídeo não salta.

O vídeo só carrega depois da página, pausa fora da tela, não toca com economia de dados/2G e não toca sozinho com movimento reduzido.

## Material oficial pendente

1. **Master original do filme** (@sampaio.filmes), para trocar a fonte de 1080p do Instagram (VP9 recomprimido) e liberar o uso. O script aceita o arquivo novo em `_raw-media/reel/`.
2. **Logo vetorial (SVG)** com o nome. O "H" do hero e do fechamento foi redesenhado a partir do PNG oficial.
3. **Depoimentos e resultados verificáveis** com autorização de uso.
4. **Confirmar o nome comercial** "Formação Varejo · programa Hub Consult" e a autoria da citação da Você de iPhone na M7.

## Alerta de segurança

As páginas atuais (`hubclassmarketing.com.br` e `formacaovarejo.hubclassmarketing.com.br`) têm **links de cassino injetados** abaixo do rodapé. É isso que gera o "espaço em branco" depois do rodapé. A página da Formação também tem imagens apontando para páginas de login do Facebook, Google e Amazon. É um sinal de WordPress comprometido e vale acionar quem mantém o servidor.
