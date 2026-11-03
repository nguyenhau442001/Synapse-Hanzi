import { Flashcard } from '../components/Flashcard';
import { RatingActions } from '../components/RatingActions';
import { StudyNavigation } from '../components/StudyNavigation';
import { ProgressNav } from '../components/ProgressNav';
import { LevelPicker } from '../components/LevelPicker';
import { getLevelsList } from '../services/dataRepository';
import {
  currentLevelSignal,
  currentLevelConfig,
  currentWord,
  currentIndexSignal,
  isFlippedSignal,
  filterSignal,
  filteredWords,
  progressStats,
  audioManifestSignal,
  setLevel,
  nextCard,
  prevCard,
  toggleCardFlip,
  markWordProgress,
  setStudyFilter
} from '../signals/studySignals';
import { playWordAudio, playExampleAudio, isPlayingAudioSignal } from '../services/speechService';
import { submitSrsRating } from '../signals/srsSignals';

/**
 * StudyView View Component
 * Assembles Flashcard study studio with level picking, filter navigation, card stage and rating actions.
 */
export function StudyView() {
  const word = currentWord.value;
  const isFlipped = isFlippedSignal.value;
  const curLevel = currentLevelSignal.value;
  const curLevelCfg = currentLevelConfig.value;
  const curFilter = filterSignal.value;
  const stats = progressStats.value;
  const curIdx = currentIndexSignal.value;
  const totalCards = filteredWords.value.length;
  const manifest = audioManifestSignal.value;
  const isPlaying = isPlayingAudioSignal.value;

  const handleRate = (rating) => {
    if (!word) return;
    if (rating === 'again') {
      markWordProgress('learning');
      submitSrsRating(word, 'again');
    } else {
      markWordProgress('remembered');
      submitSrsRating(word, 'good');
    }
    nextCard();
  };

  const handleSpeakWord = () => {
    if (word) playWordAudio(word, manifest);
  };

  const handleSpeakExample = () => {
    if (word) playExampleAudio(word, manifest);
  };

  return (
    <div>
      {/* 1. Level Picker */}
      <LevelPicker
        currentLevel={curLevel}
        levels={getLevelsList()}
        onSelectLevel={setLevel}
      />

      {/* 2. Progress & Status Navigation */}
      <ProgressNav
        stats={stats}
        currentFilter={curFilter}
        levelLabel={curLevelCfg.label}
        onSelectFilter={setStudyFilter}
      />

      {/* 3. Core Flashcard */}
      <Flashcard
        word={word}
        isFlipped={isFlipped}
        onFlip={toggleCardFlip}
        onSpeakWord={handleSpeakWord}
        onSpeakExample={handleSpeakExample}
        isPlaying={isPlaying}
      />

      {/* 4. Rating Actions (When flipped, show rating actions) */}
      {isFlipped && (
        <RatingActions
          onRate={handleRate}
          mode="study"
        />
      )}

      {/* 5. Tactical Navigation (Previous / Next / Counter) */}
      <StudyNavigation
        currentIndex={curIdx}
        totalCards={totalCards}
        onPrev={prevCard}
        onNext={nextCard}
      />
    </div>
  );
}
