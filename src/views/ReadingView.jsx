import { useState, useEffect } from 'preact/hooks';
import { fetchReadingsManifest, fetchStory } from '../services/readingService';
import { speakWithWebSpeech, stopAllAudio } from '../services/speechService';

export function ReadingView() {
  const [manifest, setManifest] = useState([]);
  const [loadingManifest, setLoadingManifest] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('HSK1');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Story State
  const [activeStoryMeta, setActiveStoryMeta] = useState(null);
  const [activeStory, setActiveStory] = useState(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);
  const [userQuizAnswers, setUserQuizAnswers] = useState({});

  useEffect(() => {
    fetchReadingsManifest().then(items => {
      setManifest(items);
      setLoadingManifest(false);
    });
  }, []);

  const openStory = async (storyMeta) => {
    setActiveStoryMeta(storyMeta);
    setLoadingStory(true);
    setUserQuizAnswers({});
    setSelectedToken(null);

    try {
      const data = await fetchStory(storyMeta.file || storyMeta.path);
      setActiveStory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStory(false);
    }
  };

  const closeStory = () => {
    stopAllAudio();
    setActiveStory(null);
    setActiveStoryMeta(null);
    setSelectedToken(null);
  };

  const levels = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7', 'HSK8', 'HSK9'];

  const filteredStories = manifest.filter(item => {
    const matchesLevel = item.level === selectedLevel;
    if (!matchesLevel) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const zh = (item.title?.zh || '').toLowerCase();
    const vi = (item.title?.vi || '').toLowerCase();
    return zh.includes(q) || vi.includes(q);
  });

  // If a story is open, render Story Reader View
  if (activeStoryMeta) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '60px' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={closeStory}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Danh sách bài đọc
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowPinyin(!showPinyin)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: showPinyin ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                color: showPinyin ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              {showPinyin ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
            </button>
          </div>
        </div>

        {loadingStory || !activeStory ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Đang tải nội dung bài đọc...
          </div>
        ) : (
          <div>
            {/* Story Header */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                {activeStory.level} • {activeStory.estimatedMinutes || 3} phút đọc
              </span>
              <h2 style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'var(--font-hanzi)', margin: '10px 0 4px', color: 'var(--text-primary)' }}>
                {activeStory.title?.zh}
              </h2>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                {activeStory.title?.vi}
              </div>
            </div>

            {/* Token Inspector Popover */}
            {selectedToken && (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-md)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px', fontWeight: '900', fontFamily: 'var(--font-hanzi)', color: 'var(--text-primary)' }}>
                      {selectedToken.text}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--brand-primary)' }}>
                      {selectedToken.pinyin}
                    </span>
                    {selectedToken.hanviet && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        [{selectedToken.hanviet}]
                      </span>
                    )}
                    {selectedToken.hsk && (
                      <span style={{ fontSize: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '1px 6px', borderRadius: '8px' }}>
                        HSK {selectedToken.hsk}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Nghĩa: <strong>{selectedToken.meaning_vi || selectedToken.meaning}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => speakWithWebSpeech(selectedToken.text, 0.85)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--brand-primary)',
                      fontSize: '14px'
                    }}
                  >
                    🔊
                  </button>
                  <button
                    onClick={() => setSelectedToken(null)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: '14px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Sentences Container */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {activeStory.sentences?.map((sentence, sIdx) => (
                <div key={sentence.id || sIdx} style={{ borderBottom: sIdx < activeStory.sentences.length - 1 ? '1px dashed var(--border-subtle)' : 'none', paddingBottom: '16px' }}>
                  {/* Chinese Tokens */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '2px', lineHeight: 1.6, marginBottom: '4px' }}>
                    {sentence.tokens ? sentence.tokens.map((token, tIdx) => (
                      <span
                        key={tIdx}
                        onClick={() => setSelectedToken(token)}
                        style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          background: selectedToken?.text === token.text ? 'var(--accent-light)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {showPinyin && (
                          <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: '600', lineHeight: 1 }}>
                            {token.pinyin || ''}
                          </span>
                        )}
                        <span style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'var(--font-hanzi)', color: 'var(--text-primary)' }}>
                          {token.text}
                        </span>
                      </span>
                    )) : (
                      <span style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'var(--font-hanzi)' }}>
                        {sentence.zh}
                      </span>
                    )}

                    <button
                      onClick={() => speakWithWebSpeech(sentence.zh, 0.8)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginLeft: '8px'
                      }}
                      title="Nghe câu này"
                    >
                      🔊
                    </button>
                  </div>

                  {/* Vietnamese Meaning */}
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                    {sentence.vi}
                  </div>
                </div>
              ))}
            </div>

            {/* Reading Comprehension Quiz */}
            {activeStory.quiz && activeStory.quiz.length > 0 && (
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 20px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📝</span> Câu hỏi đọc hiểu
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activeStory.quiz.map((q, qIdx) => {
                    const chosen = userQuizAnswers[q.id || qIdx];
                    const hasAnswered = chosen !== undefined;
                    const isCorrect = chosen === q.answer;

                    return (
                      <div key={q.id || qIdx} style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                          Câu {qIdx + 1}: {q.question_vi}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {q.options_vi?.map((opt, optIdx) => {
                            let btnBg = 'var(--bg-surface)';
                            let btnBorder = 'var(--border-subtle)';
                            let btnColor = 'var(--text-primary)';

                            if (hasAnswered) {
                              if (optIdx === q.answer) {
                                btnBg = '#ecfdf5';
                                btnBorder = 'var(--status-success)';
                                btnColor = '#047857';
                              } else if (chosen === optIdx) {
                                btnBg = '#fef2f2';
                                btnBorder = 'var(--status-danger)';
                                btnColor = '#dc2626';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={hasAnswered}
                                onClick={() => setUserQuizAnswers({ ...userQuizAnswers, [q.id || qIdx]: optIdx })}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: `1px solid ${btnBorder}`,
                                  background: btnBg,
                                  color: btnColor,
                                  textAlign: 'left',
                                  fontSize: '13px',
                                  fontWeight: chosen === optIdx || optIdx === q.answer ? '700' : '500',
                                  cursor: hasAnswered ? 'default' : 'pointer'
                                }}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </button>
                            );
                          })}
                        </div>

                        {hasAnswered && (
                          <div style={{
                            marginTop: '12px',
                            paddingTop: '10px',
                            borderTop: '1px dashed var(--border-subtle)',
                            fontSize: '12px',
                            color: isCorrect ? 'var(--status-success)' : 'var(--status-danger)'
                          }}>
                            <strong>{isCorrect ? '✓ Chính xác!' : '✗ Chưa đúng!'}</strong> {q.explanation_vi}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Story Index Browser View
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Title */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--brand-primary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📖</span> Luyện Đọc Phân Cấp (Graded Reading)
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
          450 bài đọc phân cấp chuẩn HSK 1–9 kèm phân tích ngữ nghĩa từng từ và bài trắc nghiệm đọc hiểu.
        </p>
      </div>

      {/* Level Selector Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none' }}>
        {levels.map(lvl => {
          const isActive = selectedLevel === lvl;
          return (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                background: isActive ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}
            >
              {lvl}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.target.value)}
          placeholder={`Tìm kiếm bài đọc ${selectedLevel}...`}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Stories Grid */}
      {loadingManifest ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang nạp danh mục bài đọc...
        </div>
      ) : filteredStories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Không tìm thấy bài đọc nào phù hợp.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {filteredStories.map(story => (
            <div
              key={story.id}
              onClick={() => openStory(story)}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                    {story.level}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ⏱ {story.estimatedMinutes || 3} phút
                  </span>
                </div>

                <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--font-hanzi)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {story.title?.zh}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {story.title?.vi}
                </div>

                {story.description_vi && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {story.description_vi}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{story.sentence_count || story.sentences_count || 0} câu</span>
                <span style={{ color: 'var(--brand-primary)', fontWeight: '600' }}>Đọc ngay →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
