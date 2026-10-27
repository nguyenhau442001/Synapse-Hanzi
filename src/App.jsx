import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import {
  currentLevelSignal,
  currentLevelConfig,
  wordsSignal,
  isLoadingSignal,
  errorSignal,
  currentIndexSignal,
  isFlippedSignal,
  filterSignal,
  filteredWords,
  currentWord,
  progressStats,
  progressSignal,
  audioManifestSignal,
  setLevel,
  nextCard,
  prevCard,
  toggleCardFlip,
  markWordProgress,
  setStudyFilter
} from './signals/studySignals';
import {
  srsCardsSignal,
  isDueReviewModeSignal,
  dueWordsList,
  dueCount,
  currentDueWord,
  dueReviewIndexSignal,
  startDueReviewSession,
  exitDueReviewSession,
  submitSrsRating
} from './signals/srsSignals';
import { LEVELS_CONFIG } from './services/dataRepository';
import { playWordAudio, playExampleAudio, isPlayingAudioSignal } from './services/speechService';
import { CardIllustration } from './components/CardIllustration';
import { HanziDecomposition } from './components/HanziDecomposition';
import { StrokeCanvas } from './components/StrokeCanvas';
import { ReadingView } from './views/ReadingView';
import { RadicalsView } from './views/RadicalsView';
import { GamesView } from './views/GamesView';

// Theme signal
export const themeSignal = signal(
  localStorage.getItem('hsk_theme_manual') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

themeSignal.subscribe(theme => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('hsk_theme_manual', theme);
});

