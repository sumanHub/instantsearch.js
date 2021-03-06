import initClearAllStories from './stories/clear-all.stories';
import initHitsStories from './stories/hits.stories';
import initMenuStories from './stories/menu.stories';
import initRefinementListStories from './stories/refinement-list.stories';
import initSearchBoxStories from './stories/search-box.stories';

export default () => {
  initClearAllStories();
  initHitsStories();
  initMenuStories();
  initRefinementListStories();
  initSearchBoxStories();
};
