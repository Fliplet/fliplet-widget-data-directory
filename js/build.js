var dataDirectory = {};
Fliplet().then(function(){
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

    Fliplet.Hooks.run('flDirectoryBeforeGetData', {
      config: config,
      container: container
    }).then(function() {
      if (config.getData) {
        getData = config.getData;
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

      var loadCache = config.cache === false ? Promise.resolve() : Fliplet.App.Storage.get(storageKey);

      loadCache
        .then(function (cache) {
          var loadData;

          // Let's load cache if we have it
          if (cache) {
            config.rows = cache.rows;
            dataDirectory[id] = new DataDirectory(config, container);

            loadData = Fliplet.DataSources.getById(config.source).then(function (dataSource) {
              var dsUpdated = new Date(dataSource.updatedAt);
              var cacheUpdated = new Date(cache.updatedAt);

              if (dsUpdated <= cacheUpdated) {
                // Cached data is up to date. Let's stop here
                return;
              }

              return getData({ offline: false });
            });
          } else {
            loadData = getData({ offline: false });
          }

          return loadData.then(function (rows) {
            if (typeof rows === 'undefined') {
              return; // earlier promises already handled directory init  
            }
            
            config.rows = rows;

            // Store latest data with a new timestamp
            if (config.cache !== false) {
              Fliplet.App.Storage.set(storageKey, { rows: rows, updatedAt: new Date().toISOString() });
            }

            // If directory was already initialised with cached data
            if (dataDirectory[id]) {
              // Let's just update data and initialise it again
              dataDirectory[id].data = rows;
              return dataDirectory[id].init();
            }

            return dataDirectory[id] = new DataDirectory(config, container);
          }).catch(function (error) {
            console.error(error);

            // This catches: network errors/server is down/offline
            // If we don't have cache (new directory) let's create new empty directory
            if (!cache) {
              return dataDirectory[id] = new DataDirectory(config, container);
            }
          });
        });
    });
  });
});
