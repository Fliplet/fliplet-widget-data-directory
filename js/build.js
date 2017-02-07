var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var container = this;
  var id = $(this).data('directory-id');
  var uuid = $(this).data('directory-uuid');
  var pvKey = 'data-directory-rows-' + uuid;
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
  
  if (!config.enable_live_data || Fliplet.Env.get('platform') === 'web') {
    return getData({ offline: true })
      .then(function (data) {
        config.rows = data;
        return dataDirectory[id] = new DataDirectory(config, container);
      })
      .catch(function (error) {
        // Load empty directory
        return dataDirectory[id] = new DataDirectory(config, container);
      });
  }

  Fliplet.Storage.get(pvKey)
    .then(function (rows) {
      if (rows) {
        Fliplet.Storage.set(pvKey, config.rows);
        config.rows = rows;
        dataDirectory[id] = new DataDirectory(config, container);
      }

      if (Fliplet.Navigator.isOnline()) {
        return getData({ offline: false })
          .then(function (data) {
            config.rows = data;
            Fliplet.Storage.set(pvKey, data);
            // If directory was already initialised with cached data
            if (dataDirectory[id]) {
              // Let's just update data and initialise it again
              dataDirectory[id].data = data;
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

      // If offline and no rows, because if there was rows it have been initialized already
      if (!rows) {
        dataDirectory[id] = new DataDirectory(config, container);
      }
    })
});
