import { useState, useEffect, useRef } from 'preact/hooks';
import { emptyStateStyle } from '../components/styles';

const AVAILABLE_EXAMS = [
  { id: 'H41001', name: 'HSK 4 · Đề 1 (H41001)' },
  { id: 'H41002', name: 'HSK 4 · Đề 2 (H41002)' },
  { id: 'H41003', name: 'HSK 4 · Đề 3 (H41003)' },
  { id: 'H41004', name: 'HSK 4 · Đề 4 (H41004)' },
  { id: 'H41005', name: 'HSK 4 · Đề 5 (H41005)' },
  { id: 'H41006', name: 'HSK 4 · Đề 6 (H41006)' }
];

/**
 * ListeningView View Component
 * HSK Listening practice with official exam audio, alignment transcripts, and interactive questions.
 */
export function ListeningView() {
  const [selectedExamId, setSelectedExamId] = useState('H41001');
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showVi, setShowVi] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`exam_materials/hsk4/${selectedExamId}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setExamData(data);
        setCurrentIndex(0);
        setUserAnswers({});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedExamId]);

  const questions = examData?.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelectAnswer = (choice) => {
    if (!currentQ) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        selected: choice,
        isCorrect: choice === currentQ.answer
      }
    }));
  };

  const handlePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div>
      {/* Top Controls: Exam Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {AVAILABLE_EXAMS.map(exam => {
            const isSelected = selectedExamId === exam.id;
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => setSelectedExamId(exam.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? '700' : '500',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {exam.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowPinyin(!showPinyin)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: showPinyin ? 'var(--bg-elevated)' : 'transparent',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {showPinyin ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
          </button>
          <button
            type="button"
            onClick={() => setShowVi(!showVi)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: showVi ? 'var(--bg-elevated)' : 'transparent',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {showVi ? 'Ẩn Dịch' : 'Hiện Dịch'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={emptyStateStyle}>
          Đang tải dữ liệu đề thi nghe HSK 4...
        </div>
      ) : !currentQ ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          Chưa có dữ liệu cho đề thi này.
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-md)',
          padding: '24px 20px'
        }}>
          {/* Audio Element */}
          <audio
            ref={audioRef}
            src={`assets/audio/exams/${selectedExamId}.mp3`}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />

          {/* Question Meta Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px'
          }}>
            <div>
              <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--brand-primary)' }}>
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                Phần {currentQ.part || 1}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePlayAudio}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: isPlaying ? 'var(--status-danger)' : 'var(--brand-primary)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <span>{isPlaying ? '⏸ Tạm dừng' : '▶ Nghe đoạn này'}</span>
            </button>
          </div>

          {/* Transcript Dialogue */}
          <div style={{ marginBottom: '20px' }}>
            {currentQ.dialogue && currentQ.dialogue.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '8px', lineHeight: 1.5 }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', marginRight: '6px' }}>
                  {line.speaker}:
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-hanzi)' }}>
                  {line.zh}
                </span>
                {showPinyin && line.py && (
                  <div style={{ fontSize: '13px', color: 'var(--brand-primary)', marginLeft: '24px' }}>
                    {line.py}
                  </div>
                )}
                {showVi && line.vi && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '24px' }}>
                    {line.vi}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Question prompt */}
          {currentQ.question && (
            <div style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '14px',
              background: 'var(--bg-elevated)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)'
            }}>
              ❓ {currentQ.question}
            </div>
          )}

          {/* Multiple Choices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '20px' }}>
            {currentQ.options && currentQ.options.map((opt, oIdx) => {
              const choiceKey = String.fromCharCode(65 + oIdx); // A, B, C, D
              const answerState = userAnswers[currentQ.id];
              const isSelected = answerState?.selected === choiceKey;
              const isCorrectAnswer = currentQ.answer === choiceKey;

              let btnBorder = '1px solid var(--border-subtle)';
              let btnBg = 'var(--bg-surface)';
              let btnColor = 'var(--text-primary)';

              if (answerState) {
                if (isCorrectAnswer) {
                  btnBorder = '1.5px solid var(--status-success)';
                  btnBg = 'rgba(46, 125, 90, 0.1)';
                  btnColor = 'var(--status-success)';
                } else if (isSelected && !answerState.isCorrect) {
                  btnBorder = '1.5px solid var(--status-danger)';
                  btnBg = 'rgba(239, 68, 68, 0.1)';
                  btnColor = 'var(--status-danger)';
                }
              }

              return (
                <button
                  key={choiceKey}
                  type="button"
                  onClick={() => handleSelectAnswer(choiceKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: btnBorder,
                    background: btnBg,
                    color: btnColor,
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    flexShrink: 0
                  }}>
                    {choiceKey}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Between Questions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
                opacity: currentIndex <= 0 ? 0.5 : 1
              }}
            >
              ← Câu trước
            </button>

            <button
              type="button"
              disabled={currentIndex >= questions.length - 1}
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: currentIndex >= questions.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentIndex >= questions.length - 1 ? 0.5 : 1
              }}
            >
              Câu tiếp theo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
