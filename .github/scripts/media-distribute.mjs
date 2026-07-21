/**
 * Distribui as mídias de fundo no quadro grande.
 *
 * - Vídeos longos são fatiados em trechos de `spi` segundos (0s, 3s, 6s...) tocados
 *   a partir de cada ponto (startSec) — não recorta o arquivo, só toca de offsets.
 * - Fotos entram como "pontuação" espalhada UNIFORMEMENTE ao longo da linha do tempo.
 * - O vídeo preenche o resto, em sequência (rodízio entre vídeos), SEM repetir trecho.
 * - Só repete quando os trechos/fotos acabam antes do áudio (mídia pouca p/ narração longa).
 *
 * @param {Array} pools  [{ absPath, isVideo, slices:[startSec...] }]
 * @param {number} totalDuration  duração total (s)
 * @param {number} spi  segundos por trecho
 * @param {(p:string)=>string} toUrl  converte caminho absoluto em file:// URL
 * @returns {Array} bigSegments  [{ src, type, durationSec, startSec? }]
 */
export function distribuirMidias(pools, totalDuration, spi, toUrl) {
  const videoPools = pools.filter((p) => p.isVideo);
  const photoItems = pools.filter((p) => !p.isVideo).map((p) => ({ absPath: p.absPath, type: "photo" }));

  // stream de vídeo: rodízio entre os vídeos, em ordem de trecho (0s, 3s, 6s...)
  const videoStream = [];
  const cur = videoPools.map(() => 0);
  let restam = videoPools.length > 0;
  while (restam) {
    restam = false;
    videoPools.forEach((p, i) => {
      if (cur[i] < p.slices.length) {
        videoStream.push({ absPath: p.absPath, type: "video", startSec: p.slices[cur[i]] });
        cur[i] += 1;
        restam = true;
      }
    });
  }

  const S = Math.ceil(totalDuration / spi);
  const stride = photoItems.length ? S / photoItems.length : Infinity;
  const bigSegments = [];
  let vi = 0, pi = 0, nextPhoto = stride / 2, repetiu = false;

  for (let t = 0; t < S; t++) {
    let it;
    if (photoItems.length && t >= nextPhoto) {
      if (pi >= photoItems.length) repetiu = true;
      it = photoItems[pi % photoItems.length]; pi += 1; nextPhoto += stride;
    } else if (videoStream.length) {
      if (vi >= videoStream.length) repetiu = true;
      it = videoStream[vi % videoStream.length]; vi += 1;
    } else {
      if (pi >= photoItems.length) repetiu = true;
      it = photoItems[pi % photoItems.length]; pi += 1;
    }
    const remaining = totalDuration - t * spi;
    const seg = { src: toUrl(it.absPath), type: it.type, durationSec: +Math.min(spi, remaining).toFixed(2) };
    if (it.type === "video" && it.startSec > 0) seg.startSec = it.startSec;
    bigSegments.push(seg);
  }

  return { bigSegments, videoStream, photoItems, repetiu };
}

/**
 * Distribui mídias respeitando os limites de cada bloco da narração.
 * Cada bloco cobre a janela do seu áudio; a mídia do bloco só toca nessa janela.
 *
 * @param {Array} blocos  [{ durationSec, entradas:[{absPath,isVideo}] }]
 * @param {number} spi  segundos por trecho
 * @param {(p:string)=>string} toUrl
 * @param {(p:string)=>number} mediaDuration
 * @returns {{bigSegments:Array, repetiu:boolean}}
 */
export function distribuirBlocos(blocos, spi, toUrl, mediaDuration) {
  const bigSegments = [];
  let repetiu = false;
  for (const b of blocos) {
    if (!b || !(b.durationSec > 0) || !b.entradas || !b.entradas.length) continue;
    const pools = montarPools(b.entradas, spi, mediaDuration);
    const dist = distribuirMidias(pools, b.durationSec, spi, toUrl);
    dist.bigSegments.forEach((s) => bigSegments.push(s));
    if (dist.repetiu) repetiu = true;
  }
  return { bigSegments, repetiu };
}

/**
 * Modo "vídeo de fundo contínuo": o vídeo compartilhado é a camada BASE (roda o tempo
 * todo — gerado à parte com distribuirMidias só de vídeo). Esta função agenda as fotos
 * e vídeos soltos de cada bloco como "punch-in" em TELA CHEIA por cima, intercalando,
 * com um respiro de vídeo de fundo entre cada um. Bloco sem nenhum vídeo usa stride
 * uniforme (item centralizado no seu slot, distribuído por todo o bloco). Bloco com
 * vídeo(s) usa posicionamento SEQUENCIAL (cada item com sua própria duração + respiro),
 * já que durações mistas (foto curta / vídeo mais longo) quebram a matemática do stride
 * uniforme. Itens que não couberem na janela do bloco não entram.
 * @param {Array} blocos [{ startSec, durationSec, itens:[{absPath, isVideo}] }]
 * @param {(p:string)=>string} toUrl
 * @param {{fotoDur?:number, videoDur?:number, gapMin?:number}} opts
 * @returns {Array} overlays [{ src, startSec, durationSec, type }]
 */
export function agendarPunchOverlay(blocos, toUrl, { fotoDur = 3, videoDur = 5.5, gapMin = 2 } = {}) {
  const overlays = [];
  for (const b of blocos) {
    const itens = b.itens || [];
    if (!itens.length || !(b.durationSec > 0)) continue;
    const temVideo = itens.some((it) => it.isVideo);

    if (!temVideo) {
      // só fotos: stride uniforme, cada uma centralizada no seu slot do bloco
      const cycle = fotoDur + gapMin;
      const maxN = Math.max(1, Math.floor(b.durationSec / cycle));
      const n = Math.min(itens.length, maxN);
      const stride = b.durationSec / n;
      for (let k = 0; k < n; k++) {
        let start = b.startSec + k * stride + (stride - fotoDur) / 2;
        start = Math.max(b.startSec, Math.min(start, b.startSec + b.durationSec - fotoDur));
        overlays.push({ src: toUrl(itens[k].absPath), startSec: +start.toFixed(2), durationSec: fotoDur, type: "photo" });
      }
      continue;
    }

    // sequencial: cada item (foto ou vídeo) na sua própria duração + respiro até o outro
    let cursor = b.startSec + gapMin / 2;
    const limit = b.startSec + b.durationSec;
    for (const it of itens) {
      const dur = it.isVideo ? videoDur : fotoDur;
      if (cursor + dur > limit) break; // não cabe mais nenhum nesse bloco
      overlays.push({ src: toUrl(it.absPath), startSec: +cursor.toFixed(2), durationSec: dur, type: it.isVideo ? "video" : "photo" });
      cursor += dur + gapMin;
    }
  }
  return overlays;
}

/** Monta os "pools" (trechos por mídia). entradas: [{ absPath, isVideo }]. */
export function montarPools(entradas, spi, mediaDuration) {
  return entradas.map(({ absPath, isVideo }) => {
    let slices = [0];
    if (isVideo) {
      const dur = mediaDuration(absPath);
      const n = Math.max(1, Math.floor(dur / spi));
      slices = Array.from({ length: n }, (_, i) => +(i * spi).toFixed(2));
    }
    return { absPath, isVideo, slices };
  });
}
