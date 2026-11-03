import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { AppHeader } from './components/AppHeader';
import { PlumBlossomBackground } from './components/PlumBlossomBackground';
import { StudyView } from './views/StudyView';
import { DueReviewView } from './views/DueReviewView';
import { ListeningView } from './views/ListeningView';
import { ReadingView } from './views/ReadingView';
import { RadicalsView } from './views/RadicalsView';
import { GamesView } from './views/GamesView';
import { isDueReviewModeSignal, dueCount, startDueReviewSession } from './signals/srsSignals';
import { currentLevelSignal, setLevel } from './signals/studySignals';

// Reactive Theme Signal (persisted to localStorage)
export const themeSignal = signal(
  localStorage.getItem('hsk_theme_manual') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

themeSignal.subscribe(theme => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('hsk_theme_manual', theme);
});

/**
 * Root Application Component
 * Ultra-modular layout orchestrator with zero bloat.
 */
export function App() {
  const [activeTab, setActiveTab] = useState('study'); // 'study' | 'reading' | 'radicals' | 'games'
  const isReviewMode = isDueReviewModeSignal.value;
  const currentTheme = themeSignal.value;
  const totalDue = dueCount.value;

  useEffect(() => {
    // Initial level load on mount
    setLevel(currentLevelSignal.value);
  }, []);

  const handleToggleTheme = () => {
    themeSignal.value = themeSignal.value === 'dark' ? 'light' : 'dark';
  };

  return (
    <>
      {/* 1. Ambient Background Drifting Animation */}
      <PlumBlossomBackground theme={currentTheme} />

      {/* 2. Main Container */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto', padding: '16px 14px 80px' }}>
        {/* Top Header */}
        {!isReviewMode && (
          <AppHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            theme={currentTheme}
            onToggleTheme={handleToggleTheme}
            dueCount={totalDue}
            onOpenDueReview={startDueReviewSession}
          />
        )}

        {/* Dynamic View Router */}
        <main>
          {isReviewMode ? (
            <DueReviewView />
          ) : activeTab === 'study' ? (
            <StudyView />
          ) : activeTab === 'listening' ? (
            <ListeningView />
          ) : activeTab === 'reading' ? (
            <ReadingView />
          ) : activeTab === 'radicals' ? (
            <RadicalsView />
          ) : activeTab === 'games' ? (
            <GamesView />
          ) : null}
        </main>
      </div>
    </>
  );
}
