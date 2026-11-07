// Entry for the Preact islands mounted inside the legacy index.html.
// Each island owns one piece of the page that used to be built by a legacy script,
// rendering identical markup so the existing CSS applies unchanged.
import { mountAmbientBackground } from './ambientBackground';
import { mountStudyHelpModal } from './StudyHelpModal';
import { mountGuessWordGame } from './GuessWordGame';
import { mountSpeedQuizGame } from './SpeedQuizGame';
import { mountSentenceGame } from './SentenceGame';
import { mountVocabularyOverview } from './VocabularyOverview';
import { mountMemoryCurve } from './MemoryCurve';
import { mountSidebarSearch } from './SidebarSearch';
import { mountSidebarRadicalsFilter } from './SidebarRadicalsFilter';
import { mountWeakWords } from './WeakWords';
import { mountSidebarTabs } from './SidebarTabs';
import { mountRadicalsState } from './radicalsState';
import { mountStrokeCanvas } from './StrokeCanvas';
import { mountWordCompanion } from './WordCompanion';
import { mountGrammarBreakdown } from './GrammarBreakdown';
import { mountTodayReview } from './TodayReview';
import { mountHanziDecomposition } from './HanziDecomposition';
import { mountRelatedWords } from './RelatedWords';
import { mountGradedReading } from './GradedReading';
import { mountReadingAnalysis } from './ReadingAnalysis';
import { mountListeningPractice } from './ListeningPractice';
import { mountQuickAccessDrawer } from './QuickAccessDrawer';
import { mountHomeWidgets } from './HomeWidgets';
import { mountRadicalHub } from './RadicalHub';
import { mountRadicalCards } from './RadicalCards';
import { mountFastReview } from './FastReview';
import { mountStudyProgress } from './StudyProgress';
import { mountDashboardEnhancements } from './DashboardEnhancements';
import { mountCardInteractions } from './CardInteractions';
import { mountWordIllustrations } from './WordIllustrations';
import { mountHsk30Grid } from './Hsk30Grid';
import { mountTopicGrid } from './TopicGrid';
import { mountBackupSync } from './BackupSync';
import { mountThemeManager } from './ThemeManager';
import { mountSpeechAudio } from './SpeechAudio';
import { mountLevels } from './Levels';
import { mountAppBootstrap } from './AppBootstrap';

mountAmbientBackground();
mountStudyHelpModal();
mountGuessWordGame();
mountSpeedQuizGame();
mountSentenceGame();
mountVocabularyOverview();
mountMemoryCurve();
mountSidebarSearch(); // first: the dock panels below are placed relative to the search box
mountRadicalsState(); // radical state variables initialized before sidebar filter & radical hub
mountSidebarRadicalsFilter(); // before WeakWords: the weak-words panel goes right after it
mountWeakWords();
mountHanziDecomposition(); // before SidebarTabs: the initial tab may render the radicals panel
mountSidebarTabs();
mountStrokeCanvas(); // before WordCompanion: WordCompanion places itself right after #strokeCanvasWrap
mountWordCompanion(); // before GrammarBreakdown: the grammar panel goes right after it
mountGrammarBreakdown();
mountTodayReview();
mountRelatedWords();
mountGradedReading();
mountReadingAnalysis();
mountListeningPractice();
mountQuickAccessDrawer();
mountHomeWidgets();
mountRadicalHub();
mountRadicalCards();
mountFastReview();
mountStudyProgress();
mountDashboardEnhancements();
mountCardInteractions();
mountWordIllustrations();
mountHsk30Grid();
mountTopicGrid();
mountBackupSync();
mountThemeManager();
mountSpeechAudio();
mountLevels();
mountAppBootstrap();
