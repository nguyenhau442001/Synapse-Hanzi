// Entry for the Preact islands mounted inside the legacy index.html.
// Each island owns one piece of the page that used to be built by a legacy script,
// rendering identical markup so the existing CSS applies unchanged.
import { mountStudyHelpModal } from './StudyHelpModal';
import { mountGuessWordGame } from './GuessWordGame';
import { mountSpeedQuizGame } from './SpeedQuizGame';
import { mountSentenceGame } from './SentenceGame';
import { mountVocabularyOverview } from './VocabularyOverview';
import { mountMemoryCurve } from './MemoryCurve';
import { mountWeakWords } from './WeakWords';

mountStudyHelpModal();
mountGuessWordGame();
mountSpeedQuizGame();
mountSentenceGame();
mountVocabularyOverview();
mountMemoryCurve();
mountWeakWords();
