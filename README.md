# Hubclass: site institucional

Home + duas páginas de oferta, em Vite multipágina com HTML, CSS e JS puros.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera dist/
npm run preview   # serve dist/ em http://localhost:4173
npm run media       # regenera retratos, workbook e ícones a partir de _raw-media/
npm run hero-video  # remonta o loop do hero e as fotos do filme (ffmpeg via npm)
npm run method-film # remonta o filme do Método (capítulos) e o ambiente desfocado
node scripts/qa.mjs shots|perf|record|checks [url]  # Processo Testador (Chrome instalado)
node scripts/compare.mjs                              # comparativos antes | depois em qa/
```

## Páginas

| Rota | Conteúdo | CTA principal |
| --- | --- | --- |
| `/` | Filme do Hub Experience em tela cheia que, na rolagem, se recolhe para um quadro; sintomas riscados à mão; dois caminhos com um "ou" desenhado; a foto da sala que ganha vida, vira o filme do evento em tela cheia e recua para um quadro ao lado dos pilares do método; quem conduz; dúvidas | WhatsApp do time comercial |
| `/formacao-varejo/` | "6" gigante circulado à mão (peso variável no cursor); jornada em trilha horizontal conduzida pela rolagem; "Para quem é" como autodiagnóstico de três toques (medidor à mão, veredito e caminhos alternativos); Workbook com tilt e inclusões como adesivos; dúvidas | WhatsApp, com mensagem sobre a Formação |
| `/assessoria-m7/` | "Tráfego" que se esvazia até virar contorno e lead digitado ao vivo; comparação lado a lado "gestor de tráfego × Assessoria M7" nas oito funções, com checks à mão; origem com citação que acende na leitura; condições com checks desenhados; dúvidas | Formulário de diagnóstico gratuito (Yay Forms) |

Cabeçalho e rodapé ficam em `src/partials/` e são injetados em todas as páginas pelo `vite.config.js`. Cada página escreve o próprio CTA final.

## Direção visual

- **Paleta:** ciano `#22E4F2` → azul `#2D5BFF` → índigo `#1A1F9C` sobre o marinho noturno dos eventos (`#04081A`). O rodapé é azul chapado.
- **Tipografia:** **Sora** (títulos, com eixo de peso variável), **Manrope** (texto) e **Caveat** (anotações à mão), todas via `@fontsource`.
- **Traço à mão:** doodles SVG de um só traço (sublinhado, círculo, risco, balão, setas, checks) com um filtro de turbulência que deixa a linha irregular, como no Paint. Desenham-se ao entrar ou acompanham a rolagem.
- **Rodapé** (referência: Deepbook): colunas limpas, links com letras que rolam no hover e a palavra "hubclass" gigante cortada pela base. Ele mora por baixo do conteúdo: a última folha, de cantos arredondados, sobe e o descobre (referência: Tengile).

## Movimento

- **Abertura** (referência: Spyker; só na primeira entrada pela home, uma vez por sessão; nunca com âncora, voltar/recarregar ou movimento reduzido): a marca surge no papel (o "H" aparece e a palavra sobe de uma máscara, sem traço); a página sobe por baixo e leva a marca até o cabeçalho (~3 s). Rolar, tocar ou teclar a apressa. O vídeo carrega durante a abertura, por baixo do papel, para já estar rodando quando a página aparece.
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

O vídeo carrega durante a abertura (ou logo após a página, sem abertura), aparece com uma troca longa a partir do pôster enquanto a imagem se assenta, pausa fora da tela, não toca com economia de dados/2G e não toca com movimento reduzido (fica o pôster). A hero não tem botões, controle de pausa nem crédito do filme.

## O filme do Método

Cena única e fixa na home (seção `#metodo`), conduzida pela rolagem:

