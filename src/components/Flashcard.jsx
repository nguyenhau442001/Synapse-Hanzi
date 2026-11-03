import { useState } from 'preact/hooks';
import { CardIllustration } from './CardIllustration';
import { HanziDecomposition } from './HanziDecomposition';
import { StrokeCanvas } from './StrokeCanvas';

/**
 * Flashcard Component
 * Renders Chinese word flashcard with Front (Recall) and Back (Meaning, Examples, Stroke, Decomposition).
 *
 * @param {Object} props
 * @param {Object} props.word - Current vocabulary item
 * @param {boolean} props.isFlipped - Whether the card is revealed
 * @param {Function} props.onFlip - Card flip toggle handler
 * @param {Function} props.onSpeakWord - Pronounce word
 * @param {Function} props.onSpeakExample - Pronounce example sentence
 * @param {boolean} props.isPlaying - Whether audio is playing
 */
export function Flashcard({
  word,
  isFlipped,
  onFlip,
  onSpeakWord,
  onSpeakExample,
  isPlaying = false
}) {
  const [showDecomp, setShowDecomp] = useState(false);
  const [showStroke, setShowStroke] = useState(false);

  if (!word) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 16px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)'
      }}>
        🎉 Không có từ vựng nào trong danh mục này!
      </div>
    );
  }

  return (
    <article
      onClick={onFlip}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        minHeight: '360px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 20px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        userSelect: 'none'
      }}
    >
      {!isFlipped ? (
        /* FRONT VIEW: Hanzi + Pinyin + Audio */
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <span style={{
              fontSize: 'clamp(3.5rem, 14vw, 5.2rem)',
              fontWeight: '900',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-hanzi)',
              letterSpacing: '0.02em',
              lineHeight: 1.15
            }}>
              {word.hanzi}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSpeakWord?.();
              }}
              aria-label="Nghe phát âm"
              title="Nghe phát âm (phím S)"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-strong)',
                background: isPlaying ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                color: isPlaying ? '#ffffff' : 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              🔊
            </button>
          </div>

          <div style={{ fontSize: '18px', color: 'var(--brand-primary)', fontWeight: '600', marginBottom: '24px' }}>
            {word.pinyin}
          </div>

          <div style={{
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Chạm để lật · Space</span>
          </div>
        </div>
      ) : (
        /* BACK VIEW: Full Editorial Context */
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '36px',
              fontWeight: '900',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-hanzi)'
            }}>
              {word.hanzi}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSpeakWord?.();
              }}
              aria-label="Nghe phát âm"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              🔊
            </button>
          </div>

          <div style={{ fontSize: '17px', color: 'var(--brand-primary)', fontWeight: '700', marginBottom: '4px' }}>
            {word.pinyin}
          </div>

          {word.hanviet && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '10px' }}>
              Hán-Việt: {word.hanviet}
            </div>
          )}

          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '18px',
            lineHeight: 1.35
          }}>
            {word.meaning}
          </div>

          {/* Optional illustration */}
          <CardIllustration word={word} />

          {/* Example Sentence Box */}
          {word.example_zh && (
            <div style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              textAlign: 'left',
              borderLeft: '4px solid var(--brand-primary)',
              maxWidth: '520px',
              margin: '0 auto 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div
                  style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}
                  dangerouslySetInnerHTML={{ __html: word.example_zh }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpeakExample?.();
                  }}
                  aria-label="Nghe câu ví dụ"
                  title="Nghe câu ví dụ"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    background: 'var(--bg-surface)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  🔊
                </button>
              </div>

              {word.example_py && (
                <div
                  style={{ fontSize: '13px', color: 'var(--brand-primary)', marginBottom: '4px' }}
                  dangerouslySetInnerHTML={{ __html: word.example_py }}
                />
              )}
              {word.example_vi && (
                <div
                  style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                  dangerouslySetInnerHTML={{ __html: word.example_vi }}
                />
              )}
            </div>
          )}

          {/* Stroke Writing and Radical Decomposition Drawers */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStroke(!showStroke);
                }}
                style={{
                  background: showStroke ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: showStroke ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: showStroke ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {showStroke ? '▲ Đóng tập viết' : '✍️ Tập viết thứ tự nét'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDecomp(!showDecomp);
                }}
                style={{
                  background: showDecomp ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: showDecomp ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: showDecomp ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {showDecomp ? '▲ Thu gọn chiết tự' : '🧩 Bóc tách chiết tự'}
              </button>
            </div>

            {showStroke && (
              <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', marginTop: '6px' }}>
                <StrokeCanvas word={word} />
              </div>
            )}

            {showDecomp && (
              <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', marginTop: '6px' }}>
                <HanziDecomposition word={word} />
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
