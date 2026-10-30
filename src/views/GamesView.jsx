import { useState, useEffect } from 'preact/hooks';
import { speakWithWebSpeech } from '../services/speechService';

export function GamesView() {
  const [activeTab, setActiveTab] = useState('sentence'); // 'sentence' | 'guess'

  // Sentence Game State
  const [sentences, setSentences] = useState([]);
  const [sIndex, setSIndex] = useState(0);
  const [shuffledTokens, setShuffledTokens] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [sentenceScore, setSentenceScore] = useState(0);
  const [sentenceStatus, setSentenceStatus] = useState(''); // 'correct' | 'wrong' | ''

  // Guess Word Game State
  const [guessWords, setGuessWords] = useState([]);
  const [gIndex, setGIndex] = useState(0);
  const [guessOptions, setGuessOptions] = useState([]);
  const [guessScore, setGuessScore] = useState(0);
  const [guessFeedback, setGuessFeedback] = useState('');

  // Load Sentence bank
  useEffect(() => {
    fetch('database/vocabs/sentence_bank.json')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length > 0) {
          // Shuffle sentences
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setSentences(shuffled);
          loadSentenceRound(shuffled[0]);
        }
      });

    // Load Guess word bank
    fetch('database/vocabs/guess_word_bank.json')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length > 0) {
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setGuessWords(shuffled);
          loadGuessRound(shuffled, 0);
        }
      });
  }, []);

  const loadSentenceRound = (item) => {
    if (!item) return;
    const tokens = [...(item.zh_tokens || [])].sort(() => Math.random() - 0.5);
    setShuffledTokens(tokens);
    setSelectedTokens([]);
    setSentenceStatus('');
  };

  const loadGuessRound = (allWords, idx) => {
    if (!allWords || allWords.length === 0) return;
    const current = allWords[idx % allWords.length];
    if (!current) return;

    // Pick 3 distractors
    const others = allWords.filter(w => w.hanzi !== current.hanzi).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [current, ...others].sort(() => Math.random() - 0.5);
    setGuessOptions(options);
    setGuessFeedback('');
  };

  // Sentence Game Actions
  const handleSelectToken = (token, tIdx) => {
    if (sentenceStatus === 'correct') return;
    setSelectedTokens([...selectedTokens, token]);
    const updated = [...shuffledTokens];
    updated.splice(tIdx, 1);
    setShuffledTokens(updated);
  };

  const handleDeselectToken = (token, tIdx) => {
    if (sentenceStatus === 'correct') return;
    const updatedSelected = [...selectedTokens];
    updatedSelected.splice(tIdx, 1);
    setSelectedTokens(updatedSelected);
    setShuffledTokens([...shuffledTokens, token]);
  };

  const checkSentence = () => {
    const cur = sentences[sIndex];
    if (!cur) return;

    const answer = selectedTokens.join('');
    const target = (cur.sentence_zh || '').replace(/[。！？\s]/g, '');

    if (answer === target || answer === cur.zh_tokens?.join('')) {
      setSentenceStatus('correct');
      setSentenceScore(sentenceScore + 10);
      speakWithWebSpeech(cur.sentence_zh, 0.85);
    } else {
      setSentenceStatus('wrong');
    }
  };

  const nextSentence = () => {
    const nextIdx = (sIndex + 1) % sentences.length;
    setSIndex(nextIdx);
    loadSentenceRound(sentences[nextIdx]);
  };

  // Guess Word Game Actions
  const handleGuessOption = (option) => {
    const current = guessWords[gIndex];
    if (!current || guessFeedback) return;

    if (option.hanzi === current.hanzi) {
      setGuessFeedback('correct');
      setGuessScore(guessScore + 10);
      speakWithWebSpeech(current.hanzi, 0.85);
    } else {
      setGuessFeedback('wrong');
    }
  };

  const nextGuessWord = () => {
    const nextIdx = (gIndex + 1) % guessWords.length;
    setGIndex(nextIdx);
    loadGuessRound(guessWords, nextIdx);
  };

  const currentSentence = sentences[sIndex];
  const currentGuess = guessWords[gIndex];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Game Mode Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('sentence')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'sentence' ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            background: activeTab === 'sentence' ? 'var(--bg-elevated)' : 'var(--bg-surface)',
            color: activeTab === 'sentence' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'sentence' ? '700' : '500',
            fontSize: '13px'
          }}
        >
          🧩 Ghép Câu Tiếng Trung
        </button>

        <button
          onClick={() => setActiveTab('guess')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'guess' ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            background: activeTab === 'guess' ? 'var(--bg-elevated)' : 'var(--bg-surface)',
            color: activeTab === 'guess' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'guess' ? '700' : '500',
            fontSize: '13px'
          }}
        >
          🎯 Đuổi Hình Bắt Chữ
        </button>
      </div>

      {/* GAME 1: SENTENCE BUILDER */}
      {activeTab === 'sentence' && (
        <div>
          {!currentSentence ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Đang chuẩn bị câu hỏi ghép câu...
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  {currentSentence.level?.toUpperCase()} • Câu {sIndex + 1}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-success)' }}>
                  Điểm: {sentenceScore}
                </span>
              </div>

              {/* Meaning prompt */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Sắp xếp các khối từ để tạo thành câu mang nghĩa:
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  "{currentSentence.meaning}"
                </div>
              </div>

              {/* Selected Answer Slot */}
              <div style={{
                minHeight: '64px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: sentenceStatus === 'correct' ? '2px solid var(--status-success)' : sentenceStatus === 'wrong' ? '2px solid var(--status-danger)' : '2px dashed var(--border-strong)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                {selectedTokens.length === 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Nhấn vào các từ bên dưới để ghép vào đây
                  </span>
                ) : (
                  selectedTokens.map((tok, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDeselectToken(tok, idx)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--brand-primary)',
                        background: 'var(--brand-primary)',
                        color: '#ffffff',
                        fontSize: '18px',
                        fontFamily: 'var(--font-hanzi)',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {tok}
                    </button>
                  ))
                )}
              </div>

              {/* Shuffled Candidate Tokens */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                {shuffledTokens.map((tok, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectToken(tok, idx)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '18px',
                      fontFamily: 'var(--font-hanzi)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {tok}
                  </button>
                ))}
              </div>

              {/* Feedback Banner */}
              {sentenceStatus === 'correct' && (
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid var(--status-success)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  textAlign: 'center',
                  color: '#047857',
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '16px'
                }}>
                  🎉 Chính xác! {currentSentence.sentence_zh} ({currentSentence.sentence_py})
                </div>
              )}

              {sentenceStatus === 'wrong' && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid var(--status-danger)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  textAlign: 'center',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  Chưa chính xác, hãy kiểm tra lại trật tự ngữ pháp hoặc thử lại!
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {sentenceStatus === 'correct' ? (
                  <button
                    onClick={nextSentence}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--status-success)',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Câu tiếp theo →
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => loadSentenceRound(currentSentence)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      ↺ Xếp lại
                    </button>
                    <button
                      onClick={checkSentence}
                      disabled={selectedTokens.length === 0}
                      style={{
                        flex: 1,
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: selectedTokens.length > 0 ? 'var(--brand-primary)' : 'var(--border-subtle)',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: selectedTokens.length > 0 ? 'pointer' : 'default'
                      }}
                    >
                      Kiểm tra kết quả
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME 2: GUESS WORD */}
      {activeTab === 'guess' && (
        <div>
          {!currentGuess ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Đang chuẩn bị câu hỏi đuổi hình bắt chữ...
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  Câu {gIndex + 1}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-success)' }}>
                  Điểm: {guessScore}
                </span>
              </div>

              {/* Emoji Icon & Meaning prompt */}
              <div style={{ fontSize: '72px', margin: '16px 0 8px' }}>
                {currentGuess.emoji || '🎯'}
              </div>

              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                "{currentGuess.meaning}"
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Chọn chữ Hán tương ứng với gợi ý trên:
              </div>

              {/* Multiple Choice Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {guessOptions.map((opt, idx) => {
                  let btnBg = 'var(--bg-elevated)';
                  let btnBorder = 'var(--border-subtle)';
                  let btnColor = 'var(--text-primary)';

                  if (guessFeedback) {
                    if (opt.hanzi === currentGuess.hanzi) {
                      btnBg = '#ecfdf5';
                      btnBorder = 'var(--status-success)';
                      btnColor = '#047857';
                    } else {
                      btnBg = 'var(--bg-surface)';
                      btnColor = 'var(--text-muted)';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={Boolean(guessFeedback)}
                      onClick={() => handleGuessOption(opt)}
                      style={{
                        padding: '16px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${btnBorder}`,
                        background: btnBg,
                        color: btnColor,
                        cursor: guessFeedback ? 'default' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'var(--font-hanzi)' }}>
                        {opt.hanzi}
                      </span>
                      {guessFeedback && (
                        <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '600' }}>
                          {opt.pinyin}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Next */}
              {guessFeedback && (
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: guessFeedback === 'correct' ? 'var(--status-success)' : 'var(--status-danger)',
                    marginBottom: '16px'
                  }}>
                    {guessFeedback === 'correct' ? '🎉 Đúng rồi!' : '✗ Tiếc quá!'} Đáp án là {currentGuess.hanzi} ({currentGuess.pinyin})
                  </div>

                  <button
                    onClick={nextGuessWord}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--brand-primary)',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Câu tiếp theo →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