1. **Foto parada** no quadro ao lado da citação "A maior sala de aula do mercado mobile" (1º quadro do filme, um plano que não aparece no hero).
2. **Entrada:** o quadro se abre até a tela inteira (janela em `clip-path`, mídia em `transform`) e a foto ganha vida.
3. **Filme em tela cheia** (~14,5 s) com a linha do tempo dos capítulos: Marketing, Vendas e Gestão.
4. **Saída:** o filme recua para um quadro ao lado dos pilares; cada pilar ativo toca o capítulo dele, com a legenda do que aparece no trecho.

`scripts/build-method-film.mjs` monta o filme a partir dos dois Reels do Hub Experience (dia 1 = mesmo arquivo do hero; dia 2 = `_raw-media/reel/hub-experience-dia2-1080.mp4`), escolhendo planos pelo que se vê na tela (telão "com marca forte", painel "venda uma vez e receba todo mês", slide "resultado comprovado"). As marcas de capítulo que o script imprime vão em `data-chapters` no `index.html`. As falas dos Reels não viram legenda: a transcrição automática não é confiável o bastante para citar alguém.

- `method-wide.webm/.mp4` (1600×684, ~2,6 MB) e `method-tall.webm/.mp4` (480×852, ~0,9 MB), carregados só perto da seção;
- `method-ambient.webp` (1,7 KB): a foto já desfocada, para o fundo não usar filtro em tempo real.

Sem movimento (ou quando a cena não cabe na tela, como celular deitado), a seção vira faixa + pilares em sequência, sem fixar.

## SEO técnico

- **Domínio:** definido só em `site.config.js` (`SITE_URL`, padrão `https://hubclassmarketing.com.br`, ainda **não confirmado**). O build troca `%SITE_URL%` nas páginas; para outro domínio: `SITE_URL=https://... npm run build`.
- **Por página:** `<title>`, description, canonical autorreferente, Open Graph com URL e imagem absolutas e JSON-LD (home: `Organization` + `WebSite`; internas: `Service` + `BreadcrumbList`). Só dados visíveis no site: nada de preço, avaliação ou endereço.
- **robots.txt e sitemap.xml** são gerados pelo `vite.config.js` a partir da lista de páginas de `site.config.js` (adicione ali toda página pública nova).
- **404:** `404.html` com `noindex`. O status 404 depende da hospedagem servir esse arquivo para rotas inexistentes.
- **Ambientes locais:** `npm run dev` e `npm run preview` respondem com `X-Robots-Tag: noindex`. Uma prévia hospedada (staging) precisa de proteção ou de noindex configurado na própria hospedagem.
- **Não adotados:** `llms.txt` (o conteúdo das três páginas já está todo no HTML, e o arquivo seria mais um texto para manter em dia), analytics e pixels (ninguém pediu e não há IDs). Se entrarem, os eventos a medir são cliques no WhatsApp e no formulário da M7, que mostram intenção e não confirmam venda nem formulário recebido, e o banner de consentimento precisa bloquear os scripts antes da escolha.

## Material oficial pendente

1. **Master original do filme** (@sampaio.filmes), para trocar a fonte de 1080p do Instagram (VP9 recomprimido) e liberar o uso. O script aceita o arquivo novo em `_raw-media/reel/`.
2. **Logo vetorial (SVG)** com o nome. O "H" do hero e do fechamento foi redesenhado a partir do PNG oficial.
3. **Depoimentos e resultados verificáveis** com autorização de uso.
4. **Confirmar o "Vagas limitadas"** no fechamento da Formação: só manter se houver limite real de vagas por turma.
5. **Política de privacidade:** o site não usa cookies de rastreamento, mas leva a WhatsApp e Yay Forms. Uma política com os dados reais de tratamento deve vir da Hubclass.
6. **Confirmar o nome comercial** "Formação Varejo · programa Hub Consult" e a autoria da citação da Você de iPhone na M7.

## Alerta de segurança

As páginas atuais (`hubclassmarketing.com.br` e `formacaovarejo.hubclassmarketing.com.br`) têm **links de cassino injetados** abaixo do rodapé. É isso que gera o "espaço em branco" depois do rodapé. A página da Formação também tem imagens apontando para páginas de login do Facebook, Google e Amazon. É um sinal de WordPress comprometido e vale acionar quem mantém o servidor.
