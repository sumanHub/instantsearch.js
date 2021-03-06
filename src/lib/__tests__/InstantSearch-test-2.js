// import algoliaSearchHelper from 'algoliasearch-helper';
import InstantSearch from '../InstantSearch';

jest.useFakeTimers();

const appId = 'appId';
const apiKey = 'apiKey';
const indexName = 'lifecycle';

describe('InstantSearch lifecycle', () => {
  it('calls the provided searchFunction when used', () => {
    const searchFunctionSpy = jest.fn(h => {
      h.setQuery('test').search();
    });

    const fakeClient = {
      search: jest.fn(),
      addAlgoliaAgent: () => {},
    };

    const search = new InstantSearch({
      appId,
      apiKey,
      indexName,
      searchFunction: searchFunctionSpy,
      createAlgoliaClient: () => fakeClient,
    });

    expect(searchFunctionSpy).not.toHaveBeenCalled();
    expect(fakeClient.search).not.toHaveBeenCalled();

    search.start();

    expect(searchFunctionSpy).toHaveBeenCalledTimes(1);
    expect(search.helper.state.query).toBe('test');
    expect(fakeClient.search).toHaveBeenCalledTimes(1);
  });

  const fakeResults = () => ({
    results: [
      {
        hits: [{}, {}],
        nbHits: 2,
        page: 0,
        nbPages: 1,
        hitsPerPage: 4,
        processingTimeMS: 1,
        exhaustiveNbHits: true,
        query: '',
        params: '',
        index: 'quick_links',
      },
    ],
  });

  it('triggers the stalled search rendering once if the search does not resolve in time', () => {
    const searchResultsResolvers = [];
    const searchResultsPromises = [];
    const fakeClient = {
      search: jest.fn((qs, cb) => {
        const p = new Promise(resolve =>
          searchResultsResolvers.push(resolve)
        ).then(() => {
          cb(null, fakeResults());
        });
        searchResultsPromises.push(p);
      }),
      addAlgoliaAgent: () => {},
    };

    const search = new InstantSearch({
      appId,
      apiKey,
      indexName,
      createAlgoliaClient: () => fakeClient,
    });

    const widget = {
      getConfiguration: jest.fn(),
      init: jest.fn(),
      render: jest.fn(),
    };

    search.addWidget(widget);

    // when a widget is added the methods of the widget are not called
    expect(widget.getConfiguration).not.toHaveBeenCalled();
    expect(widget.init).not.toHaveBeenCalled();
    expect(widget.render).not.toHaveBeenCalled();

    search.start();

    // During start, IS.js calls the getConfiguration, init and then send a search
    expect(widget.getConfiguration).toHaveBeenCalledTimes(1);
    expect(widget.init).toHaveBeenCalledTimes(1);
    expect(widget.render).not.toHaveBeenCalled();

    // first results come back
    searchResultsResolvers[0]();

    return searchResultsPromises[0].then(() => {
      // render has now been called
      expect(widget.render).toHaveBeenCalledTimes(1);

      expect(widget.render).toHaveBeenLastCalledWith(
        expect.objectContaining({
          searchMetadata: {
            isSearchStalled: false,
          },
        })
      );

      // New search
      search.helper.search();
      // results are not back yet
      expect(widget.render).toHaveBeenCalledTimes(1);
      // delay is reached
      jest.runAllTimers();

      expect(widget.render).toHaveBeenCalledTimes(2);
      expect(widget.render).toHaveBeenLastCalledWith(
        expect.objectContaining({
          searchMetadata: {
            isSearchStalled: true,
          },
        })
      );

      searchResultsResolvers[1]();
      return searchResultsPromises[1].then(() => {
        expect(widget.render).toHaveBeenCalledTimes(3);
        expect(widget.render).toHaveBeenLastCalledWith(
          expect.objectContaining({
            searchMetadata: {
              isSearchStalled: false,
            },
          })
        );

        // getConfiguration and init are not called a second time
        expect(widget.getConfiguration).toHaveBeenCalledTimes(1);
        expect(widget.init).toHaveBeenCalledTimes(1);
      });
    });
  });
});