export function App() {
  const [activeNavTab, setActiveNavTab] = useState('study'); // 'study' | 'reading' | 'radicals' | 'games'
  const [showDecomp, setShowDecomp] = useState(false);
  const [showStroke, setShowStroke] = useState(false);

  const isReviewMode = isDueReviewModeSignal.value;
  const word = isReviewMode ? currentDueWord.value : currentWord.value;

  useEffect(() => {
    // Initial level load
    setLevel(currentLevelSignal.value);

    // Keyboard shortcuts (only active on study tab)
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (activeNavTab !== 'study') return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        toggleCardFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        const activeWord = isDueReviewModeSignal.value ? currentDueWord.value : currentWord.value;
        if (activeWord) playWordAudio(activeWord, audioManifestSignal.value);
      } else if (e.code === 'Digit1') {
        if (isDueReviewModeSignal.value) {
          if (currentDueWord.value) submitSrsRating(currentDueWord.value, 'again');
        } else {
          markWordProgress('learning');
        }
      } else if (e.code === 'Digit2') {
        if (isDueReviewModeSignal.value) {
          if (currentDueWord.value) submitSrsRating(currentDueWord.value, 'hard');
        } else {
          markWordProgress('remembered');
        }
      } else if (e.code === 'Digit3' && isDueReviewModeSignal.value) {
        if (currentDueWord.value) submitSrsRating(currentDueWord.value, 'good');
      } else if (e.code === 'Digit4' && isDueReviewModeSignal.value) {
        if (currentDueWord.value) submitSrsRating(currentDueWord.value, 'easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNavTab]);

  const toggleTheme = () => {
    themeSignal.value = themeSignal.value === 'dark' ? 'light' : 'dark';
  };

  const stats = progressStats.value;
  const filteredList = filteredWords.value;
  const curIdx = isReviewMode ? dueReviewIndexSignal.value : currentIndexSignal.value;
  const totalCards = isReviewMode ? dueWordsList.value.length : filteredList.length;
  const isFlipped = isFlippedSignal.value;
  const curFilter = filterSignal.value;
  const curLevel = currentLevelSignal.value;
  const manifest = audioManifestSignal.value;
  const isPlaying = isPlayingAudioSignal.value;
  const dueTotal = dueCount.value;

  const currentStatus = word && progressSignal.value[word.id] ? progressSignal.value[word.id] : 'unlearned';

  const handleSpeakWord = (e) => {
    e.stopPropagation();
    if (word) playWordAudio(word, manifest);
  };

  const handleSpeakExample = (e) => {
    e.stopPropagation();
    if (word) playExampleAudio(word, manifest);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 12px 80px' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Synapse Hanzi
            <span style={{ fontSize: '11px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              v2.0 PWA
            </span>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Trạm học chữ Hán đa giác quan • 100% Offline
          </p>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Đổi giao diện"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontWeight: '600'
          }}
        >
          {themeSignal.value === 'dark' ? '🌙 Tối' : '☀️ Sáng'}
        </button>
      </header>

      {/* Main Navigation Tabs */}
      <nav style={{
        display: 'flex',
        gap: '6px',
        background: 'var(--bg-surface)',
        padding: '6px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '18px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {[
          { id: 'study', label: '⚡ Flashcard', icon: '⚡' },
          { id: 'reading', label: '📖 Luyện Đọc', icon: '📖' },
          { id: 'radicals', label: '🏛️ Bộ Thủ', icon: '🏛️' },
          { id: 'games', label: '🎮 Trò Chơi', icon: '🎮' }
        ].map(tab => {
          const isActive = activeNavTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveNavTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--brand-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: STUDY WORKSTATION */}
      {activeNavTab === 'study' && (
        <div>
          {/* Due Review Callout Banner */}
          {!isReviewMode && dueTotal > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(192, 86, 36, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid var(--brand-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span> Có {dueTotal} từ cần ôn tập hôm nay (FSRS)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Ôn tập đúng lịch để khắc sâu trí nhớ dài hạn
                </div>
              </div>

              <button
                onClick={startDueReviewSession}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                Ôn tập ngay →
              </button>
            </div>
          )}

          {/* Mode Header: Review Mode vs Normal Study Mode */}
          {isReviewMode ? (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px'
            }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎯</span> Đang ôn tập FSRS ({dueTotal} từ đến hạn)
              </div>

              <button
                onClick={exitDueReviewSession}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Thoát ôn tập
              </button>
            </div>
          ) : (
            <>
              {/* Level Selector Chips */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none' }}>
                {Object.entries(LEVELS_CONFIG).map(([key, cfg]) => {
                  const isActive = curLevel === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setLevel(key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        background: isActive ? 'var(--brand-primary)' : 'var(--bg-surface)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: isActive ? '700' : '500',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Stats Bar */}
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Tiến độ {currentLevelConfig.value.label}: {stats.pct}%
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Đã thuộc: <strong style={{ color: 'var(--status-success)' }}>{stats.remembered}</strong> / {stats.total} từ
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${stats.pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--status-success) 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {[
                  { id: 'all', label: `Tất cả (${stats.total})` },
                  { id: 'unlearned', label: `Chưa học (${stats.unlearned})` },
                  { id: 'learning', label: `Đang nhớ (${stats.learning})` },
                  { id: 'remembered', label: `Đã thuộc (${stats.remembered})` }
                ].map(tab => {
                  const isSelected = curFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStudyFilter(tab.id)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                        color: isSelected ? 'var(--brand-primary)' : 'var(--text-muted)',
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Flashcard Component */}
          {isLoadingSignal.value ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              Đang tải dữ liệu từ vựng {currentLevelConfig.value.label}...
            </div>
          ) : errorSignal.value ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--status-danger)' }}>
              {errorSignal.value}
            </div>
          ) : !word ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 16px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}>
              {isReviewMode ? '🎉 Xuất sắc! Bạn đã hoàn thành toàn bộ thẻ cần ôn tập hôm nay.' : '🎉 Không có từ vựng nào trong bộ lọc này!'}
            </div>
          ) : (
            <div>
              {/* Card Frame */}
              <div
                onClick={toggleCardFlip}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  minHeight: '380px',
                  padding: '32px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: 'var(--shadow-md)',
                  userSelect: 'none',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Index Counter */}
                <div style={{ position: 'absolute', top: '16px', left: '20px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {curIdx + 1} / {totalCards}
                </div>

                {/* Status Badge */}
                <div style={{ position: 'absolute', top: '16px', right: '20px' }}>
                  {currentStatus === 'remembered' ? (
                    <span style={{ fontSize: '12px', background: 'var(--status-success)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                      ✓ Đã thuộc
                    </span>
                  ) : currentStatus === 'learning' ? (
                    <span style={{ fontSize: '12px', background: 'var(--status-warning)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                      ⏳ Đang nhớ
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', background: 'var(--border-subtle)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                      Chưa học
                    </span>
                  )}
                </div>

                {/* Card Content */}
                {!isFlipped ? (
                  /* FRONT VIEW */
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <CardIllustration word={word} size={150} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '76px',
                        fontWeight: '900',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-hanzi)',
                        lineHeight: '1.1'
                      }}>
                        {word.hanzi}
                      </div>

                      <button
                        onClick={handleSpeakWord}
                        aria-label="Phát âm"
                        title="Phát âm (phím S)"
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

                    <div style={{ fontSize: '18px', color: 'var(--brand-primary)', fontWeight: '600', marginBottom: '20px' }}>
                      {word.pinyin}
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '6px 16px', borderRadius: 'var(--radius-full)', display: 'inline-block' }}>
                      👆 Nhấn vào thẻ (hoặc phím Space) để lật xem nghĩa
                    </div>
                  </div>
                ) : (
                  /* BACK VIEW */
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)', fontFamily: 'var(--font-hanzi)' }}>
                        {word.hanzi}
                      </span>
                      <button
                        onClick={handleSpeakWord}
                        aria-label="Phát âm"
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

                    <div style={{ fontSize: '17px', color: 'var(--brand-primary)', fontWeight: '700', marginBottom: '2px' }}>
                      {word.pinyin}
                    </div>

                    {word.hanviet && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
                        Hán-Việt: {word.hanviet}
                      </div>
                    )}

                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '18px' }}>
                      {word.meaning}
                    </div>

                    {/* Example sentence box with audio */}
                    {word.example_zh && (
                      <div style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        textAlign: 'left',
                        borderLeft: '4px solid var(--brand-primary)',
                        maxWidth: '500px',
                        margin: '0 auto',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div
                            style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}
                            dangerouslySetInnerHTML={{ __html: word.example_zh }}
                          />
                          <button
                            onClick={handleSpeakExample}
                            aria-label="Đọc câu ví dụ"
                            title="Đọc câu ví dụ"
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

                    {/* Hanzi Radical Decomposition and Stroke Practice Drawer Buttons */}
                    <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
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
              </div>

              {/* Action Navigation Controls */}
              {isReviewMode ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                  <button
                    onClick={() => submitSrsRating(word, 'again')}
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #ef4444',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}
                  >
                    ❌ Chưa nhớ (1)
                  </button>
                  <button
                    onClick={() => submitSrsRating(word, 'hard')}
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #f59e0b',
                      background: '#fffbeb',
                      color: '#b45309',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}
                  >
                    ⏳ Khó (2)
                  </button>
                  <button
                    onClick={() => submitSrsRating(word, 'good')}
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #10b981',
                      background: '#ecfdf5',
                      color: '#047857',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}
                  >
                    ✓ Tốt (3)
                  </button>
                  <button
                    onClick={() => submitSrsRating(word, 'easy')}
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #3b82f6',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}
                  >
                    ⚡ Rất dễ (4)
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
                  <button
                    onClick={prevCard}
                    title="Thẻ trước (←)"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    ← Trước
                  </button>

                  <button
                    onClick={() => {
                      markWordProgress('learning');
                      submitSrsRating(word, 'again');
                    }}
                    title="Đang nhớ (phím 1)"
                    style={{
                      flex: 1.2,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #f59e0b',
                      background: 'var(--status-warning)',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}
                  >
                    ⏳ Đang nhớ
                  </button>

                  <button
                    onClick={() => {
                      markWordProgress('remembered');
                      submitSrsRating(word, 'good');
                    }}
                    title="Đã thuộc (phím 2)"
                    style={{
                      flex: 1.2,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #10b981',
                      background: 'var(--status-success)',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}
                  >
                    ✓ Đã thuộc
                  </button>

                  <button
                    onClick={nextCard}
                    title="Thẻ tiếp theo (→)"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    Tiếp →
                  </button>
                </div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Phím tắt: <kbd style={{ padding: '2px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Space</kbd> Lật thẻ • <kbd style={{ padding: '2px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>S</kbd> Phát âm • {isReviewMode ? <><kbd style={{ padding: '2px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>1..4</kbd> Đánh giá FSRS</> : <><kbd style={{ padding: '2px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>1</kbd> Đang nhớ • <kbd style={{ padding: '2px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>2</kbd> Đã thuộc • <kbd style={{ padding: '2px 5px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>← / →</kbd> Chuyển thẻ</>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GRADED READING */}
      {activeNavTab === 'reading' && <ReadingView />}

      {/* TAB 3: RADICALS EXPLORER */}
      {activeNavTab === 'radicals' && <RadicalsView />}

      {/* TAB 4: MINI GAMES */}
      {activeNavTab === 'games' && <GamesView />}

      {/* FOOTER */}
      <footer style={{
        marginTop: 'auto',
        padding: '24px 16px 16px',
        textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Synapse Hanzi · Trạm học chữ Hán đa giác quan</span>
          <span>·</span>
          <span className="footer-version" title="Phiên bản ứng dụng">v2.0.0</span>
          <span>·</span>
          <a
            href="./legacy.html"
            style={{
              color: 'var(--brand-terracotta)',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            Giao diện cũ (v1.x) ↺
          </a>
        </div>
        <p style={{ margin: 0, opacity: 0.8 }}>
          FSRS Spaced Repetition · 450 Graded Readings · Kangxi Radicals · 100% Offline PWA
        </p>
      </footer>
    </div>
  );
}
