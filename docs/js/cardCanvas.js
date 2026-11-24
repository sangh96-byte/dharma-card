/**
 * 클라이언트 고해상도 법문 카드 PNG 생성기
 * 브라우저에 로드된 불교박람회 웹폰트를 그대로 사용해 9:16 모바일 / 1:1 카톡 공유용 고화질 PNG를 렌더링합니다.
 */
(function (global) {
  const FONT_FAMILY_MAP = {
    'expo-woodblock': '"Song Myung", "Gowun Batang", serif',
    'expo-calli': '"Yeon Sung", "Nanum Brush Script", cursive',
    'expo-ink': '"East Sea Dokdo", "Nanum Brush Script", cursive',
    'expo-classic': '"Gowun Batang", serif',
    'expo-modern': '"Hahmlet", "Gowun Batang", serif',
  };

  const INK_COLOR_MAP = {
    'charcoal': '#26221D',
    'ink': '#121110',
    'warm-brown': '#3D2C1E',
  };

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function renderDharmaCardToBlob(quote, design, { format = 'mobile' } = {}) {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const width = format === 'square' ? 1080 : 1080;
    const height = format === 'square' ? 1080 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. 기본 한지 바탕
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, width, height);

    // 2. 배경 일러스트 (cover crop)
    const bgImg = await loadImage(quote.resolvedBgUrl);
    if (bgImg) {
      const scale = Math.max(width / bgImg.width, height / bgImg.height);
      const dw = bgImg.width * scale;
      const dh = bgImg.height * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    }

    // 3. 중앙 가독성 한지 소프트 광채
    const grad = ctx.createRadialGradient(
      width / 2, height * 0.46, width * 0.08,
      width / 2, height * 0.46, width * 0.62
    );
    grad.addColorStop(0, 'rgba(255, 253, 248, 0.80)');
    grad.addColorStop(0.65, 'rgba(255, 251, 243, 0.42)');
    grad.addColorStop(1, 'rgba(255, 251, 243, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 4. 절제된 한지 전시 프레임 테두리
    ctx.strokeStyle = 'rgba(176, 150, 114, 0.34)';
    ctx.lineWidth = 2;
    ctx.strokeRect(46, 46, width - 92, height - 92);

    // 5. 폰트 계산
    const preset = design?.fontPreset || 'expo-woodblock';
    const fontFamily = FONT_FAMILY_MAP[preset] || FONT_FAMILY_MAP['expo-woodblock'];
    const inkColor = INK_COLOR_MAP[design?.textDarkness] || INK_COLOR_MAP.charcoal;

    const lines = (quote.quote_ko || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const maxChars = Math.max(...lines.map((l) => l.length), 1);

    const presetBoost = preset === 'expo-ink' ? 1.24 : preset === 'expo-calli' ? 1.12 : 1.0;
    const sizeScale =
      design?.fontSize === 'small' ? 0.86 :
      design?.fontSize === 'large' ? 1.14 :
      design?.fontSize === 'xlarge' ? 1.26 : 1.0;

    let baseSize = format === 'square' ? 46 : 52;
    if (maxChars > 18) baseSize *= 0.86;
    else if (maxChars > 15) baseSize *= 0.93;
    if (lines.length >= 6) baseSize *= 0.90;

    const fontSize = Math.round(baseSize * sizeScale * presetBoost);
    const lineHeight = Math.round(fontSize * (design?.lineHeight || 1.85));
    const totalTextH = lines.length * lineHeight;
    const centerY = format === 'square' ? height * 0.48 : height * 0.45;
    const startY = Math.round(centerY - totalTextH / 2 + fontSize * 0.4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 6. 상단 범종/연꽃 심볼 + 번호
    if (design?.showIcon !== false) {
      const iconY = startY - fontSize * 2.55;
      ctx.fillStyle = '#574A3D';
      ctx.beginPath();
      ctx.moveTo(width / 2, iconY - 22);
      ctx.quadraticCurveTo(width / 2 + 16, iconY - 12, width / 2 + 18, iconY + 14);
      ctx.lineTo(width / 2 - 18, iconY + 14);
      ctx.quadraticCurveTo(width / 2 - 16, iconY - 12, width / 2, iconY - 22);
      ctx.fill();
      ctx.fillRect(width / 2 - 3, iconY - 30, 6, 9);
    }

    if (design?.showNumber !== false) {
      ctx.font = `400 ${Math.round(fontSize * 0.52)}px "Gowun Batang", serif`;
      ctx.fillStyle = '#7A6855';
      ctx.fillText(`·  ${quote.id}  ·`, width / 2, startY - fontSize * 1.45);
    }

    // 7. 법문 본문
    ctx.font = `400 ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = inkColor;
    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * lineHeight);
    });

    // 8. 경전 출처 + 전통 붉은 낙관
    const sourceY = startY + (lines.length - 1) * lineHeight + Math.round(fontSize * 1.9);
    const sourceFontSize = Math.round(fontSize * 0.56);
    const sourceText = `- ${quote.source} -`;
    ctx.font = `400 ${sourceFontSize}px "Gowun Batang", serif`;
    ctx.fillStyle = '#5D4F3E';
    ctx.fillText(sourceText, width / 2, sourceY);

    if (design?.showSeal !== false) {
      const textWidth = ctx.measureText(sourceText).width;
      const sealSize = 36;
      const sealX = width / 2 + textWidth / 2 + 18;
      const sealY = sourceY - sealSize / 2;

      ctx.save();
      ctx.translate(sealX + sealSize / 2, sealY + sealSize / 2);
      ctx.rotate(-0.06);
      ctx.fillStyle = 'rgba(176, 48, 36, 0.9)';
      ctx.beginPath();
      ctx.roundRect(-sealSize / 2, -sealSize / 2, sealSize, sealSize, 5);
      ctx.fill();

      ctx.strokeStyle = 'rgba(250, 244, 232, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-sealSize / 2 + 3.5, -sealSize / 2 + 3.5, sealSize - 7, sealSize - 7);

      ctx.fillStyle = '#FAF4E8';
      ctx.font = '400 21px "Song Myung", serif';
      ctx.fillText(design?.sealText || '法', 0, 1);
      ctx.restore();
    }

    // 9. 하단 은은한 서명
    ctx.font = '400 22px "Gowun Batang", serif';
    ctx.fillStyle = 'rgba(110, 95, 76, 0.55)';
    ctx.fillText('Dharma Card · 오늘의 불경 말씀', width / 2, height - 86);

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.96));
  }

  global.DharmaCardCanvas = {
    renderDharmaCardToBlob,
  };
})(window);
