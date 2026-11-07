// Entry for the Preact islands mounted inside the legacy index.html.
// Each island owns one piece of the page that used to be built by a legacy script,
// rendering identical markup so the existing CSS applies unchanged.
import { mountStudyHelpModal } from './StudyHelpModal';
import { mountGuessWordGame } from './GuessWordGame';
import { mountSpeedQuizGame } from './SpeedQuizGame';
import { mountSentenceGame } from './SentenceGame';
import { mountVocabularyOverview } from './VocabularyOverview';
import { mountMemoryCurve } from './MemoryCurve';
import { mountSidebarRadicalsFilter } from './SidebarRadicalsFilter';
import { mountWeakWords } from './WeakWords';
import { mountSidebarTabs } from './SidebarTabs';
import { mountWordCompanion } from './WordCompanion';
import { mountGrammarBreakdown } from './GrammarBreakdown';

mountStudyHelpModal();
mountGuessWordGame();
mountSpeedQuizGame();
mountSentenceGame();
mountVocabularyOverview();
mountMemoryCurve();
mountSidebarRadicalsFilter(); // before WeakWords: the weak-words panel goes right after it
mountWeakWords();
mountSidebarTabs();
mountWordCompanion(); // before GrammarBreakdown: the grammar panel goes right after it
mountGrammarBreakdown();
