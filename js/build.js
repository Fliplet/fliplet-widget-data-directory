var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var container = this;
  var id = $(this).data('directory-id');
  var uuid = $(this).data('directory-uuid');
  var storageKey = 'directory-' + uuid;
  var config = Fliplet.Widget.getData(id);

  /*
   * Get data source data and format it to data directory format
   */
  function getData (options) {
    options = options || { offline: true };
    return Fliplet.DataSources.connect(config.source, options)
      .then(function (source) {
        return source.find();
      })
      .then(function formatData(rows) {
        var formattedRows = rows.map(function (row) {
          row.data.dataSourceEntryId = row.id;
          return row.data;
        });

        return Promise.resolve(formattedRows);
      })
  }

  if (!config.source) {
    return dataDirectory[id] = new DataDirectory(config, container);
  }

  // If live data is disabled or we are on web let's go directly to data source.
  if (!config.enable_live_data || Fliplet.Env.get('platform') === 'web') {
    return getData({ offline: true })
      .then(function (rows) {
        config.rows = rows;
        return dataDirectory[id] = new DataDirectory(config, container);
      })
      .catch(function (error) {
        // Load empty directory
        return dataDirectory[id] = new DataDirectory(config, container);
      });
  }

  Fliplet.App.Storage.get(storageKey)
    .then(function (cache) {
      // Let's load cache if we have it
      if (cache) {
        config.rows = cache.rows;
        dataDirectory[id] = new DataDirectory(config, container);
      }

      // Let's check if there's is new data
      Fliplet.DataSources.getById(config.source)
        .then(function (dataSource) {
          // Let's see if live data source was updated
          if (cache) {
            var dsUpdated = new Date(dataSource.updatedAt);
            var cacheUpdated = new Date(cache.updatedAt);
            if (cacheUpdated > dsUpdated) {
              // Cached data is up to date. Let's stop here
              return;
            }
          }

          if (Fliplet.Navigator.isOnline()) {
            return getData({ offline: false })
              .then(function (rows) {
                config.rows = rows;
                Fliplet.App.Storage.set(storageKey, { rows: rows, updatedAt: (new Date()).toISOString() });

                // If directory was already initialised with cached data
                if (dataDirectory[id]) {
                  // Let's just update data and initialise it again
                  dataDirectory[id].data = rows;
                  return dataDirectory[id].init();
                }

                return dataDirectory[id] = new DataDirectory(config, container);
              })
              .catch(function (error) {
                // If directory have been initialized do nothing
                if (dataDirectory[id]) {
                  return;
                }

                // Initilize empty directory
                return dataDirectory[id] = new DataDirectory(config, container);
              });
          }

          // If offline and no cache, because if there was rows it have been initialized already
          if (!cache) {
            dataDirectory[id] = new DataDirectory(config, container);
          }
        });
    })
});
