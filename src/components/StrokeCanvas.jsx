import { useState, useEffect, useRef } from 'preact/hooks';
import HanziWriter from 'hanzi-writer';

export function StrokeCanvas({ word }) {
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizMessage, setQuizMessage] = useState('');
  const [strokeCount, setStrokeCount] = useState(0);

  const containerRef = useRef(null);
  const writerRef = useRef(null);

  // Extract clean Chinese characters from word.hanzi
  const chars = word?.hanzi
    ? Array.from(word.hanzi.replace(/[（\(].*?[）\)]/g, '').trim()).filter(ch => /\p{Script=Han}/u.test(ch))
    : [];

  const activeChar = chars[activeCharIndex] || chars[0];

  useEffect(() => {
    setActiveCharIndex(0);
    setIsQuizMode(false);
    setQuizMessage('');
  }, [word?.hanzi]);

  useEffect(() => {
    if (!containerRef.current || !activeChar) return;

    // Clear previous writer
    containerRef.current.innerHTML = '';
    writerRef.current = null;
    setIsQuizMode(false);
    setQuizMessage('');

    const isDark = document.documentElement.dataset.theme === 'dark';

    try {
      const writer = HanziWriter.create(containerRef.current, activeChar, {
        width: 200,
        height: 200,
        padding: 12,
        showOutline: true,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 200,
        strokeColor: isDark ? '#f8fafc' : '#0f172a',
        radicalColor: '#c05624',
        outlineColor: isDark ? '#334155' : '#cbd5e1',
        drawingColor: '#c05624',
        drawingWidth: 20,
        showCharacter: true
      });

      writerRef.current = writer;

      // Animate on load once
      writer.animateCharacter();

      // Retrieve total stroke count
      HanziWriter.loadCharacterData(activeChar).then(data => {
        if (data && data.strokes) {
          setStrokeCount(data.strokes.length);
        }
      }).catch(() => {});
    } catch (err) {
      console.warn('HanziWriter error:', err);
    }

    return () => {
      if (writerRef.current) {
        try { writerRef.current.cancelQuiz(); } catch (e) {}
      }
    };
  }, [activeChar]);

  const handleAnimate = (e) => {
    e.stopPropagation();
    if (!writerRef.current) return;
    setIsQuizMode(false);
    setQuizMessage('');
    writerRef.current.showOutline();
    writerRef.current.animateCharacter();
  };

  const handleStartQuiz = (e) => {
    e.stopPropagation();
    if (!writerRef.current) return;
    setIsQuizMode(true);
    setQuizMessage('Hãy dùng chuột hoặc ngón tay viết theo thứ tự nét...');

    writerRef.current.quiz({
      onMistake: (strokeData) => {
        setQuizMessage(`Sai nét thứ ${strokeData.strokeNum + 1}! Hãy thử lại.`);
      },
      onCorrectStroke: (strokeData) => {
        setQuizMessage(`✓ Đúng nét ${strokeData.strokeNum + 1}/${strokeCount}!`);
      },
      onComplete: (summaryData) => {
        setQuizMessage(`🎉 Tuyệt vời! Bạn đã hoàn thành chữ ${activeChar} với ${summaryData.totalMistakes} lỗi.`);
      }
    });
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (!writerRef.current) return;
    setIsQuizMode(false);
    setQuizMessage('');
    writerRef.current.cancelQuiz();
    writerRef.current.showCharacter();
    writerRef.current.showOutline();
  };

  if (chars.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      marginTop: '16px',
      border: '1px solid var(--border-subtle)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <span>✍️</span> Tập viết & Xem thứ tự nét chữ Hán
        {strokeCount > 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({strokeCount} nét)</span>}
      </div>

      {/* Character Selector (if word has > 1 char) */}
      {chars.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
          {chars.map((ch, idx) => {
            const isSelected = idx === activeCharIndex;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCharIndex(idx);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  fontFamily: 'var(--font-hanzi)',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {ch}
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas Wrap with Traditional Grid Guidelines */}
      <div style={{
        width: '202px',
        height: '202px',
        margin: '0 auto 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: '2px solid var(--border-strong)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Chinese calligraphy grid background (Mễ tự cách) */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.25 }} viewBox="0 0 200 200">
          <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" stroke-dasharray="4 4" stroke-width="1" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" stroke-dasharray="4 4" stroke-width="1" />
          <line x1="0" y1="0" x2="200" y2="200" stroke="currentColor" stroke-dasharray="4 4" stroke-width="0.8" />
          <line x1="200" y1="0" x2="0" y2="200" stroke="currentColor" stroke-dasharray="4 4" stroke-width="0.8" />
        </svg>

        {/* HanziWriter mounts here */}
        <div ref={containerRef} style={{ width: '200px', height: '200px', position: 'relative', zIndex: 1 }} />
      </div>

      {/* Feedback Message */}
      {quizMessage && (
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: quizMessage.startsWith('✓') || quizMessage.startsWith('🎉') ? 'var(--status-success)' : 'var(--brand-primary)',
          marginBottom: '10px'
        }}>
          {quizMessage}
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          onClick={handleAnimate}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ▶ Viết mẫu
        </button>

        <button
          onClick={handleStartQuiz}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: isQuizMode ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            background: isQuizMode ? 'var(--brand-primary)' : 'var(--bg-surface)',
            color: isQuizMode ? '#ffffff' : 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ✍ Tập viết
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ↺ Đặt lại
        </button>
      </div>
    </div>
  );
}
